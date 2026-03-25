"""
SAM3 Object Detection Module

This module handles all SAM3 model operations including:
- Model loading and initialization
- Image processing
- Object detection by text prompt
- Mask generation and overlay creation
"""

import os
import time
import numpy as np
import torch
from PIL import Image

from ultralytics.models.sam import SAM3SemanticPredictor
from .tracker import extract_mask_contour


def _configure_cuda_workarounds():
    """Apply CUDA workarounds for SM_121+ architectures (e.g. DGX Spark GB10).

    Must be called BEFORE loading any model so PyTorch picks up the flags.
    """
    torch.backends.cuda.enable_flash_sdp(False)
    torch.backends.cuda.enable_mem_efficient_sdp(True)
    torch.backends.cuda.enable_math_sdp(True)
    os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")


def get_best_device():
    """Auto-detect the best available device (CUDA GPU > CPU).

    When a CUDA GPU is found the SM_121 workarounds from test_sam3.py
    are applied automatically before any model is loaded.
    """
    # Diagnostics (same as test_sam3.py)
    print(f"--- Device Diagnostics ---")
    print(f"  PyTorch version: {torch.__version__}")
    print(f"  CUDA available:  {torch.cuda.is_available()}")
    print(f"  CUDA built:      {torch.backends.cuda.is_built() if hasattr(torch.backends.cuda, 'is_built') else 'N/A'}")
    if hasattr(torch.version, 'cuda') and torch.version.cuda:
        print(f"  CUDA version:    {torch.version.cuda}")
    else:
        print(f"  CUDA version:    None (CPU-only PyTorch)")

    if torch.cuda.is_available():
        device = "cuda"
        gpu_name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_mem / (1024 ** 3)
        print(f"  GPU name:        {gpu_name}")
        print(f"  GPU VRAM:        {vram:.1f} GB")
        print(f"  Device index:    {torch.cuda.current_device()}")
        print(f"🎮 Using GPU: {gpu_name} ({vram:.1f} GB VRAM)")
        _configure_cuda_workarounds()
        print(f"⚡ CUDA workarounds applied (flash SDP off, mem-efficient SDP on)")
        return device

    print("💻 No GPU detected, using CPU")
    print("  Hint: install CUDA-enabled PyTorch for GPU support:")
    print("    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124")
    return "cpu"


class SAM3Detector:
    """
    SAM3 Object Detector class that encapsulates all detection logic.
    """

    def __init__(self, model_path, device="cpu", default_conf=0.25):
        """
        Initialize the SAM3 detector with the specified model.

        Args:
            model_path (str): Path to the SAM3 model file (.pt)
            device (str): Device to run the model on ('cpu' or 'cuda')
            default_conf (float): Default confidence threshold (0.0 - 1.0)
        """
        self.model_path = model_path
        self.device = device
        self.default_conf = default_conf

        print(f"🔄 Loading SAM3 Model on {device}...")
        self.predictor = SAM3SemanticPredictor(
            overrides=dict(
                model=model_path,
                mode="predict",
                conf=default_conf,
                device=device,
                half=(device != "cpu"),
                save=False,
            )
        )
        print(f"✅ SAM3 Model Loaded Successfully ({device})")

    def detect(self, image, text_prompt, confidence=None, opacity=0.6):
        """
        Detect objects in an image based on a text prompt.

        Args:
            image: PIL Image or numpy array
            text_prompt (str): Text description of object to detect
            confidence (float, optional): Confidence threshold (0.0 - 1.0)
            opacity (float): Mask overlay opacity (0.0 - 1.0)

        Returns:
            dict: Detection results containing:
                - original_image (np.array): Original image array
                - objects (list): List of detected objects with individual data
                - objects_detected (int): Number of objects found
                - processing_time (float): Time taken for detection
                - image_size (tuple): (height, width) of the image
        """
        start_time = time.time()

        # Convert PIL Image to numpy if needed
        if isinstance(image, Image.Image):
            image_np = np.array(image.convert("RGB"))
        else:
            image_np = image

        # Use default confidence if not specified
        if confidence is None:
            confidence = self.default_conf

        # Handle multiple prompts (comma-separated or list)
        if isinstance(text_prompt, str):
            # Split by comma and strip whitespace
            prompts = [p.strip() for p in text_prompt.split(',') if p.strip()]
        else:
            prompts = text_prompt

        # Set image for detection (only once)
        self.predictor.set_image(image_np)

        # Process individual objects
        detected_objects = []
        object_counter = 0  # Global counter across all prompts

        # Run detection for each prompt separately to track which prompt matches which object
        for prompt in prompts:
            results = self.predictor(text=[prompt], conf=confidence)

            if results and results[0].masks is not None:
                masks = results[0].masks.data.cpu().numpy()

                # Extract confidence scores and boxes if available
                confidence_scores = []
                boxes = None

                if hasattr(results[0], 'boxes') and results[0].boxes is not None:
                    if hasattr(results[0].boxes, 'conf'):
                        confidence_scores = results[0].boxes.conf.cpu().numpy().tolist()
                    if hasattr(results[0].boxes, 'xyxy'):
                        boxes = results[0].boxes.xyxy.cpu().numpy()

                # Process each detected object separately
                for idx, mask in enumerate(masks):
                    # Generate unique color for this object
                    np.random.seed(object_counter * 42)  # Consistent colors across all prompts
                    color = np.random.randint(50, 255, 3).tolist()

                    # Get bounding box
                    mask_bool = mask > 0.5
                    y_indices, x_indices = np.where(mask_bool)

                    bbox = None
                    if len(y_indices) > 0 and len(x_indices) > 0:
                        # Calculate bounding box from mask
                        x_min, x_max = int(x_indices.min()), int(x_indices.max())
                        y_min, y_max = int(y_indices.min()), int(y_indices.max())
                        bbox = {
                            'x_min': x_min,
                            'y_min': y_min,
                            'x_max': x_max,
                            'y_max': y_max,
                            'width': x_max - x_min,
                            'height': y_max - y_min
                        }

                    # Use model's bounding box if available and more accurate
                    if boxes is not None and idx < len(boxes):
                        box = boxes[idx]
                        bbox = {
                            'x_min': int(box[0]),
                            'y_min': int(box[1]),
                            'x_max': int(box[2]),
                            'y_max': int(box[3]),
                            'width': int(box[2] - box[0]),
                            'height': int(box[3] - box[1])
                        }

                    # Create object data
                    obj_data = {
                        'id': object_counter,
                        'label': f"{prompt} #{idx + 1}",
                        'prompt': prompt,  # Track which prompt this object matched
                        'color': color,
                        'mask': mask_bool.tolist(),  # Binary mask
                        'bbox': bbox,
                        'confidence': confidence_scores[idx] if idx < len(confidence_scores) else None,
                        'area': int(mask_bool.sum())  # Number of pixels in mask
                    }

                    detected_objects.append(obj_data)
                    object_counter += 1

        # Calculate processing time
        processing_time = time.time() - start_time

        return {
            'original_image': image_np,
            'objects': detected_objects,
            'objects_detected': len(detected_objects),
            'processing_time': processing_time,
            'image_size': {'height': image_np.shape[0], 'width': image_np.shape[1]}
        }

    def detect_live(self, image, text_prompt, confidence=None, imgsz=320,
                     return_contours=False):
        """
        Lightweight detection for live camera — returns bboxes only (no masks).

        Uses a temporary predictor with a small imgsz for fast inference,
        and skips mask serialization entirely.

        Args:
            image: PIL Image or numpy array
            text_prompt (str): Text description of object to detect
            confidence (float, optional): Confidence threshold
            imgsz (int): Model inference size (smaller = faster)
            return_contours (bool): When True, include a simplified polygon
                outline ('contour') for each detected object.

        Returns:
            dict: Lightweight results with bbox-only objects
        """
        start_time = time.time()

        if isinstance(image, Image.Image):
            image_np = np.array(image.convert("RGB"))
        else:
            image_np = image

        if confidence is None:
            confidence = self.default_conf

        if isinstance(text_prompt, str):
            prompts = [p.strip() for p in text_prompt.split(',') if p.strip()]
        else:
            prompts = text_prompt

        # Use a lightweight predictor with small imgsz for speed
        if not hasattr(self, '_live_predictor') or self._live_imgsz != imgsz:
            self._live_predictor = SAM3SemanticPredictor(
                overrides=dict(
                    model=self.model_path,
                    mode="predict",
                    task="segment",
                    conf=confidence,
                    device=self.device,
                    half=(self.device != "cpu"),
                    save=False,
                    imgsz=imgsz,
                    verbose=False
                )
            )
            self._live_imgsz = imgsz

        self._live_predictor.set_image(image_np)

        detected_objects = []
        object_counter = 0

        # Run all prompts at once for speed
        results = self._live_predictor(text=prompts, conf=confidence)

        if results and results[0].masks is not None:
            masks = results[0].masks.data.cpu().numpy()

            confidence_scores = []
            boxes = None

            if hasattr(results[0], 'boxes') and results[0].boxes is not None:
                if hasattr(results[0].boxes, 'conf'):
                    confidence_scores = results[0].boxes.conf.cpu().numpy().tolist()
                if hasattr(results[0].boxes, 'xyxy'):
                    boxes = results[0].boxes.xyxy.cpu().numpy()

            for idx, mask in enumerate(masks):
                np.random.seed(object_counter * 42)
                color = np.random.randint(50, 255, 3).tolist()

                # Get bbox from model boxes (fast) or from mask
                bbox = None
                if boxes is not None and idx < len(boxes):
                    box = boxes[idx]
                    bbox = {
                        'x_min': int(box[0]),
                        'y_min': int(box[1]),
                        'x_max': int(box[2]),
                        'y_max': int(box[3]),
                        'width': int(box[2] - box[0]),
                        'height': int(box[3] - box[1])
                    }
                else:
                    mask_bool = mask > 0.5
                    y_indices, x_indices = np.where(mask_bool)
                    if len(y_indices) > 0:
                        x_min, x_max = int(x_indices.min()), int(x_indices.max())
                        y_min, y_max = int(y_indices.min()), int(y_indices.max())
                        bbox = {
                            'x_min': x_min, 'y_min': y_min,
                            'x_max': x_max, 'y_max': y_max,
                            'width': x_max - x_min, 'height': y_max - y_min
                        }

                # Assign label: use prompt name
                # With all prompts at once, we use generic labels
                label = f"{prompts[0]} #{idx + 1}" if len(prompts) == 1 else f"object #{idx + 1}"

                obj_dict = {
                    'id': object_counter,
                    'label': label,
                    'color': color,
                    'bbox': bbox,
                    'confidence': confidence_scores[idx] if idx < len(confidence_scores) else None,
                }
                if return_contours:
                    obj_dict['contour'] = extract_mask_contour(mask)

                detected_objects.append(obj_dict)
                object_counter += 1

        processing_time = time.time() - start_time

        return {
            'objects': detected_objects,
            'objects_detected': len(detected_objects),
            'processing_time': processing_time,
            'image_size': {'height': image_np.shape[0], 'width': image_np.shape[1]}
        }

    def detect_by_points(self, image, points, labels, confidence=None):
        """
        Detect objects using point prompts.

        Args:
            image: PIL Image or numpy array
            points: List of [x, y] coordinates or single [x, y] pair
            labels: List of 1 (foreground) or 0 (background) or single int
            confidence (float, optional): Confidence threshold (0.0 - 1.0)

        Returns:
            dict: Detection results containing:
                - original_image (np.array): Original image array
                - objects (list): List of detected objects with individual data
                - objects_detected (int): Number of objects found
                - processing_time (float): Time taken for detection
                - image_size (tuple): (height, width) of the image
        """
        start_time = time.time()

        # Convert PIL Image to numpy if needed
        if isinstance(image, Image.Image):
            image_np = np.array(image.convert("RGB"))
        else:
            image_np = image

        # Use default confidence if not specified
        if confidence is None:
            confidence = self.default_conf

        # Ensure points and labels are lists
        if isinstance(points[0], (int, float)):
            # Single point: [x, y]
            points = [points]
        if isinstance(labels, int):
            # Single label
            labels = [labels]

        # Run detection with point prompts
        from ultralytics import SAM
        model = SAM(self.model_path)
        results = model.predict(source=image_np, points=points, labels=labels, conf=confidence, device=self.device)

        # Process results
        detected_objects = []
        object_counter = 0

        if results and results[0].masks is not None:
            masks = results[0].masks.data.cpu().numpy()

            # Extract confidence scores and boxes if available
            confidence_scores = []
            boxes = None

            if hasattr(results[0], 'boxes') and results[0].boxes is not None:
                if hasattr(results[0].boxes, 'conf'):
                    confidence_scores = results[0].boxes.conf.cpu().numpy().tolist()
                if hasattr(results[0].boxes, 'xyxy'):
                    boxes = results[0].boxes.xyxy.cpu().numpy()

            # Process each detected object separately
            for idx, mask in enumerate(masks):
                # Generate unique color for this object
                np.random.seed(object_counter * 42)
                color = np.random.randint(50, 255, 3).tolist()

                # Get bounding box
                mask_bool = mask > 0.5
                y_indices, x_indices = np.where(mask_bool)

                bbox = None
                if len(y_indices) > 0 and len(x_indices) > 0:
                    # Calculate bounding box from mask
                    x_min, x_max = int(x_indices.min()), int(x_indices.max())
                    y_min, y_max = int(y_indices.min()), int(y_indices.max())
                    bbox = {
                        'x_min': x_min,
                        'y_min': y_min,
                        'x_max': x_max,
                        'y_max': y_max,
                        'width': x_max - x_min,
                        'height': y_max - y_min
                    }

                # Use model's bounding box if available and more accurate
                if boxes is not None and idx < len(boxes):
                    box = boxes[idx]
                    bbox = {
                        'x_min': int(box[0]),
                        'y_min': int(box[1]),
                        'x_max': int(box[2]),
                        'y_max': int(box[3]),
                        'width': int(box[2] - box[0]),
                        'height': int(box[3] - box[1])
                    }

                # Create object data
                obj_data = {
                    'id': object_counter,
                    'label': f"object #{idx + 1}",
                    'color': color,
                    'mask': mask_bool.tolist(),  # Binary mask
                    'bbox': bbox,
                    'confidence': confidence_scores[idx] if idx < len(confidence_scores) else None,
                    'area': int(mask_bool.sum())  # Number of pixels in mask
                }

                detected_objects.append(obj_data)
                object_counter += 1

        # Calculate processing time
        processing_time = time.time() - start_time

        return {
            'original_image': image_np,
            'objects': detected_objects,
            'objects_detected': len(detected_objects),
            'processing_time': processing_time,
            'image_size': {'height': image_np.shape[0], 'width': image_np.shape[1]}
        }

    def detect_by_box(self, image, bboxes, confidence=None):
        """
        Detect objects using bounding box prompts.

        Args:
            image: PIL Image or numpy array
            bboxes: List of [x_min, y_min, x_max, y_max] boxes
            confidence (float, optional): Confidence threshold

        Returns:
            dict: Detection results (same format as detect())
        """
        start_time = time.time()

        if isinstance(image, Image.Image):
            image_np = np.array(image.convert("RGB"))
        else:
            image_np = image

        if confidence is None:
            confidence = self.default_conf

        from ultralytics import SAM
        model = SAM(self.model_path)
        results = model.predict(source=image_np, bboxes=bboxes, conf=confidence, device=self.device)

        detected_objects = []
        object_counter = 0

        if results and results[0].masks is not None:
            masks = results[0].masks.data.cpu().numpy()

            confidence_scores = []
            boxes = None

            if hasattr(results[0], 'boxes') and results[0].boxes is not None:
                if hasattr(results[0].boxes, 'conf'):
                    confidence_scores = results[0].boxes.conf.cpu().numpy().tolist()
                if hasattr(results[0].boxes, 'xyxy'):
                    boxes = results[0].boxes.xyxy.cpu().numpy()

            for idx, mask in enumerate(masks):
                np.random.seed(object_counter * 42)
                color = np.random.randint(50, 255, 3).tolist()

                mask_bool = mask > 0.5
                y_indices, x_indices = np.where(mask_bool)

                bbox = None
                if len(y_indices) > 0 and len(x_indices) > 0:
                    x_min, x_max = int(x_indices.min()), int(x_indices.max())
                    y_min, y_max = int(y_indices.min()), int(y_indices.max())
                    bbox = {'x_min': x_min, 'y_min': y_min, 'x_max': x_max, 'y_max': y_max,
                            'width': x_max - x_min, 'height': y_max - y_min}

                if boxes is not None and idx < len(boxes):
                    box = boxes[idx]
                    bbox = {'x_min': int(box[0]), 'y_min': int(box[1]),
                            'x_max': int(box[2]), 'y_max': int(box[3]),
                            'width': int(box[2] - box[0]), 'height': int(box[3] - box[1])}

                obj_data = {
                    'id': object_counter,
                    'label': f"box #{idx + 1}",
                    'color': color,
                    'mask': mask_bool.tolist(),
                    'bbox': bbox,
                    'confidence': confidence_scores[idx] if idx < len(confidence_scores) else None,
                    'area': int(mask_bool.sum())
                }
                detected_objects.append(obj_data)
                object_counter += 1

        processing_time = time.time() - start_time
        return {
            'original_image': image_np,
            'objects': detected_objects,
            'objects_detected': len(detected_objects),
            'processing_time': processing_time,
            'image_size': {'height': image_np.shape[0], 'width': image_np.shape[1]}
        }

    def _classify_crop_with_clip(self, image_np, bbox):
        """
        Use CLIP to identify the object class in the reference crop.

        Returns the best-matching label string from a set of COCO-style candidates.
        """
        import torch
        import clip
        from PIL import Image as PILImage

        x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
        x1, y1 = max(0, x1), max(0, y1)
        x2 = min(image_np.shape[1], x2)
        y2 = min(image_np.shape[0], y2)

        crop_np = image_np[y1:y2, x1:x2]
        if crop_np.size == 0:
            return "object"

        crop_pil = PILImage.fromarray(crop_np)

        # Common object categories (COCO 80 + extras)
        candidates = [
            "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train",
            "truck", "boat", "traffic light", "fire hydrant", "stop sign",
            "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep",
            "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella",
            "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard",
            "sports ball", "kite", "baseball bat", "baseball glove", "skateboard",
            "surfboard", "tennis racket", "bottle", "wine glass", "cup", "fork",
            "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
            "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
            "couch", "potted plant", "bed", "dining table", "toilet", "tv",
            "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave",
            "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase",
            "scissors", "teddy bear", "hair drier", "toothbrush", "tree", "flower",
            "building", "sky", "road", "wall", "floor", "window", "door",
        ]

        device = self.device
        clip_model, clip_preprocess = clip.load("ViT-B/32", device=device)
        clip_model.eval()

        crop_tensor = clip_preprocess(crop_pil).unsqueeze(0).to(device)
        text_tokens = clip.tokenize([f"a photo of a {c}" for c in candidates]).to(device)

        with torch.no_grad():
            image_features = clip_model.encode_image(crop_tensor)
            text_features = clip_model.encode_text(text_tokens)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)
            similarities = (100.0 * image_features @ text_features.T).softmax(dim=-1)

        best_idx = similarities[0].argmax().item()
        best_label = candidates[best_idx]
        best_score = float(similarities[0][best_idx].item())
        print(f"🔍 CLIP identified reference as: '{best_label}' (score={best_score:.3f})")
        return best_label, best_score

    def detect_by_exemplar(self, image, reference_bbox, confidence=None):
        """
        Find similar objects across the whole image using a visual exemplar.

        Pipeline:
          1. Crop the reference region from the image.
          2. Use CLIP to identify what class of object is in the crop.
          3. Use that text label with SAM3SemanticPredictor to find ALL matching
             objects in the full image.

        Args:
            image: PIL Image or numpy array
            reference_bbox: [x_min, y_min, x_max, y_max] of the reference region
            confidence (float, optional): Confidence threshold

        Returns:
            dict: Detection results (same format as detect())
        """
        start_time = time.time()

        if isinstance(image, Image.Image):
            image_np = np.array(image.convert("RGB"))
        else:
            image_np = image

        if confidence is None:
            confidence = self.default_conf

        # Step 1: Identify reference object via CLIP
        label, clip_score = self._classify_crop_with_clip(image_np, reference_bbox)

        # Step 2: Use SAM3SemanticPredictor with the identified text to find
        # ALL similar objects in the full image
        self.predictor.set_image(image_np)
        results = self.predictor(text=[label], conf=confidence)

        detected_objects = []
        object_counter = 0

        if results and results[0].masks is not None:
            masks = results[0].masks.data.cpu().numpy()

            confidence_scores = []
            boxes = None

            if hasattr(results[0], 'boxes') and results[0].boxes is not None:
                if hasattr(results[0].boxes, 'conf'):
                    confidence_scores = results[0].boxes.conf.cpu().numpy().tolist()
                if hasattr(results[0].boxes, 'xyxy'):
                    boxes = results[0].boxes.xyxy.cpu().numpy()

            for idx, mask in enumerate(masks):
                np.random.seed(object_counter * 42)
                color = np.random.randint(50, 255, 3).tolist()

                mask_bool = mask > 0.5
                y_indices, x_indices = np.where(mask_bool)

                bbox = None
                if len(y_indices) > 0 and len(x_indices) > 0:
                    x_min, x_max = int(x_indices.min()), int(x_indices.max())
                    y_min, y_max = int(y_indices.min()), int(y_indices.max())
                    bbox = {'x_min': x_min, 'y_min': y_min, 'x_max': x_max, 'y_max': y_max,
                            'width': x_max - x_min, 'height': y_max - y_min}

                if boxes is not None and idx < len(boxes):
                    box = boxes[idx]
                    bbox = {'x_min': int(box[0]), 'y_min': int(box[1]),
                            'x_max': int(box[2]), 'y_max': int(box[3]),
                            'width': int(box[2] - box[0]), 'height': int(box[3] - box[1])}

                obj_data = {
                    'id': object_counter,
                    'label': f"{label} #{idx + 1}",
                    'color': color,
                    'mask': mask_bool.tolist(),
                    'bbox': bbox,
                    'confidence': confidence_scores[idx] if idx < len(confidence_scores) else None,
                    'area': int(mask_bool.sum())
                }
                detected_objects.append(obj_data)
                object_counter += 1

        processing_time = time.time() - start_time
        return {
            'original_image': image_np,
            'objects': detected_objects,
            'objects_detected': len(detected_objects),
            'processing_time': processing_time,
            'image_size': {'height': image_np.shape[0], 'width': image_np.shape[1]},
            'clip_label': label,
            'clip_score': clip_score
        }

    def get_model_info(self):
        """
        Get information about the loaded model.

        Returns:
            dict: Model information
        """
        return {
            'model_path': self.model_path,
            'device': self.device,
            'default_confidence': self.default_conf
        }
