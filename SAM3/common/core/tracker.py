"""
Position tracking and closeness estimation for detected objects.

All calculations are pure functions — no web/Flask dependencies.
Pass bounding boxes and image dimensions, get position data back.
"""

import cv2
import numpy as np


def extract_mask_contour(mask, simplify=0.01):
    """
    Extract a simplified polygon outline from a binary mask.

    Args:
        mask: numpy array (H, W), values > 0.5 treated as foreground.
        simplify (float): Approximation tolerance as a fraction of the
            contour perimeter.  Smaller = more points, closer to the
            real shape.  0 = no simplification.

    Returns:
        list[list[int]]: List of [x, y] points forming the polygon,
        or empty list if no contour found.
    """
    mask_uint8 = (mask > 0.5).astype(np.uint8)
    contours, _ = cv2.findContours(
        mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    if not contours:
        return []

    # Use the largest contour (in case of multiple fragments)
    largest = max(contours, key=cv2.contourArea)
    if simplify > 0:
        epsilon = simplify * cv2.arcLength(largest, True)
        largest = cv2.approxPolyDP(largest, epsilon, True)

    return largest.reshape(-1, 2).tolist()


def compute_closeness(bbox, img_width, img_height):
    """
    Estimate how close an object is based on its bounding box size
    relative to the full frame.

    Args:
        bbox (dict): Bounding box with keys 'width' and 'height'
                     (or 'x_min', 'y_min', 'x_max', 'y_max').
        img_width (int): Frame width in pixels.
        img_height (int): Frame height in pixels.

    Returns:
        float: Closeness percentage (0–100). Larger bbox = higher %.
    """
    w = bbox.get('width') or (bbox['x_max'] - bbox['x_min'])
    h = bbox.get('height') or (bbox['y_max'] - bbox['y_min'])
    frame_area = img_width * img_height
    if frame_area == 0:
        return 0.0
    return round(w * h / frame_area * 100, 1)


def compute_position_zone(bbox, img_width, img_height):
    """
    Compute a 3x3 zone label for an object.

    The frame is divided into a 3x3 grid:
        Up-Left   |   Up    | Up-Right
        Left      | Center  | Right
        Down-Left |  Down   | Down-Right

    Args:
        bbox (dict): Bounding box with 'x_min', 'y_min', 'x_max', 'y_max'.
        img_width (int): Frame width in pixels.
        img_height (int): Frame height in pixels.

    Returns:
        str: Zone label, e.g. "Up-Left", "Center", "Down".
    """
    cx = (bbox['x_min'] + bbox['x_max']) / 2
    cy = (bbox['y_min'] + bbox['y_max']) / 2

    if cx < img_width / 3:
        col = "Left"
    elif cx < 2 * img_width / 3:
        col = ""
    else:
        col = "Right"

    if cy < img_height / 3:
        row = "Up"
    elif cy < 2 * img_height / 3:
        row = ""
    else:
        row = "Down"

    if row and col:
        return f"{row}-{col}"
    elif row:
        return row
    elif col:
        return col
    return "Center"


def compute_position_pct(bbox, img_width, img_height):
    """
    Compute percentage displacement from the frame center.

    At the exact center all values are 0%.
    At the far left edge, left=100% right=0%.
    At the bottom-right corner, right=100% down=100%.

    Args:
        bbox (dict): Bounding box with 'x_min', 'y_min', 'x_max', 'y_max'.
        img_width (int): Frame width in pixels.
        img_height (int): Frame height in pixels.

    Returns:
        dict: {'left': int, 'right': int, 'up': int, 'down': int}
              Each value 0–100.
    """
    cx = (bbox['x_min'] + bbox['x_max']) / 2
    cy = (bbox['y_min'] + bbox['y_max']) / 2

    half_w = img_width / 2
    half_h = img_height / 2

    return {
        'left':  round(max(0, (half_w - cx) / half_w * 100)) if half_w else 0,
        'right': round(max(0, (cx - half_w) / half_w * 100)) if half_w else 0,
        'up':    round(max(0, (half_h - cy) / half_h * 100)) if half_h else 0,
        'down':  round(max(0, (cy - half_h) / half_h * 100)) if half_h else 0,
    }


def add_tracking(objects, img_width, img_height, grid_mode="3"):
    """
    Enrich a list of detected objects with position and closeness data.

    This is a convenience wrapper that calls compute_position_zone or
    compute_position_pct plus compute_closeness for every object that
    has a bounding box.

    Args:
        objects (list[dict]): Detection results. Each dict must have a
            'bbox' key with 'x_min', 'y_min', 'x_max', 'y_max'
            (and optionally 'width', 'height').
        img_width (int): Frame width in pixels.
        img_height (int): Frame height in pixels.
        grid_mode (str): "3" for zone labels, "10" or "20" for
                         percentage displacement from center.

    Returns:
        list[dict]: Same objects list, with 'position' and 'closeness'
                    fields added to each object that has a bbox.
    """
    for obj in objects:
        bbox = obj.get('bbox')
        if not bbox:
            continue

        obj['closeness'] = compute_closeness(bbox, img_width, img_height)

        if grid_mode == "3":
            obj['position'] = compute_position_zone(bbox, img_width, img_height)
        else:
            obj['position'] = compute_position_pct(bbox, img_width, img_height)

    return objects


def _bbox_center(bbox):
    """Return (cx, cy) for a bbox dict."""
    return (
        (bbox['x_min'] + bbox['x_max']) / 2,
        (bbox['y_min'] + bbox['y_max']) / 2,
    )


def match_tracked_object(objects, target_center, img_width, img_height,
                         grid_mode="3", max_distance=None):
    """
    Find the detected object closest to a previously-tracked position
    and enrich it with position/closeness data.

    Args:
        objects (list[dict]): Detection results with 'bbox' keys.
        target_center (dict): {'x': float, 'y': float} — the bbox center
            from the previous frame.
        img_width (int): Frame width in pixels.
        img_height (int): Frame height in pixels.
        grid_mode (str): "3" for zone labels, "10"/"20" for percentages.
        max_distance (float|None): Maximum pixel distance for a valid
            match.  ``None`` means always return the closest object.

    Returns:
        dict|None: A dict with the matched object's data plus a
        'center' key ``{'x': float, 'y': float}`` for the next frame,
        or ``None`` if no object matched.
    """
    if not objects:
        return None

    tx = target_center['x']
    ty = target_center['y']

    best = None
    best_dist = float('inf')

    for obj in objects:
        bbox = obj.get('bbox')
        if not bbox:
            continue
        cx, cy = _bbox_center(bbox)
        dist = ((cx - tx) ** 2 + (cy - ty) ** 2) ** 0.5
        if dist < best_dist:
            best_dist = dist
            best = obj

    if best is None:
        return None
    if max_distance is not None and best_dist > max_distance:
        return None

    # Enrich the matched object with tracking data
    bbox = best['bbox']
    cx, cy = _bbox_center(bbox)

    result = {
        'id': best.get('id'),
        'label': best.get('label'),
        'confidence': best.get('confidence'),
        'bbox': bbox,
        'closeness': compute_closeness(bbox, img_width, img_height),
        'center': {'x': cx, 'y': cy},
    }

    if grid_mode == "3":
        result['position'] = compute_position_zone(bbox, img_width, img_height)
    else:
        result['position'] = compute_position_pct(bbox, img_width, img_height)

    return result
