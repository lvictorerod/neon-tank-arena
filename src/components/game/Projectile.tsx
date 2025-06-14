
import React from 'react';
import { ProjectileData } from './GameArena';

export const Projectile: React.FC<ProjectileData> = ({ x, y, rotation }) => {
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {/* Projectile body */}
      <div className="w-3 h-1 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full shadow-lg shadow-yellow-400/75">
        {/* Trail effect */}
        <div className="absolute -left-2 top-0 w-2 h-1 bg-gradient-to-l from-yellow-400/80 to-transparent rounded-full"></div>
      </div>
    </div>
  );
};
