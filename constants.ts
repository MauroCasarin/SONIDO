export const SIMULATION_SIZE_Y = 8;
export const SEGMENTS = 256;
export const VELOCIDAD_SONIDO = 340; // meters/second

export const MIN_FREQ = 20;
export const MAX_FREQ = 20000;
export const MIN_FREQ_LOG = Math.log10(MIN_FREQ);
export const MAX_FREQ_LOG = Math.log10(MAX_FREQ);
export const LOG_RANGE = MAX_FREQ_LOG - MIN_FREQ_LOG;
export const NOISE_THRESHOLD = 0.005;

export const POWER_MAX_FREQ_LIMIT = 1000; // Max frequency for dominant freq calculation
export const DOMINANT_FREQ_VOLUME_THRESHOLD = 50; // Min volume to consider a frequency dominant
