
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Heart, Target, Clock, Trophy } from 'lucide-react';

interface GameHUDProps {
  playerName: string;
  health: number;
  score: number;
  kills: number;
  gameTime: number;
  onBackToMenu: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  playerName,
  health,
  score,
  kills,
  gameTime,
  onBackToMenu,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const healthPercentage = Math.max(0, (health / 100) * 100);
  const isLowHealth = healthPercentage <= 25;
  const isCriticalHealth = healthPercentage <= 10;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-start">
      {/* Left side - Player info and controls */}
      <Card className="bg-black/60 backdrop-blur-lg border-cyan-500/30 p-3 shadow-xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToMenu}
            className="text-gray-300 hover:text-white hover:bg-white/10 p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="text-cyan-300 font-semibold text-sm">{playerName}</div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            
            <div className="flex items-center gap-2">
              <Heart className={`w-4 h-4 ${isCriticalHealth ? 'text-red-500 animate-pulse' : isLowHealth ? 'text-orange-400' : 'text-green-400'}`} />
              <div className="w-24 h-2 bg-black/50 rounded-full border border-gray-600/50">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isCriticalHealth ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse' :
                    isLowHealth ? 'bg-gradient-to-r from-orange-400 to-red-400' :
                    healthPercentage > 60 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                    'bg-gradient-to-r from-yellow-400 to-orange-400'
                  }`}
                  style={{ width: `${healthPercentage}%` }}
                ></div>
              </div>
              <span className={`text-xs font-mono min-w-[2rem] text-center ${
                isCriticalHealth ? 'text-red-400 font-bold' : 'text-white'
              }`}>
                {health}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Center - Game timer */}
      <Card className="bg-black/60 backdrop-blur-lg border-cyan-500/30 p-4 shadow-xl">
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center mb-1">
            <Clock className="w-5 h-5 text-cyan-300" />
            <div className={`text-2xl font-mono font-bold ${
              gameTime <= 30 ? 'text-red-400 animate-pulse' :
              gameTime <= 60 ? 'text-orange-400' : 'text-cyan-300'
            }`}>
              {formatTime(gameTime)}
            </div>
          </div>
          <div className="text-xs text-gray-400">TIME REMAINING</div>
        </div>
      </Card>

      {/* Right side - Score and stats */}
      <Card className="bg-black/60 backdrop-blur-lg border-cyan-500/30 p-3 shadow-xl">
        <div className="flex gap-4">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center mb-1">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <div className="text-xl font-bold text-green-400">{score}</div>
            </div>
            <div className="text-xs text-gray-400">SCORE</div>
          </div>
          <div className="w-px bg-gray-600"></div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center mb-1">
              <Target className="w-4 h-4 text-red-400" />
              <div className="text-xl font-bold text-red-400">{kills}</div>
            </div>
            <div className="text-xs text-gray-400">KILLS</div>
          </div>
        </div>
      </Card>

      {/* Mini-map with enhanced design */}
      <Card className="bg-black/60 backdrop-blur-lg border-cyan-500/30 p-2 ml-4 shadow-xl">
        <div className="w-28 h-20 bg-black/50 rounded border border-cyan-500/30 relative overflow-hidden">
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-30">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="miniGrid" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M 8 0 L 0 0 0 8" fill="none" stroke="cyan" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#miniGrid)" />
            </svg>
          </div>
          
          {/* Player indicator */}
          <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-sm shadow-cyan-400/75"></div>
          
          {/* Enemy indicators */}
          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-red-400 rounded-full shadow-sm shadow-red-400/75"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-400 rounded-full shadow-sm shadow-red-400/75"></div>
          <div className="absolute top-2 right-4 w-1.5 h-1.5 bg-red-400 rounded-full shadow-sm shadow-red-400/75"></div>
          
          {/* Obstacles */}
          <div className="absolute top-2 left-4 w-2 h-2 bg-gray-500 rounded-sm opacity-60"></div>
          <div className="absolute bottom-3 right-5 w-2.5 h-1.5 bg-gray-500 rounded-sm opacity-60"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-500 rounded-sm opacity-60"></div>
          
          <div className="absolute bottom-0 left-2 text-xs text-gray-400 font-mono">MAP</div>
        </div>
      </Card>
    </div>
  );
};
