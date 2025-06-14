
import React from 'react';
import { TankData } from './GameArena';

interface ExtendedTankData extends TankData {
  turretRotation?: number;
}

export const Tank: React.FC<ExtendedTankData> = ({ 
  x, y, rotation, turretRotation, health, maxHealth, name, isPlayer, isRespawning 
}) => {
  const healthPercentage = (health / maxHealth) * 100;
  // For AI tanks, use body rotation for turret. For player, use separate turret rotation
  const actualTurretRotation = isPlayer && turretRotation !== undefined ? turretRotation : rotation;

  if (isRespawning) {
    return null; // Don't render respawning tanks
  }

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10,
        willChange: 'transform',
      }}
    >
      {/* Tank body with improved design */}
      <div
        className={`w-12 h-8 rounded-sm border-2 relative transition-transform duration-100 ease-out ${
          isPlayer 
            ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 border-cyan-300 shadow-lg shadow-cyan-500/50' 
            : 'bg-gradient-to-br from-red-400 to-red-600 border-red-300 shadow-lg shadow-red-500/50'
        }`}
        style={{
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          willChange: 'transform',
        }}
      >
        {/* Tank tracks with better detail */}
        <div className="absolute -left-0.5 -top-1 w-1 h-10 bg-gradient-to-b from-gray-500 to-gray-700 rounded-full shadow-sm"></div>
        <div className="absolute -right-0.5 -top-1 w-1 h-10 bg-gradient-to-b from-gray-500 to-gray-700 rounded-full shadow-sm"></div>
        
        {/* Tank body details */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
          isPlayer ? 'bg-cyan-200' : 'bg-red-200'
        }`}></div>
      </div>

      {/* Enhanced Turret with smooth rotation and better responsiveness */}
      <div
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
          isPlayer 
            ? 'transition-transform duration-50 ease-out' 
            : 'transition-transform duration-150 ease-in-out'
        }`}
        style={{
          left: '0px',
          top: '0px',
          transform: `translate(-50%, -50%) rotate(${actualTurretRotation}deg)`,
          willChange: 'transform',
          transformOrigin: 'center center',
        }}
      >
        {/* Enhanced Tank barrel with muzzle flash indicator */}
        <div
          className={`relative w-7 h-1.5 rounded-full shadow-md transition-all duration-75 ${
            isPlayer ? 'bg-gradient-to-r from-cyan-300 to-cyan-400' : 'bg-gradient-to-r from-red-300 to-red-400'
          }`}
          style={{
            transformOrigin: '0 center',
            marginLeft: '6px',
          }}
        >
          {/* Enhanced barrel tip with glow effect */}
          <div
            className={`absolute -right-1 top-0 w-2 h-1.5 rounded-r-full transition-all duration-75 ${
              isPlayer ? 'bg-cyan-200 shadow-cyan-300/50' : 'bg-red-200 shadow-red-300/50'
            }`}
            style={{
              boxShadow: isPlayer ? '0 0 4px rgba(103, 232, 249, 0.5)' : '0 0 4px rgba(248, 113, 113, 0.5)',
            }}
          ></div>

          {/* Barrel details */}
          <div className="absolute top-0.5 left-2 w-3 h-0.5 bg-black/20 rounded-full"></div>
        </div>

        {/* Enhanced turret base with rotation indicator */}
        <div
          className={`absolute w-4 h-4 rounded-full border transition-all duration-75 ${
            isPlayer 
              ? 'bg-gradient-to-br from-cyan-300 to-cyan-500 border-cyan-200' 
              : 'bg-gradient-to-br from-red-300 to-red-500 border-red-200'
          }`}
          style={{
            left: '-8px',
            top: '-8px',
            boxShadow: isPlayer 
              ? '0 2px 8px rgba(103, 232, 249, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)' 
              : '0 2px 8px rgba(248, 113, 113, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
          }}
        >
          {/* Turret center indicator */}
          <div
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
              isPlayer ? 'bg-cyan-100' : 'bg-red-100'
            }`}
          ></div>
        </div>
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

      {/* Enhanced player indicator with pulsing effect */}
      {isPlayer && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
            <div className="absolute inset-0 w-3 h-3 bg-cyan-300 rounded-full animate-ping opacity-75"></div>
          </div>
        </div>
      )}

      {/* Enhanced aiming system with dynamic crosshair */}
      {isPlayer && (
        <div className="absolute pointer-events-none">
          {/* Main aiming line */}
          <div
            className="absolute bg-gradient-to-r from-cyan-400/60 to-cyan-300/20 opacity-70"
            style={{
              width: '20px',
              height: '1px',
              left: '20px',
              top: '0px',
              transformOrigin: '0 center',
              transform: `rotate(${actualTurretRotation - rotation}deg)`,
              transition: 'all 50ms ease-out',
              boxShadow: '0 0 3px rgba(103, 232, 249, 0.4)',
            }}
          ></div>
          
          {/* Secondary range indicator */}
          <div
            className="absolute bg-cyan-400/30 opacity-40"
            style={{
              width: '30px',
              height: '0.5px',
              left: '18px',
              top: '0px',
              transformOrigin: '0 center',
              transform: `rotate(${actualTurretRotation - rotation}deg)`,
              transition: 'all 50ms ease-out',
            }}
          ></div>

          {/* Aiming dot at barrel tip */}
          <div
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60"
            style={{
              left: '25px',
              top: '-2px',
              transformOrigin: '-19px 2px',
              transform: `rotate(${actualTurretRotation - rotation}deg)`,
              transition: 'all 50ms ease-out',
              boxShadow: '0 0 2px rgba(103, 232, 249, 0.6)',
            }}
          ></div>
        </div>
      )}

      {/* Enhanced damage indicator with pulse effect */}
      {health < maxHealth && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="w-full h-full bg-red-500/15 rounded-sm animate-pulse border border-red-400/30"></div>
        </div>
      )}

      {/* Active power-up indicators */}
      {isPlayer && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {/* Speed boost indicator */}
          {(health as any)?.speedBoostEnd && Date.now() < (health as any).speedBoostEnd && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          )}
          {/* Damage boost indicator */}
          {(health as any)?.damageBoostEnd && Date.now() < (health as any).damageBoostEnd && (
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
          )}
          {/* Shield indicator */}
          {(health as any)?.shield && (health as any).shield > 0 && (
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          )}
        </div>
      )}
    </div>
  );
};
