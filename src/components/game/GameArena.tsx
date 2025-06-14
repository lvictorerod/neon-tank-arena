
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tank } from './Tank';
import { Projectile } from './Projectile';
import { GameHUD } from './GameHUD';
import { ParticleSystem } from './ParticleSystem';

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
  name: string;
  isPlayer: boolean;
}

export interface ProjectileData {
  id: string;
  x: number;
  y: number;
  rotation: number;
  speed: number;
}

export interface ParticleData {
  id: string;
  x: number;
  y: number;
  type: 'explosion' | 'smoke' | 'trail';
}

export const GameArena: React.FC<GameArenaProps> = ({ playerName, onBackToMenu }) => {
  const arenaRef = useRef<HTMLDivElement>(null);
  const [tanks, setTanks] = useState<TankData[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [gameTime, setGameTime] = useState(300); // 5 minutes
  const keysPressed = useRef<Set<string>>(new Set());

  // Initialize game
  useEffect(() => {
    const initialTanks: TankData[] = [
      {
        id: 'player',
        x: 400,
        y: 300,
        rotation: 0,
        health: 100,
        name: playerName,
        isPlayer: true,
      },
      {
        id: 'enemy1',
        x: 100,
        y: 100,
        rotation: 45,
        health: 100,
        name: 'Alpha-7',
        isPlayer: false,
      },
      {
        id: 'enemy2',
        x: 700,
        y: 500,
        rotation: 225,
        health: 75,
        name: 'Storm',
        isPlayer: false,
      },
    ];
    setTanks(initialTanks);
  }, [playerName]);

  // Game timer
  useEffect(() => {
    const timer = setInterval(() => {
      setGameTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Keyboard input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Tank movement update loop
  useEffect(() => {
    const updateLoop = setInterval(() => {
      setTanks((prevTanks) =>
        prevTanks.map((tank) => {
          if (!tank.isPlayer) return tank;

          let newX = tank.x;
          let newY = tank.y;
          let newRotation = tank.rotation;

          const speed = 3;
          const rotationSpeed = 3;

          // Movement
          if (keysPressed.current.has('w')) {
            newX += Math.cos((tank.rotation * Math.PI) / 180) * speed;
            newY += Math.sin((tank.rotation * Math.PI) / 180) * speed;
          }
          if (keysPressed.current.has('s')) {
            newX -= Math.cos((tank.rotation * Math.PI) / 180) * speed;
            newY -= Math.sin((tank.rotation * Math.PI) / 180) * speed;
          }
          if (keysPressed.current.has('a')) {
            newRotation -= rotationSpeed;
          }
          if (keysPressed.current.has('d')) {
            newRotation += rotationSpeed;
          }

          // Boundary checking
          const arenaWidth = 800;
          const arenaHeight = 600;
          newX = Math.max(25, Math.min(arenaWidth - 25, newX));
          newY = Math.max(25, Math.min(arenaHeight - 25, newY));

          return {
            ...tank,
            x: newX,
            y: newY,
            rotation: newRotation,
          };
        })
      );
    }, 16); // ~60 FPS

    return () => clearInterval(updateLoop);
  }, []);

  // Projectile physics
  useEffect(() => {
    const projectileLoop = setInterval(() => {
      setProjectiles((prev) =>
        prev
          .map((projectile) => ({
            ...projectile,
            x: projectile.x + Math.cos((projectile.rotation * Math.PI) / 180) * projectile.speed,
            y: projectile.y + Math.sin((projectile.rotation * Math.PI) / 180) * projectile.speed,
          }))
          .filter((projectile) => 
            projectile.x > 0 && projectile.x < 800 && 
            projectile.y > 0 && projectile.y < 600
          )
      );
    }, 16);

    return () => clearInterval(projectileLoop);
  }, []);

  const handleShoot = useCallback((tank: TankData) => {
    const newProjectile: ProjectileData = {
      id: `proj_${Date.now()}_${Math.random()}`,
      x: tank.x + Math.cos((tank.rotation * Math.PI) / 180) * 30,
      y: tank.y + Math.sin((tank.rotation * Math.PI) / 180) * 30,
      rotation: tank.rotation,
      speed: 8,
    };

    setProjectiles((prev) => [...prev, newProjectile]);

    // Add muzzle flash particle
    const muzzleFlash: ParticleData = {
      id: `particle_${Date.now()}`,
      x: newProjectile.x,
      y: newProjectile.y,
      type: 'trail',
    };

    setParticles((prev) => [...prev, muzzleFlash]);
  }, []);

  // Mouse click to shoot
  const handleArenaClick = useCallback((e: React.MouseEvent) => {
    const playerTank = tanks.find((tank) => tank.isPlayer);
    if (playerTank) {
      handleShoot(playerTank);
    }
  }, [tanks, handleShoot]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <GameHUD
        playerName={playerName}
        health={tanks.find(tank => tank.isPlayer)?.health || 0}
        score={score}
        kills={kills}
        gameTime={gameTime}
        onBackToMenu={onBackToMenu}
      />

      <div className="flex justify-center mt-4">
        <div
          ref={arenaRef}
          className="relative w-[800px] h-[600px] bg-black/60 border-2 border-cyan-500/50 rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/20 cursor-crosshair"
          onClick={handleArenaClick}
        >
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="cyan" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Static obstacles */}
          <div className="absolute top-20 left-20 w-16 h-16 bg-gray-600 border border-gray-400 rounded-sm shadow-lg"></div>
          <div className="absolute bottom-20 right-20 w-20 h-12 bg-gray-600 border border-gray-400 rounded-sm shadow-lg"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gray-600 border border-gray-400 rounded-sm shadow-lg"></div>

          {/* Particles */}
          <ParticleSystem particles={particles} />

          {/* Projectiles */}
          {projectiles.map((projectile) => (
            <Projectile key={projectile.id} {...projectile} />
          ))}

          {/* Tanks */}
          {tanks.map((tank) => (
            <Tank key={tank.id} {...tank} />
          ))}
        </div>
      </div>

      <div className="text-center mt-4 text-gray-300 text-sm">
        <p>WASD to move • Mouse to aim • Click to shoot • Eliminate enemies to score points</p>
      </div>
    </div>
  );
};
