# Dual Path CNN + ViT Model Architecture

The `ml_engine` utilizes a novel **Dual Path** architecture that fuses local spatial feature extraction with global contextual awareness. The architecture combines a Convolutional Neural Network (CNN) backbone and a Vision Transformer (ViT) to predict 3D ocean subsurface temperature profiles from 2D surface parameters.

---

## 1. Input Data Processing

The model accepts dynamic input parameters that are downloaded from the Copernicus Marine Service. By default, it operates on a `7-channel` input representing the following surface parameters:

1. **Sea Surface Temperature (SST)**
2. **Sea Surface Salinity (SSS)**
3. **Sea Surface Height (SSH / SLA)**
4. **Ocean Currents (U-Vector)**
5. **Ocean Currents (V-Vector)**
6. **Surface Winds (U-Vector)**
7. **Surface Winds (V-Vector)**

The expected input tensor format is:
`[Batch Size, Channels (7), Height (64), Width (64)]`

---

## 2. Architecture Overview

The system processes the input tensor sequentially through two neural network domains (Spatial and Contextual) to make a comprehensive depth profile prediction.

### A. Stage 1: Spatial Feature Extraction (OceanCNN)
- **Purpose:** Extracts local, high-frequency spatial features (e.g., localized temperature gradients, swirling currents).
- **Architecture:** Four consecutive convolutional blocks (`Conv2d` -> `BatchNorm2d` -> `ReLU`) coupled with `MaxPool2d` layers.
- **Output:** Produces a down-sampled `256`-channel feature map of shape `[16, 16]`.

### B. Stage 2: Contextual Feature Extraction (ViTPath)
- **Purpose:** Learns global contextual relationships and long-range dependencies by treating the CNN feature map as a sequence of spatial tokens.
- **Architecture:** 
  - Splits the `16x16` spatial feature map from the CNN into `4x4` patches.
  - Generates patch embeddings and injects learned positional encodings, alongside a `[CLS]` token.
  - Passes the sequence through a native PyTorch `TransformerEncoder`.
- **Output:** Extracts a `256`-dimensional global feature vector derived from the `[CLS]` token state.

### C. Stage 3: Output Head
- **Purpose:** Maps the final global contextual representation to the target depth profile.
- **Architecture:** 
  - Passes the `[256]` dimensional ViT output through a Multi-Layer Perceptron (MLP) consisting of dense linear layers, `ReLU` activations, and Dropout regularization.
- **Output:** Predicts the subsurface temperature array.

---

## 3. Output Predictions

The model projects the fused latent representation into **15 standard depth bins**, representing the 3D temperature profile (in meters) down to 1000m:

`(0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000)`

The output tensor matches the format: `[Batch Size, 15]`

---

## 4. Physics-Informed Neural Network (PINN)

To ensure the neural network produces predictions that are physically realistic and to improve its data efficiency, the architecture is trained as a **Physics-Informed Neural Network (PINN)**. 

During training, the system uses a custom `PhysicsInformedLoss` function that combines two components:
1. **Data Error (`MSELoss`)**: The standard statistical distance between the predicted temperature and the true downloaded target data.
2. **Thermal Stratification Penalty**: A strict physics-based rule which mathematically punishes the model if it predicts that deeper ocean water is hotter than shallower water (violating the laws of thermodynamic stratification).

By enforcing these constraints during the backward pass, the model is guided toward physically sound profiles without having to "re-learn" thermodynamics purely from scratch, drastically reducing overfitting and training time.

---

## 5. Modularity and Extensibility

The source code for the model is designed to be highly modular and is contained within the `ml_engine/models/` directory:

- `cnn_backbone.py`: Contains the `OceanCNN` spatial extractor.
- `vit_backbone.py`: Contains the `ViTPath` context extractor.
- `dual_path.py`: The `DualPathModel` module orchestrating both paths and fusion.
- `cnn_model.py`: Acts as the main integration script and testing entry point.

### Dynamic Input/Output Sizing
The architecture natively adapts to changes in the data pipeline. If certain data streams (like Wind data) are omitted, or if the target depth profile is extended (e.g., down to 4000m), you only need to modify the parameters when instantiating the model:

```python
from models import DualPathModel

# Example: 5 channels, predicting 20 depths
model = DualPathModel(in_channels=5, num_depths=20)
```
