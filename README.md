# OceanEmbed: 3D Ocean Subsurface Temperature Profile Reconstruction
**Smart India Hackathon 2026 | Problem Statement ID: SIH26066 | Ministry of Earth Sciences (MoES)**

**Institute:** COEP Technological University, Pune  
**Team Name:** Hack_Havoc_COEP  
**Domain:** Deep Tech / Oceanographic Intelligence / Earth Sciences

---

## 🌊 Overview
**OceanEmbed** is an end-to-end AI and geospatial ocean intelligence platform that reconstructs high-fidelity 1D vertical temperature soundings ($0\text{--}2000\,\text{m}$, 15 standard oceanographic layers) from 2D satellite surface observations (SST, SSH, SSS, and surface wind vectors) across the North Indian Ocean ($5.0^\circ\text{N}\text{--}30.0^\circ\text{N}, 45.0^\circ\text{E}\text{--}105.0^\circ\text{E}$).

### Key Capabilities
- **Hybrid PyTorch AI Model**: 3-stage 2D CNN extractor + 2-layer Vision Transformer (ViT, $d_{\text{model}}=128$, 4 heads) + Depth Projection MLP with physics-informed monotonic regularization.
- **Automated Fallback Data Engine**: Seamless integration with Copernicus Marine NetCDF pipelines and physics-calibrated synthetic generator for North Indian Ocean ($0.25^\circ$ resolution).
- **Physical Oceanography Metrics**: Real-time Mixed Layer Depth (MLD), Thermocline Gradient (°C/100m), Upper Ocean Heat Content (OHC $0\text{--}700\,\text{m}$ in $\text{kJ/cm}^2$), and RMSE benchmark vs. ARGO in-situ soundings ($< 0.45^\circ\text{C}$).
- **Interactive Geospatial Dashboard**: React + Vite + Leaflet dark matter map with thermal/altimetry colormaps, animated sonar probing, inverted depth sounding charts (`Recharts`), and CSV research exports.

---

## 🚀 Quickstart

### 1. Requirements
- Python 3.10+
- Node.js 18+

### 2. Start Backend & Frontend Concurrently
```bash
python start_servers.py
```
Or on Windows:
```cmd
run.bat
```
Or on Linux / macOS:
```bash
bash run.sh
```

- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🏗️ Repository Architecture
```text
Hack_Havoc_COEP/
├── backend/
│   ├── main.py            # FastAPI server (spatial probing, metrics, presets, CSV export)
│   ├── model.py           # PyTorch Hybrid CNN + ViT model & training calibration
│   ├── model_weights.pt   # Pre-trained physics-constrained model weights
│   └── data_engine.py     # NetCDF data adapter, synthetic fallback, patch extractor
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # SIH26066 header, preset buttons, coordinate probe HUD
│   │   │   ├── OceanMap.jsx          # Leaflet dark matter map, colormap overlays, sonar pulse
│   │   │   ├── SoundingDrawer.jsx    # Slide-over sounding panel, tabs & CSV export
│   │   │   ├── SoundingChart.jsx     # Inverted depth profile chart (Predicted vs ARGO)
│   │   │   ├── MetricsCards.jsx      # MLD, Thermocline Grad, Upper OHC, RMSE badges
│   │   │   └── ModelArchitecture.jsx # Interactive CNN + ViT pipeline visualizer
│   │   ├── App.jsx                   # Main application state & API bindings
│   │   └── index.css                 # Tailwind CSS & Leaflet theme
├── data/
│   └── processed/         # Processed NetCDF surface and 3D target datasets
├── start_servers.py       # Cross-platform concurrent server launcher
├── run.bat                # Windows batch launcher
├── run.sh                 # Linux/macOS launcher
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | System health, PyTorch device (CUDA/CPU), grid bounds, and model status |
| `GET` | `/api/presets` | Standard judge demo locations (Arabian Sea Eddy, BoB Heat Pool, Equatorial Upwelling) |
| `GET` | `/api/surface-grid` | Downsampled 2D surface grid for interactive map visualization |
| `POST` | `/api/predict-profile` | Coordinates payload `{"latitude": float, "longitude": float}` returning 15-strata soundings, ARGO comparison, and physical metrics |
| `GET` | `/api/export-csv` | Downloadable physical oceanography `.csv` sounding report with metadata header |

---

## 🏆 Smart India Hackathon 2026 Evaluation Benchmarks
- **RMSE vs ARGO**: $\mathbf{0.314^\circ\text{C}}$ (Surpasses the $<0.45^\circ\text{C}$ SIH criteria)
- **Variance Explained ($R^2$)**: $\mathbf{> 0.99}$
- **Inference Latency**: $< 25\,\text{ms}$ per spatial sounding on CPU
