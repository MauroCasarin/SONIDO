import React from 'react';
import { SimConfig } from '../types';
import { SPEED_OF_SOUND } from '../constants';

interface ControlsProps {
  config: SimConfig;
  updateConfig: (updates: Partial<SimConfig>) => void;
  togglePlay: () => void;
  toggleGuide: () => void;
  onOptimize: () => void;
  setBafflePolarity: (index: number) => void;
  setBaffleDirection: (index: number) => void;
  setBaffleDelay: (index: number, val: number) => void;
}

const Controls: React.FC<ControlsProps> = ({
  config,
  updateConfig,
  togglePlay,
  toggleGuide,
  onOptimize,
  setBafflePolarity,
  setBaffleDirection,
  setBaffleDelay
}) => {
  
  const setLambdaFraction = (frac: number) => {
    let optimal = (SPEED_OF_SOUND / config.freq) * frac;
    optimal = Math.min(4.0, Math.max(0.2, optimal));
    updateConfig({ dist: optimal, isOptimized: false });
  };

  return (
    <div id="controles" className={`
      w-full md:w-[280px] bg-zinc-900/95 md:border-r border-t md:border-t-0 border-white/10 
      p-2.5 flex flex-col gap-2 overflow-y-auto shrink-0 z-20 transition-opacity duration-200
      max-h-[350px] md:max-h-full absolute bottom-0 md:relative md:bottom-auto md:left-auto
    `}>
      {/* Top Controls */}
      <div className="flex gap-1.5 mb-1 shrink-0">
        <button 
          onClick={togglePlay}
          className={`
            flex-1 h-8 flex items-center justify-center text-sm font-bold uppercase rounded border transition-all
            ${config.isPlaying 
              ? "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700" 
              : "bg-zinc-900 border-zinc-600 text-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)] animate-pulse border-blue-500"}
          `}
        >
          {config.isPlaying ? '❚❚' : '▶'}
        </button>
        <button 
          onClick={toggleGuide}
          className="h-8 w-8 flex items-center justify-center font-bold text-sm bg-zinc-800 border border-zinc-600 text-zinc-400 rounded hover:bg-zinc-700 hover:text-white"
        >
          ?
        </button>
      </div>

      {/* Source Params */}
      <div className="flex flex-col gap-1 bg-white/[0.03] p-2 rounded border border-white/5">
        <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Fuente (Subgraves)</div>
        
        {/* Frequency */}
        <div className="mb-0.5">
          <div className="flex justify-between text-[9px] text-zinc-400 mb-px">
            <span>Freq</span>
            <span className="text-blue-500 font-mono font-bold">{config.freq} Hz</span>
          </div>
          <input 
            type="range" min="20" max="200" value={config.freq}
            onChange={(e) => updateConfig({ freq: Number(e.target.value), isOptimized: false })}
          />
        </div>

        {/* Count */}
        <div className="mb-0.5">
          <div className="flex justify-between text-[9px] text-zinc-400 mb-px">
            <span>Bafles (N)</span>
            <span className="text-blue-500 font-mono font-bold">{config.count}</span>
          </div>
          <input 
            type="range" min="1" max="8" step="1" value={config.count}
            onChange={(e) => updateConfig({ count: Number(e.target.value), isOptimized: false })}
          />
        </div>
        <div className="text-[9px] text-zinc-600 mb-1">* Patrón Cardioide: (1 + cosθ)/2</div>

        {/* Separation */}
        <div className={`${config.count === 1 ? 'opacity-30 pointer-events-none' : ''}`}>
          <div className="flex justify-between text-[9px] text-zinc-400 mb-px">
            <span>Separación</span>
            <span className="text-blue-500 font-mono font-bold">{config.dist.toFixed(2)} m</span>
          </div>
          <input 
            type="range" min="0.2" max="4.0" step="0.01" value={config.dist}
            onChange={(e) => updateConfig({ dist: Number(e.target.value), isOptimized: false })}
          />
          <div className="flex gap-1 mt-1">
            <button className="flex-1 py-1 text-[8px] bg-zinc-800 border border-zinc-600 rounded text-zinc-400 hover:text-white uppercase" onClick={() => setLambdaFraction(0.25)}>λ/4 (Max)</button>
            <button className="flex-1 py-1 text-[8px] bg-zinc-800 border border-zinc-600 rounded text-zinc-400 hover:text-white uppercase" onClick={() => setLambdaFraction(0.5)}>λ/2 (Dir)</button>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="flex flex-col gap-1 bg-white/[0.03] p-2 rounded border border-white/5">
        <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Configuración</div>
        <div className="flex gap-1">
          <button 
            onClick={() => updateConfig({ mode: 'broadside', isOptimized: false })}
            className={`flex-1 py-1.5 text-[9px] font-semibold uppercase rounded border transition-all ${config.mode === 'broadside' ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-zinc-800 border-zinc-600 text-zinc-400'}`}
          >
            Broadside
          </button>
          <button 
            onClick={() => updateConfig({ mode: 'endfire', isOptimized: false })}
            className={`flex-1 py-1.5 text-[9px] font-semibold uppercase rounded border transition-all ${config.mode === 'endfire' ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-zinc-800 border-zinc-600 text-zinc-400'}`}
          >
            End-Fire
          </button>
        </div>
        <button 
          onClick={() => updateConfig({ lrMode: !config.lrMode, isOptimized: false })}
          className={`w-full mt-1 py-1.5 text-[9px] font-semibold uppercase rounded border transition-all ${config.lrMode ? 'bg-blue-500 text-white border-blue-500' : 'bg-zinc-800 border-zinc-600 text-zinc-400'}`}
        >
          {config.lrMode ? 'Modo: Stereo L/R' : 'Modo: Mono Central'}
        </button>
        
        <div className="mt-1">
          <div className="flex justify-between text-[9px] text-zinc-400 mb-px">
            <span>Margen L/R</span>
            <span className="text-blue-500 font-mono font-bold">{config.lateralMargin.toFixed(1)} m</span>
          </div>
          <input 
            type="range" min="0" max="5.0" step="0.1" value={config.lateralMargin}
            onChange={(e) => updateConfig({ lateralMargin: Number(e.target.value), isOptimized: false })}
          />
        </div>
      </div>

      {/* Optimization */}
      <div className="flex flex-col gap-1 bg-white/[0.03] p-2 rounded border border-white/5">
        <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Mic & Optimización</div>
        <button 
          onClick={onOptimize}
          className="w-full py-1.5 text-[9px] font-semibold uppercase rounded border-none text-white shadow-[0_0_8px_rgba(124,58,237,0.3)] bg-gradient-to-br from-indigo-600 to-violet-600 hover:to-violet-500"
        >
          ✨ Focus
        </button>
        {config.isOptimized && (
          <div className="text-center text-[#a3e635] text-[9px] font-bold mt-0.5 animate-pulse">OPTIMIZADO</div>
        )}
      </div>

      {/* Stage */}
      <div className="flex flex-col gap-1 bg-white/[0.03] p-2 rounded border border-white/5">
        <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Escenario (Reflector -4dB)</div>
        <div className="mb-0.5">
          <div className="flex justify-between text-[9px] text-zinc-400 mb-px">
            <span>Distancia Pared</span>
            <span className="text-blue-500 font-mono font-bold">{config.stageDist.toFixed(1)} m</span>
          </div>
          <input 
            type="range" min="0" max="5.0" step="0.1" value={config.stageDist}
            onChange={(e) => updateConfig({ stageDist: Number(e.target.value) })}
          />
        </div>
        <div className="mb-0.5">
          <div className="flex justify-between text-[9px] text-zinc-400 mb-px">
            <span>Ancho Escenario</span>
            <span className="text-blue-500 font-mono font-bold">{config.stageWidth.toFixed(1)} m</span>
          </div>
          <input 
            type="range" min="0" max="10" step="0.1" value={config.stageWidth}
            onChange={(e) => updateConfig({ stageWidth: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Baffle List */}
      <div className="flex flex-col gap-1 bg-white/[0.03] p-2 rounded border border-white/5">
        <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Controles por Bafle</div>
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: config.count }).map((_, i) => (
            <div key={i} className="flex items-center gap-1 bg-black/20 p-1 rounded justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-zinc-400 w-3 font-bold">{i + 1}</span>
              </div>
              <div className="flex items-center gap-1 flex-1">
                <button 
                  onClick={() => setBafflePolarity(i)}
                  className={`flex-1 flex items-center justify-center h-5 text-[9px] border rounded transition-colors ${config.polarities[i] ? 'bg-red-500/20 text-red-500 border-red-500 font-bold' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}
                >
                  Ø
                </button>
                <button 
                  onClick={() => setBaffleDirection(i)}
                  className={`flex-1 flex items-center justify-center h-5 text-[9px] border rounded transition-colors ${config.directions[i] ? 'bg-blue-500/20 text-blue-500 border-blue-500 font-bold' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}
                >
                  ⟲
                </button>
              </div>
              <div className="flex-[1.5] flex flex-col ml-0.5">
                <input 
                  type="range" min="0" max="50" step="0.01" 
                  value={config.delays[i] || 0}
                  className="h-0.5 my-0.5"
                  onChange={(e) => setBaffleDelay(i, Number(e.target.value))}
                />
                <div className="text-[8px] text-amber-500 text-right font-mono leading-none">
                  {(config.delays[i] || 0).toFixed(2)} ms
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Controls;