
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tank } from './Tank';
import { Projectile } from './Projectile';
import { GameHUD } from './GameHUD';
import { ParticleSystem } from './ParticleSystem';
import { useToast } from '@/hooks/use-toast';

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

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const TANK_SIZE = 25;
const PROJECTILE_LIFETIME = 3000; // 3 seconds
const WEAPON_COOLDOWN = 500; // 500ms
const RESPAWN_TIME = 3000; // 3 seconds

export const GameArena: React.FC<GameArenaProps> = ({ playerName, onBackToMenu }) => {
  const arenaRef = useRef<HTMLDivElement>(null);
  const [tanks, setTanks] = useState<TankData[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [gameTime, setGameTime] = useState(300); // 5 minutes
  const [gameActive, setGameActive] = useState(true);
  const keysPressed = useRef<Set<string>>(new Set());
  const lastUpdateTime = useRef<number>(Date.now());
  const { toast } = useToast();

  // Static obstacles for cover
  const obstacles: Obstacle[] = [
    { x: 100, y: 100, width: 60, height: 60 },
    { x: 640, y: 440, width: 80, height: 60 },
    { x: 360, y: 260, width: 80, height: 80 },
    { x: 150, y: 400, width: 60, height: 40 },
    { x: 590, y: 150, width: 40, height: 80 },
  ];

  // Collision detection utilities
  const checkCollision = useCallback((x1: number, y1: number, size1: number, x2: number, y2: number, size2: number): boolean => {
    const distance = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    return distance < (size1 + size2) / 2;
  }, []);

  const checkObstacleCollision = useCallback((x: number, y: number, size: number): boolean => {
    return obstacles.some(obstacle => 
      x - size/2 < obstacle.x + obstacle.width &&
      x + size/2 > obstacle.x &&
      y - size/2 < obstacle.y + obstacle.height &&
      y + size/2 > obstacle.y
    );
  }, []);

  const checkBoundaryCollision = useCallback((x: number, y: number, size: number): boolean => {
    return x - size/2 < 0 || x + size/2 > ARENA_WIDTH || y - size/2 < 0 || y + size/2 > ARENA_HEIGHT;
  }, []);

  // Initialize game with better balanced setup
  useEffect(() => {
    const spawnPositions = [
      { x: 100, y: 50 },
      { x: 700, y: 550 },
      { x: 50, y: 300 },
      { x: 750, y: 300 },
      { x: 400, y: 50 },
      { x: 400, y: 550 },
    ];

    const initialTanks: TankData[] = [
      {
        id: 'player',
        x: spawnPositions[0].x,
        y: spawnPositions[0].y,
        rotation: 0,
        health: 100,
        maxHealth: 100,
        name: playerName,
        isPlayer: true,
        lastShotTime: 0,
        kills: 0,
        isRespawning: false,
      },
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `bot_${i + 1}`,
        x: spawnPositions[i + 1].x,
        y: spawnPositions[i + 1].y,
        rotation: Math.random() * 360,
        health: 100,
        maxHealth: 100,
        name: ['Alpha-7', 'Storm', 'Viper'][i],
        isPlayer: false,
        lastShotTime: 0,
        kills: 0,
        isRespawning: false,
      }))
    ];
    setTanks(initialTanks);
  }, [playerName]);

  // Game timer with end condition
  useEffect(() => {
    if (!gameActive) return;
    
    const timer = setInterval(() => {
      setGameTime((prev) => {
        if (prev <= 1) {
          setGameActive(false);
          toast({
            title: "Game Over!",
            description: `Final Score: ${score} points, ${kills} kills`,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, score, kills, toast]);

  // Enhanced keyboard input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      keysPressed.current.add(e.key.toLowerCase());
      
      // Space bar for shooting
      if (e.key === ' ') {
        const playerTank = tanks.find(tank => tank.isPlayer && !tank.isRespawning);
        if (playerTank) {
          handleShoot(playerTank);
        }
      }
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
  }, [tanks]);

  // Enhanced tank movement with collision detection
  useEffect(() => {
    if (!gameActive) return;

    const updateLoop = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTime.current;
      lastUpdateTime.current = now;

      setTanks((prevTanks) =>
        prevTanks.map((tank) => {
          if (tank.isRespawning) {
            if (tank.respawnTime && now > tank.respawnTime) {
              // Respawn tank
              const spawnPositions = [
                { x: 100, y: 50 }, { x: 700, y: 550 }, { x: 50, y: 300 }, 
                { x: 750, y: 300 }, { x: 400, y: 50 }, { x: 400, y: 550 }
              ];
              const spawnPos = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
              
              return {
                ...tank,
                x: spawnPos.x,
                y: spawnPos.y,
                health: tank.maxHealth,
                isRespawning: false,
                respawnTime: undefined,
              };
            }
            return tank;
          }

          let newX = tank.x;
          let newY = tank.y;
          let newRotation = tank.rotation;

          const speed = 120 * (deltaTime / 1000); // pixels per second
          const rotationSpeed = 180 * (deltaTime / 1000); // degrees per second

          if (tank.isPlayer) {
            // Player movement
            if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
              const moveX = Math.cos((tank.rotation * Math.PI) / 180) * speed;
              const moveY = Math.sin((tank.rotation * Math.PI) / 180) * speed;
              newX += moveX;
              newY += moveY;
            }
            if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
              const moveX = Math.cos((tank.rotation * Math.PI) / 180) * speed;
              const moveY = Math.sin((tank.rotation * Math.PI) / 180) * speed;
              newX -= moveX;
              newY -= moveY;
            }
            if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
              newRotation -= rotationSpeed;
            }
            if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
              newRotation += rotationSpeed;
            }
          } else {
            // Simple AI behavior
            const player = prevTanks.find(t => t.isPlayer && !t.isRespawning);
            if (player && Math.random() < 0.02) {
              const dx = player.x - tank.x;
              const dy = player.y - tank.y;
              const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
              
              if (Math.abs(targetAngle - tank.rotation) > 10) {
                newRotation += targetAngle > tank.rotation ? rotationSpeed : -rotationSpeed;
              }
              
              if (Math.random() < 0.1) {
                newX += Math.cos((tank.rotation * Math.PI) / 180) * speed;
                newY += Math.sin((tank.rotation * Math.PI) / 180) * speed;
              }
              
              // AI shooting
              if (now - tank.lastShotTime > WEAPON_COOLDOWN * 2 && Math.random() < 0.05) {
                setTimeout(() => handleShoot(tank), 0);
              }
            }
          }

          // Collision detection
          if (checkBoundaryCollision(newX, newY, TANK_SIZE) || checkObstacleCollision(newX, newY, TANK_SIZE)) {
            newX = tank.x;
            newY = tank.y;
          }

          // Tank-to-tank collision
          const wouldCollide = prevTanks.some(otherTank => 
            otherTank.id !== tank.id && 
            !otherTank.isRespawning &&
            checkCollision(newX, newY, TANK_SIZE, otherTank.x, otherTank.y, TANK_SIZE)
          );

          if (wouldCollide) {
            newX = tank.x;
            newY = tank.y;
          }

          return {
            ...tank,
            x: newX,
            y: newY,
            rotation: newRotation % 360,
          };
        })
      );
    }, 16); // ~60 FPS

    return () => clearInterval(updateLoop);
  }, [gameActive, checkBoundaryCollision, checkObstacleCollision, checkCollision]);

  // Enhanced projectile physics with collision detection
  useEffect(() => {
    if (!gameActive) return;

    const projectileLoop = setInterval(() => {
      const now = Date.now();
      
      setProjectiles((prev) => {
        const activeProjectiles = prev
          .filter(projectile => now - projectile.createdAt < PROJECTILE_LIFETIME)
          .map((projectile) => {
            const newX = projectile.x + Math.cos((projectile.rotation * Math.PI) / 180) * projectile.speed * 0.016;
            const newY = projectile.y + Math.sin((projectile.rotation * Math.PI) / 180) * projectile.speed * 0.016;

            // Check boundary collision
            if (newX < 0 || newX > ARENA_WIDTH || newY < 0 || newY > ARENA_HEIGHT) {
              return null;
            }

            // Check obstacle collision
            if (checkObstacleCollision(newX, newY, 5)) {
              // Create explosion particle
              setParticles(prev => [...prev, {
                id: `explosion_${Date.now()}_${Math.random()}`,
                x: newX,
                y: newY,
                type: 'explosion',
                createdAt: now,
              }]);
              return null;
            }

            // Check tank collision
            const hitTank = tanks.find(tank => 
              !tank.isRespawning &&
              tank.id !== projectile.ownerId &&
              checkCollision(newX, newY, 5, tank.x, tank.y, TANK_SIZE)
            );

            if (hitTank) {
              // Damage tank
              setTanks(prevTanks => prevTanks.map(tank => {
                if (tank.id === hitTank.id) {
                  const newHealth = Math.max(0, tank.health - projectile.damage);
                  
                  if (newHealth === 0 && !tank.isRespawning) {
                    // Tank eliminated
                    const shooter = prevTanks.find(t => t.id === projectile.ownerId);
                    if (shooter?.isPlayer) {
                      setKills(prev => prev + 1);
                      setScore(prev => prev + 100);
                      toast({
                        title: "Elimination!",
                        description: `You eliminated ${tank.name}`,
                      });
                    }

                    return {
                      ...tank,
                      health: 0,
                      isRespawning: true,
                      respawnTime: now + RESPAWN_TIME,
                    };
                  }
                  
                  return { ...tank, health: newHealth };
                }
                return tank;
              }));

              // Create explosion
              setParticles(prev => [...prev, {
                id: `explosion_${Date.now()}_${Math.random()}`,
                x: newX,
                y: newY,
                type: 'explosion',
                createdAt: now,
              }]);

              return null;
            }

            return {
              ...projectile,
              x: newX,
              y: newY,
            };
          })
          .filter(Boolean) as ProjectileData[];

        return activeProjectiles;
      });
    }, 16);

    return () => clearInterval(projectileLoop);
  }, [gameActive, tanks, checkObstacleCollision, checkCollision, toast]);

  // Particle system cleanup
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setParticles(prev => prev.filter(particle => now - particle.createdAt < 2000));
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  const handleShoot = useCallback((tank: TankData) => {
    const now = Date.now();
    
    if (now - tank.lastShotTime < WEAPON_COOLDOWN || tank.isRespawning) {
      return;
    }

    const barrelLength = 30;
    const projectileX = tank.x + Math.cos((tank.rotation * Math.PI) / 180) * barrelLength;
    const projectileY = tank.y + Math.sin((tank.rotation * Math.PI) / 180) * barrelLength;

    const newProjectile: ProjectileData = {
      id: `proj_${Date.now()}_${Math.random()}`,
      x: projectileX,
      y: projectileY,
      rotation: tank.rotation,
      speed: 400,
      ownerId: tank.id,
      damage: 25,
      createdAt: now,
    };

    setProjectiles((prev) => [...prev, newProjectile]);

    // Update tank's last shot time
    setTanks(prev => prev.map(t => 
      t.id === tank.id ? { ...t, lastShotTime: now } : t
    ));

    // Add muzzle flash
    setParticles((prev) => [...prev, {
      id: `muzzle_${Date.now()}`,
      x: projectileX,
      y: projectileY,
      type: 'muzzle',
      createdAt: now,
    }]);
  }, []);

  const handleArenaClick = useCallback((e: React.MouseEvent) => {
    if (!gameActive) return;
    
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const playerTank = tanks.find((tank) => tank.isPlayer && !tank.isRespawning);
    if (!playerTank) return;

    // Calculate angle to click position
    const dx = clickX - playerTank.x;
    const dy = clickY - playerTank.y;
    const targetRotation = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Update tank rotation toward click
    setTanks(prev => prev.map(tank => 
      tank.isPlayer ? { ...tank, rotation: targetRotation } : tank
    ));

    // Shoot after a brief delay for rotation
    setTimeout(() => {
      const updatedTank = { ...playerTank, rotation: targetRotation };
      handleShoot(updatedTank);
    }, 100);
  }, [tanks, gameActive, handleShoot]);

  const playerTank = tanks.find(tank => tank.isPlayer);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
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
          className={`relative w-[${ARENA_WIDTH}px] h-[${ARENA_HEIGHT}px] bg-black/60 border-2 border-cyan-500/50 rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/20 ${gameActive ? 'cursor-crosshair' : 'cursor-default'}`}
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

          {/* Dynamic obstacles */}
          {obstacles.map((obstacle, index) => (
            <div
              key={index}
              className="absolute bg-gray-600 border border-gray-400 rounded-sm shadow-lg"
              style={{
                left: `${obstacle.x}px`,
                top: `${obstacle.y}px`,
                width: `${obstacle.width}px`,
                height: `${obstacle.height}px`,
              }}
            />
          ))}

          {/* Particles */}
          <ParticleSystem particles={particles} />

          {/* Projectiles */}
          {projectiles.map((projectile) => (
            <Projectile key={projectile.id} {...projectile} />
          ))}

          {/* Tanks */}
          {tanks.filter(tank => !tank.isRespawning).map((tank) => (
            <Tank key={tank.id} {...tank} />
          ))}

          {/* Game over overlay */}
          {!gameActive && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
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
        <p>WASD/Arrow Keys to move • Mouse to aim • Click/Space to shoot • Use cover to survive</p>
        {playerTank?.isRespawning && (
          <p className="text-red-400 font-semibold">Respawning...</p>
        )}
      </div>
    </div>
  );
};
