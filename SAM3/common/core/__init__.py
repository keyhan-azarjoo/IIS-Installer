"""
Core backend module for SAM3 object detection.

This module contains all the business logic and detection functions
separated from the web application layer.
"""

from .detector import SAM3Detector, get_best_device
from .utils import to_base64
from .tracker import (
    compute_closeness,
    compute_position_zone,
    compute_position_pct,
    add_tracking,
    match_tracked_object,
    extract_mask_contour,
)

__all__ = [
    'SAM3Detector', 'get_best_device', 'to_base64',
    'compute_closeness', 'compute_position_zone', 'compute_position_pct',
    'add_tracking', 'match_tracked_object', 'extract_mask_contour',
]
