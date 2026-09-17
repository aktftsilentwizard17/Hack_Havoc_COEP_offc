import os
import torch
import torch.optim as optim
from torch.utils.data import DataLoader
import numpy as np

# Adjust path to import from the local package
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import DualPathModel
from data_loader import OceanDataset
from physics_loss import PhysicsInformedLoss

def train_model():
    print("="*60)
    print("Training PINN Dual Path Model on Copernicus Data")
    print("="*60)
    
    # Configure Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    surface_file = os.path.join(base_dir, "data", "processed", "merged_surface_data.nc")
    target_file = os.path.join(base_dir, "data", "processed", "processed_target_data.nc")
    
    if not os.path.exists(surface_file) or not os.path.exists(target_file):
        print(f"Error: Data files not found.")
        print(f"Expected:\n  - {surface_file}\n  - {target_file}")
        return

    # Hyperparameters
    batch_size = 8
    epochs = 10
    learning_rate = 1e-4
    lambda_physics = 0.5  # Weight of the physics penalty
    
    # Create Dataset & DataLoader
    dataset = OceanDataset(surface_file, target_file, num_samples=160, patch_size=64)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    # Initialize Model (5 channels, 15 depths)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    model = DualPathModel(in_channels=5, num_depths=15).to(device)
    
    # Check if previous weights exist to continue training (Fine-tuning)
    weights_dir = os.path.join(base_dir, "ml_engine", "weights")
    save_path = os.path.join(weights_dir, "dual_path_model.pth")
    if os.path.exists(save_path):
        print(f"Found existing weights at {save_path}. Loading them to continue training...")
        model.load_state_dict(torch.load(save_path))
    else:
        print("No existing weights found. Training from scratch...")
        
    # Initialize Physics-Informed Loss
    criterion = PhysicsInformedLoss(lambda_physics=lambda_physics)
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    # Training Loop
    model.train()
    for epoch in range(epochs):
        epoch_loss = 0.0
        epoch_mse = 0.0
        epoch_physics = 0.0
        
        for batch_idx, (inputs, targets) in enumerate(dataloader):
            inputs, targets = inputs.to(device), targets.to(device)
            
            # Forward pass
            optimizer.zero_grad()
            outputs = model(inputs)
            
            # Compute loss (Returns total, mse, and physics penalty)
            loss, mse_val, phys_val = criterion(outputs, targets)
            
            # Backward and optimize
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            epoch_mse += mse_val.item()
            epoch_physics += phys_val.item()
            
        avg_loss = epoch_loss / len(dataloader)
        avg_mse = epoch_mse / len(dataloader)
        avg_phys = epoch_physics / len(dataloader)
        print(f"Epoch [{epoch+1}/{epochs}], Total Loss: {avg_loss:.4f} (MSE: {avg_mse:.4f}, Physics: {avg_phys:.4f})")

    print("\nTraining Complete!")
    
    # Save the trained model weights
    os.makedirs(weights_dir, exist_ok=True)
    torch.save(model.state_dict(), save_path)
    print(f"Model weights successfully saved to: {save_path}")
    
    # Quick Test
    model.eval()
    with torch.no_grad():
        test_inputs, test_targets = dataset[0]
        test_inputs = test_inputs.unsqueeze(0).to(device)
        test_preds = model(test_inputs).squeeze(0).cpu()
        
    print("\n--- Validation Sample ---")
    print("Predicted Profile (15 depths):")
    print(np.round(test_preds.numpy(), 2))
    print("Actual Profile (15 depths):")
    print(np.round(test_targets.numpy(), 2))
    print("MSE on Sample: ", torch.nn.MSELoss()(test_preds, test_targets).item())
    print("="*60)

if __name__ == "__main__":
    train_model()
