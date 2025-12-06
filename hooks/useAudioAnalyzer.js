import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MIN_FREQ,
  MAX_FREQ,
  MIN_FREQ_LOG,
  MAX_FREQ_LOG,
  LOG_RANGE,
  NOISE_THRESHOLD,
  POWER_MAX_FREQ_LIMIT,
  DOMINANT_FREQ_VOLUME_THRESHOLD,
} from '../constants.js';
import { calculateRMS } from '../utils/audioUtils.js';

export const useAudioAnalyzer = () => {
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [dominantFreq, setDominantFreq] = useState(0);
  const [rms, setRms] = useState(0);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const frequencyDataRef = useRef(null);
  const timeDomainDataRef = useRef(null);
  const animationFrameRef = useRef(null);

  const freqToPercent = useCallback((f) => {
    if (f < MIN_FREQ) return 0;
    if (f > MAX_FREQ) return 100;

    const logF = Math.log10(f);
    return ((logF - MIN_FREQ_LOG) / LOG_RANGE) * 100;
  }, []);

  const updateFrequencyMeter = useCallback(() => {
    if (!analyserRef.current || !frequencyDataRef.current || !timeDomainDataRef.current) return;

    analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
    analyserRef.current.getByteTimeDomainData(timeDomainDataRef.current);

    const sampleRate = analyserRef.current.context.sampleRate;
    const binWidth = sampleRate / analyserRef.current.fftSize;

    let maxVolume = 0;
    let currentDominantFreq = 0;

    const maxIndexPower = Math.min(
      frequencyDataRef.current.length,
      Math.ceil(POWER_MAX_FREQ_LIMIT / binWidth),
    );
    const minIndex = Math.ceil(30 / binWidth); // Start analysis from 30 Hz

    for (let i = minIndex; i < maxIndexPower; i++) {
      if (frequencyDataRef.current[i] > maxVolume) {
        maxVolume = frequencyDataRef.current[i];
        currentDominantFreq = i * binWidth;
      }
    }

    const currentRms = calculateRMS(timeDomainDataRef.current);

    setRms(currentRms);

    if (currentDominantFreq > 0 && maxVolume > DOMINANT_FREQ_VOLUME_THRESHOLD) {
      setDominantFreq(currentDominantFreq);
    } else {
      setDominantFreq(0);
    }

    animationFrameRef.current = requestAnimationFrame(updateFrequencyMeter);
  }, []);

  const iniciarAudio = useCallback(() => {
    if (audioInitialized) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Tu navegador no soporta la API de Micrófono.');
      return;
    }

    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024;
      analyserRef.current.smoothingTimeConstant = 0.92;
      frequencyDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      timeDomainDataRef.current = new Uint8Array(analyserRef.current.fftSize);

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          try {
            if (!audioContextRef.current || !analyserRef.current) {
              stream.getTracks().forEach(track => track.stop()); // Stop stream if context/analyser are gone
              return;
            }
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            setAudioInitialized(true);
            setError(null);
            animationFrameRef.current = requestAnimationFrame(updateFrequencyMeter);
          } catch (innerError) {
            console.error('Error connecting audio stream:', innerError);
            setError('Error al conectar el stream de audio.');
            setAudioInitialized(false);
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
              audioContextRef.current.close().catch(console.error);
              audioContextRef.current = null;
            }
            stream.getTracks().forEach(track => track.stop()); // Stop stream on inner error
          }
        })
        .catch((err) => {
          console.error('Microphone access denied:', err);
          let errorMessage = 'Acceso denegado al micrófono.';
          if (window.location.protocol !== 'https:') {
            errorMessage += ' (HTTPS Requerido)';
          } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage += ' Por favor, permite el acceso en la configuración de tu navegador.';
          } else if (err.name === 'NotFoundError') {
            errorMessage += ' No se encontró un micrófono.';
          } else if (err.name === 'NotReadableError') {
            errorMessage += ' El micrófono está en uso o no disponible.';
          } else {
            errorMessage += ` Error desconocido: ${err.message}`;
          }
          setError(errorMessage);
          setAudioInitialized(false);
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
          }
        });
    } catch (e) {
      console.error('AudioContext error:', e);
      setError('Error de AudioContext o configuración inicial.');
      setAudioInitialized(false);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    }
  }, [audioInitialized, updateFrequencyMeter]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  return {
    audioInitialized,
    dominantFreq,
    rms,
    error,
    iniciarAudio,
    freqToPercent,
  };
};