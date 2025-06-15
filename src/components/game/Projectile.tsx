
import React from 'react';
import { ProjectileData } from './GameArena';

export const Projectile: React.FC<ProjectileData> = ({ x, y, rotation }) => {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        zIndex: 5,
        willChange: 'transform',
      }}
    >
      {/* Enhanced projectile with better visual effects */}
      <div className="relative">
        {/* Main projectile body */}
        <div className="w-4 h-2 bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-500 rounded-full shadow-lg shadow-yellow-400/75 border border-yellow-300/50">
          {/* Core bright center */}
          <div className="absolute inset-0 w-2 h-1 ml-1 mt-0.5 bg-white/80 rounded-full blur-sm"></div>
        </div>
        
        {/* Enhanced trail effect */}
        <div className="absolute -left-3 top-0 w-3 h-2 bg-gradient-to-l from-yellow-400/80 via-orange-400/60 to-transparent rounded-full blur-sm"></div>
        <div className="absolute -left-5 top-0.5 w-2 h-1 bg-gradient-to-l from-orange-400/60 to-transparent rounded-full blur-sm"></div>
        
        {/* Sparks effect */}
        <div className="absolute -left-1 -top-0.5 w-1 h-1 bg-yellow-300 rounded-full opacity-75 animate-pulse"></div>
        <div className="absolute -left-2 top-1.5 w-0.5 h-0.5 bg-orange-400 rounded-full opacity-60 animate-pulse"></div>
      </div>
    </div>
  );
};
