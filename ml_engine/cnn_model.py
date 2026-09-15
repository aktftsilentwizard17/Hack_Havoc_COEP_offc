"""
OceanEmbed CNN Backbone
=======================

Purpose:
    Extract local spatial features from satellite/ocean surface data.

Input:
    [Batch, Channels, 64, 64]

Example:
    6 channels:
        1. SST
        2. Chlorophyll-a
        3. Rrs443
        4. Rrs490
        5. Rrs510
        6. Rrs665

Output:
    [Batch, 256, 16, 16]

The output feature map will later be passed to
the Vision Transformer (ViT).
"""

import torch
import torch.nn as nn


# ============================================================
# 1. BASIC CONVOLUTIONAL BLOCK
# ============================================================

class ConvBlock(nn.Module):
    """
    Basic CNN block:

        Conv2D
          ↓
        BatchNorm
          ↓
        ReLU

    This block extracts spatial features while
    keeping the spatial dimensions unchanged.
    """

    def __init__(self, in_channels, out_channels):
        super().__init__()

        self.block = nn.Sequential(

            nn.Conv2d(
                in_channels=in_channels,
                out_channels=out_channels,
                kernel_size=3,
                stride=1,
                padding=1,
                bias=False
            ),

            nn.BatchNorm2d(out_channels),

            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.block(x)


# ============================================================
# 2. OCEAN CNN
# ============================================================

class OceanCNN(nn.Module):
    """
    CNN backbone for OceanEmbed.

    Input:
        [B, C, 64, 64]

    Output:
        [B, 256, 16, 16]
    """

    def __init__(self, in_channels=6):
        super().__init__()

        # ----------------------------------------------------
        # Block 1
        # ----------------------------------------------------

        self.block1 = ConvBlock(
            in_channels=in_channels,
            out_channels=32
        )

        self.pool1 = nn.MaxPool2d(
            kernel_size=2,
            stride=2
        )


        # ----------------------------------------------------
        # Block 2
        # ----------------------------------------------------

        self.block2 = ConvBlock(
            in_channels=32,
            out_channels=64
        )

        self.pool2 = nn.MaxPool2d(
            kernel_size=2,
            stride=2
        )


        # ----------------------------------------------------
        # Block 3
        # ----------------------------------------------------

        self.block3 = ConvBlock(
            in_channels=64,
            out_channels=128
        )


        # ----------------------------------------------------
        # Block 4
        # ----------------------------------------------------

        self.block4 = ConvBlock(
            in_channels=128,
            out_channels=256
        )


    # ========================================================
    # FORWARD PASS
    # ========================================================

    def forward(self, x):

        # Input
        # [B, 6, 64, 64]

        x = self.block1(x)

        # [B, 32, 64, 64]

        x = self.pool1(x)

        # [B, 32, 32, 32]


        x = self.block2(x)

        # [B, 64, 32, 32]

        x = self.pool2(x)

        # [B, 64, 16, 16]


        x = self.block3(x)

        # [B, 128, 16, 16]


        x = self.block4(x)

        # [B, 256, 16, 16]

        return x


# ============================================================
# 3. TEST FUNCTION
# ============================================================

def test_model():

    print("=" * 60)
    print("Testing OceanEmbed CNN")
    print("=" * 60)


    # --------------------------------------------------------
    # Configuration
    # --------------------------------------------------------

    batch_size = 4
    channels = 6
    height = 64
    width = 64


    # --------------------------------------------------------
    # Create fake input
    # --------------------------------------------------------
    #
    # This is NOT real ocean data.
    #
    # We are simply creating random tensors to verify
    # that the CNN architecture works correctly.
    #

    x = torch.randn(
        batch_size,
        channels,
        height,
        width
    )


    print("\nInput:")
    print("Shape:", x.shape)


    # --------------------------------------------------------
    # Create model
    # --------------------------------------------------------

    model = OceanCNN(
        in_channels=channels
    )


    print("\nModel:")
    print(model)


    # --------------------------------------------------------
    # Forward pass
    # --------------------------------------------------------

    with torch.no_grad():

        output = model(x)


    print("\nOutput:")
    print("Shape:", output.shape)


    # --------------------------------------------------------
    # Expected output
    # --------------------------------------------------------

    expected_shape = (
        batch_size,
        256,
        16,
        16
    )


    print("\nExpected:")
    print("Shape:", expected_shape)


    # --------------------------------------------------------
    # Verify
    # --------------------------------------------------------

    assert output.shape == expected_shape, (
        f"Wrong output shape! "
        f"Got {output.shape}, "
        f"expected {expected_shape}"
    )


    print("\n" + "=" * 60)
    print("CNN TEST PASSED")
    print("=" * 60)


# ============================================================
# 4. RUN TEST
# ============================================================

if __name__ == "__main__":
    test_model()