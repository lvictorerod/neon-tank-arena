

import { useEffect, useRef } from 'react';
import { TankData, ProjectileData, ParticleData } from './GameArena';
import { PowerUpData } from './PowerUp';
import { 
  checkCollision, 
  checkBoundaryCollision, 
  checkObstacleCollision, 
  obstacles,
  TANK_SIZE,
  PROJECTILE_SIZE
} from './CollisionDetection';

// Game constants
const WEAPON_COOLDOWN = 500;
const PROJECTILE_LIFETIME = 3000;
const RESPAWN_TIME = 3000;

// Enhanced movement constants
const TANK_MAX_SPEED = 120;
const TANK_ACCELERATION = 300;
const TANK_DECELERATION = 400;
const TANK_ROTATION_SPEED = 150;

interface GameLoopProps {
  gameActive: boolean;
  tanks: TankData[];
  projectiles: ProjectileData[];
  powerUps: PowerUpData[];
  keysPressed: React.MutableRefObject<Set<string>>;
  setTanks: React.Dispatch<React.SetStateAction<TankData[]>>;
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileData[]>>;
  setParticles: React.Dispatch<React.SetStateAction<ParticleData[]>>;
  setPowerUps: React.Dispatch<React.SetStateAction<PowerUpData[]>>;
  setKills: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  onShoot: (tankId: string) => void;
  onCollectPowerUp: (tankId: string, powerUpId: string) => void;
  onToast: (toast: { title: string; description: string }) => void;
  onScreenShake: (intensity: number, duration: number) => void;
}

export const GameLoop: React.FC<GameLoopProps> = ({
  gameActive,
  tanks,
  projectiles,
  powerUps,
  keysPressed,
  setTanks,
  setProjectiles,
  setParticles,
  setPowerUps,
  setKills,
  setScore,
  onShoot,
  onCollectPowerUp,
  onToast,
  onScreenShake,
}) => {
  const lastUpdateTime = useRef<number>(Date.now());
  const gameLoopRef = useRef<number>();

  useEffect(() => {
    if (!gameActive) return;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastUpdateTime.current) / 1000, 1/30);
      lastUpdateTime.current = now;

      // Check power-up collisions
      tanks.forEach(tank => {
        if (tank.isRespawning) return;
        
        powerUps.forEach(powerUp => {
          if (checkCollision(tank.x, tank.y, TANK_SIZE, powerUp.x, powerUp.y, 20)) {
            onCollectPowerUp(tank.id, powerUp.id);
          }
        });
      });

      // Update tanks with fixed movement system
      setTanks(prevTanks => {
        const updatedTanks = prevTanks.map(tank => {
          if (tank.isRespawning) {
            if (tank.respawnTime && now > tank.respawnTime) {
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
                velocityX: 0,
                velocityY: 0,
              };
            }
            return tank;
          }

          const enhancedTank = tank as any;
          const speedMultiplier = enhancedTank.speed || 1;
          let currentVelocityX = enhancedTank.velocityX || 0;
          let currentVelocityY = enhancedTank.velocityY || 0;
          let newRotation = tank.rotation;

          if (tank.isPlayer) {
            // Player movement with WASD/Arrow keys
            let inputX = 0;
            let inputY = 0;

            if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
              inputY = -1;
            }
            if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
              inputY = 1;
            }
            if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
              inputX = -1;
            }
            if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
              inputX = 1;
            }

            // Normalize diagonal movement
            if (inputX !== 0 && inputY !== 0) {
              const normalizer = Math.sqrt(2) / 2;
              inputX *= normalizer;
              inputY *= normalizer;
            }

            const accelerationRate = TANK_ACCELERATION * speedMultiplier;
            const maxSpeed = TANK_MAX_SPEED * speedMultiplier;

            // Apply acceleration based on input
            if (inputX !== 0) {
              currentVelocityX += inputX * accelerationRate * deltaTime;
              currentVelocityX = Math.max(-maxSpeed, Math.min(maxSpeed, currentVelocityX));
            } else {
              // Apply deceleration when no input
              if (Math.abs(currentVelocityX) > 5) {
                const deceleration = Math.sign(currentVelocityX) * TANK_DECELERATION * deltaTime;
                currentVelocityX -= deceleration;
                if (Math.sign(currentVelocityX) !== Math.sign(currentVelocityX + deceleration)) {
                  currentVelocityX = 0;
                }
              } else {
                currentVelocityX = 0;
              }
            }

            if (inputY !== 0) {
              currentVelocityY += inputY * accelerationRate * deltaTime;
              currentVelocityY = Math.max(-maxSpeed, Math.min(maxSpeed, currentVelocityY));
            } else {
              // Apply deceleration when no input
              if (Math.abs(currentVelocityY) > 5) {
                const deceleration = Math.sign(currentVelocityY) * TANK_DECELERATION * deltaTime;
                currentVelocityY -= deceleration;
                if (Math.sign(currentVelocityY) !== Math.sign(currentVelocityY + deceleration)) {
                  currentVelocityY = 0;
                }
              } else {
                currentVelocityY = 0;
              }
            }

            // Update rotation based on movement direction
            if (Math.abs(currentVelocityX) > 10 || Math.abs(currentVelocityY) > 10) {
              const targetAngle = (Math.atan2(currentVelocityY, currentVelocityX) * 180) / Math.PI;
              let angleDiff = targetAngle - tank.rotation;
              
              // Normalize angle difference
              while (angleDiff > 180) angleDiff -= 360;
              while (angleDiff < -180) angleDiff += 360;
              
              // Smooth rotation
              if (Math.abs(angleDiff) > 5) {
                const rotationStep = TANK_ROTATION_SPEED * deltaTime;
                if (Math.abs(angleDiff) < rotationStep) {
                  newRotation = targetAngle;
                } else {
                  newRotation += angleDiff > 0 ? rotationStep : -rotationStep;
                }
              }
            }

          } else {
            // AI movement with improved behavior
            const player = prevTanks.find(t => t.isPlayer && !t.isRespawning);
            if (player && Math.random() < 0.02) {
              const dx = player.x - tank.x;
              const dy = player.y - tank.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              let targetX = 0;
              let targetY = 0;
              
              if (distance > 200) {
                // Move towards player
                targetX = (dx / distance) * 0.8;
                targetY = (dy / distance) * 0.8;
              } else if (distance < 100) {
                // Move away from player
                targetX = -(dx / distance) * 0.6;
                targetY = -(dy / distance) * 0.6;
              } else {
                // Strafe around player
                targetX = -(dy / distance) * 0.5;
                targetY = (dx / distance) * 0.5;
              }
              
              // Apply AI movement
              const aiAcceleration = TANK_ACCELERATION * 0.7;
              const aiMaxSpeed = TANK_MAX_SPEED * 0.8;
              
              currentVelocityX += targetX * aiAcceleration * deltaTime;
              currentVelocityY += targetY * aiAcceleration * deltaTime;
              
              currentVelocityX = Math.max(-aiMaxSpeed, Math.min(aiMaxSpeed, currentVelocityX));
              currentVelocityY = Math.max(-aiMaxSpeed, Math.min(aiMaxSpeed, currentVelocityY));
              
              // AI rotation towards player
              const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
              let angleDiff = targetAngle - tank.rotation;
              while (angleDiff > 180) angleDiff -= 360;
              while (angleDiff < -180) angleDiff += 360;
              
              if (Math.abs(angleDiff) > 10) {
                const rotationStep = TANK_ROTATION_SPEED * deltaTime * 0.8;
                newRotation += angleDiff > 0 ? rotationStep : -rotationStep;
              }
              
              // AI shooting
              if (now - tank.lastShotTime > WEAPON_COOLDOWN * 1.5 && 
                  Math.abs(angleDiff) < 30 && 
                  distance < 300 && 
                  Math.random() < 0.08) {
                setTimeout(() => onShoot(tank.id), 0);
              }
            }
            
            // Apply friction to AI tanks
            currentVelocityX *= 0.92;
            currentVelocityY *= 0.92;
            if (Math.abs(currentVelocityX) < 5) currentVelocityX = 0;
            if (Math.abs(currentVelocityY) < 5) currentVelocityY = 0;
          }

          // Calculate new position
          const newX = tank.x + currentVelocityX * deltaTime;
          const newY = tank.y + currentVelocityY * deltaTime;

          // Handle collisions with proper physics response
          let finalX = newX;
          let finalY = newY;
          let finalVelocityX = currentVelocityX;
          let finalVelocityY = currentVelocityY;

          // Boundary collision
          if (checkBoundaryCollision(newX, newY, TANK_SIZE)) {
            if (checkBoundaryCollision(newX, tank.y, TANK_SIZE)) {
              finalX = tank.x;
              finalVelocityX = -currentVelocityX * 0.3; // Bounce with energy loss
            }
            if (checkBoundaryCollision(tank.x, newY, TANK_SIZE)) {
              finalY = tank.y;
              finalVelocityY = -currentVelocityY * 0.3; // Bounce with energy loss
            }
          }

          // Obstacle collision
          if (checkObstacleCollision(finalX, finalY, TANK_SIZE, obstacles)) {
            if (checkObstacleCollision(finalX, tank.y, TANK_SIZE, obstacles)) {
              finalX = tank.x;
              finalVelocityX = -currentVelocityX * 0.2;
            }
            if (checkObstacleCollision(tank.x, finalY, TANK_SIZE, obstacles)) {
              finalY = tank.y;
              finalVelocityY = -currentVelocityY * 0.2;
            }
          }

          // Tank-to-tank collision
          const collidingTank = prevTanks.find(otherTank => 
            otherTank.id !== tank.id && 
            !otherTank.isRespawning &&
            checkCollision(finalX, finalY, TANK_SIZE, otherTank.x, otherTank.y, TANK_SIZE)
          );

          if (collidingTank) {
            const dx = finalX - collidingTank.x;
            const dy = finalY - collidingTank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              // Push tanks apart
              const separation = (TANK_SIZE - distance + 2) * 0.5;
              const separationX = (dx / distance) * separation;
              const separationY = (dy / distance) * separation;
              
              finalX = tank.x + separationX;
              finalY = tank.y + separationY;
              
              // Exchange momentum
              finalVelocityX = -currentVelocityX * 0.4;
              finalVelocityY = -currentVelocityY * 0.4;
            }
          }

          // Normalize rotation
          while (newRotation >= 360) newRotation -= 360;
          while (newRotation < 0) newRotation += 360;

          return {
            ...tank,
            x: finalX,
            y: finalY,
            rotation: newRotation,
            velocityX: finalVelocityX,
            velocityY: finalVelocityY,
          } as TankData & { velocityX: number; velocityY: number };
        });

        return updatedTanks;
      });

      // Enhanced projectile updates with better collision
      setProjectiles(prevProjectiles => {
        const activeProjectiles: ProjectileData[] = [];
        
        for (const projectile of prevProjectiles) {
          if (now - projectile.createdAt >= PROJECTILE_LIFETIME) {
            continue;
          }

          const newX = projectile.x + Math.cos((projectile.rotation * Math.PI) / 180) * projectile.speed * deltaTime;
          const newY = projectile.y + Math.sin((projectile.rotation * Math.PI) / 180) * projectile.speed * deltaTime;

          if (checkBoundaryCollision(newX, newY, PROJECTILE_SIZE)) {
            continue;
          }

          if (checkObstacleCollision(newX, newY, PROJECTILE_SIZE, obstacles)) {
            setParticles(prev => [...prev, {
              id: `explosion_${Date.now()}_${Math.random()}`,
              x: newX,
              y: newY,
              type: 'explosion',
              createdAt: now,
            }]);
            onScreenShake(4, 200);
            continue;
          }

          let hitTank = false;
          setTanks(prevTanks => {
            const targetTank = prevTanks.find(tank => 
              !tank.isRespawning &&
              tank.id !== projectile.ownerId &&
              checkCollision(newX, newY, PROJECTILE_SIZE, tank.x, tank.y, TANK_SIZE)
            );

            if (targetTank) {
              hitTank = true;
              
              setParticles(prev => [...prev, {
                id: `explosion_${Date.now()}_${Math.random()}`,
                x: newX,
                y: newY,
                type: 'explosion',
                createdAt: now,
              }]);

              onScreenShake(6, 300);

              return prevTanks.map(tank => {
                if (tank.id === targetTank.id) {
                  const enhancedTank = tank as any;
                  let damage = projectile.damage;
                  
                  if (enhancedTank.shield && enhancedTank.shield > 0) {
                    const shieldAbsorbed = Math.min(damage, enhancedTank.shield);
                    damage -= shieldAbsorbed;
                    enhancedTank.shield -= shieldAbsorbed;
                  }
                  
                  const newHealth = Math.max(0, tank.health - damage);
                  
                  if (newHealth === 0 && !tank.isRespawning) {
                    const shooter = prevTanks.find(t => t.id === projectile.ownerId);
                    if (shooter?.isPlayer) {
                      setKills(prev => prev + 1);
                      setScore(prev => prev + 100);
                      onToast({
                        title: "Elimination!",
                        description: `You eliminated ${tank.name}`,
                      });
                    }

                    return {
                      ...enhancedTank,
                      health: 0,
                      isRespawning: true,
                      respawnTime: now + RESPAWN_TIME,
                      velocityX: 0,
                      velocityY: 0,
                    };
                  }
                  
                  return { ...enhancedTank, health: newHealth };
                }
                return tank;
              });
            }

            return prevTanks;
          });

          if (!hitTank) {
            activeProjectiles.push({
              ...projectile,
              x: newX,
              y: newY,
            });
          }
        }

        return activeProjectiles;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameActive, tanks, projectiles, powerUps, keysPressed, setTanks, setProjectiles, setParticles, setPowerUps, setKills, setScore, onShoot, onCollectPowerUp, onToast, onScreenShake]);

  return null;
};

