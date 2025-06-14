
import React from 'react';
import { TankData } from './GameArena';

export const Tank: React.FC<TankData> = ({ x, y, rotation, health, name, isPlayer }) => {
  const healthPercentage = (health / 100) * 100;

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {/* Tank body */}
      <div
        className={`w-12 h-8 rounded-sm border-2 relative ${
          isPlayer 
            ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 border-cyan-300 shadow-lg shadow-cyan-500/50' 
            : 'bg-gradient-to-br from-red-400 to-red-600 border-red-300 shadow-lg shadow-red-500/50'
        }`}
      >
        {/* Tank barrel */}
        <div
          className={`absolute w-6 h-1 -right-3 top-1/2 transform -translate-y-1/2 rounded-full ${
            isPlayer ? 'bg-cyan-300' : 'bg-red-300'
          }`}
        ></div>
        
        {/* Tank tracks */}
        <div className="absolute -left-1 -top-1 w-1 h-10 bg-gray-600 rounded-full"></div>
        <div className="absolute -right-1 -top-1 w-1 h-10 bg-gray-600 rounded-full"></div>
      </div>

      {/* Health bar */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16">
        <div className="bg-black/50 rounded-full h-1 mb-1">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              healthPercentage > 60 ? 'bg-green-400' :
              healthPercentage > 30 ? 'bg-yellow-400' : 'bg-red-400'
            }`}
            style={{ width: `${healthPercentage}%` }}
          ></div>
        </div>
        
        {/* Player name */}
        <div className="text-xs text-center text-white font-semibold truncate">
          {name}
        </div>
      </div>

      {/* Player indicator */}
      {isPlayer && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
};
