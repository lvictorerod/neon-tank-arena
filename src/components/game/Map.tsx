
import React from 'react';

interface MapProps {
  width: number;
  height: number;
}

export const Map: React.FC<MapProps> = ({ width, height }) => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base terrain background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-green-800 via-green-700 to-green-900"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* Terrain texture overlay */}
        <div className="absolute inset-0 opacity-30">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="terrain" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none"/>
                <circle cx="5" cy="5" r="1" fill="rgba(34, 197, 94, 0.3)"/>
                <circle cx="15" cy="15" r="0.5" fill="rgba(34, 197, 94, 0.2)"/>
                <circle cx="10" cy="18" r="0.8" fill="rgba(34, 197, 94, 0.25)"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#terrain)"/>
          </svg>
        </div>

        {/* Dirt patches */}
        <div className="absolute top-20 left-32 w-24 h-16 bg-amber-800 rounded-full opacity-40 blur-sm"></div>
        <div className="absolute top-40 right-28 w-20 h-12 bg-amber-700 rounded-full opacity-35 blur-sm"></div>
        <div className="absolute bottom-32 left-20 w-28 h-20 bg-amber-800 rounded-full opacity-30 blur-sm"></div>
        <div className="absolute bottom-24 right-40 w-16 h-14 bg-amber-700 rounded-full opacity-40 blur-sm"></div>

        {/* Rock formations */}
        <div className="absolute top-16 right-16 w-8 h-6 bg-gray-600 rounded-sm transform rotate-12 shadow-lg"></div>
        <div className="absolute top-18 right-18 w-6 h-4 bg-gray-500 rounded-sm transform -rotate-6 shadow-md"></div>
        <div className="absolute bottom-40 left-32 w-10 h-8 bg-gray-600 rounded-sm transform rotate-45 shadow-lg"></div>
        <div className="absolute bottom-38 left-34 w-6 h-6 bg-gray-500 rounded-sm transform -rotate-12 shadow-md"></div>

        {/* Grass patches */}
        <div className="absolute top-24 left-60 w-12 h-8 bg-green-600 rounded-full opacity-60 blur-xs"></div>
        <div className="absolute top-48 right-60 w-16 h-10 bg-green-500 rounded-full opacity-50 blur-xs"></div>
        <div className="absolute bottom-48 left-48 w-14 h-9 bg-green-600 rounded-full opacity-55 blur-xs"></div>

        {/* Battle scars / craters */}
        <div className="absolute top-32 left-80 w-16 h-16 bg-black rounded-full opacity-20 blur-sm border-2 border-gray-700/30"></div>
        <div className="absolute bottom-60 right-80 w-12 h-12 bg-black rounded-full opacity-15 blur-sm border border-gray-600/20"></div>
        <div className="absolute top-64 left-40 w-10 h-10 bg-black rounded-full opacity-18 blur-sm border border-gray-600/25"></div>

        {/* Grid pattern overlay for tactical feel */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="cyan" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Border highlights */}
        <div className="absolute inset-0 border-2 border-cyan-500/50 rounded-lg shadow-inner shadow-cyan-500/20"></div>
        
        {/* Corner markers */}
        <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-cyan-400/60"></div>
        <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-cyan-400/60"></div>
        <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-cyan-400/60"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-cyan-400/60"></div>
      </div>
    </div>
  );
};
