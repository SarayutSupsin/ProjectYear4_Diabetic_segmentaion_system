import cv2
import numpy as np
from app.core.config import settings

def warp_image_and_mask(img, mask, qr_polygon):

    qr_size_cm = settings.QR_SIZE_CM
    target_px_per_cm = settings.TARGET_PX_PER_CM
    max_warped_dim = settings.MAX_WARPED_DIM

    pts = np.array(qr_polygon, dtype="float32")
    # 1. Sort the four corner coordinates using X-sort and Y-sort criteria.
    x_sorted = pts[np.argsort(pts[:, 0]), :]
    left_most = x_sorted[:2, :]
    right_most = x_sorted[2:, :]

    left_most = left_most[np.argsort(left_most[:, 1]), :]
    (tl, bl) = left_most

    right_most = right_most[np.argsort(right_most[:, 1]), :]
    (tr, br) = right_most

    # Well-organized origin coordinates
    src_pts = np.array([tl, tr, br, bl], dtype="float32")

    # 2. Set the standard destination coordinates for the sticker (1 cm always equals 100 pixels).
    qr_side_px = qr_size_cm * target_px_per_cm
    dst_pts_ref = np.array([
        [0.0, 0.0],
        [qr_side_px, 0.0],
        [qr_side_px, qr_side_px],
        [0.0, qr_side_px]
    ], dtype="float32")

    # Basic Homography Matrix Estimation
    H = cv2.getPerspectiveTransform(src_pts, dst_pts_ref)

    # 3. Adjust the plane to ensure that other parts of the image do not get cut off outside the frame.
    h, w = img.shape[:2]
    img_corners = np.array([
        [0, 0],
        [w - 1, 0],
        [w - 1, h - 1],
        [0, h - 1]
    ], dtype="float32").reshape(-1, 1 ,2)

    warped_corners = cv2.perspectiveTransform(img_corners, H)
    x_coords = warped_corners[:, 0, 0]
    y_coords = warped_corners[:, 0, 1]
    
    min_x, max_x = np.min(x_coords), np.max(x_coords)
    min_y, max_y = np.min(y_coords), np.max(y_coords)

    warped_w = int(np.ceil(max_x - min_x))
    warped_h = int(np.ceil(max_y - min_y))

    # Handling extreme camera tilt cases
    if warped_w > max_warped_dim or warped_h > max_warped_dim:
        raise ValueError(
            f"มุมกล้องถ่ายภาพเอียงเฉียงมากเกินไป (ระนาบกว้าง {warped_w}x{warped_h} px) "
            f"เกินขีดจำกัดความปลอดภัยของเซิร์ฟเวอร์ ({max_warped_dim} px) กรุณาถือกล้องให้ขนานและตั้งฉากมากขึ้น"
        )
    
    # Translation matrix for shifting overflowing image edges in the negative direction
    translation_matrix = np.array([
        [1, 0, -min_x],
        [0, 1, -min_y],
        [0, 0, 1]
    ], dtype="float32")

    # Multiply the shift matrix by the planar warping matrix to obtain a straight-on view wide enough to cover the entire raw image.
    H_final = np.dot(translation_matrix, H)


    # Planar rectification processing for both the actual image and the wound mask image.
    warped_img = cv2.warpPerspective(img, H_final, (warped_w, warped_h))
    warped_mask = cv2.warpPerspective(mask, H_final, (warped_w, warped_h), flags=cv2.INTER_NEAREST)

    return warped_img, warped_mask, H_final

    

    
    

    