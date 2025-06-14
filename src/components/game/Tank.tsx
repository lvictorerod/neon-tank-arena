import React from 'react';
import { TankData } from './GameArena';

export const Tank: React.FC<TankData> = ({ x, y, rotation, health, maxHealth, name, isPlayer, isRespawning }) => {
  const healthPercentage = (health / maxHealth) * 100;

  if (isRespawning) {
    return null; // Don't render respawning tanks
  }

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        zIndex: 10,
        willChange: 'transform',
      }}
    >
      {/* Tank body with improved design */}
      <div
        className={`w-12 h-8 rounded-sm border-2 relative ${
          isPlayer 
            ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 border-cyan-300 shadow-lg shadow-cyan-500/50' 
            : 'bg-gradient-to-br from-red-400 to-red-600 border-red-300 shadow-lg shadow-red-500/50'
        }`}
      >
        {/* Tank barrel with better positioning */}
        <div
          className={`absolute w-7 h-1.5 -right-3 top-1/2 transform -translate-y-1/2 rounded-full shadow-md ${
            isPlayer ? 'bg-gradient-to-r from-cyan-300 to-cyan-400' : 'bg-gradient-to-r from-red-300 to-red-400'
          }`}
        >
          {/* Barrel tip */}
          <div
            className={`absolute -right-1 top-0 w-2 h-1.5 rounded-r-full ${
              isPlayer ? 'bg-cyan-200' : 'bg-red-200'
            }`}
          ></div>
        </div>
        
        {/* Tank tracks with better detail */}
        <div className="absolute -left-0.5 -top-1 w-1 h-10 bg-gradient-to-b from-gray-500 to-gray-700 rounded-full shadow-sm"></div>
        <div className="absolute -right-0.5 -top-1 w-1 h-10 bg-gradient-to-b from-gray-500 to-gray-700 rounded-full shadow-sm"></div>
        
        {/* Tank body details */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
          isPlayer ? 'bg-cyan-200' : 'bg-red-200'
        }`}></div>
      </div>

      {/* Health bar with improved design */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-16">
        <div className="bg-black/70 rounded-full h-1.5 mb-1 border border-gray-600/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              healthPercentage > 66 ? 'bg-gradient-to-r from-green-400 to-green-500' :
              healthPercentage > 33 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
              'bg-gradient-to-r from-red-400 to-red-500'
            }`}
            style={{ width: `${healthPercentage}%` }}
          ></div>
        </div>
        
        {/* Player name with better styling */}
        <div className={`text-xs text-center font-semibold truncate px-1 py-0.5 rounded ${
          isPlayer 
            ? 'text-cyan-300 bg-black/40' 
            : 'text-red-300 bg-black/40'
        }`}>
          {name}
        </div>
      </div>

      {/* Player indicator with pulsing effect */}
      {isPlayer && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
            <div className="absolute inset-0 w-3 h-3 bg-cyan-300 rounded-full animate-ping opacity-75"></div>
          </div>
        </div>
      )}

      {/* Damage indicator */}
      {health < maxHealth && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="w-full h-full bg-red-500/20 rounded-sm animate-pulse"></div>
        </div>
      )}
    </div>
  );
};
