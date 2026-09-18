import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import OceanMap from './components/OceanMap';
import SoundingDrawer from './components/SoundingDrawer';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function App() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [presets, setPresets] = useState([]);
  const [surfaceGrid, setSurfaceGrid] = useState(null);
  const [activeCoords, setActiveCoords] = useState(null);
  const [activePresetId, setActivePresetId] = useState(null);
  const [soundingData, setSoundingData] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualCoords, setManualCoords] = useState({ lat: '18.5', lon: '65.2' });

  // Initial Data Fetch: Status, Presets, and Surface Grid
  useEffect(() => {
    async function initPlatform() {
      try {
        const [statusRes, presetsRes, gridRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/status`),
          axios.get(`${API_BASE_URL}/api/presets`),
          axios.get(`${API_BASE_URL}/api/surface-grid?step=2`),
        ]);

        setSystemStatus(statusRes.data);
        setPresets(presetsRes.data);
        setSurfaceGrid(gridRes.data);

        // Auto-load the first preset for immediate judge showcase
        if (presetsRes.data && presetsRes.data.length > 0) {
          const firstPreset = presetsRes.data[0];
          handleSelectCoords(firstPreset.latitude, firstPreset.longitude, firstPreset.id);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to connect to OceanEmbed backend server at http://localhost:8000');
      }
    }
    initPlatform();
  }, []);

  // Fetch 3D Profile Sounding for Coordinates
  const handleSelectCoords = async (lat, lon, presetId = null) => {
    setActiveCoords({ latitude: lat, longitude: lon });
    setActivePresetId(presetId);
    setManualCoords({ lat: lat.toString(), lon: lon.toString() });
    setIsDrawerOpen(true);
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/predict-profile`, {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      });
      setSoundingData(response.data);
    } catch (err) {
      console.error('Inference error:', err);
      setError(err.response?.data?.detail || 'Failed to generate 3D vertical profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset) => {
    handleSelectCoords(preset.latitude, preset.longitude, preset.id);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(manualCoords.lat);
    const lon = parseFloat(manualCoords.lon);
    if (isNaN(lat) || isNaN(lon)) return;
    handleSelectCoords(lat, lon, null);
  };

  const handleExportCsv = (lat, lon) => {
    if (lat === undefined || lon === undefined) return;
    const downloadUrl = `${API_BASE_URL}/api/export-csv?lat=${lat}&lon=${lon}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* SIH26066 & Ministry of Earth Sciences Navbar */}
      <Navbar
        systemStatus={systemStatus}
        presets={presets}
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
        manualCoords={manualCoords}
        setManualCoords={setManualCoords}
        onManualSubmit={handleManualSubmit}
      />

      {/* Main Interactive Map Canvas */}
      <main className="flex-1 relative overflow-hidden">
        <OceanMap
          activeCoords={activeCoords}
          onSelectCoords={handleSelectCoords}
          surfaceGrid={surfaceGrid}
          presets={presets}
          activePresetId={activePresetId}
          isDrawerOpen={isDrawerOpen}
        />

        {/* Slide-over Visual Sounding & Analytics Drawer */}
        <SoundingDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          soundingData={soundingData}
          loading={loading}
          error={error}
          onExportCsv={handleExportCsv}
        />
      </main>
    </div>
  );
}