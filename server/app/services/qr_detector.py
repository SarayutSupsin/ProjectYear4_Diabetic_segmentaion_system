from alembic import operations
import cv2
from pyzbar import pyzbar
import numpy as np

def detect_qr(image, qr_size_cm=2.0):
    if image is None: return None

    qr_list = pyzbar.decode(image)
    if not qr_list or len(qr_list[0].polygon) != 4:
        return None

    qr = qr_list[0]
    #Extract the (X, Y) coordinates for all four corners of the QR code.
    polygon = np.array(polygon, dtype=np.float32)

    # (Shoelace Formula)
    # Calculate the total planar pixel area of ​​the QR Code, disregarding planar tilt.
    qr_area_px = float(cv2.contourArea(pts))
    # Calculate the average width of the QR code across all four sides to determine the average camera distance.
    side_lengths = [np.linalg.norm(pts[i] - pts[(i + 1) % 4]) for i in range(4)]
    # Pixel scale per 1 cm = average pixel width divided by the actual size of the QR code (2 cm).
    px_per_cm = float(np.mean(side_lengths)) / qr_size_cm

    return{
        "px_per_cm": px_per_cm, # Pixel density per centimeter
        "polygon": polygon # Coordinates of the four vertices of QR on the raw image plane

    }
    