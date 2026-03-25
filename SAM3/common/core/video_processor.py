"""
SAM3 Video Processing Module

Handles video upload, frame extraction, and object tracking across video frames.
Uses sequential processing for memory-efficient frame-by-frame detection.
"""

import os
import uuid
import time
import cv2
import numpy as np
import gc


class SAM3VideoProcessor:
    """
    Video processor for SAM3 object tracking across frames.
    """

    def __init__(self, model_path, temp_dir=None, device="cpu"):
        """
        Initialize video processor.

        Args:
            model_path (str): Path to SAM3 model
            temp_dir (str): Directory for temporary video storage.
                            Defaults to temp/videos relative to model_path's directory.
            device (str): Device to run model on ('cpu' or 'cuda')
        """
        self.model_path = model_path
        if temp_dir is None:
            base_dir = os.path.dirname(os.path.abspath(model_path))
            temp_dir = os.path.join(base_dir, "temp", "videos")
        self.temp_dir = temp_dir
        self.device = device

        # Create temp directory if it doesn't exist
        os.makedirs(temp_dir, exist_ok=True)

    def save_uploaded_video(self, file_stream, original_filename):
        """
        Save uploaded video to temporary directory.

        Args:
            file_stream: File stream from Flask request
            original_filename (str): Original filename

        Returns:
            dict: {video_id, video_path}
        """
        # Generate unique video ID
        video_id = str(uuid.uuid4())
        extension = os.path.splitext(original_filename)[1]
        video_filename = f"{video_id}{extension}"
        video_path = os.path.join(self.temp_dir, video_filename)

        # Save video file
        file_stream.save(video_path)

        return {
            'video_id': video_id,
            'video_path': video_path
        }

    def get_video_info(self, video_path):
        """
        Extract video metadata.

        Args:
            video_path (str): Path to video file

        Returns:
            dict: Video information (duration, fps, frame_count, resolution)
        """
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")

        # Get video properties
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0

        cap.release()

        return {
            'duration': duration,
            'fps': fps,
            'frame_count': frame_count,
            'resolution': {'width': width, 'height': height}
        }

    def process_video(self, video_path, text_prompts, detector=None, confidence=0.25,
                     process_fps=10, quality_scale=50):
        """
        Process video with sequential frame-by-frame processing for low memory usage.

        Args:
            video_path (str): Path to video file
            text_prompts (str or list): Text prompts for detection
            detector: SAM3Detector instance (not used, kept for compatibility)
            confidence (float): Detection confidence threshold
            process_fps (int): FPS for processing (lower = faster, skip frames)
            quality_scale (int): Quality percentage (5, 10, 25, 50, 75, 100) - lower = faster

        Yields:
            dict: Frame results with progress information (streamed in real-time)
        """
        from core.utils import to_base64
        from ultralytics.models.sam import SAM3SemanticPredictor

        # Get video metadata
        video_info = self.get_video_info(video_path)
        total_frames = video_info['frame_count']
        video_fps = video_info['fps']
        width = video_info['resolution']['width']
        height = video_info['resolution']['height']

        # Calculate frame skip interval based on process_fps
        skip_frames = max(1, int(video_fps / process_fps)) if process_fps < video_fps else 1

        # Calculate estimated frames to process
        estimated_frames = total_frames // skip_frames

        # Calculate model inference size based on quality
        if quality_scale == 5:
            imgsz = 160
        elif quality_scale == 10:
            imgsz = 224
        elif quality_scale == 25:
            imgsz = 320
        elif quality_scale == 50:
            imgsz = 480
        elif quality_scale == 75:
            imgsz = 640
        else:  # 100
            imgsz = 800

        # Log configuration
        print(f"🎬 Video Processing Configuration:")
        print(f"   Video FPS: {video_fps}")
        print(f"   Process FPS: {process_fps}")
        print(f"   Skip Frames: {skip_frames} (processing every {skip_frames} frame(s))")
        print(f"   Quality Scale: {quality_scale}%")
        print(f"   Model Size: {imgsz}px")
        print(f"   Processing Mode: Sequential (low memory)")

        # Handle text prompts
        if isinstance(text_prompts, str):
            prompts = [p.strip() for p in text_prompts.split(',') if p.strip()]
        else:
            prompts = text_prompts

        # Initialize predictor once (reused for all frames)
        predictor = SAM3SemanticPredictor(
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

        # Open video capture
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")

        try:
            frame_number = 0
            processed_count = 0

            while True:
                ret, frame_image = cap.read()
                if not ret:
                    break

                # Only process frames at the specified interval
                if frame_number % skip_frames == 0:
                    # Log first frame to confirm it's being processed
                    if processed_count == 0:
                        print(f"✅ Processing first frame (frame #{frame_number})")

                    # Convert BGR to RGB
                    frame_rgb = cv2.cvtColor(frame_image, cv2.COLOR_BGR2RGB)

                    # Resize frame based on quality scale for faster processing
                    if quality_scale < 100:
                        new_width = int(width * quality_scale / 100)
                        new_height = int(height * quality_scale / 100)
                        frame_rgb = cv2.resize(frame_rgb, (new_width, new_height))

                    # Calculate timestamp
                    timestamp = frame_number / video_fps if video_fps > 0 else 0

                    # Run detection
                    predictor.set_image(frame_rgb)
                    results = predictor(text=prompts)

                    result = results[0] if results and len(results) > 0 else None

                    # Process detected objects
                    detected_objects = []
                    object_counter = 0

                    if result and hasattr(result, 'masks') and result.masks is not None:
                        masks = result.masks.data.cpu().numpy()

                        # Extract confidence scores and boxes
                        confidence_scores = []
                        boxes = None

                        if hasattr(result, 'boxes') and result.boxes is not None:
                            if hasattr(result.boxes, 'conf'):
                                confidence_scores = result.boxes.conf.cpu().numpy().tolist()
                            if hasattr(result.boxes, 'xyxy'):
                                boxes = result.boxes.xyxy.cpu().numpy()

                        # Process each mask
                        for idx, mask in enumerate(masks):
                            np.random.seed(object_counter * 42)
                            color = np.random.randint(50, 255, 3).tolist()

                            # Resize mask back to original resolution for correct alignment
                            mask_uint8 = (mask * 255).astype(np.uint8)
                            mask_resized = cv2.resize(mask_uint8, (width, height),
                                                     interpolation=cv2.INTER_NEAREST)
                            mask_bool = mask_resized > 127

                            y_indices, x_indices = np.where(mask_bool)

                            bbox = None
                            if len(y_indices) > 0 and len(x_indices) > 0:
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

                            if boxes is not None and idx < len(boxes):
                                box = boxes[idx]
                                # Scale box coordinates back to original resolution
                                scale_x = width / frame_rgb.shape[1]
                                scale_y = height / frame_rgb.shape[0]
                                bbox = {
                                    'x_min': int(box[0] * scale_x),
                                    'y_min': int(box[1] * scale_y),
                                    'x_max': int(box[2] * scale_x),
                                    'y_max': int(box[3] * scale_y),
                                    'width': int((box[2] - box[0]) * scale_x),
                                    'height': int((box[3] - box[1]) * scale_y)
                                }

                            label = f"object #{idx + 1}"
                            if len(prompts) > 0:
                                prompt_idx = idx % len(prompts)
                                label = f"{prompts[prompt_idx]} #{idx + 1}"

                            obj_data = {
                                'id': object_counter,
                                'label': label,
                                'color': color,
                                'mask': mask_bool.tolist(),
                                'bbox': bbox,
                                'confidence': confidence_scores[idx] if idx < len(confidence_scores) else None,
                                'area': int(mask_bool.sum())
                            }

                            detected_objects.append(obj_data)
                            object_counter += 1

                    # Prepare result
                    result_data = {
                        'frame_number': frame_number,
                        'timestamp': timestamp,
                        'objects': detected_objects,
                        'objects_detected': len(detected_objects),
                        'progress': (processed_count + 1) / estimated_frames
                    }

                    # Yield result immediately
                    yield result_data

                    processed_count += 1

                    # Explicit memory cleanup every 10 frames to prevent memory buildup
                    if processed_count % 10 == 0:
                        gc.collect()

                frame_number += 1

            # Log processing summary
            print(f"📊 Processing Summary:")
            print(f"   Total frames in video: {frame_number}")
            print(f"   Frames processed: {processed_count}")
            print(f"   Actual processing rate: {processed_count / (frame_number / video_fps if frame_number > 0 else 1):.2f} FPS")

        finally:
            cap.release()
            # Final memory cleanup
            gc.collect()

    def get_frame_as_jpeg(self, video_path, frame_number):
        """
        Extract a single frame from the video and return as JPEG bytes.

        Args:
            video_path (str): Path to video file
            frame_number (int): Frame index to extract

        Returns:
            bytes: JPEG image bytes
        """
        import io
        from PIL import Image

        cap = cv2.VideoCapture(video_path)
        try:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()
            if not ret:
                raise ValueError(f"Could not read frame {frame_number}")
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(frame_rgb)
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=85)
            buf.seek(0)
            return buf.getvalue()
        finally:
            cap.release()

    def track_object(self, video_path, start_frame, bbox, confidence=0.25, quality_scale=50):
        """
        Track a specific object from start_frame through the end of the video.

        Uses bbox propagation: detect with box prompt on each frame using SAM3,
        then update bbox to the detected object's bbox for the next frame.

        Args:
            video_path (str): Path to video file
            start_frame (int): Frame number where the object is selected
            bbox (list): [x_min, y_min, x_max, y_max] bounding box on the object
            confidence (float): Detection confidence threshold
            quality_scale (int): Quality percentage (5-100)

        Yields:
            dict: Per-frame tracking result with progress
        """
        from ultralytics.models.sam import SAM3SemanticPredictor

        video_info = self.get_video_info(video_path)
        total_frames = video_info['frame_count']
        video_fps = video_info['fps']
        width = video_info['resolution']['width']
        height = video_info['resolution']['height']

        # Map quality to imgsz
        quality_to_imgsz = {5: 160, 10: 224, 25: 320, 50: 480, 75: 640, 100: 800}
        imgsz = quality_to_imgsz.get(quality_scale, 480)

        frames_to_process = total_frames - start_frame
        if frames_to_process <= 0:
            return

        print(f"🎯 Object Tracker: starting at frame {start_frame}, bbox={bbox}")
        print(f"   Processing {frames_to_process} frames, imgsz={imgsz}px")

        # Initialize SAM3 predictor once
        predictor = SAM3SemanticPredictor(
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

        # Track current bbox (propagates across frames)
        current_bbox = list(bbox)  # [x_min, y_min, x_max, y_max]

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")

        try:
            cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
            processed_count = 0

            for frame_idx in range(start_frame, total_frames):
                ret, frame_bgr = cap.read()
                if not ret:
                    break

                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

                # Resize for quality
                if quality_scale < 100:
                    new_w = int(width * quality_scale / 100)
                    new_h = int(height * quality_scale / 100)
                    frame_rgb_resized = cv2.resize(frame_rgb, (new_w, new_h))
                    scale_x = new_w / width
                    scale_y = new_h / height
                    scaled_bbox = [
                        current_bbox[0] * scale_x,
                        current_bbox[1] * scale_y,
                        current_bbox[2] * scale_x,
                        current_bbox[3] * scale_y
                    ]
                else:
                    frame_rgb_resized = frame_rgb
                    scale_x = scale_y = 1.0
                    scaled_bbox = list(current_bbox)

                timestamp = frame_idx / video_fps if video_fps > 0 else 0

                # Run SAM3 with current bbox as prompt
                predictor.set_image(frame_rgb_resized)
                try:
                    results = predictor(bboxes=[scaled_bbox])
                except Exception:
                    # Fallback: try with points at bbox center
                    cx = (scaled_bbox[0] + scaled_bbox[2]) / 2
                    cy = (scaled_bbox[1] + scaled_bbox[3]) / 2
                    results = predictor(points=[[cx, cy]], labels=[1])

                result = results[0] if results and len(results) > 0 else None

                obj_data = None
                if result is not None and result.masks is not None:
                    masks = result.masks.data.cpu().numpy()
                    if len(masks) > 0:
                        # Take the first (highest confidence) mask
                        mask = masks[0]
                        mask_uint8 = (mask * 255).astype(np.uint8)
                        mask_resized = cv2.resize(mask_uint8, (width, height),
                                                  interpolation=cv2.INTER_NEAREST)
                        mask_bool = mask_resized > 127

                        y_indices, x_indices = np.where(mask_bool)
                        if len(y_indices) > 0 and len(x_indices) > 0:
                            x_min = int(x_indices.min())
                            x_max = int(x_indices.max())
                            y_min = int(y_indices.min())
                            y_max = int(y_indices.max())
                            detected_bbox = {
                                'x_min': x_min, 'y_min': y_min,
                                'x_max': x_max, 'y_max': y_max,
                                'width': x_max - x_min, 'height': y_max - y_min
                            }
                            # Update tracking bbox for next frame
                            current_bbox = [x_min, y_min, x_max, y_max]

                            confidence_val = None
                            if hasattr(result, 'boxes') and result.boxes is not None:
                                if hasattr(result.boxes, 'conf') and len(result.boxes.conf) > 0:
                                    confidence_val = float(result.boxes.conf[0].cpu().numpy())

                            np.random.seed(42)
                            color = [255, 165, 0]  # Orange for tracked object

                            obj_data = {
                                'id': 0,
                                'label': 'tracked object',
                                'color': color,
                                'mask': mask_bool.tolist(),
                                'bbox': detected_bbox,
                                'confidence': confidence_val,
                                'area': int(mask_bool.sum())
                            }

                yield {
                    'frame_number': frame_idx,
                    'timestamp': timestamp,
                    'object': obj_data,
                    'found': obj_data is not None,
                    'progress': (processed_count + 1) / frames_to_process
                }

                processed_count += 1

                if processed_count % 10 == 0:
                    gc.collect()

        finally:
            cap.release()
            gc.collect()

    def cleanup_video(self, video_path):
        """
        Delete temporary video file.

        Args:
            video_path (str): Path to video file
        """
        try:
            if os.path.exists(video_path):
                os.remove(video_path)
                print(f"✅ Deleted temporary video: {video_path}")
        except Exception as e:
            print(f"⚠️ Failed to delete video: {e}")
