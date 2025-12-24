import React, { useRef, useEffect, useState, useMemo } from 'react';
import { SimConfig, ViewState, MicState, Source } from '../types';
import { SPEED_OF_SOUND } from '../constants';
import { generateSources, fillHeatmapColor } from '../utils/audioPhysics';

interface ViewportProps {
  config: SimConfig;
  updateConfig: (updates: Partial<SimConfig>) => void;
  mic: MicState;
  setMic: React.Dispatch<React.SetStateAction<MicState>>;
  isDimmed: boolean;
  setIsDimmed: (d: boolean) => void;
}

const Viewport: React.FC<ViewportProps> = ({ config, updateConfig, mic, setMic, isDimmed, setIsDimmed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Physics State (Mutable for Animation Loop)
  const physicsRef = useRef({
    time: 0,
    config: config,
    mic: mic
  });

  // Sync ref with props
  useEffect(() => { physicsRef.current.config = config; }, [config]);
  useEffect(() => { physicsRef.current.mic = mic; }, [mic]);

  // View State (Zoom/Pan)
  const [view, setView] = useState<ViewState>({ scale: 30, x: 0, y: 0 });
  const viewRef = useRef(view); // Ref for loop access
  useEffect(() => { viewRef.current = view; }, [view]);

  // Dragging State
  const dragRef = useRef<{
    active: boolean;
    type: 'view' | 'mic' | 'baffle' | null;
    lastX: number;
    lastY: number;
    baffleIndex: number;
    lastPinchDist: number;
  }>({
    active: false,
    type: null,
    lastX: 0,
    lastY: 0,
    baffleIndex: -1,
    lastPinchDist: 0
  });

  // HUD Computed Values
  const lambda = SPEED_OF_SOUND / config.freq;
  const delay = (config.dist / SPEED_OF_SOUND) * 1000;
  
  const statusInfo = useMemo(() => {
    const limit = (2/3) * lambda; 
    const optimal = lambda / 4;
    
    if (config.dist > limit && config.count > 1) return { text: "ALIASING", color: "text-red-500 font-bold" };
    if (Math.abs(config.dist - optimal) < optimal * 0.15 && config.count > 1) return { text: "OPTIMO λ/4", color: "text-green-500 font-bold" };
    return { text: config.count === 1 ? "PUNTUAL" : "ESTANDAR", color: "text-white" };
  }, [config.dist, config.count, lambda]);

  // Canvas Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = true;

    let animationFrameId: number;

    const draw = () => {
      const { time, config: currConfig, mic: currMic } = physicsRef.current;
      const { scale: ppm, x: viewX, y: viewY } = viewRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w/2 + viewX;
      const cy = h/2 + viewY;

      // Clear
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      const startX = Math.floor((-cx)/ppm);
      const endX = Math.ceil((w-cx)/ppm);
      const startY = Math.floor((-cy)/ppm);
      const endY = Math.ceil((h-cy)/ppm);
      
      for(let gx=startX; gx<=endX; gx++) { const sx = cx + gx*ppm; ctx.moveTo(sx, 0); ctx.lineTo(sx, h); }
      for(let gy=startY; gy<=endY; gy++) { const sy = cy + gy*ppm; ctx.moveTo(0, sy); ctx.lineTo(w, sy); }
      ctx.stroke();
      ctx.restore();

      // Calculation
      const sources = generateSources(currConfig);
      const wallYVal = currConfig.stageDist;
      const k = (2 * Math.PI * currConfig.freq) / SPEED_OF_SOUND;
      const timePhase = time * 0.5;

      // Heatmap Data Generation
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Prepare simulation sources (Direct + Reflection)
      const simSources: (Source & { sx: number, sy: number, isRef: boolean })[] = [];
      const isReflectionActive = currConfig.stageWidth > 0;

      sources.forEach(s => {
        // Direct
        simSources.push({ ...s, sx: cx + s.x * ppm, sy: cy + s.y * ppm, isRef: false });
        // Reflected
        if (isReflectionActive) {
          const vy = wallYVal + (wallYVal - s.y);
          // Mirror orientation: if real is Up (dirDown=false), virtual is Down (dirDown=true)
          const virtualDirDown = !s.dirDown;
          simSources.push({ ...s, y: vy, dirDown: virtualDirDown, sx: cx + s.x * ppm, sy: cy + vy * ppm, isRef: true });
        }
      });

      // Pixel Loop (Heavy)
      // optimization: lower resolution if dragging? No, keep quality requested.
      for(let y=0; y<h; y++) {
        const rowOff = y * w * 4;
        for(let x=0; x<w; x++) {
          let pSum = 0;
          for(let i=0; i<simSources.length; i++) {
            const s = simSources[i];
            const dx = x - s.sx; 
            const dy = y - s.sy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const distMeters = dist / ppm;
            const dClamped = Math.max(0.1, distMeters);

            let ampD = (1.0 / dClamped);

            // Directivity Cardioid
            // Front Vector depends on dirDown.
            // dirDown=true (down) => Front=(0,1). CosTheta = dy/dist.
            // dirDown=false (up) => Front=(0,-1). CosTheta = -dy/dist.
            const cosTheta = s.dirDown ? (dy/dist) : (-dy/dist);
            const directivity = (1.0 + cosTheta) / 2.0;

            if (s.isRef) ampD *= 0.6; // -4dB approx

            // Wave
            // phase is pre-calculated in generateSources based on delay
            // Wave = Amp * Directivity * Sin(k*d - wt - phase + inversion)
            const phaseOffset = s.phase || 0;
            const invOffset = s.inv ? Math.PI : 0;
            
            pSum += ampD * directivity * Math.sin((k * distMeters) - timePhase - phaseOffset + invOffset);
          }

          const idx = rowOff + (x * 4);
          const db = 20 * Math.log10(Math.abs(pSum) + 1e-7);
          fillHeatmapColor(db, data, idx);
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // Draw Rulers
      const rulerColor = 'rgba(255,255,255,0.4)';
      const subTickColor = 'rgba(255,255,255,0.2)';
      ctx.save();
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '9px monospace';
      ctx.lineWidth = 1;
      
      const rulerY = h - 20;
      ctx.strokeStyle = rulerColor;
      ctx.beginPath(); ctx.moveTo(0, rulerY); ctx.lineTo(w, rulerY); ctx.stroke();

      for (let m = startX; m <= endX; m++) {
        const rx = cx + m * ppm;
        if (rx < 0 || rx > w) continue;
        ctx.strokeStyle = rulerColor;
        ctx.beginPath(); ctx.moveTo(rx, rulerY); ctx.lineTo(rx, rulerY + 8); ctx.stroke();
        ctx.fillText(m + "m", rx + 3, rulerY + 14);
        
        ctx.strokeStyle = subTickColor;
        for(let sm=1; sm<10; sm++) {
           const sx = rx + (sm * 0.1 * ppm);
           if (sx > w) break;
           ctx.beginPath(); ctx.moveTo(sx, rulerY); ctx.lineTo(sx, rulerY + 3); ctx.stroke();
        }
      }

      const rulerX = 30;
      ctx.strokeStyle = rulerColor;
      ctx.beginPath(); ctx.moveTo(rulerX, 0); ctx.lineTo(rulerX, h); ctx.stroke();
      for (let m = startY; m <= endY; m++) {
        const ry = cy + m * ppm;
        if (ry < 0 || ry > h) continue;
        ctx.strokeStyle = rulerColor;
        ctx.beginPath(); ctx.moveTo(rulerX - 8, ry); ctx.lineTo(rulerX, ry); ctx.stroke();
        ctx.fillText((-m) + "m", 2, ry + 3);
        
        ctx.strokeStyle = subTickColor;
        for(let sm=1; sm<10; sm++) {
           const sy = ry + (sm * 0.1 * ppm);
           if (sy > h) break;
           ctx.beginPath(); ctx.moveTo(rulerX - 3, sy); ctx.lineTo(rulerX, sy); ctx.stroke();
        }
      }
      ctx.restore();

      // Transform for World Objects
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(ppm, ppm);

      // Stage
      if (currConfig.stageWidth > 0) {
        const sw = currConfig.stageWidth;
        const sd = currConfig.stageDist;
        ctx.fillStyle = 'rgba(40, 40, 80, 0.6)';
        ctx.fillRect(-sw/2, sd, sw, 10.0);
        ctx.strokeStyle = '#88f'; ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.moveTo(-sw/2, sd); ctx.lineTo(sw/2, sd); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 0.5px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText("ESCENARIO", 0, sd + 0.8);
      }

      // Baffles
      sources.forEach(s => {
        const size = 0.4;
        ctx.fillStyle = s.inv ? '#ef4444' : '#e4e4e7';
        ctx.strokeStyle = s.dirDown ? '#3b82f6' : '#000';
        ctx.lineWidth = 0.04;
        ctx.beginPath();
        ctx.arc(s.x, s.y, size/2, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(s.x, s.y);
        if (s.dirDown) ctx.rotate(Math.PI);
        ctx.fillStyle = "rgba(0,0,0,0.5)"; 
        ctx.beginPath(); ctx.moveTo(-0.1, 0); ctx.lineTo(0.1, 0); ctx.lineTo(0, -0.25); ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(s.x, s.y - 0.6);
        ctx.scale(0.04, 0.04);
        ctx.fillStyle = "rgba(0,0,0,0.8)"; 
        ctx.beginPath(); ctx.roundRect(-25, -10, 50, 20, 5); ctx.fill();
        ctx.fillStyle = "#3b82f6"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold 14px sans-serif";
        ctx.fillText(s.delay.toFixed(2) + "ms", 0, 0);
        ctx.restore();
      });

      // Mic Calculation (Distance)
      const mx = currMic.x;
      const my = currMic.y;
      let closestDist = 999;
      sources.forEach(s => {
        const d = Math.sqrt(Math.pow(mx - s.x, 2) + Math.pow(my - s.y, 2));
        if (d < closestDist) closestDist = d;
      });

      // Draw Mic
      ctx.translate(mx, my);
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.arc(0, 0, 0.8, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.6, 0); ctx.lineTo(0.6, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -0.6); ctx.lineTo(0, 0.6); ctx.stroke();

      ctx.save();
      ctx.fillStyle = "#fff"; ctx.font = 'bold 0.4px monospace'; ctx.textAlign = 'left';
      ctx.shadowColor = "black"; ctx.shadowBlur = 4;
      ctx.fillText(`Dist: ${closestDist.toFixed(2)}m`, 0.8, -0.5);
      ctx.restore();

      ctx.restore(); // End World Transform

      // Oscilloscope Overlay (Screen Space)
      const micScreenX = cx + mx * ppm;
      const micScreenY = cy + my * ppm;
      const boxW = 120, boxH = 60;
      const boxX = micScreenX - 140; 
      const boxY = micScreenY - 30;

      // Oscilloscope Maths
      let complexSumR = 0, complexSumI = 0;
      let magSum = 0, maxSingleMag = 0;

      simSources.forEach(s => {
        const d = Math.sqrt(Math.pow(mx - s.x, 2) + Math.pow(my - s.y, 2));
        const phase = (k*d) - (s.phase||0) + (s.inv ? Math.PI : 0);
        
        const vSMx = mx - s.x; const vSMy = my - s.y;
        const distSM = Math.sqrt(vSMx*vSMx + vSMy*vSMy);
        const cosTheta = s.dirDown ? (vSMy/distSM) : (-vSMy/distSM);
        const direct = (1.0 + cosTheta)/2.0;

        let amp = (1.0 / Math.max(0.1, d)) * direct;
        if(s.isRef) amp *= 0.6;

        complexSumR += amp * Math.cos(phase);
        complexSumI += amp * Math.sin(phase);
        magSum += amp;
        if (!s.isRef && amp > maxSingleMag) maxSingleMag = amp;
      });

      const vectorSumMag = Math.sqrt(complexSumR*complexSumR + complexSumI*complexSumI);
      const coherence = magSum > 0 ? (vectorSumMag / magSum) : 0;

      let oscColor = "#00ff00";
      let oscText = "";
      let shadowColor = "transparent";
      let shadowBlur = 0;

      if (maxSingleMag > 0 && vectorSumMag < maxSingleMag * 0.15) {
        oscColor = "#ef4444"; oscText = "CANCELACIÓN"; shadowColor = "#ef4444"; shadowBlur = 10;
      } else if (coherence > 0.985) {
        oscColor = "#ffd700"; oscText = "FASE 0° - SUMA MÁXIMA"; shadowColor = "#ffd700"; shadowBlur = 15;
      }

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = oscColor; ctx.lineWidth = 2; ctx.shadowColor = shadowColor; ctx.shadowBlur = shadowBlur;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(boxX, boxY + boxH/2); ctx.lineTo(boxX+boxW, boxY + boxH/2); ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = oscColor; ctx.lineWidth = 2;
      for(let i=0; i<boxW; i++) {
        const tOffset = i * 0.2;
        const totalPhase = Math.atan2(complexSumI, complexSumR);
        const val = vectorSumMag * Math.sin(timePhase + tOffset - totalPhase);
        const y = boxY + boxH/2 - (val * 15);
        if(i===0) ctx.moveTo(boxX+i, y); else ctx.lineTo(boxX+i, y);
      }
      ctx.stroke();

      if (oscText) {
        ctx.fillStyle = oscColor; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.shadowColor = "black"; ctx.shadowBlur = 2;
        ctx.fillText(oscText, boxX + boxW/2, boxY + 12);
      }
      ctx.restore();

      // Update time if playing
      if (currConfig.isPlaying) {
        physicsRef.current.time += 0.2;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrameId);
  }, []); // Logic is inside loop via refs

  // Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only capture primary button or touch
    if (e.target !== canvasRef.current) return;
    
    // Pinch detection would go here if extending for mobile pinch, 
    // but sticking to standard pointer events for now.
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ppm = view.scale;
    const cx = canvas.width/2 + view.x;
    const cy = canvas.height/2 + view.y;
    const mx = cx + mic.x * ppm;
    const my = cy + mic.y * ppm;

    // Hit Test Mic
    if (Math.hypot(x - mx, y - my) < 50) {
      dragRef.current = { active: true, type: 'mic', lastX: clientX, lastY: clientY, baffleIndex: -1, lastPinchDist: 0 };
      setIsDimmed(true);
      return;
    }

    // Hit Test Baffles
    const sources = generateSources(config);
    let closest = -1;
    let minD = 50;
    sources.forEach((s, i) => {
      const sx = cx + s.x * ppm;
      const sy = cy + s.y * ppm;
      const d = Math.hypot(x - sx, y - sy);
      if (d < minD) { minD = d; closest = i; }
    });

    if (closest !== -1) {
      dragRef.current = { active: true, type: 'baffle', lastX: clientX, lastY: clientY, baffleIndex: closest, lastPinchDist: 0 };
      setIsDimmed(true);
    } else {
      dragRef.current = { active: true, type: 'view', lastX: clientX, lastY: clientY, baffleIndex: -1, lastPinchDist: 0 };
      setIsDimmed(true);
    }
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;

    if (dragRef.current.type === 'view') {
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
    } else if (dragRef.current.type === 'mic') {
      const ppm = view.scale;
      setMic(m => ({ x: m.x + dx/ppm, y: m.y + dy/ppm }));
      // Invalidate optimization if needed (parent handles logic)
      if (config.isOptimized) updateConfig({ isOptimized: false });
    } else if (dragRef.current.type === 'baffle') {
      const ppm = view.scale;
      // Dragging baffle usually changes distribution distance in the original app
      // Logic: vertical drag changes distance
      const dM = -dy / ppm;
      if (Math.abs(dM) > 0) {
        let newDist = config.dist + (dM * 0.5);
        newDist = Math.max(0.2, Math.min(4.0, newDist));
        updateConfig({ dist: newDist, isOptimized: false });
      }
    }

    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragRef.current.active = false;
    dragRef.current.type = null;
    setIsDimmed(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setView(v => ({ ...v, scale: Math.max(5, Math.min(100, v.scale * factor)) }));
  };

  // Resize Handling
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div id="viewport" ref={containerRef} className="flex-1 relative bg-black overflow-hidden cursor-crosshair flex items-center justify-center z-10">
      <canvas 
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="block touch-none blur-[0.5px] contrast-110"
      />
      
      {/* HUD Panel */}
      <div className="absolute top-2.5 left-2.5 bg-black/60 border border-white/10 backdrop-blur-sm p-2 rounded w-[140px] pointer-events-none z-15 select-none">
        <div className="flex justify-between text-[9px] font-mono mb-0.5">
          <span className="text-zinc-400">Longitud Onda:</span>
          <span className="text-white font-bold">{lambda.toFixed(2)} m</span>
        </div>
        <div className="flex justify-between text-[9px] font-mono mb-0.5">
          <span className="text-zinc-400">Estado:</span>
          <span className={statusInfo.color}>{statusInfo.text}</span>
        </div>
        {config.mode === 'endfire' && config.count > 1 && (
          <div className="flex justify-between text-[9px] font-mono">
             <span className="text-zinc-400">Delay E.F.:</span>
             <span className="text-amber-500 font-bold">{delay.toFixed(2)} ms</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Viewport;