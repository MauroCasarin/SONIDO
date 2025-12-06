import React from 'react';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer.js';
import { classifyFrequency, classifyDecibels } from '../utils/audioUtils.js';

export const AudioAnalyzerMeter = () => {
  const {
    audioInitialized,
    dominantFreq,
    rms,
    error,
    iniciarAudio,
    freqToPercent,
  } = useAudioAnalyzer();

  let dominantFreqText;
  let rangoText;
  let dBText;
  let dBClass;
  let indicatorLeft = '0%';

  if (error) {
    dominantFreqText = <span className="text-red-500">{error}</span>;
    rangoText = <span className="font-bold">Error de análisis...</span>;
  } else if (!audioInitialized) {
    dominantFreqText = <span className="font-bold text-neutral-400">(No iniciado)</span>;
    rangoText = <span className="font-bold text-neutral-400">Esperando análisis...</span>;
  } else if (dominantFreq > 0) {
    const percent = freqToPercent(dominantFreq);
    indicatorLeft = `${percent}%`;
    dominantFreqText = <span className="font-bold text-emerald-400">{dominantFreq.toFixed(1)} Hz</span>;
    rangoText = <span className="font-bold text-neutral-300">{classifyFrequency(dominantFreq)}</span>;
  } else {
    dominantFreqText = <span className="font-bold text-neutral-400">(Nivel bajo o silencioso)</span>;
    rangoText = <span className="font-bold text-neutral-400">(Esperando sonido...)</span>;
  }

  const approx_dB = rms > 0 ? (20 * Math.log10(rms) + 93) : 0;
  dBText = approx_dB > 0 ? `${approx_dB.toFixed(1)} dB` : `< 30 dB`;
  dBClass = classifyDecibels(approx_dB);

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 p-5 bg-gradient-to-br from-neutral-800 to-neutral-850 rounded-xl border border-blue-600 shadow-xl shadow-blue-500/15">
      <p className="text-base font-semibold text-neutral-200 mb-3">Medidor de Frecuencia Ambiental (Logarítmico)</p>
      <div className="relative w-full h-8">
        <div
          id="freq-meter-bar"
          className="relative w-full h-4 bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500 border border-blue-700 rounded-full mt-1"
        >
          <div
            id="freq-meter-indicator"
            className="absolute -top-1.5 w-5 h-7 bg-fuchsia-400 border-2 border-fuchsia-200 rounded-full transform -translate-x-1/2 transition-all duration-100 ease-linear shadow-lg shadow-fuchsia-500/50"
            style={{ left: indicatorLeft }}
          ></div>
        </div>
        {!audioInitialized && !error && (
          <div
            id="audio-overlay"
            onClick={iniciarAudio}
            className="absolute top-0 left-0 w-full h-full bg-blue-900/80 text-blue-100 text-base font-semibold flex justify-center items-center cursor-pointer rounded-xl z-20 transition-all duration-300 hover:bg-blue-800/90"
          >
            Toca aquí para activar el micrófono y el análisis (HTTPS Requerido)
          </div>
        )}
        {error && (
            <div
                className="absolute top-0 left-0 w-full h-full bg-red-900/80 text-red-300 text-base font-semibold flex justify-center items-center rounded-xl z-20"
            >
                {error}
            </div>
        )}
      </div>
      <div id="freq-ticks-labels" className="w-full flex justify-between text-xs mt-2 text-neutral-400 font-medium">
        <span>20 Hz</span>
        <span>60 Hz</span>
        <span>200 Hz</span>
        <span>1 kHz</span>
        <span>5 kHz</span>
        <span>20 kHz</span>
      </div>
      <p id="dominante-freq" className="text-base text-blue-400 mt-4">
        Frecuencia Dominante: {dominantFreqText}
      </p>
      <p id="rango-label" className="text-sm font-medium text-neutral-300 mt-1">
        Rango: {rangoText}
      </p>
      <p id="decibel-label" className="text-sm text-amber-400 mt-1">
        <span className="font-bold">{dBText}</span> | {dBClass}
      </p>
    </div>
  );
};