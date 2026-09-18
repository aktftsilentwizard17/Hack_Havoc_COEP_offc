import React, { useState } from 'react';
import {
  X,
  Download,
  Activity,
  Layers,
  Network,
  Maximize2,
  Minimize2,
  Table,
  CheckCircle2,
  Compass,
  AlertCircle
} from 'lucide-react';
import SoundingChart from './SoundingChart';
import MetricsCards from './MetricsCards';
import ModelArchitecture from './ModelArchitecture';

export default function SoundingDrawer({
  isOpen,
  onClose,
  soundingData,
  loading,
  error,
  onExportCsv
}) {
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'table' | 'architecture'
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  const lat = soundingData?.coordinates?.latitude;
  const lon = soundingData?.coordinates?.longitude;

  // Derive ocean basin name
  let basinName = "North Indian Ocean";
  if (lat && lon) {
    if (lon < 77.0) basinName = "Arabian Sea Basin";
    else if (lon >= 77.0 && lon <= 100.0 && lat > 8.0) basinName = "Bay of Bengal Basin";
    else if (lat <= 8.0) basinName = "Equatorial Indian Ocean";
  }

  return (
    <div
      className={`fixed bottom-0 right-0 z-[1000] transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-full h-full' : 'w-full lg:w-[680px] xl:w-[760px] h-[92vh] lg:h-full'
      } bg-slate-950/95 border-l border-t lg:border-t-0 border-cyan-500/30 shadow-2xl backdrop-blur-xl flex flex-col text-white`}
    >
      {/* Drawer Top Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Vertical Depth Sounding
              </h2>
              <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                {basinName}
              </span>
            </div>
            {lat !== undefined && lon !== undefined && (
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lat: <strong className="text-cyan-200">{lat.toFixed(2)}°N</strong></span>
                <span>•</span>
                <span>Lon: <strong className="text-cyan-200">{lon.toFixed(2)}°E</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {soundingData && (
            <button
              onClick={() => onExportCsv(lat, lon)}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
              title="Download Research Oceanography CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden lg:flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Full Screen'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-400 border border-slate-700 transition cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800/80 bg-slate-900/40 text-xs">
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'chart'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Sounding Profile (0–2000m)</span>
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'table'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Stratification Data</span>
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'architecture'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Model Pipeline (CNN + ViT)</span>
        </button>
      </div>

      {/* Main Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3 text-cyan-400">
            <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-mono tracking-wider animate-pulse">
              Extracting 2D Spatial Patch & Running CNN + ViT Inference...
            </span>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : soundingData ? (
          <>
            {/* Metric KPI Cards */}
            <MetricsCards
              metrics={soundingData.metrics}
              surfaceParams={soundingData.surface_parameters}
            />

            {/* Tab 1: Chart View */}
            {activeTab === 'chart' && (
              <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Inverted Depth Temperature Profile</span>
                  </h3>
                  <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    RMSE: {soundingData.metrics?.rmse_c} °C | R²: {soundingData.metrics?.r2_score}
                  </div>
                </div>

                <SoundingChart
                  soundings={soundingData.soundings}
                  mld={soundingData.metrics?.mld_m}
                  height={isExpanded ? 580 : 440}
                />
              </div>
            )}

            {/* Tab 2: Stratification Table */}
            {activeTab === 'table' && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>15-Stratum Discrete Oceanographic Levels</span>
                  <span className="text-slate-400 font-normal text-[11px]">Seabird CTD Benchmark Comparison</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5">Depth (m)</th>
                        <th className="px-3.5 py-2.5 text-cyan-300">OceanEmbed Pred (°C)</th>
                        <th className="px-3.5 py-2.5 text-amber-300">ARGO In-Situ (°C)</th>
                        <th className="px-3.5 py-2.5 text-slate-300">Delta Error (°C)</th>
                        <th className="px-3.5 py-2.5 text-slate-400">Stratum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {soundingData.soundings?.map((row) => {
                        const d = row.depth;
                        let stratum = "Mixed Layer";
                        if (d > 50 && d <= 200) stratum = "Upper Thermocline";
                        else if (d > 200 && d <= 1000) stratum = "Permanent Thermocline";
                        else if (d > 1000) stratum = "Abyssal Layer";

                        return (
                          <tr key={d} className="hover:bg-slate-800/50 transition-colors">
                            <td className="px-3.5 py-2 font-bold text-slate-300">{d} m</td>
                            <td className="px-3.5 py-2 font-bold text-cyan-300">{row.predicted.toFixed(3)}</td>
                            <td className="px-3.5 py-2 font-bold text-amber-300">{row.argo.toFixed(3)}</td>
                            <td className="px-3.5 py-2 text-emerald-400">
                              {Math.abs(row.diff).toFixed(3)}
                            </td>
                            <td className="px-3.5 py-2 text-[11px] text-slate-400 font-sans">{stratum}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Model Architecture */}
            {activeTab === 'architecture' && <ModelArchitecture />}
          </>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
            <Compass className="w-8 h-8 text-cyan-500 mb-2 opacity-60 animate-bounce" />
            <span>Click any coordinate on the interactive map to dispatch a 3D sounding</span>
          </div>
        )}
      </div>
    </div>
  );
}

