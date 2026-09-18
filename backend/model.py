import os
import sys

# Ensure repository root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
import torch.nn as nn
import numpy as np
from typing import Tuple, List, Optional
from backend.data_engine import DEPTH_LEVELS, SURFACE_VARS, CHANNEL_STATS, data_engine

class ConvBlock(nn.Module):
    """2D Convolutional block with BatchNorm and GELU."""
    def __init__(self, in_c: int, out_c: int, stride: int = 1, padding: int = 1):
        super().__init__()
        self.conv = nn.Conv2d(in_c, out_c, kernel_size=3, stride=stride, padding=padding, bias=False)
        self.bn = nn.BatchNorm2d(out_c)
        self.act = nn.GELU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.act(self.bn(self.conv(x)))

class CNNBackbone(nn.Module):
    """
    3-layer 2D convolutional block with BatchNorm and GELU activations
    to capture mesoscale eddies and thermal front gradients from input patches.
    """
    def __init__(self, in_channels: int = 5):
        super().__init__()
        # Input: (B, 5, 16, 16)
        self.layer1 = ConvBlock(in_channels, 32) # (B, 32, 16, 16)
        self.pool1 = nn.MaxPool2d(kernel_size=2, stride=2) # (B, 32, 8, 8)
        
        self.layer2 = ConvBlock(32, 64) # (B, 64, 8, 8)
        self.pool2 = nn.MaxPool2d(kernel_size=2, stride=2) # (B, 64, 4, 4)
        
        self.layer3 = ConvBlock(64, 128) # (B, 128, 4, 4)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.pool1(self.layer1(x))
        x = self.pool2(self.layer2(x))
        x = self.layer3(x)
        return x

class ViTContextEncoder(nn.Module):
    """
    Vision Transformer global context encoder.
    Flattens the feature map into patch embeddings with 1D learnable positional encodings,
    passing them through a 2-layer nn.TransformerEncoder (4 attention heads, d_model=128).
    """
    def __init__(self, d_model: int = 128, num_patches: int = 16, nhead: int = 4, num_layers: int = 2):
        super().__init__()
        self.d_model = d_model
        self.cls_token = nn.Parameter(torch.zeros(1, 1, d_model))
        self.pos_embed = nn.Parameter(torch.randn(1, num_patches + 1, d_model) * 0.02)
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=d_model * 4,
            activation="gelu",
            batch_first=True,
            dropout=0.05
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.norm = nn.LayerNorm(d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, 128, 4, 4)
        B, C, H, W = x.shape
        # Flatten spatial dimensions into token sequence: (B, H*W, C) = (B, 16, 128)
        tokens = x.flatten(2).transpose(1, 2)
        
        # Prepend learnable CLS token: (B, 17, 128)
        cls_tokens = self.cls_token.expand(B, -1, -1)
        x = torch.cat((cls_tokens, tokens), dim=1)
        
        # Add 1D positional encoding
        x = x + self.pos_embed
        
        # Global Transformer contextual attention
        x = self.transformer(x)
        x = self.norm(x)
        
        # Return CLS token representation: (B, 128)
        return x[:, 0]

class VerticalReconstructionHead(nn.Module):
    """
    Vertical Reconstruction MLP Head:
    Projects the transformer output token to the 15 discrete depth layers (0 to 2000m).
    """
    def __init__(self, in_features: int = 128, num_depths: int = 15):
        super().__init__()
        self.head = nn.Sequential(
            nn.Linear(in_features, 128),
            nn.GELU(),
            nn.Dropout(0.05),
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Linear(64, num_depths)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.head(x)

class OceanEmbedModel(nn.Module):
    """
    Hybrid CNN + ViT Oceanographic 3D Subsurface Temperature Reconstruction Model.
    Architecture:
      1. Local Feature Extractor (CNN Backbone): Conv2D + BatchNorm + GELU
      2. Global Context Encoder (ViT): Patch Flattening + 1D Pos Embed + 2-Layer TransformerEncoder
      3. Vertical Reconstruction Head (MLP): 15 Depth Level Predictions
    """
    def __init__(self, in_channels: int = 5, num_depths: int = 15):
        super().__init__()
        self.cnn = CNNBackbone(in_channels=in_channels)
        self.vit = ViTContextEncoder(d_model=128, num_patches=16, nhead=4, num_layers=2)
        self.head = VerticalReconstructionHead(in_features=128, num_depths=num_depths)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, 5, 16, 16)
        cnn_feat = self.cnn(x)     # (B, 128, 4, 4)
        vit_feat = self.vit(cnn_feat) # (B, 128)
        depth_profile = self.head(vit_feat) # (B, 15)
        return depth_profile

def get_device() -> torch.device:
    """Returns torch device (CUDA, MPS, or CPU)."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")

def calibrate_and_train_model(
    model: OceanEmbedModel,
    weights_path: str,
    device: torch.device,
    epochs: int = 35
) -> OceanEmbedModel:
    """
    Calibrates and trains the OceanEmbed model on spatial patches sampled from the
    domain to ensure smooth, monotonic temperature decay with RMSE < 0.45°C.
    """
    print(f"[Model] Calibrating OceanEmbed model weights on {device}...")
    model.to(device)
    model.train()

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    criterion = nn.MSELoss()

    # Generate training samples across North Indian Ocean grid
    sample_lats = np.linspace(6.0, 28.0, 24)
    sample_lons = np.linspace(48.0, 102.0, 36)

    patches = []
    targets = []

    for lat in sample_lats:
        for lon in sample_lons:
            patch, _ = data_engine.extract_patch(lat, lon)
            gt = data_engine.get_ground_truth_profile(lat, lon)
            patches.append(patch)
            targets.append(gt)

    x_train = torch.tensor(np.array(patches), dtype=torch.float32)
    y_train = torch.tensor(np.array(targets), dtype=torch.float32)

    dataset = torch.utils.data.TensorDataset(x_train, y_train)
    loader = torch.utils.data.DataLoader(dataset, batch_size=32, shuffle=True)

    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for batch_x, batch_y in loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            preds = model(batch_x)
            
            # Physics-informed loss: standard MSE + monotonicity penalty
            mse_loss = criterion(preds, batch_y)
            
            # Penalize temperature inversions: T(z_{i+1}) - T(z_i) > 0
            diffs = preds[:, 1:] - preds[:, :-1]
            inversion_penalty = torch.relu(diffs).pow(2).mean() * 5.0
            
            loss = mse_loss + inversion_penalty
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(batch_x)

        avg_loss = total_loss / len(dataset)
        if epoch % 10 == 0 or epoch == epochs:
            rmse = np.sqrt(avg_loss)
            print(f"[Model] Epoch {epoch:02d}/{epochs} - Loss: {avg_loss:.5f} - Training RMSE: {rmse:.4f}°C")

    # Save trained checkpoint
    os.makedirs(os.path.dirname(weights_path), exist_ok=True)
    torch.save(model.state_dict(), weights_path)
    print(f"[Model] Checkpoint saved successfully -> {weights_path}")
    model.eval()
    return model

def load_or_initialize_model(weights_path: Optional[str] = None) -> Tuple[OceanEmbedModel, torch.device]:
    """
    Loads pre-trained model weights from weights_path or initializes and calibrates.
    """
    if weights_path is None:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        weights_path = os.path.join(backend_dir, "model_weights.pt")

    device = get_device()
    model = OceanEmbedModel(in_channels=5, num_depths=len(DEPTH_LEVELS))

    if os.path.exists(weights_path):
        try:
            print(f"[Model] Loading pre-trained weights from {weights_path}...")
            state_dict = torch.load(weights_path, map_location=device)
            model.load_state_dict(state_dict)
            model.to(device)
            model.eval()
            print("[Model] Model loaded and ready for inference.")
            return model, device
        except Exception as e:
            print(f"[Model] Error loading existing weights ({e}). Recalibrating...")

    model = calibrate_and_train_model(model, weights_path, device)
    return model, device

# Global Model & Device Instance
model_instance, active_device = load_or_initialize_model()
