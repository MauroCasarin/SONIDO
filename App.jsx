import React, { useState } from 'react';
import { Logo } from './components/Logo.jsx';
import { InfoPanel } from './components/InfoPanel.jsx';
import { AudioWaveVisualizer } from './components/AudioWaveVisualizer.jsx';
import { AudioAnalyzerMeter } from './components/AudioAnalyzerMeter.jsx';
import { ReferenceImage } from './components/ReferenceImage.jsx';
import { VELOCIDAD_SONIDO } from './constants.js';

const App = () => {
  const [frecuenciaHz, setFrecuenciaHz] = useState(100);
  const [separacionMetros, setSeparacionMetros] = useState(0.85);

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