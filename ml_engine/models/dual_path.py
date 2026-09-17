import torch
import torch.nn as nn
from .cnn_backbone import OceanCNN
from .vit_backbone import ViTPath

class DualPathModel(nn.Module):
    """
    Dual Path model fusing local spatial features (CNN) and global context (ViT).
    
    Args:
        in_channels (int): Dynamically set based on the parameters downloaded (default: 7)
        num_depths (int): The number of target standard depth levels to reconstruct (default: 15)
    """
    def __init__(self, in_channels=7, num_depths=15):
        super().__init__()
        # 1. Spatial Feature Extraction (CNN)
        self.cnn = OceanCNN(in_channels=in_channels)
        
        # CNN outputs a feature map of shape [B, 256, 16, 16]
        # 2. Contextual Feature Extraction (ViT)
        self.vit = ViTPath(in_channels=256, img_size=16, patch_size=4, embed_dim=256)
        
        # 3. Output Head
        # ViT output: 256 (cls_token)
        self.fc = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(128, num_depths)
        )

    def forward(self, x):
        # 1. Spatial Processing (CNN)
        cnn_features = self.cnn(x)  # [B, 256, 16, 16]
        
        # 2. Contextual Processing (ViT)
        vit_features = self.vit(cnn_features)  # [B, 256]
        
        # 3. Final Output Prediction
        output = self.fc(vit_features)
        return output
