import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="h-10 border-b border-white/10 flex items-center justify-between px-3 bg-zinc-950/95 backdrop-blur-sm shrink-0 z-50">
      <div className="flex items-center gap-2">
        <a 
          href="https://www.instagram.com/3d_mc_3d/" 
          target="_blank" 
          rel="noopener noreferrer"
          title="Visitar Instagram de MC" 
          className="flex items-center"
        >
          <img 
            src="https://raw.githubusercontent.com/MauroCasarin/SONIDO/refs/heads/main/MC%2048%20N.png" 
            alt="MC Logo" 
            className="h-7 w-auto transition-transform hover:scale-105 cursor-pointer"
          />
        </a>
        <h1 className="text-xs uppercase tracking-widest text-white flex flex-col leading-none">
          Simulador Educativo
          <span className="text-[8px] text-blue-500 tracking-[1px] mt-0.5">Sonidos Graves</span>
        </h1>
      </div>
    </header>
  );
};

export default Header;