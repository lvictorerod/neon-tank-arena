
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface MainMenuProps {
  onPlay: (name: string) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onPlay }) => {
  const [playerName, setPlayerName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onPlay(playerName.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-green-500/10 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      <Card className="relative z-10 p-8 bg-black/40 backdrop-blur-lg border-cyan-500/30 shadow-2xl shadow-cyan-500/20 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
            TANK BATTLE
          </h1>
          <h2 className="text-2xl font-semibold text-cyan-300 mb-4">ARENA</h2>
          <p className="text-gray-300 text-sm">
            Fast-paced tactical multiplayer tank combat
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="playerName" className="block text-cyan-300 text-sm font-medium mb-2">
              Enter Your Call Sign
            </label>
            <Input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Tank Commander"
              className="bg-black/50 border-cyan-500/50 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/50"
              maxLength={16}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold py-3 text-lg shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40 hover:scale-105"
          >
            ENTER BATTLE
          </Button>
        </form>

        <div className="mt-8 text-center space-y-2">
          <p className="text-gray-400 text-xs">Controls:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div>WASD - Move</div>
            <div>Mouse - Aim</div>
            <div>Click - Shoot</div>
            <div>Space - Brake</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
