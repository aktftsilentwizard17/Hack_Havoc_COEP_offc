import React from 'react';
import { Thermometer, Layers, Flame, Gauge, CheckCircle2, TrendingDown } from 'lucide-react';

export default function MetricsCards({ metrics, surfaceParams }) {
  if (!metrics) return null;

  const isRmseOptimal = (metrics.rmse_c || 0) < 0.45;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Surface SST */}
      <div className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 p-3 rounded-xl shadow-lg transition-all">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Surface SST</span>
          <Thermometer className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono text-cyan-200">
            {surfaceParams?.sst_c?.toFixed(2) || '--'}
          </span>
          <span className="text-xs text-slate-400">°C</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
          <span>SSH: {surfaceParams?.ssh_m > 0 ? `+${surfaceParams?.ssh_m}` : surfaceParams?.ssh_m}m</span>
          <span>{surfaceParams?.sss_psu} PSU</span>
        </div>
      </div>

      {/* 2. Mixed Layer Depth (MLD) */}
      <div className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 p-3 rounded-xl shadow-lg transition-all">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Mixed Layer Depth</span>
          <Layers className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono text-blue-200">
            {metrics.mld_m?.toFixed(1) || '--'}
          </span>
          <span className="text-xs text-slate-400">meters</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          ΔT = 0.2°C surface threshold
        </div>
      </div>

      {/* 3. Thermocline Gradient */}
      <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 p-3 rounded-xl shadow-lg transition-all">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Thermocline Grad.</span>
          <TrendingDown className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono text-indigo-200">
            {metrics.thermocline_gradient_c_per_100m?.toFixed(2) || '--'}
          </span>
          <span className="text-xs text-slate-400">°C/100m</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          Peak stratification rate
        </div>
      </div>

      {/* 4. Upper Ocean Heat Content (OHC) */}
      <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 p-3 rounded-xl shadow-lg transition-all">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Upper OHC (0-700m)</span>
          <Flame className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono text-amber-200">
            {metrics.upper_ohc_kj_cm2?.toFixed(1) || '--'}
          </span>
          <span className="text-xs text-slate-400">kJ/cm²</span>
        </div>
        <div className="mt-1 text-[10px] text-amber-400/80 font-medium">
          Cyclone heat potential
        </div>
      </div>

      {/* 5. Benchmark Model RMSE */}
      <div className="bg-slate-900/90 border border-emerald-900/60 hover:border-emerald-500/60 p-3 rounded-xl shadow-lg transition-all col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Benchmark RMSE</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono text-emerald-300">
            {metrics.rmse_c?.toFixed(3) || '--'}
          </span>
          <span className="text-xs text-slate-400">°C</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{isRmseOptimal ? 'Passed (<0.45°C Goal)' : 'Calibrated'}</span>
        </div>
      </div>
    </div>
  );
}

