import boto3
from botocore.config import Config
import cv2
import numpy as np
import os
from app.core.config import settings

def get_r2_client():
    """
    Creates and returns a boto3 S3 client configured for Cloudflare R2.
    Returns None if credentials are missing.
    """
    if not (settings.R2_ENDPOINT_URL and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY):
        return None

    return boto3.client(
        service_name="s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto"
    )

def upload_image_to_r2(img: np.ndarray, folder: str, filename: str) -> str:
    """
    Uploads an OpenCV image array to Cloudflare R2 bucket.
    :param img: OpenCV image array (BGR)
    :param folder: Target folder ('original', 'mask', 'combined', 'warped')
    :param filename: Filename with extension (e.g. 'HN123_W001_20261006_original.jpg')
    :return: Full public URL of the uploaded image
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.png']:
        success, encoded = cv2.imencode('.png', img)
        content_type = 'image/png'
    else:
        success, encoded = cv2.imencode('.jpg', img)
        content_type = 'image/jpeg'

    if not success:
        raise ValueError(f"Failed to encode image {filename}")

    image_bytes = encoded.tobytes()
    object_key = f"{folder}/{filename}"

    client = get_r2_client()
    if client and settings.R2_BUCKET_NAME and settings.R2_PUBLIC_DEV_URL:
        client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=object_key,
            Body=image_bytes,
            ContentType=content_type
        )
        public_base = settings.R2_PUBLIC_DEV_URL.rstrip('/')
        return f"{public_base}/{object_key}"
    else:
        # Fallback to local storage if R2 client is unavailable
        target_dir = os.path.join(settings.STATIC_DIR, folder)
        os.makedirs(target_dir, exist_ok=True)
        local_path = os.path.join(target_dir, filename)
        with open(local_path, 'wb') as f:
            f.write(image_bytes)
        return f"static/wounds/{folder}/{filename}"
