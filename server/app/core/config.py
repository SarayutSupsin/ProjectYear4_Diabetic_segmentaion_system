from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Deep Learning-Based System for Segmentation and Monitoring of Diabetic Foot Ulcer"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str


    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    MODEL_PATH: str = os.path.join(BASE_DIR, "weights", "unet_efficientnet_b4_dfu.pth")
    STATIC_DIR: str = os.path.join(BASE_DIR, "static", "wounds")
    
    #DFU Scale Parameters
    QR_SIZE_CM: float = 2.0
    TARGET_PX_PER_CM: float = 100.0 # 1 cm = 100 px
    MAX_WARPED_DIM: int = 5000
    THRESHOLD: float = 0.5

    @property
    def DEVICE(self) -> str:
        import torch
        return "cuda" if torch.cuda.is_available() else "cpu"

    #Database models
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    

settings = Settings()
