
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

      // Update tanks with enhanced movement
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
              };
            }
            return tank;
          }

          const enhancedTank = tank as any;
          const speedMultiplier = enhancedTank.speed || 1;
          const currentVelocityX = enhancedTank.velocityX || 0;
          const currentVelocityY = enhancedTank.velocityY || 0;
          
          let velocityX = currentVelocityX;
          let velocityY = currentVelocityY;
          let newRotation = tank.rotation;

          if (tank.isPlayer) {
            // Enhanced player input with speed boost
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

            if (inputX !== 0 && inputY !== 0) {
              const normalizer = Math.sqrt(2) / 2;
              inputX *= normalizer;
              inputY *= normalizer;
            }

            const accelerationRate = TANK_ACCELERATION * speedMultiplier;
            const maxSpeed = TANK_MAX_SPEED * speedMultiplier;

            if (inputX !== 0) {
              velocityX += inputX * accelerationRate * deltaTime;
              velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, velocityX));
            } else {
              if (Math.abs(velocityX) > 5) {
                const decel = Math.sign(velocityX) * TANK_DECELERATION * deltaTime;
                velocityX -= decel;
                if (Math.sign(velocityX) !== Math.sign(velocityX + decel)) {
                  velocityX = 0;
                }
              } else {
                velocityX = 0;
              }
            }

            if (inputY !== 0) {
              velocityY += inputY * accelerationRate * deltaTime;
              velocityY = Math.max(-maxSpeed, Math.min(maxSpeed, velocityY));
            } else {
              if (Math.abs(velocityY) > 5) {
                const decel = Math.sign(velocityY) * TANK_DECELERATION * deltaTime;
                velocityY -= decel;
                if (Math.sign(velocityY) !== Math.sign(velocityY + decel)) {
                  velocityY = 0;
                }
              } else {
                velocityY = 0;
              }
            }

          } else {
            // Enhanced AI with better tactics
            const player = prevTanks.find(t => t.isPlayer && !t.isRespawning);
            if (player && Math.random() < 0.03) {
              const dx = player.x - tank.x;
              const dy = player.y - tank.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 180) {
                const moveX = (dx / distance) * TANK_ACCELERATION * deltaTime * 0.7;
                const moveY = (dy / distance) * TANK_ACCELERATION * deltaTime * 0.7;
                velocityX += moveX;
                velocityY += moveY;
              } else if (distance < 120) {
                const moveX = -(dx / distance) * TANK_ACCELERATION * deltaTime * 0.5;
                const moveY = -(dy / distance) * TANK_ACCELERATION * deltaTime * 0.5;
                velocityX += moveX;
                velocityY += moveY;
              }
              
              velocityX = Math.max(-TANK_MAX_SPEED * 0.8, Math.min(TANK_MAX_SPEED * 0.8, velocityX));
              velocityY = Math.max(-TANK_MAX_SPEED * 0.8, Math.min(TANK_MAX_SPEED * 0.8, velocityY));
              
              const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
              let angleDiff = targetAngle - tank.rotation;
              if (angleDiff > 180) angleDiff -= 360;
              if (angleDiff < -180) angleDiff += 360;
              
              if (Math.abs(angleDiff) > 20) {
                newRotation += angleDiff > 0 ? TANK_ROTATION_SPEED * deltaTime : -TANK_ROTATION_SPEED * deltaTime;
              }
              
              if (now - tank.lastShotTime > WEAPON_COOLDOWN * 2 && 
                  Math.abs(angleDiff) < 25 && 
                  distance < 250 && 
                  Math.random() < 0.06) {
                setTimeout(() => onShoot(tank.id), 0);
              }
            }
            
            velocityX *= 0.94;
            velocityY *= 0.94;
            if (Math.abs(velocityX) < 5) velocityX = 0;
            if (Math.abs(velocityY) < 5) velocityY = 0;
          }

          // Calculate new position based on velocity
          const newX = tank.x + velocityX * deltaTime;
          const newY = tank.y + velocityY * deltaTime;

          // Collision detection and response
          let finalX = newX;
          let finalY = newY;
          let finalVelocityX = velocityX;
          let finalVelocityY = velocityY;

          // Boundary collision with velocity dampening
          if (checkBoundaryCollision(newX, newY, TANK_SIZE)) {
            if (checkBoundaryCollision(newX, tank.y, TANK_SIZE)) {
              finalX = tank.x;
              finalVelocityX = 0;
            }
            if (checkBoundaryCollision(tank.x, newY, TANK_SIZE)) {
              finalY = tank.y;
              finalVelocityY = 0;
            }
          }

          // Obstacle collision with velocity dampening
          if (checkObstacleCollision(finalX, finalY, TANK_SIZE, obstacles)) {
            if (checkObstacleCollision(finalX, tank.y, TANK_SIZE, obstacles)) {
              finalX = tank.x;
              finalVelocityX = 0;
            }
            if (checkObstacleCollision(tank.x, finalY, TANK_SIZE, obstacles)) {
              finalY = tank.y;
              finalVelocityY = 0;
            }
          }

          // Tank-to-tank collision with physics response
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
              const separation = TANK_SIZE - distance + 2;
              const separationX = (dx / distance) * separation * 0.5;
              const separationY = (dy / distance) * separation * 0.5;
              
              finalX = tank.x + separationX;
              finalY = tank.y + separationY;
              
              // Bounce effect
              finalVelocityX *= -0.3;
              finalVelocityY *= -0.3;
            }
          }

          return {
            ...tank,
            x: finalX,
            y: finalY,
            rotation: newRotation % 360,
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
                  
                  // Apply shield protection
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
