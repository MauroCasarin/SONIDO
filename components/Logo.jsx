import React from 'react';

export const Logo = () => {
  return (
    <div className="w-full max-w-xs text-center p-3 bg-neutral-800 rounded-lg border border-blue-700 shadow-lg shadow-blue-500/10 transition-all duration-300">
      <a href="https://www.instagram.com/3d_mc_3d/" target="_blank" rel="noopener noreferrer">
        <img
          src="https://raw.githubusercontent.com/MauroCasarin/SONIDO/refs/heads/main/MC%2048%20N.png"
          alt="Logo MC 3D"
          className="w-14 h-auto cursor-pointer rounded-full transition-transform duration-200 hover:scale-110 mx-auto"
        />
      </a>
      <p className="text-xs text-neutral-400 mt-2">Powered by MC 3D Audio</p>
    </div>
  );
};