from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "Deep Learning-Based System for Segmentation and Monitoring of Diabetic Foot Ulcer"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str
    MODEL_PATH: str = str(BASE_DIR / "weights" / "unet_efficientnet_b4_dfu.pth")
    STATIC_DIR: str = str(BASE_DIR / "static" / "wounds")
    
    #DFU Scale Parameters
    QR_SIZE_CM: float = 2.0
    TARGET_PX_PER_CM: float = 100.0 # 1 cm = 100 px
    MAX_WARPED_DIM: int = 5000 ## Maximum image width limit to prevent system RAM crashes due to homography warping
    THRESHOLD: float = 0.5

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # JWT Authentication
    SECRET_KEY: str 
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @property
    def DEVICE(self) -> str:
        import torch
        return "cuda" if torch.cuda.is_available() else "cpu"

    #Database models
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
settings = Settings()
