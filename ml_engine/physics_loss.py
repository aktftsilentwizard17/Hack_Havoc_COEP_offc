import torch
import torch.nn as nn
import torch.nn.functional as F

class PhysicsInformedLoss(nn.Module):
    """
    A custom loss function that combines standard data-driven error (MSE)
    with a Physics-Informed Penalty based on ocean thermodynamic stratification.
    
    Penalty Rule:
        Deep ocean water should be colder than or equal to surface water.
        If the model predicts T_{depth X} < T_{depth X+1} (i.e., deeper water is hotter),
        a heavy penalty is applied.
    """
    def __init__(self, lambda_physics=0.5):
        super().__init__()
        self.mse = nn.MSELoss()
        self.lambda_physics = lambda_physics

    def forward(self, predictions, targets):
        """
        predictions: [Batch Size, Num Depths]
        targets: [Batch Size, Num Depths]
        """
        # 1. Standard Data Error (Mean Squared Error)
        mse_loss = self.mse(predictions, targets)
        
        # 2. Physics-Informed Penalty (Thermal Stratification)
        # We want to punish: predictions[:, i+1] > predictions[:, i]
        # Diff = deeper_temp - shallower_temp
        # If Diff > 0 (deeper is hotter), apply penalty using ReLU
        
        # predictions[:, 1:] represents deeper depths
        # predictions[:, :-1] represents shallower depths
        depth_diffs = predictions[:, 1:] - predictions[:, :-1]
        
        # ReLU will zero out negative diffs (where deeper is colder, which is physically correct)
        # and keep positive diffs (where deeper is hotter, which violates physics)
        physics_violations = F.relu(depth_diffs)
        
        # The penalty is the mean of these squared violations across the batch
        physics_penalty = torch.mean(physics_violations ** 2)
        
        # 3. Total Loss
        total_loss = mse_loss + (self.lambda_physics * physics_penalty)
        
        return total_loss, mse_loss, physics_penalty
