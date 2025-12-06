import React, { useCallback } from 'react';
import { getRangeDescription } from '../utils/audioUtils';

interface InfoPanelProps {
  frecuenciaHz: number;
  setFrecuenciaHz: (value: number) => void;
  separacionMetros: number;
  setSeparacionMetros: (value: number) => void;
  longitudOnda: number;
  controlDirectividad: number;
  comentarioSeparacion: string;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  frecuenciaHz,
  setFrecuenciaHz,
  separacionMetros,
  setSeparacionMetros,
  longitudOnda,
  controlDirectividad,
  comentarioSeparacion,
}) => {
  const handleFrecuenciaChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFrecuenciaHz(parseFloat(event.target.value));
  }, [setFrecuenciaHz]);

  const handleSeparacionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSeparacionMetros(parseFloat(event.target.value));
  }, [setSeparacionMetros]);

  const rangeDescription = getRangeDescription(frecuenciaHz);

  return (
    <div className="flex-shrink-0 text-sm p-5 bg-gradient-to-br from-neutral-800 to-neutral-850 w-full max-w-3xl mx-auto rounded-xl border border-blue-600 shadow-xl shadow-blue-500/15">
      <h1 className="text-emerald-400 pt-1 text-2xl mb-4 font-bold text-center tracking-wide">
        Calculador de Graves
      </h1>

      <div className="mb-3 text-neutral-300">
        <span id="frecuencia-info" className="block text-base">
          Frecuencia: <span className="font-semibold text-emerald-300">{frecuenciaHz.toFixed(0)} Hz</span> (L.O.: {longitudOnda.toFixed(2)} m) | Ideal:{' '}
          {controlDirectividad.toFixed(2)} m
        </span>
      </div>
      <label htmlFor="sliderFrecuencia" className="block text-sm mb-1 font-semibold text-blue-400">
        Control de Frecuencia (Hz) [30 - 400 Hz]:
      </label>
      <div className="w-[95%] mx-auto mb-4">
        <input
          type="range"
          id="sliderFrecuencia"
          min="30"
          max="400"
          step="5"
          value={frecuenciaHz}
          onChange={handleFrecuenciaChange}
          className="w-full h-1.5 bg-gradient-to-r from-blue-700 to-blue-400 appearance-none rounded-full cursor-pointer 
                   [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none 
                   [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-blue-200 
                   [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:duration-200"
        />
      </div>

      <div className="mb-3 text-neutral-300">
        <span id="separacion-info" className="block text-base">
          Separación: <span className="font-semibold text-emerald-300">{separacionMetros.toFixed(2)} m</span>{' '}
          <span className="text-amber-400 font-medium">{comentarioSeparacion}</span>
        </span>
      </div>
      <label htmlFor="sliderSeparacion" className="block text-sm mb-1 font-semibold text-blue-400">
        Control de Separación (Metros) [0.1 - 4.0 m]:
      </label>
      <div className="w-[95%] mx-auto mb-5">
        <input
          type="range"
          id="sliderSeparacion"
          min="0.1"
          max="4.0"
          step="0.05"
          value={separacionMetros}
          onChange={handleSeparacionChange}
          className="w-full h-1.5 bg-gradient-to-r from-blue-700 to-blue-400 appearance-none rounded-full cursor-pointer 
                   [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none 
                   [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-blue-200
                   [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:duration-200"
        />
      </div>

      <p id="rango-description" className="font-medium text-amber-400 mt-4 pt-3 border-t border-neutral-700 text-xs leading-relaxed">
        {rangeDescription}
      </p>

      <p className="text-xs mt-3 text-neutral-400">
        <span className="font-bold text-emerald-500">Verde</span> = Refuerzo (Suma) |{' '}
        <span className="font-bold text-red-500">Rojo</span> = Cancelación (Resta)
      </p>
    </div>
  );
};