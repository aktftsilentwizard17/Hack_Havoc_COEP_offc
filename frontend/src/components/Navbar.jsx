import React from 'react';
import { Waves, Activity, Cpu, MapPin, Compass, ShieldCheck, Sparkles } from 'lucide-react';

export default function Navbar({ systemStatus, presets, onSelectPreset, activePresetId, manualCoords, setManualCoords, onManualSubmit }) {
  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-cyan-900/40 text-white sticky top-0 z-40 shadow-xl">
      {/* Top Banner: SIH 2026 & Ministry Branding */}
      <div className="bg-gradient-to-r from-blue-950 via-cyan-950 to-slate-950 px-4 py-1.5 border-b border-cyan-800/30 text-xs flex flex-wrap items-center justify-between text-cyan-200/90">
        <div className="flex items-center gap-2 font-medium">
          <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase">
            Smart India Hackathon 2026
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline font-mono">Problem Statement: <strong className="text-white">SIH26066</strong></span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-cyan-300">Ministry of Earth Sciences (MoES)</span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
            <span className={`w-2 h-2 rounded-full ${systemStatus?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-slate-300">Engine:</span>
            <strong className="text-emerald-400 font-mono uppercase">{systemStatus?.device || 'CPU'}</strong>
          </div>
          <div className="hidden lg:flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>0.25° Physics Reanalysis</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-300/30">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                OceanEmbed
              </h1>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold">
                v1.0-MoES
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              3D Ocean Subsurface Temperature Profile AI Reconstruction (0–2000m)
            </p>
          </div>
        </div>

        {/* Judge Quick Demo Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-cyan-400/80 font-medium mr-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Judge Presets:</span>
          </div>
          {presets.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30 font-semibold'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-200 border-slate-700 hover:border-cyan-500/50 hover:text-cyan-300'
                }`}
                title={preset.description}
              >
                <MapPin className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-cyan-400'}`} />
                <span>{preset.name.split(' ')[0]} {preset.name.split(' ')[1]}</span>
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${isActive ? 'bg-slate-950/20 text-slate-900' : 'bg-slate-900 text-slate-400'}`}>
                  {preset.latitude}°N
                </span>
              </button>
            );
          })}
        </div>

        {/* Manual Coordinates Form */}
        <form onSubmit={onManualSubmit} className="hidden md:flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 rounded-lg p-1">
          <div className="flex items-center gap-1 px-1.5 text-slate-400 text-xs font-mono">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lat:</span>
            <input
              type="number"
              step="0.1"
              min="5.0"
              max="30.0"
              value={manualCoords.lat}
              onChange={(e) => setManualCoords({ ...manualCoords, lat: e.target.value })}
              className="w-14 bg-slate-900 text-white rounded px-1.5 py-0.5 text-xs font-mono border border-slate-700 focus:outline-none focus:border-cyan-400"
              placeholder="15.0"
            />
          </div>
          <div className="flex items-center gap-1 px-1.5 text-slate-400 text-xs font-mono">
            <span>Lon:</span>
            <input
              type="number"
              step="0.1"
              min="45.0"
              max="105.0"
              value={manualCoords.lon}
              onChange={(e) => setManualCoords({ ...manualCoords, lon: e.target.value })}
              className="w-14 bg-slate-900 text-white rounded px-1.5 py-0.5 text-xs font-mono border border-slate-700 focus:outline-none focus:border-cyan-400"
              placeholder="75.0"
            />
          </div>
          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
          >
            Probe
          </button>
        </form>
      </div>
    </header>
  );
}

