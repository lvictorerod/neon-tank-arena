
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

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

  const healthPercentage = (health / 100) * 100;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-start">
      {/* Left side - Player info */}
      <Card className="bg-black/40 backdrop-blur-lg border-cyan-500/30 p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToMenu}
            className="text-gray-300 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div>
            <div className="text-cyan-300 font-semibold text-sm">{playerName}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">HP:</span>
              <div className="w-20 h-2 bg-black/50 rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    healthPercentage > 60 ? 'bg-green-400' :
                    healthPercentage > 30 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${healthPercentage}%` }}
                ></div>
              </div>
              <span className="text-xs text-white font-mono">{health}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Center - Game timer */}
      <Card className="bg-black/40 backdrop-blur-lg border-cyan-500/30 p-4">
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-cyan-300">
            {formatTime(gameTime)}
          </div>
          <div className="text-xs text-gray-400">TIME REMAINING</div>
        </div>
      </Card>

      {/* Right side - Score */}
      <Card className="bg-black/40 backdrop-blur-lg border-cyan-500/30 p-4">
        <div className="text-right">
          <div className="flex gap-4">
            <div>
              <div className="text-xl font-bold text-green-400">{score}</div>
              <div className="text-xs text-gray-400">SCORE</div>
            </div>
            <div>
              <div className="text-xl font-bold text-red-400">{kills}</div>
              <div className="text-xs text-gray-400">KILLS</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Mini-map (placeholder) */}
      <Card className="bg-black/40 backdrop-blur-lg border-cyan-500/30 p-2 ml-4">
        <div className="w-24 h-18 bg-black/50 rounded border border-cyan-500/30 relative">
          <div className="absolute top-1 left-1 w-1 h-1 bg-cyan-400 rounded-full"></div>
          <div className="absolute bottom-1 right-1 w-1 h-1 bg-red-400 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-red-400 rounded-full"></div>
          <div className="absolute bottom-0 left-2 text-xs text-gray-400">MAP</div>
        </div>
      </Card>
    </div>
  );
};
