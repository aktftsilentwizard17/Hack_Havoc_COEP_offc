import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  ImageOverlay
} from 'react-leaflet';
import L from 'leaflet';
import { Layers, MapPin, Eye, Compass, Info, X, ChevronDown, ChevronUp } from 'lucide-react';

// Fix Leaflet default icon issues in bundled React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Pulse Sonar Icon for active probing coordinate
const createPulseIcon = () => {
  return L.divIcon({
    className: 'custom-sonar-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-8 h-8 rounded-full bg-cyan-400 opacity-75 animate-ping"></span>
        <span class="relative w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-lg shadow-cyan-400"></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Preset Marker Icon
const createPresetIcon = (isActive) => {
  return L.divIcon({
    className: 'custom-preset-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border shadow-xl flex items-center gap-1 ${
          isActive
            ? 'bg-cyan-400 text-slate-950 border-white shadow-cyan-400/50 scale-110'
            : 'bg-slate-900/90 text-cyan-300 border-cyan-500/60'
        }">
          <span>⚓</span>
        </div>
      </div>
    `,
    iconSize: [30, 20],
    iconAnchor: [15, 10],
  });
};

// High-performance direct DOM cursor listener (ZERO React re-renders during mouse move)
function MapInteractionListener({ onMapClick, hudRef }) {
  const map = useMapEvents({
    click(e) {
      const lat = parseFloat(e.latlng.lat.toFixed(4));
      const lon = parseFloat(e.latlng.lng.toFixed(4));
      // Clamp within North Indian Ocean domain (Lat 5-30, Lon 45-105)
      if (lat >= 5.0 && lat <= 30.0 && lon >= 45.0 && lon <= 105.0) {
        onMapClick(lat, lon);
      }
    },
    mousemove(e) {
      if (hudRef && hudRef.current) {
        hudRef.current.innerText = `${e.latlng.lat.toFixed(2)}°N, ${e.latlng.lng.toFixed(2)}°E`;
      }
    },
  });
  return null;
}

// Controller to smoothly pan/zoom map on preset selection
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 6, { duration: 1.0 });
    }
  }, [center, zoom, map]);
  return null;
}

// Color conversion helper
function getRGBA(val, type) {
  if (type === 'sst') {
    // SST range: 24.0°C to 31.5°C
    const r = Math.max(0, Math.min(1, (val - 24.0) / 7.5));
    if (r < 0.3) return [6, 182, 212, 190]; // Cyan
    if (r < 0.55) return [59, 130, 246, 200]; // Blue
    if (r < 0.8) return [245, 158, 11, 210]; // Amber
    return [239, 68, 68, 220]; // Red
  } else if (type === 'ssh') {
    // SSH range: -0.35m to +0.35m
    const r = Math.max(0, Math.min(1, (val + 0.35) / 0.7));
    if (r < 0.5) return [2, 132, 199, 200];
    return [249, 115, 22, 210];
  } else if (type === 'sss') {
    // SSS range: 32.0 to 37.0 PSU
    const r = Math.max(0, Math.min(1, (val - 32.0) / 5.0));
    if (r < 0.4) return [16, 185, 129, 200]; // Emerald
    if (r < 0.7) return [99, 102, 241, 210]; // Indigo
    return [168, 85, 247, 220]; // Purple
  }
  return [14, 165, 233, 180];
}

export default function OceanMap({
  activeCoords,
  onSelectCoords,
  surfaceGrid,
  presets,
  activePresetId,
  isDrawerOpen
}) {
  const [basemapStyle, setBasemapStyle] = useState('dark'); // 'dark' | 'ocean'
  const [activeLayer, setActiveLayer] = useState('sst'); // 'sst' | 'ssh' | 'sss' | 'none'
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [isInstructionDismissed, setIsInstructionDismissed] = useState(false);
  const hudRef = useRef(null);

  // Generate GPU-accelerated smooth canvas data URL (computed only when layer or grid changes)
  const overlayUrl = useMemo(() => {
    if (activeLayer === 'none' || !surfaceGrid || !surfaceGrid.latitudes || !surfaceGrid.longitudes) {
      return null;
    }

    const lats = surfaceGrid.latitudes;
    const lons = surfaceGrid.longitudes;
    const gridData = surfaceGrid[activeLayer];
    if (!gridData) return null;

    const nLat = lats.length;
    const nLon = lons.length;

    const canvas = document.createElement('canvas');
    canvas.width = nLon;
    canvas.height = nLat;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(nLon, nLat);

    for (let r = 0; r < nLat; r++) {
      // In Leaflet, row 0 in canvas corresponds to north (highest lat)
      const latIdx = nLat - 1 - r;
      for (let c = 0; c < nLon; c++) {
        const val = gridData[latIdx][c];
        const [red, green, blue, alpha] = getRGBA(val, activeLayer);
        const pixelIdx = (r * nLon + c) * 4;
        imgData.data[pixelIdx] = red;
        imgData.data[pixelIdx + 1] = green;
        imgData.data[pixelIdx + 2] = blue;
        imgData.data[pixelIdx + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  }, [surfaceGrid, activeLayer]);

  const initialCenter = activeCoords
    ? [activeCoords.latitude, activeCoords.longitude]
    : [15.0, 75.0];

  const bounds = [
    [5.0, 45.0],
    [30.0, 105.0]
  ];

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* Map Layer & Basemap Switcher HUD (Top Left) */}
      <div className="absolute top-4 left-4 z-[300] bg-slate-900/95 border border-slate-700/80 rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-xs transition-all max-w-[210px]">
        <div className="flex items-center justify-between font-semibold text-slate-300 mb-1 px-1">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Map Layers</span>
          </div>
          <button
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
            title={isControlsCollapsed ? 'Expand Controls' : 'Collapse Controls'}
          >
            {isControlsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!isControlsCollapsed && (
          <div className="space-y-2.5 mt-2">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setActiveLayer('sst')}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  activeLayer === 'sst'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-red-400 shrink-0"></span>
                  <span className="truncate">SST Heatmap</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">24–31°C</span>
              </button>

              <button
                onClick={() => setActiveLayer('ssh')}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  activeLayer === 'ssh'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-orange-400 shrink-0"></span>
                  <span className="truncate">SSH Altimetry</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">±0.35m</span>
              </button>

              <button
                onClick={() => setActiveLayer('sss')}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  activeLayer === 'sss'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-purple-400 shrink-0"></span>
                  <span className="truncate">Salinity SSS</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">32–37</span>
              </button>

              <button
                onClick={() => setActiveLayer('none')}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                  activeLayer === 'none'
                    ? 'bg-slate-800 text-slate-200 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Basemap Only</span>
              </button>
            </div>

            {/* Basemap Style Switcher */}
            <div className="border-t border-slate-800 pt-2">
              <div className="text-[10px] font-semibold text-slate-400 mb-1 px-1 flex items-center justify-between">
                <span>Basemap Style</span>
                <span className="text-[9px] text-emerald-400 font-mono">No Key Req</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setBasemapStyle('dark')}
                  className={`px-1.5 py-1 rounded text-[10px] font-medium transition cursor-pointer text-center ${
                    basemapStyle === 'dark'
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50 font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dark Canvas
                </button>
                <button
                  onClick={() => setBasemapStyle('ocean')}
                  className={`px-1.5 py-1 rounded text-[10px] font-medium transition cursor-pointer text-center ${
                    basemapStyle === 'ocean'
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50 font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bathymetry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dismissable Instructions HUD (Top Right - auto-hidden when drawer is open) */}
      {!isDrawerOpen && !isInstructionDismissed && (
        <div className="absolute top-4 right-4 z-[300] bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 shadow-2xl backdrop-blur-md text-xs text-slate-300 max-w-xs flex items-center justify-between gap-2.5 transition-all">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-[11px] leading-snug">
              Click anywhere in the <strong>North Indian Ocean</strong> to probe vertical soundings down to <strong>2000m</strong>.
            </span>
          </div>
          <button
            onClick={() => setIsInstructionDismissed(true)}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Direct DOM Telemetry HUD (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[300] bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md text-xs font-mono text-slate-300 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cursor:</span>
          <strong ref={hudRef} className="text-cyan-200">15.00°N, 75.00°E</strong>
        </div>
        <span className="text-slate-600">|</span>
        <div className="text-[11px] text-slate-400 hidden sm:block">
          Domain: 5.0°N–30.0°N, 45.0°E–105.0°E
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <MapContainer
        center={initialCenter}
        zoom={5}
        minZoom={4}
        maxZoom={9}
        maxBounds={[
          [2.0, 40.0],
          [33.0, 110.0]
        ]}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <MapViewController
          center={activeCoords ? [activeCoords.latitude, activeCoords.longitude] : null}
        />
        <MapInteractionListener
          onMapClick={onSelectCoords}
          hudRef={hudRef}
        />

        {/* Free Basemaps (No API Key Required) */}
        {basemapStyle === 'dark' ? (
          <TileLayer
            key="esri_dark"
            attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, NOAA'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />
        ) : (
          <TileLayer
            key="esri_ocean"
            attribution='Tiles &copy; Esri &mdash; GEBCO, NOAA, National Geographic, DeLorme'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={13}
          />
        )}

        {/* GPU-Accelerated Canvas Raster Overlay (60 FPS Smooth Rendering) */}
        {overlayUrl && (
          <ImageOverlay
            url={overlayUrl}
            bounds={bounds}
            opacity={0.55}
            interactive={false}
          />
        )}

        {/* Demo Preset Pins */}
        {presets.map((preset) => {
          const isPresetActive = activePresetId === preset.id;
          return (
            <Marker
              key={preset.id}
              position={[preset.latitude, preset.longitude]}
              icon={createPresetIcon(isPresetActive)}
              eventHandlers={{
                click: () => onSelectCoords(preset.latitude, preset.longitude, preset.id)
              }}
            >
              <Popup className="custom-popup">
                <div className="bg-slate-900 text-white p-2 rounded-lg text-xs font-sans">
                  <div className="font-bold text-cyan-400">{preset.name}</div>
                  <div className="text-[11px] text-slate-300 mt-1">{preset.description}</div>
                  <div className="text-[10px] font-mono text-cyan-200 mt-1">
                    {preset.latitude}°N, {preset.longitude}°E
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Active Probing Sonar Marker */}
        {activeCoords && (
          <Marker
            position={[activeCoords.latitude, activeCoords.longitude]}
            icon={createPulseIcon()}
          />
        )}
      </MapContainer>
    </div>
  );
}
