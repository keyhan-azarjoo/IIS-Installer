"""
SAM3 Mask Export Module

Exports detection results in multiple formats: PNG, JSON, COCO.
"""

import io
import json
import zipfile
import numpy as np
from PIL import Image


class MaskExporter:

    @staticmethod
    def export_single_mask_png(obj, image_np):
        """
        Export a single object mask as RGBA PNG with transparent background.

        Args:
            obj (dict): Object data with 'mask' (2D bool list) and 'color' ([r,g,b])
            image_np (np.array): Original image as numpy array (H, W, 3)

        Returns:
            bytes: PNG file bytes
        """
        mask = np.array(obj['mask'], dtype=bool)
        h, w = mask.shape

        # RGBA image: original pixels where mask is True, transparent elsewhere
        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[mask, :3] = image_np[mask]
        rgba[mask, 3] = 255  # fully opaque where mask

        img = Image.fromarray(rgba, 'RGBA')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return buf.getvalue()

    @staticmethod
    def export_all_masks_zip(objects, image_np):
        """
        Export all object masks as a ZIP of PNG files.

        Args:
            objects (list): List of object dicts
            image_np (np.array): Original image

        Returns:
            bytes: ZIP file bytes
        """
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for obj in objects:
                png_bytes = MaskExporter.export_single_mask_png(obj, image_np)
                label = obj.get('label', f"object_{obj['id']}").replace(' ', '_').replace('#', '')
                zf.writestr(f"{label}.png", png_bytes)
        buf.seek(0)
        return buf.getvalue()

    @staticmethod
    def export_json(detection_results):
        """
        Export detection results as structured JSON.

        Args:
            detection_results (dict): Results from detector.detect()

        Returns:
            bytes: JSON file bytes
        """
        export_data = {
            'image_size': detection_results.get('image_size'),
            'objects_detected': detection_results.get('objects_detected'),
            'processing_time': detection_results.get('processing_time'),
            'objects': []
        }

        for obj in detection_results.get('objects', []):
            obj_export = {
                'id': obj['id'],
                'label': obj['label'],
                'color': obj['color'],
                'bbox': obj.get('bbox'),
                'confidence': obj.get('confidence'),
                'area': obj.get('area')
                # mask excluded (too large for JSON export)
            }
            export_data['objects'].append(obj_export)

        json_bytes = json.dumps(export_data, indent=2).encode('utf-8')
        return json_bytes

    @staticmethod
    def export_coco(detection_results, image_id=1, image_filename="image.jpg"):
        """
        Export detection results in COCO annotation format.

        Args:
            detection_results (dict): Results from detector.detect()
            image_id (int): Image ID for COCO format
            image_filename (str): Image filename for COCO format

        Returns:
            bytes: COCO JSON file bytes
        """
        image_size = detection_results.get('image_size', {})
        width = image_size.get('width', 0)
        height = image_size.get('height', 0)

        coco_data = {
            'info': {'description': 'SAM3 Detection Results', 'version': '1.0'},
            'images': [{
                'id': image_id,
                'file_name': image_filename,
                'width': width,
                'height': height
            }],
            'annotations': [],
            'categories': []
        }

        category_map = {}
        cat_id = 1

        for obj in detection_results.get('objects', []):
            label = obj.get('label', 'object')
            # Extract base label (remove # number)
            base_label = label.rsplit(' #', 1)[0].strip()

            if base_label not in category_map:
                category_map[base_label] = cat_id
                coco_data['categories'].append({'id': cat_id, 'name': base_label})
                cat_id += 1

            bbox = obj.get('bbox')
            coco_bbox = None
            area = obj.get('area', 0)

            if bbox:
                coco_bbox = [bbox['x_min'], bbox['y_min'], bbox['width'], bbox['height']]

            # Build RLE-style segmentation from mask
            segmentation = []
            if obj.get('mask'):
                mask = np.array(obj['mask'], dtype=np.uint8)
                # Simple polygon approximation: use bbox corners as segmentation
                if bbox:
                    x1, y1, x2, y2 = bbox['x_min'], bbox['y_min'], bbox['x_max'], bbox['y_max']
                    segmentation = [[x1, y1, x2, y1, x2, y2, x1, y2]]

            annotation = {
                'id': obj['id'] + 1,
                'image_id': image_id,
                'category_id': category_map[base_label],
                'segmentation': segmentation,
                'area': area,
                'bbox': coco_bbox,
                'iscrowd': 0,
                'score': obj.get('confidence')
            }
            coco_data['annotations'].append(annotation)

        json_bytes = json.dumps(coco_data, indent=2).encode('utf-8')
        return json_bytes
