"""
Utility functions for image processing and encoding.
"""

import io
import base64
from PIL import Image


def to_base64(img_array):
    """
    Convert numpy array image to base64 string for web display.

    Args:
        img_array: Numpy array representing an image

    Returns:
        str: Base64 encoded string of the image
    """
    img = Image.fromarray(img_array.astype('uint8'))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()
