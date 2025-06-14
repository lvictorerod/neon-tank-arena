import React, { useRef, useCallback } from 'react';
import { Tank } from './Tank';
import { Projectile } from './Projectile';
import { PowerUp, PowerUpData } from './PowerUp';
import { GameHUD } from './GameHUD';
import { EnhancedParticleSystem } from './EnhancedParticleSystem';
import { Map } from './Map';
import { GameControls } from './GameControls';
import { GameLoop } from './GameLoop';
import { useGameLogic } from './GameLogic';
import { useScreenShake } from './ScreenShake';
import { obstacles, ARENA_WIDTH, ARENA_HEIGHT, checkCollision, TANK_SIZE } from './CollisionDetection';

interface GameArenaProps {
  playerName: string;
  onBackToMenu: () => void;
}

export interface TankData {
  id: string;
  x: number;
  y: number;
  rotation: number;
  health: number;
  maxHealth: number;
  name: string;
  isPlayer: boolean;
  lastShotTime: number;
  kills: number;
  isRespawning: boolean;
  respawnTime?: number;
}

export interface ProjectileData {
  id: string;
  x: number;
  y: number;
  rotation: number;
  speed: number;
  ownerId: string;
  damage: number;
  createdAt: number;
}

export interface ParticleData {
  id: string;
  x: number;
  y: number;
  type: 'explosion' | 'smoke' | 'trail' | 'muzzle';
  createdAt: number;
}

export const GameArena: React.FC<GameArenaProps> = ({ playerName, onBackToMenu }) => {
  const arenaRef = useRef<HTMLDivElement>(null);
  const { shake, triggerShake } = useScreenShake();
  
  const {
    tanks,
    projectiles,
    particles,
    powerUps,
    score,
    kills,
    gameTime,
    gameActive,
    keysPressed,
    setTanks,
    setProjectiles,
    setParticles,
    setPowerUps,
    setKills,
    setScore,
    handleShoot,
    collectPowerUp,
    toast,
  } = useGameLogic({
    playerName,
    onGameEnd: (finalScore, finalKills) => {
      toast({
        title: "Game Over!",
        description: `Final Score: ${finalScore} points, ${finalKills} kills`,
      });
    },
  });

  const handleArenaClick = useCallback((e: React.MouseEvent) => {
    if (!gameActive) return;
    
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const playerTank = tanks.find((tank) => tank.isPlayer && !tank.isRespawning);
    if (!playerTank) return;

    const dx = clickX - playerTank.x;
    const dy = clickY - playerTank.y;
    const targetRotation = (Math.atan2(dy, dx) * 180) / Math.PI;

    setTanks(prev => prev.map(tank => 
      tank.isPlayer ? { ...tank, rotation: targetRotation } : tank
    ));

    setTimeout(() => {
      handleShoot('player');
      triggerShake(3, 150);
    }, 100);
  }, [tanks, gameActive, handleShoot, setTanks, triggerShake]);

  const playerTank = tanks.find(tank => tank.isPlayer);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <GameControls 
        onShoot={() => {
          handleShoot('player');
          triggerShake(2, 100);
        }}
        keysPressed={keysPressed}
      />
      
      <GameLoop
        gameActive={gameActive}
        tanks={tanks}
        projectiles={projectiles}
        powerUps={powerUps}
        keysPressed={keysPressed}
        setTanks={setTanks}
        setProjectiles={setProjectiles}
        setParticles={setParticles}
        setPowerUps={setPowerUps}
        setKills={setKills}
        setScore={setScore}
        onShoot={handleShoot}
        onCollectPowerUp={collectPowerUp}
        onToast={toast}
        onScreenShake={triggerShake}
      />

      <GameHUD
        playerName={playerName}
        health={playerTank?.health || 0}
        score={score}
        kills={kills}
        gameTime={gameTime}
        onBackToMenu={onBackToMenu}
      />

      <div className="flex justify-center mt-4">
        <div
          ref={arenaRef}
          className={`relative bg-black rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/20 ${gameActive ? 'cursor-crosshair' : 'cursor-default'}`}
          style={{ 
            width: `${ARENA_WIDTH}px`, 
            height: `${ARENA_HEIGHT}px`,
            transform: shake.active ? `translate(${shake.x}px, ${shake.y}px)` : 'none',
            transition: shake.active ? 'none' : 'transform 0.1s ease-out',
          }}
          onClick={handleArenaClick}
        >
          {/* Map background - lowest layer */}
          <Map width={ARENA_WIDTH} height={ARENA_HEIGHT} />

          {/* Static obstacles - above map */}
          {obstacles.map((obstacle, index) => (
            <div
              key={index}
              className="absolute bg-gradient-to-br from-gray-500 to-gray-700 border border-gray-400 rounded-sm shadow-lg z-10"
              style={{
                left: `${obstacle.x}px`,
                top: `${obstacle.y}px`,
                width: `${obstacle.width}px`,
                height: `${obstacle.height}px`,
              }}
            >
              <div className="absolute inset-1 bg-gradient-to-br from-gray-400 to-gray-600 rounded-sm"></div>
              <div className="absolute top-1 left-1 w-2 h-2 bg-gray-300 rounded-sm"></div>
              <div className="absolute bottom-1 right-1 w-1 h-1 bg-gray-800 rounded-sm"></div>
            </div>
          ))}

          {/* Power-ups - above obstacles */}
          <div className="relative z-15">
            {powerUps.map((powerUp) => (
              <PowerUp key={powerUp.id} {...powerUp} />
            ))}
          </div>

          {/* Enhanced particles - above power-ups */}
          <div className="relative z-20">
            <EnhancedParticleSystem particles={particles} />
          </div>

          {/* Projectiles - above particles */}
          <div className="relative z-30">
            {projectiles.map((projectile) => (
              <Projectile key={projectile.id} {...projectile} />
            ))}
          </div>

          {/* Tanks - highest game layer */}
          <div className="relative z-40">
            {tanks.filter(tank => !tank.isRespawning).map((tank) => (
              <Tank key={tank.id} {...tank} />
            ))}
          </div>

          {/* Game over overlay - absolute highest */}
          {!gameActive && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-cyan-300 mb-4">Game Over!</h2>
                <p className="text-xl text-white mb-2">Final Score: {score}</p>
                <p className="text-xl text-white mb-6">Kills: {kills}</p>
                <button
                  onClick={onBackToMenu}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
                >
                  Return to Menu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center mt-4 text-gray-300 text-sm">
        <p>WASD/Arrow Keys for directional movement • Mouse to aim • Click/Space to shoot • Collect power-ups for advantages</p>
        {playerTank?.isRespawning && (
          <p className="text-red-400 font-semibold">Respawning...</p>
        )}
      </div>
    </div>
  );
};
