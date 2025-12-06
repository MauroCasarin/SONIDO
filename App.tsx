import React, { useState } from 'react';
import { Logo } from './components/Logo';
import { InfoPanel } from './components/InfoPanel';
import { AudioWaveVisualizer } from './components/AudioWaveVisualizer';
import { AudioAnalyzerMeter } from './components/AudioAnalyzerMeter';
import { ReferenceImage } from './components/ReferenceImage';
import { VELOCIDAD_SONIDO } from './constants';

const App: React.FC = () => {
  const [frecuenciaHz, setFrecuenciaHz] = useState<number>(100);
  const [separacionMetros, setSeparacionMetros] = useState<number>(0.85);

  const longitudOnda = VELOCIDAD_SONIDO / frecuenciaHz;
  const controlDirectividad = longitudOnda / 2;
  const coherenciaMax = longitudOnda / 4;

  let comentarioSeparacion = '';
  if (separacionMetros < coherenciaMax * 1.1) {
    comentarioSeparacion = ' - Máxima Coherencia (Fuente única)';
  } else if (separacionMetros < controlDirectividad * 1.1) {
    comentarioSeparacion = ' - Ideal para Control de Directividad (Arreglo Lineal)';
  } else if (separacionMetros >= controlDirectividad * 1.1) {
    comentarioSeparacion = ' - **LOBING** Severo (Cancelaciones fuertes)';
  }

  return (
    <div className="flex flex-col items-center w-full max-w-3xl px-4 py-6 space-y-6">
      <Logo />
      <InfoPanel
        frecuenciaHz={frecuenciaHz}
        setFrecuenciaHz={setFrecuenciaHz}
        separacionMetros={separacionMetros}
        setSeparacionMetros={setSeparacionMetros}
        longitudOnda={longitudOnda}
        controlDirectividad={controlDirectividad}
        comentarioSeparacion={comentarioSeparacion}
      />
      <AudioWaveVisualizer
        frecuenciaHz={frecuenciaHz}
        separacionMetros={separacionMetros}
      />
      <AudioAnalyzerMeter />
      <ReferenceImage />
    </div>
  );
};

export default App;