import torch.nn as nn

class ConvBlock(nn.Module):
    """
    Basic CNN block:
        Conv2D -> BatchNorm -> ReLU
    """
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.block(x)


class OceanCNN(nn.Module):
    """
    CNN backbone for extracting local spatial features.
    
    Args:
        in_channels (int): Number of input parameter channels (e.g., 7 for Copernicus data)
    """
    def __init__(self, in_channels=7):
        super().__init__()
        self.block1 = ConvBlock(in_channels, 32)
        self.pool1 = nn.MaxPool2d(2, 2)
        
        self.block2 = ConvBlock(32, 64)
        self.pool2 = nn.MaxPool2d(2, 2)
        
        self.block3 = ConvBlock(64, 128)
        self.block4 = ConvBlock(128, 256)

    def forward(self, x):
        x = self.block1(x)
        x = self.pool1(x)
        
        x = self.block2(x)
        x = self.pool2(x)
        
        x = self.block3(x)
        x = self.block4(x)
        
        return x
