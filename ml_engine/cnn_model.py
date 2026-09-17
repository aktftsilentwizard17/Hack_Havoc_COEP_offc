"""
Dual Path CNN + ViT Model Tester
================================

Instantiates the modular DualPathModel and runs a forward pass to ensure 
that the tensor shapes match the dynamically assigned input channels 
and the target depth bins.
"""

import torch
from models import DualPathModel

# Copernicus surface parameters (SST, SSS, SSH, U-cur, V-cur, U-wind, V-wind)
DEFAULT_CHANNELS = 7 

# Target standard depth levels for 3D reconstruction down to 1000m
DEFAULT_DEPTHS = 15 

def test_model():
    print("=" * 60)
    print("Testing Modular Dual Path CNN + ViT Model")
    print("=" * 60)

    batch_size = 4
    channels = DEFAULT_CHANNELS
    height = 64
    width = 64
    num_depths = DEFAULT_DEPTHS

    # Simulate an input batch of data
    x = torch.randn(batch_size, channels, height, width)

    print(f"\nInput:")
    print(f"Shape: {x.shape} -> (Batch: {batch_size}, Channels: {channels})")

    # Instantiate the modular Dual Path model
    model = DualPathModel(in_channels=channels, num_depths=num_depths)

    print("\nModel Components Loaded Successfully!")
    print(f"CNN Path: {sum(p.numel() for p in model.cnn.parameters()):,} parameters")
    print(f"ViT Path: {sum(p.numel() for p in model.vit.parameters()):,} parameters")
    print(f"Fusion Head: {sum(p.numel() for p in model.fc.parameters()):,} parameters")

    with torch.no_grad():
        output = model(x)

    print("\nOutput:")
    print(f"Shape: {output.shape}")

    expected_shape = (batch_size, num_depths)
    
    print("\nExpected Output Format:")
    print(f"Shape: {expected_shape} -> (Batch: {batch_size}, Depths: {num_depths})")
    
    print("\nStandard Depth Levels (m):")
    print("(0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000)")

    assert output.shape == expected_shape, (
        f"Wrong output shape! Got {output.shape}, expected {expected_shape}"
    )

    print("\n" + "=" * 60)
    print("MODULAR DUAL PATH MODEL TEST PASSED")
    print("=" * 60)

if __name__ == "__main__":
    test_model()