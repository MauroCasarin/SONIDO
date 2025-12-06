import React from 'react';

export const ReferenceImage = () => {
  return (
    <div className="w-full max-w-3xl mx-auto my-6 p-5 bg-neutral-800 rounded-xl border border-neutral-700 shadow-xl shadow-neutral-700/10">
      <h2 className="text-lg mb-4 text-neutral-200 text-center font-semibold">Rangos de Frecuencia Musical</h2>
      <img
        src="https://maurocasarin.github.io/SONIDO/index_archivos/image005.jpg"
        alt="Gráfico de Rangos de Frecuencia para Mezcla de Sonido"
        className="w-full h-auto rounded-lg shadow-lg"
      />
    </div>
  );
};