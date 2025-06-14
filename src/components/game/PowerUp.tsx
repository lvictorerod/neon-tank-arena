
import React from 'react';

export interface PowerUpData {
  id: string;
  x: number;
  y: number;
  type: 'health' | 'speed' | 'damage' | 'shield';
  createdAt: number;
}

interface PowerUpProps extends PowerUpData {}

export const PowerUp: React.FC<PowerUpProps> = ({ x, y, type }) => {
  const getPowerUpStyle = () => {
    switch (type) {
      case 'health':
        return 'bg-gradient-to-br from-green-400 to-green-600 border-green-300';
      case 'speed':
        return 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300';
      case 'damage':
        return 'bg-gradient-to-br from-red-400 to-red-600 border-red-300';
      case 'shield':
        return 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300';
      default:
        return 'bg-gradient-to-br from-gray-400 to-gray-600 border-gray-300';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'health':
        return '+';
      case 'speed':
        return '⚡';
      case 'damage':
        return '💥';
      case 'shield':
        return '🛡';
      default:
        return '?';
    }
  };

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 15,
      }}
    >
      <div className={`w-8 h-8 rounded-full border-2 ${getPowerUpStyle()} shadow-lg animate-pulse flex items-center justify-center`}>
        <div className="absolute inset-0 rounded-full bg-white/20 animate-ping"></div>
        <span className="text-white text-xs font-bold relative z-10">{getIcon()}</span>
      </div>
      <div className="absolute -inset-2 rounded-full bg-white/10 animate-pulse"></div>
    </div>
  );
};
