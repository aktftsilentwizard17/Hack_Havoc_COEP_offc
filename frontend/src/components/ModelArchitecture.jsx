import React from 'react';
import { Layers, Network, Cpu, ArrowRight, ShieldCheck, Database, GitMerge, Zap } from 'lucide-react';

export default function ModelArchitecture() {
  return (
    <div className="space-y-6 text-slate-200">
      {/* Intro Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1 text-sm">
          <Network className="w-4 h-4" />
          <span>Hybrid CNN + Vision Transformer (ViT) Architecture (SIH26066)</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          OceanEmbed couples a <strong>3-layer 2D Convolutional neural network</strong> for capturing local mesoscale eddy gradients
          with a <strong>Vision Transformer Context Encoder (d_model=128, 4 heads)</strong> to model basin-scale teleconnections,
          reconstructing continuous 15-strata vertical temperature soundings with physics-informed monotonic regularization.
        </p>
      </div>

      {/* Interactive Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Step 1: Input Patch */}
        <div className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-3.5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Input Tensor
              </span>
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <h4 className="font-semibold text-xs text-white mb-1">2D Satellite Surface Grid</h4>
            <p className="text-[11px] text-slate-400 mb-2">
              Multi-modal 5-channel patch centered at query coordinates.
            </p>
            <div className="space-y-1 text-[10px] font-mono text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
              <div className="text-cyan-300">• SST (thetao) & SSH (zos)</div>
              <div className="text-cyan-300">• Salinity SSS (so)</div>
              <div className="text-cyan-300">• Wind/Currents (uo, vo)</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-cyan-400">
            Shape: [B, 5, 16, 16]
          </div>
        </div>

        {/* Step 2: CNN Backbone */}
        <div className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-3.5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                Backbone 1
              </span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <h4 className="font-semibold text-xs text-white mb-1">3-Stage 2D CNN Extractor</h4>
            <p className="text-[11px] text-slate-400 mb-2">
              Captures thermal fronts, thermal anomalies & mesoscale vortices.
            </p>
            <div className="space-y-1 text-[10px] font-mono text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
              <div>• Conv2D(5→32) + BN + GELU</div>
              <div>• MaxPool2D(2×2) → [8×8]</div>
              <div>• Conv2D(32→64) + Pool → [4×4]</div>
              <div>• Conv2D(64→128) + BN</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-blue-400">
            Shape: [B, 128, 4, 4]
          </div>
        </div>

        {/* Step 3: ViT Context Encoder */}
        <div className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-3.5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                Backbone 2
              </span>
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <h4 className="font-semibold text-xs text-white mb-1">Vision Transformer (ViT)</h4>
            <p className="text-[11px] text-slate-400 mb-2">
              Basin-scale teleconnection self-attention & spatial context.
            </p>
            <div className="space-y-1 text-[10px] font-mono text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
              <div>• Flatten 16 Spatial Tokens</div>
              <div>• Learnable CLS Token</div>
              <div>• 1D Positional Encodings</div>
              <div>• 2-Layer Transformer (4 Heads)</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-indigo-400">
            CLS Token: [B, 128]
          </div>
        </div>

        {/* Step 4: Vertical Head */}
        <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-3.5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Vertical Head
              </span>
              <GitMerge className="w-4 h-4 text-emerald-400" />
            </div>
            <h4 className="font-semibold text-xs text-white mb-1">Depth Projection MLP</h4>
            <p className="text-[11px] text-slate-400 mb-2">
              Reconstructs 15 discrete ocean strata from surface to abyss.
            </p>
            <div className="space-y-1 text-[10px] font-mono text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
              <div>• Linear(128 → 128) + GELU</div>
              <div>• Linear(128 → 64) + GELU</div>
              <div>• Linear(64 → 15 Depths)</div>
              <div className="text-emerald-300">• Monotonic Regularization</div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-emerald-400">
            Output: [B, 15] (0–2000m)
          </div>
        </div>
      </div>

      {/* Physics Constraints & Loss Formula */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs mb-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Physics-Informed Loss Function</span>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-xs text-cyan-200/90 overflow-x-auto mb-2">
          {"L_total = L_MSE(T_pred, T_argo) + λ * Σ max(0, T(z_{i+1}) - T(z_i))^2"}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The monotonicity penalty prevents unphysical vertical density inversions in the water column,
          guaranteeing smooth thermal decay through the mixed layer (0–50m), steep thermocline (50–300m), and asymptotic convergence to the deep cold ocean (2.8°C at 2000m).
        </p>
      </div>
    </div>
  );
}

