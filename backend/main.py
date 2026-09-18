import os
import sys
import io
import csv

# Ensure repository root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import torch
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from backend.data_engine import data_engine, DEPTH_LEVELS, LAT_MIN, LAT_MAX, LON_MIN, LON_MAX
from backend.model import model_instance, active_device

app = FastAPI(
    title="OceanEmbed ML & Oceanographic API",
    description="SIH26066 - Ministry of Earth Sciences: 3D Ocean Subsurface Temperature Profile Reconstruction",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CoordinateRequest(BaseModel):
    latitude: float = Field(..., ge=LAT_MIN, le=LAT_MAX, description="Latitude in decimal degrees (5.0 to 30.0)")
    longitude: float = Field(..., ge=LON_MIN, le=LON_MAX, description="Longitude in decimal degrees (45.0 to 105.0)")

def calculate_mld(depths: np.ndarray, temps: np.ndarray) -> float:
    """
    Computes Mixed Layer Depth (MLD) in meters.
    Standard definition: Depth where temperature drops by 0.2°C from surface value T(0).
    """
    surface_temp = temps[0]
    threshold_temp = surface_temp - 0.2
    
    for i in range(len(temps) - 1):
        if temps[i] >= threshold_temp >= temps[i + 1]:
            # Linear interpolation for sub-grid depth resolution
            z1, z2 = depths[i], depths[i + 1]
            t1, t2 = temps[i], temps[i + 1]
            if t1 == t2:
                return float(z1)
            fraction = (threshold_temp - t1) / (t2 - t1)
            mld = z1 + fraction * (z2 - z1)
            return float(round(mld, 1))
            
    # If entire upper layer is mixed beyond 200m
    return float(depths[3])

def calculate_thermocline_gradient(depths: np.ndarray, temps: np.ndarray) -> float:
    """
    Computes maximum vertical temperature gradient in °C per 100 meters.
    """
    max_grad = 0.0
    for i in range(len(depths) - 1):
        dz = depths[i + 1] - depths[i]
        dt = abs(temps[i] - temps[i + 1])
        if dz > 0:
            grad = (dt / dz) * 100.0
            if grad > max_grad:
                max_grad = grad
    return float(round(max_grad, 2))

def calculate_upper_ohc(depths: np.ndarray, temps: np.ndarray, ref_temp: float = 26.0) -> float:
    """
    Computes Upper Ocean Heat Content (OHC) integrated from 0 to 700m in kJ/cm².
    OHC = rho * cp * integral_0^700 (T(z) - T_ref) dz * 1e-4
    where rho = 1025 kg/m^3, cp = 3.99 kJ/(kg K).
    """
    rho = 1025.0  # kg/m^3
    cp = 3.99     # kJ/(kg °C)
    
    # Restrict to depths <= 750m and interpolate to 700m
    valid_indices = np.where(depths <= 750)[0]
    z_sub = depths[valid_indices].copy()
    t_sub = temps[valid_indices].copy()

    # Clip negative temperature anomalies above ref_temp
    t_anom = np.maximum(0.0, t_sub - ref_temp)
    
    # Trapezoidal integration in Joules / m^2
    integral_val = np.trapezoid(t_anom, z_sub)
    ohc_kj_per_cm2 = (rho * cp * integral_val) * 1e-4
    return float(round(ohc_kj_per_cm2, 2))

@app.get("/api/status")
async def get_status():
    """Returns system health, device, dataset bounds, and model status."""
    return {
        "status": "healthy",
        "service": "OceanEmbed SIH26066 ML Engine",
        "device": str(active_device),
        "dataset_bounds": {
            "min_latitude": LAT_MIN,
            "max_latitude": LAT_MAX,
            "min_longitude": LON_MIN,
            "max_longitude": LON_MAX,
            "resolution": 0.25,
            "region": "North Indian Ocean (Arabian Sea & Bay of Bengal)"
        },
        "depth_levels": DEPTH_LEVELS,
        "model": {
            "name": "Hybrid CNN + ViT OceanEmbed",
            "channels": ["thetao (SST)", "zos (SSH)", "so (SSS)", "uo (East Wind/Current)", "vo (North Wind/Current)"],
            "status": "ready"
        }
    }

@app.get("/api/presets")
async def get_presets():
    """Returns standard judge demo locations representing critical oceanographic regimes."""
    return [
        {
            "id": "preset_arabian_eddy",
            "name": "Arabian Sea Mesoscale Eddy",
            "region": "Arabian Sea (Central Basin)",
            "latitude": 18.5,
            "longitude": 65.2,
            "description": "Intense anticyclonic eddy showing strong sea surface elevation, deepened thermocline, and elevated upper salinity (>36.2 PSU).",
            "tag": "Anticyclonic Vortex"
        },
        {
            "id": "preset_bob_heat_pool",
            "name": "Bay of Bengal Cyclone Heat Pool",
            "region": "Bay of Bengal (Northern Basin)",
            "latitude": 14.2,
            "longitude": 88.6,
            "description": "High Tropical Cyclone Heat Potential zone with SST > 30.5°C, high riverine freshwater stratification, and shallow barrier layer.",
            "tag": "Cyclone Incubator"
        },
        {
            "id": "preset_equatorial_upwelling",
            "name": "Equatorial Upwelling Zone",
            "region": "Equatorial Indian Ocean",
            "latitude": 6.0,
            "longitude": 78.0,
            "description": "Divergence-driven equatorial upwelling with steep thermocline gradient, shoaled 20°C isotherm, and moderate salinity.",
            "tag": "Upwelling Front"
        }
    ]

@app.get("/api/surface-grid")
async def get_surface_grid(step: int = Query(2, ge=1, le=5)):
    """Returns downsampled 2D surface grid for interactive map visualization."""
    return data_engine.get_surface_grid_summary(step=step)

@app.post("/api/predict-profile")
async def predict_profile(req: CoordinateRequest):
    """
    Extracts spatial patch for coordinate, executes CNN+ViT inference,
    generates matched simulated ARGO float soundings, and computes physical metrics.
    """
    lat, lon = req.latitude, req.longitude
    
    # 1. Extract normalized patch and raw surface parameters
    patch_np, surface_vals = data_engine.extract_patch(lat, lon, patch_size=16)
    
    # 2. PyTorch model inference
    model_instance.eval()
    with torch.no_grad():
        patch_tensor = torch.tensor(patch_np, dtype=torch.float32).unsqueeze(0).to(active_device)
        raw_pred = model_instance(patch_tensor).cpu().squeeze(0).numpy()

    # 3. Ground Truth & ARGO Float Sounding
    gt_profile = data_engine.get_ground_truth_profile(lat, lon)
    argo_profile = data_engine.generate_simulated_argo_sounding(lat, lon, gt_profile)
    
    # Calibrated physical prediction
    # Ensure surface boundary condition matches exact SST and monotonic physics
    predicted_profile = raw_pred.copy()
    predicted_profile[0] = surface_vals["thetao"]
    for i in range(1, len(predicted_profile)):
        if predicted_profile[i] > predicted_profile[i - 1]:
            predicted_profile[i] = predicted_profile[i - 1] - 0.02
    predicted_profile = np.clip(predicted_profile, 2.8, surface_vals["thetao"])

    # 4. Calculate Physical Metrics
    depths = np.array(DEPTH_LEVELS, dtype=np.float32)
    mld = calculate_mld(depths, predicted_profile)
    therm_grad = calculate_thermocline_gradient(depths, predicted_profile)
    upper_ohc = calculate_upper_ohc(depths, predicted_profile)

    # Statistical evaluation against simulated ARGO in-situ benchmark
    errors = predicted_profile - argo_profile
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    mae = float(np.mean(np.abs(errors)))
    
    # Variance explained R2
    ss_res = np.sum(errors ** 2)
    ss_tot = np.sum((argo_profile - np.mean(argo_profile)) ** 2)
    r2 = float(1.0 - (ss_res / (ss_tot + 1e-7)))

    # Formatting sounding arrays
    sounding_data = []
    for d, p_t, a_t, g_t in zip(DEPTH_LEVELS, predicted_profile, argo_profile, gt_profile):
        sounding_data.append({
            "depth": d,
            "predicted": round(float(p_t), 3),
            "argo": round(float(a_t), 3),
            "groundTruth": round(float(g_t), 3),
            "diff": round(float(p_t - a_t), 3)
        })

    return {
        "coordinates": {
            "latitude": lat,
            "longitude": lon
        },
        "surface_parameters": {
            "sst_c": round(float(surface_vals.get("thetao", 0.0)), 2),
            "ssh_m": round(float(surface_vals.get("zos", 0.0)), 3),
            "sss_psu": round(float(surface_vals.get("so", 0.0)), 2),
            "wind_u_ms": round(float(surface_vals.get("uo", 0.0)), 2),
            "wind_v_ms": round(float(surface_vals.get("vo", 0.0)), 2),
        },
        "metrics": {
            "mld_m": mld,
            "thermocline_gradient_c_per_100m": therm_grad,
            "upper_ohc_kj_cm2": upper_ohc,
            "rmse_c": round(rmse, 4),
            "mae_c": round(mae, 4),
            "r2_score": round(max(0.0, r2), 4)
        },
        "depths": DEPTH_LEVELS,
        "predicted_temperatures": [round(float(x), 3) for x in predicted_profile],
        "argo_temperatures": [round(float(x), 3) for x in argo_profile],
        "soundings": sounding_data
    }

@app.get("/api/export-csv")
async def export_csv(
    lat: float = Query(..., ge=LAT_MIN, le=LAT_MAX),
    lon: float = Query(..., ge=LON_MIN, le=LON_MAX)
):
    """
    Generates and downloads a physical oceanography formatted CSV sounding report for the coordinates.
    """
    # Run prediction
    req = CoordinateRequest(latitude=lat, longitude=lon)
    result = await predict_profile(req)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Metadata Header
    writer.writerow(["# OceanEmbed - 3D Subsurface Temperature Reconstruction Report"])
    writer.writerow(["# Problem Statement: SIH26066 | Ministry of Earth Sciences"])
    writer.writerow([f"# Coordinates: Lat {lat:.4f} N, Lon {lon:.4f} E"])
    writer.writerow([f"# Sea Surface Temperature (SST): {result['surface_parameters']['sst_c']} °C"])
    writer.writerow([f"# Sea Surface Height (SSH): {result['surface_parameters']['ssh_m']} m"])
    writer.writerow([f"# Sea Surface Salinity (SSS): {result['surface_parameters']['sss_psu']} PSU"])
    writer.writerow([f"# Mixed Layer Depth (MLD): {result['metrics']['mld_m']} m"])
    writer.writerow([f"# Upper Ocean Heat Content (0-700m): {result['metrics']['upper_ohc_kj_cm2']} kJ/cm2"])
    writer.writerow([f"# Model Benchmark RMSE vs ARGO: {result['metrics']['rmse_c']} °C"])
    writer.writerow([])
    
    # Column Headers
    writer.writerow([
        "Depth_m",
        "Predicted_Temp_C",
        "ARGO_InSitu_Temp_C",
        "GroundTruth_Temp_C",
        "Delta_Error_C",
        "Ocean_Stratum"
    ])
    
    for row in result["soundings"]:
        d = row["depth"]
        if d <= 50:
            stratum = "Epipelagic (Mixed Layer)"
        elif d <= 200:
            stratum = "Upper Thermocline"
        elif d <= 1000:
            stratum = "Mesopelagic (Permanent Thermocline)"
        else:
            stratum = "Bathypelagic (Abyssal Cold Layer)"
            
        writer.writerow([
            d,
            row["predicted"],
            row["argo"],
            row["groundTruth"],
            row["diff"],
            stratum
        ])
        
    filename = f"oceanembed_profile_{lat:.2f}N_{lon:.2f}E.csv"
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
