import torch
import torch.nn as nn

class ViTPath(nn.Module):
    """
    Vision Transformer backbone for extracting global contextual features.
    
    Args:
        in_channels (int): Number of input parameter channels
        img_size (int): Spatial dimension of input (e.g., 64)
        patch_size (int): Size of patches (e.g., 16)
        embed_dim (int): Embedding dimension inside the transformer
        num_heads (int): Number of attention heads
        num_layers (int): Number of transformer layers
    """
    def __init__(self, in_channels=7, img_size=64, patch_size=16, embed_dim=256, num_heads=8, num_layers=4):
        super().__init__()
        self.patch_size = patch_size
        num_patches = (img_size // patch_size) ** 2
        patch_dim = in_channels * patch_size * patch_size
        
        self.patch_embed = nn.Linear(patch_dim, embed_dim)
        self.cls_token = nn.Parameter(torch.randn(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.randn(1, num_patches + 1, embed_dim))
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, 
            nhead=num_heads, 
            dim_feedforward=embed_dim * 4, 
            activation="gelu", 
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
    def forward(self, x):
        B, C, H, W = x.shape
        P = self.patch_size
        
        # Patchify
        # x: [B, C, H, W] -> [B, C, H//P, P, W//P, P]
        x = x.unfold(2, P, P).unfold(3, P, P)
        
        # x: [B, C, H//P * W//P, P, P]
        x = x.contiguous().view(B, C, -1, P, P)
        
        # x: [B, NumPatches, C, P, P] -> [B, NumPatches, PatchDim]
        x = x.permute(0, 2, 1, 3, 4).contiguous().view(B, -1, C * P * P)
        
        x = self.patch_embed(x)
        
        # Add classification token
        cls_tokens = self.cls_token.expand(B, -1, -1)
        x = torch.cat((cls_tokens, x), dim=1)
        
        # Add positional embedding
        x = x + self.pos_embed
        
        # Apply Transformer
        x = self.transformer(x)
        
        # Return cls_token representation
        return x[:, 0]
