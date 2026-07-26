import cv2
from pyzbar import pyzbar
import numpy as np
from app.core.config import settings

def detect_qr(img):
    qr_size_cm = settings.QR_SIZE_CM

    h_orig, w_orig = img.shape[:2]
    polygon = None
    
    # Check Level 1: pyzbar on the full-size image.
    qr_list = pyzbar.decode(img)
    if qr_list and len(qr_list[0].polygon) == 4:
        polygon = [[p.x, p.y] for p in qr_list[0].polygon]
    else:
        # Check Level 2: Reduce image size by half 50%.
        img_resized = cv2.resize(img, (w_orig // 2, h_orig // 2))
        qr_list_resized = pyzbar.decode(img_resized)
        if qr_list_resized and len(qr_list_resized[0].polygon) == 4:
            polygon = [[p.x * 2, p.y * 2] for p in qr_list_resized[0].polygon]
        else:
            # Check Level 3: OpenCV QRCodeDetector fallback
            detector = cv2.QRCodeDetector()
            val, pts, _ = detector.detectAndDecode(img)
            if pts is not None and len(pts) > 0:
                pts_sq = np.squeeze(pts)
                if len(pts_sq) == 4:
                    polygon = [[float(p[0]), float(p[1])] for p in pts_sq]
            
    if polygon is None or len(polygon) != 4:
        return None

    pts = np.array(polygon, dtype=np.float32)
    qr_area_px = float(cv2.contourArea(pts))

    # Calculate the average length of all four sides to determine the px_per_cm scale factor.
    side_lengths = [np.linalg.norm(pts[i] - pts[(i + 1) % 4]) for i in range (4)]
    avg_side_px = float(np.mean(side_lengths))

    px_per_cm = avg_side_px / qr_size_cm

    return{
        "px_per_cm": px_per_cm,
        "qr_area_px": qr_area_px,
        "polygon": polygon
    }    

