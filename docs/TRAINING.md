# Model Training Guide

This guide details the process of training the Dual Path CNN + ViT model using the real-world ocean surface data fetched from the Copernicus Marine Service.

## 1. Prerequisites

Before running the training script, ensure that the data ingestion pipeline has completed successfully. You should have the following preprocessed NetCDF files available:

- `data/processed/merged_surface_data.nc` (Input Features: SST, SSS, SSH, Ocean Currents)
- `data/processed/processed_target_data.nc` (Target Labels: 3D Temperature Profile)

If these files are missing, run the ingestion and preprocessing scripts first:
```bash
python data_ingestion/fetch_copernicus.py
python data_ingestion/preprocess.py
```

## 2. The Training Pipeline (`train.py`)

The primary training loop is housed in `ml_engine/train.py`.

### A. Data Loading (`OceanDataset`)
The PyTorch `OceanDataset` class bridges the gap between the `.nc` (NetCDF) format and PyTorch tensors:
1. **Dynamic Target Interpolation**: It reads the 46-level 3D target data and linearly interpolates it down to the exact **15 standard depth levels** expected by the architecture.
2. **Spatial Patching**: The dataset randomly slices the massive continuous global grid (e.g., `101x241`) into `64x64` localized geographical patches for training.

### B. Forward Pass
The model initializes with `in_channels=5` to match the surface variables. The inputs `[Batch, 5, 64, 64]` are processed through the Sequential CNN $\rightarrow$ ViT path, predicting the corresponding 15 depth values at the center of the patch.

### C. Optimization
- **Loss Function:** Mean Squared Error (`MSELoss`)
- **Optimizer:** Adam Optimizer (`lr=1e-4`)
- **Hardware:** The script automatically detects and utilizes a GPU (`cuda`) if available, otherwise it falls back to the `cpu`.

## 3. Running the Training

To kick off the training loop, simply execute:

```bash
python ml_engine/train.py
```

You will see output displaying the dataset dimensions, followed by the loss metrics per epoch, and a final validation sample indicating the Mean Squared Error (MSE) on a single test patch.

## 4. Model Weights

Once the training loops are fully complete, the script automatically saves the final model parameters to:
- **Location:** `ml_engine/weights/dual_path_model.pth`

### Continuous Learning (Fine-Tuning)
`train.py` is configured for continuous learning. Every time you run it, it will check if `dual_path_model.pth` already exists.
- If **yes**: It loads the existing brain (weights) and continues to train on the new data you provide, effectively becoming smarter and generalizing better across seasons without forgetting old data.
- If **no**: It initializes randomly and trains from scratch.

## 5. Inference (Making Predictions)

Once you are satisfied with the model's accuracy, you stop training and move to **Inference**. 
- **Training (`train.py`)** is like studying: the model updates its internal math based on the provided answers to learn.
- **Inference (`inference.py`)** is like taking the exam: the model locks its brain (`model.eval()`) and makes rapid predictions on new data without updating its weights.

We have provided an inference script to demonstrate how to load the weights and make a prediction.

To run the inference script:
```bash
python ml_engine/inference.py
```
