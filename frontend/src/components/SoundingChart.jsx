import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { Thermometer, Anchor, Activity } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const depth = data.depth;
    let stratum = "Epipelagic (Surface Layer)";
    if (depth > 50 && depth <= 200) stratum = "Upper Thermocline";
    else if (depth > 200 && depth <= 1000) stratum = "Permanent Thermocline";
    else if (depth > 1000) stratum = "Bathypelagic Abyssal Layer";

    const pred = data.predicted;
    const argo = data.argo;
    const diff = Math.abs(pred - argo).toFixed(3);

    return (
      <div className="bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs min-w-[200px]">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-2">
          <div className="flex items-center gap-1 text-cyan-400 font-mono font-semibold">
            <Anchor className="w-3.5 h-3.5" />
            <span>Depth: {depth} m</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{stratum}</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-cyan-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400"></span>
              OceanEmbed AI:
            </span>
            <strong className="font-mono text-cyan-200 text-sm">{pred.toFixed(2)} °C</strong>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-amber-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
              ARGO Float In-Situ:
            </span>
            <strong className="font-mono text-amber-200 text-sm">{argo.toFixed(2)} °C</strong>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-1 text-[11px]">
            <span className="text-slate-400">Reconstruction Error:</span>
            <span className="font-mono font-semibold text-emerald-400">Δ {diff} °C</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function SoundingChart({ soundings, mld, height = 440 }) {
  if (!soundings || soundings.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-xs font-mono">
        No sounding profile data available
      </div>
    );
  }

  // Format data for Recharts: X is temperature, Y is depth
  return (
    <div className="relative w-full">
      {/* Visual Chart Header / Legend Tags */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-md text-cyan-300 font-medium">
            <span className="w-3 h-1 bg-cyan-400 rounded"></span>
            <span>OceanEmbed Reconstruction</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-950/50 border border-amber-500/30 px-2.5 py-1 rounded-md text-amber-300 font-medium">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-400"></span>
            <span>ARGO Ground Truth</span>
          </div>
        </div>

        {mld && (
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 text-slate-300 font-mono text-[11px]">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Mixed Layer Base (MLD): <strong className="text-white">{mld}m</strong></span>
          </div>
        )}
      </div>

      {/* Inverted Recharts Container */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <LineChart
            data={soundings}
            layout="vertical"
            margin={{ top: 10, right: 25, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
            
            {/* Inverted Depth Axis: 0m at surface (top), 2000m at abyssal bottom */}
            <YAxis
              dataKey="depth"
              type="number"
              reversed={true}
              domain={[0, 2000]}
              ticks={[0, 100, 200, 300, 500, 750, 1000, 1500, 2000]}
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickFormatter={(val) => `${val}m`}
              label={{
                value: 'Depth (meters) ↓',
                angle: -90,
                position: 'insideLeft',
                offset: -2,
                fill: '#94a3b8',
                fontSize: 12,
                fontFamily: 'monospace'
              }}
            />

            {/* Temperature X-Axis */}
            <XAxis
              type="number"
              domain={[0, 32]}
              ticks={[0, 5, 10, 15, 20, 25, 30]}
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickFormatter={(val) => `${val}°C`}
              label={{
                value: 'Temperature (°C) →',
                position: 'insideBottom',
                offset: -12,
                fill: '#94a3b8',
                fontSize: 12,
                fontFamily: 'monospace'
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* MLD Reference Line */}
            {mld && (
              <ReferenceLine
                y={mld}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                label={{
                  value: `MLD: ${mld}m`,
                  fill: '#38bdf8',
                  fontSize: 10,
                  position: 'insideRight'
                }}
              />
            )}

            {/* Permanent Thermocline Baseline (1000m) */}
            <ReferenceLine
              y={1000}
              stroke="#475569"
              strokeDasharray="2 2"
              label={{
                value: 'Mesopelagic Base (1000m)',
                fill: '#64748b',
                fontSize: 9,
                position: 'insideRight'
              }}
            />

            {/* ARGO Float Ground Truth Line (Amber Dashed) */}
            <Line
              type="monotone"
              dataKey="argo"
              stroke="#f59e0b"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 1, stroke: '#1e293b' }}
              activeDot={{ r: 6, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
              name="ARGO Float"
            />

            {/* OceanEmbed Prediction Line (Cyan Solid) */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#06b6d4"
              strokeWidth={3}
              dot={{ r: 4, fill: '#06b6d4', strokeWidth: 1.5, stroke: '#083344' }}
              activeDot={{ r: 7, fill: '#22d3ee', stroke: '#fff', strokeWidth: 2 }}
              name="OceanEmbed AI"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Ocean Stratification Legend Footnote */}
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-slate-400 border-t border-slate-800 pt-2 font-mono">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          <span>0–200m: Epipelagic</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <span>200–1000m: Mesopelagic</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          <span>1000–2000m: Abyssal</span>
        </div>
      </div>
    </div>
  );
}

