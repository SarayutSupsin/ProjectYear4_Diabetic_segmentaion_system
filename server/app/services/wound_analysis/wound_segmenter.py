import torch 
import torchvision.transforms as transforms
from PIL import Image
import cv2
import numpy as np
import segmentation_models_pytorch as smp
from app.core.config import settings

# System variable to cache the model in RAM, preventing redundant file loading.
_model_cache = {}

def get_segmenation_model(model_path: str, device: str):
    if model_path in _model_cache:
        return _model_cache[model_path]

    model = smp.Unet(
        encoder_name="efficientnet-b4",
        encoder_weights=None,
        in_channels=3,
        classes=1,
        activation=None,
    )
    # Load model weight parameters
    state_dict = torch.load(model_path, map_location=device)
    keys_to_remove = [k for k in state_dict.keys() if 'num_batches_tracked' in k]
    for k in keys_to_remove:
        del state_dict[k]

    model.load_state_dict(state_dict, strict=False)
    model.to(device)
    model.eval()
    
    # Save to RAM disk
    _model_cache[model_path] = model
    return model

def segment_wound(img):
    model_path = settings.MODEL_PATH
    device = settings.DEVICE
    threshold = settings.THRESHOLD

    h, w = img.shape[:2]

    # 1. Prepare image data (BGR -> RGB -> Resize -> Normalize)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_pil = Image.fromarray(img_rgb)

    transform = transforms.Compose([
        transforms.Resize((512, 512)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                            std=[0.229, 0.224, 0.225])
    ])

    img_tensor = transform(img_pil).unsqueeze(0).to(device)
    
    # Retrieve the model from the Singleton allocation system
    model = get_segmenation_model(model_path, device)

    # 2. Start model inference 
    with torch.no_grad():
        logits = model(img_tensor)
        prob = torch.sigmoid(logits)
        prob_np = prob.squeeze().cpu().numpy()

    # Resize probability map back to original size for smooth edges
    prob_resized = cv2.resize(prob_np, (w, h), interpolation=cv2.INTER_LINEAR) 
    mask = (prob_resized > threshold).astype(np.uint8) * 255 
    pixel_area = int(np.sum(mask > 0))

    # 3. Calculate average probability of the predicted wound area (model confidence score)
    wound_pixels_prob = prob_np[prob_np > threshold]
    confidence = float(np.mean(wound_pixels_prob)) if len(wound_pixels_prob) > 0 else 0.0

    return{
        "pixel_area": pixel_area,
        "mask": mask,
        "confidence": confidence
    }