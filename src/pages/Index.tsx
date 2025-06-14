
import React, { useState } from 'react';
import { MainMenu } from '@/components/game/MainMenu';
import { GameArena } from '@/components/game/GameArena';
import { Lobby } from '@/components/game/Lobby';

export type GameState = 'menu' | 'lobby' | 'playing';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [playerName, setPlayerName] = useState('');

  const handlePlay = (name: string) => {
    setPlayerName(name);
    setGameState('lobby');
  };

  const handleStartGame = () => {
    setGameState('playing');
  };

  const handleBackToMenu = () => {
    setGameState('menu');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {gameState === 'menu' && (
        <MainMenu onPlay={handlePlay} />
      )}
      {gameState === 'lobby' && (
        <Lobby 
          playerName={playerName} 
          onStartGame={handleStartGame}
          onBackToMenu={handleBackToMenu}
        />
      )}
      {gameState === 'playing' && (
        <GameArena 
          playerName={playerName}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
};

export default Index;
