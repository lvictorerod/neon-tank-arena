
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface LobbyProps {
  playerName: string;
  onStartGame: () => void;
  onBackToMenu: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ playerName, onStartGame, onBackToMenu }) => {
  const [countdown, setCountdown] = useState(5);
  const [players] = useState([
    { name: playerName, ready: true },
    { name: 'Alpha-7', ready: true },
    { name: 'Storm', ready: true },
    { name: 'Viper', ready: false },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onStartGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onStartGame]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30"></div>
      
      <Card className="relative z-10 p-8 bg-black/40 backdrop-blur-lg border-cyan-500/30 shadow-2xl max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={onBackToMenu}
            className="text-gray-300 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold text-cyan-300">Battle Lobby</h2>
          <div></div>
        </div>

        <div className="text-center mb-8">
          <div className="text-6xl font-bold text-cyan-400 mb-2">{countdown}</div>
          <p className="text-gray-300">Battle starts in...</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-cyan-300 mb-4">Players ({players.length}/8)</h3>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.ready 
                      ? 'bg-green-500/20 border border-green-500/30' 
                      : 'bg-yellow-500/20 border border-yellow-500/30'
                  }`}
                >
                  <span className="text-white font-medium">{player.name}</span>
                  <span className={`text-xs font-semibold ${
                    player.ready ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {player.ready ? 'READY' : 'WAITING'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-cyan-300 mb-4">Map: Urban Warfare</h3>
            <div className="bg-black/50 rounded-lg p-4 h-40 border border-cyan-500/30">
              <div className="text-center text-gray-400 pt-12">
                Map Preview
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-400">
          <p>Get ready for intense tank combat!</p>
          <p>Eliminate enemies • Use cover • Dominate the battlefield</p>
        </div>
      </Card>
    </div>
  );
};
