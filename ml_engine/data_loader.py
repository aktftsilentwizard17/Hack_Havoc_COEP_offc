import torch
from torch.utils.data import Dataset
import xarray as xr
import numpy as np

class OceanDataset(Dataset):
    """
    Loads ocean surface data and 3D temperature targets from Copernicus NetCDF files.
    Randomly crops into `patch_size x patch_size` spatial patches.
    """
    def __init__(self, surface_file, target_file, num_samples=100, patch_size=64):
        print(f"Loading data from {surface_file} and {target_file}...")
        self.patch_size = patch_size
        self.num_samples = num_samples
        
        ds_surf = xr.open_dataset(surface_file)
        ds_tgt = xr.open_dataset(target_file)
        
        # 1. Standardize Target Depths to 15 levels
        target_depths = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]
        # Interpolate missing depth values
        ds_tgt = ds_tgt.interp(depth=target_depths, method="linear", kwargs={"fill_value": "extrapolate"})
        
        # 2. Extract Data Arrays
        # Variables: thetao, so, zos, uo, vo (5 channels)
        variables = ['thetao', 'so', 'zos', 'uo', 'vo']
        surf_arrays = []
        for v in variables:
            # Fill NaNs with 0 (land mask or missing data)
            data = ds_surf[v].fillna(0).values
            surf_arrays.append(data)
            
        # Shape: [Time, Channels, Lat, Lon]
        self.surface_data = np.stack(surf_arrays, axis=1)
        
        # Target variable: thetao (3D temperature)
        # Shape: [Time, Depth, Lat, Lon]
        self.target_data = ds_tgt['thetao'].fillna(0).values
        
        self.num_time_steps = self.surface_data.shape[0]
        self.num_lat = self.surface_data.shape[2]
        self.num_lon = self.surface_data.shape[3]
        
        print(f"Loaded Surface Data Shape: {self.surface_data.shape}")
        print(f"Loaded Target Data Shape: {self.target_data.shape}")

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        # Randomly sample a patch
        t = np.random.randint(0, self.num_time_steps)
        lat_start = np.random.randint(0, self.num_lat - self.patch_size)
        lon_start = np.random.randint(0, self.num_lon - self.patch_size)
        
        # Extract 64x64 surface patch
        surf_patch = self.surface_data[
            t, 
            :, 
            lat_start:lat_start + self.patch_size, 
            lon_start:lon_start + self.patch_size
        ]
        
        # Extract the center point of the patch from the target 3D data
        center_lat = lat_start + self.patch_size // 2
        center_lon = lon_start + self.patch_size // 2
        tgt_profile = self.target_data[t, :, center_lat, center_lon]
        
        return torch.tensor(surf_patch, dtype=torch.float32), torch.tensor(tgt_profile, dtype=torch.float32)
