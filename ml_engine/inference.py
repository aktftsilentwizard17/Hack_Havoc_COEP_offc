import os
import torch
import numpy as np
import xarray as xr

# Import the model
from models import DualPathModel

def run_inference():
    print("="*60)
    print("Loading Trained Dual Path Model for Inference")
    print("="*60)
    
    # 1. Initialize the architecture
    # Make sure this matches the configuration used during training
    model = DualPathModel(in_channels=5, num_depths=15)
    
    # 2. Load the trained weights
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    weights_path = os.path.join(base_dir, "ml_engine", "weights", "dual_path_model.pth")
    
    if not os.path.exists(weights_path):
        print(f"Error: Weights file not found at {weights_path}.")
        print("Please run train.py first to generate the model weights.")
        return
        
    model.load_state_dict(torch.load(weights_path))
    model.eval() # Set to evaluation mode (disables dropout, etc.)
    print(f"Successfully loaded weights from {weights_path}")
    
    # 3. Simulate an inference pass
    # In a real scenario, this 'input_tensor' would come from live Copernicus data
    # Shape: [Batch Size, Channels, Height, Width]
    print("\nRunning simulated prediction...")
    dummy_input = torch.randn(1, 5, 64, 64)
    
    with torch.no_grad():
        prediction = model(dummy_input)
        
    print("\nPredicted 3D Temperature Profile (15 standard depths):")
    
    # Print out mapping to depths
    depths = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]
    preds = prediction.squeeze().numpy()
    
    for d, p in zip(depths, preds):
        print(f"  {d}m : {p:.2f} °C")

if __name__ == "__main__":
    run_inference()
