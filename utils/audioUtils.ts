import { NOISE_THRESHOLD } from '../constants';

/**
 * Provides a descriptive text for a given frequency range.
 * @param f The frequency in Hz.
 * @returns A string describing the frequency range.
 */
export function getRangeDescription(f: number): string {
  if (f < 63) {
    return 'Sub Bajos (25-63 Hz): A menudo se percibe como una vibración en lugar de un tono puro. La mayoría de la música generalmente no baja de los 30 Hz.';
  } else if (f >= 63 && f < 250) {
    return 'Bajos (63-250 Hz): Una frecuencia que puede sentirse retumbante, pero también añade calidez y potencia. Frecuencia donde instrumentos como el bombo o las cuerdas más graves del bajo pueden tener su fundamental, proporcionando esa sensación de \'retumbo\'.';
  } else if (f >= 250 && f <= 400) {
    return 'Medios Bajos (250-500 Hz): Frecuencia que da \'cuerpo\' y calidez al sonido. Un exceso de esta frecuencia puede hacer que el audio suene apagado, mientras que una cantidad adecuada proporciona una base sólida para la mezcla. Fundamental para la sensación de ritmo y potencia.';
  }
  return '';
}

/**
 * Classifies a given frequency into a descriptive category.
 * @param f The frequency in Hz.
 * @returns A string representing the frequency classification.
 */
export function classifyFrequency(f: number): string {
  if (f < 20) return 'INFRA SONIDO';
  if (f < 60) return 'SUB GRAVE';
  if (f < 200) return 'GRAVE';
  if (f < 500) return 'MEDIO GRAVE';
  if (f < 2000) return 'MEDIO';
  if (f < 8000) return 'MEDIO ALTO';
  if (f <= 20000) return 'ALTO';
  return 'ULTRA SONIDO';
}

/**
 * Classifies a given decibel level into a descriptive category.
 * @param dB The decibel level.
 * @returns A string representing the decibel classification.
 */
export function classifyDecibels(dB: number): string {
  if (dB < 30) return 'SILENCIO TOTAL';
  if (dB < 60) return 'NORMAL';
  if (dB < 75) return 'RUIDO MEDIO';
  if (dB < 90) return 'RUIDO FUERTE';
  if (dB < 105) return 'MUY FUERTE (Riesgo)';
  if (dB < 120) return 'EXTREMO (Peligro)';
  return 'DOLOR SEVERO';
}

/**
 * Calculates the Root Mean Square (RMS) value from audio time domain data.
 * @param data A Uint8Array containing time domain data.
 * @returns The RMS value.
 */
export function calculateRMS(data: Uint8Array): number {
  let sumOfSquares = 0;
  for (let i = 0; i < data.length; i++) {
    // Normalize byte data from 0-255 to -1 to 1
    const normalized = (data[i] / 128) - 1;
    sumOfSquares += normalized * normalized;
  }
  const rmsValue = Math.sqrt(sumOfSquares / data.length);
  return rmsValue > NOISE_THRESHOLD ? rmsValue : 0;
}
