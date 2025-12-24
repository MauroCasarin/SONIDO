import { SimConfig, Source } from '../types';
import { SPEED_OF_SOUND } from '../constants';

export const generateSources = (config: SimConfig): Source[] => {
  const sources: Source[] = [];
  const { mode, lrMode, count, dist, lateralMargin, polarities, directions, delays } = config;
  
  let xOffsets = [0];
  if (lrMode) xOffsets = [-lateralMargin, lateralMargin];

  const srcY = 0;

  xOffsets.forEach(xOff => {
    if (mode === 'broadside') {
      for (let i = 0; i < count; i++) {
        const totalW = (count - 1) * dist;
        const xPos = xOff - totalW / 2 + (i * dist);
        sources.push({
          x: xPos,
          y: srcY,
          inv: polarities[i] || false,
          dirDown: directions[i] || false,
          delay: delays[i] || 0
        });
      }
    } else {
      // End-fire logic
      for (let i = 0; i < count; i++) {
        const yPos = srcY - (i * dist);
        sources.push({
          x: xOff,
          y: yPos,
          inv: polarities[i] || false,
          dirDown: directions[i] || false,
          delay: delays[i] || 0
        });
      }
    }
  });

  // Calculate Phase for each source based on its electronic delay
  // phase = -(2 * PI * f) * (delay_ms / 1000)
  const k_freq = 2 * Math.PI * config.freq;
  sources.forEach(s => {
    s.phase = -k_freq * (s.delay / 1000);
  });

  return sources;
};

// Writes directly to the clamped array for performance
export const fillHeatmapColor = (db: number, data: Uint8ClampedArray, idx: number) => {
  let r = 0, g = 0, b = 0, a = 230;

  if (db > 0) {
    // White > Yellow
    r = 255; g = 255; b = Math.min(255, Math.floor(db * 40));
  } else if (db > -3) {
    // Yellow > Orange
    r = 255; g = Math.floor(160 + ((db + 3) / 3) * 95); b = 0;
  } else if (db > -6) {
    // Orange > Red
    r = 255; g = Math.floor(((db + 6) / 3) * 160); b = 0;
  } else if (db > -12) {
    // Red > Dark Red
    r = Math.floor(100 + ((db + 12) / 6) * 155); g = 0; b = 0;
  } else if (db > -24) {
    // Dark Red > Blue
    const t = (db + 24) / 12;
    r = Math.floor(t * 100); g = 0; b = Math.floor((1 - t) * 200);
  } else if (db > -60) {
    // Blue > Black
    const t = (db + 60) / 36;
    r = 0; g = 0; b = Math.floor(t * 200); a = Math.floor(t * 230);
  } else {
    r = 0; g = 0; b = 0; a = 0;
  }

  data[idx] = r;
  data[idx + 1] = g;
  data[idx + 2] = b;
  data[idx + 3] = a;
};
