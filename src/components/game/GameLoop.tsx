
import { useEffect, useRef } from 'react';
import { TankData, ProjectileData, ParticleData } from './GameArena';
import { 
  checkCollision, 
  checkBoundaryCollision, 
  checkObstacleCollision, 
  obstacles,
  TANK_SIZE,
  PROJECTILE_SIZE
} from './CollisionDetection';

const PROJECTILE_LIFETIME = 3000;
const WEAPON_COOLDOWN = 500;
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
  keysPressed: React.MutableRefObject<Set<string>>;
  setTanks: React.Dispatch<React.SetStateAction<TankData[]>>;
  setProjectiles: React.Dispatch<React.SetStateAction<ProjectileData[]>>;
  setParticles: React.Dispatch<React.SetStateAction<ParticleData[]>>;
  setKills: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  onShoot: (tankId: string) => void;
  onToast: (toast: { title: string; description: string }) => void;
}

export const GameLoop: React.FC<GameLoopProps> = ({
  gameActive,
  tanks,
  projectiles,
  keysPressed,
  setTanks,
  setProjectiles,
  setParticles,
  setKills,
  setScore,
  onShoot,
  onToast,
}) => {
  const lastUpdateTime = useRef<number>(Date.now());
  const gameLoopRef = useRef<number>();

  useEffect(() => {
    if (!gameActive) return;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastUpdateTime.current) / 1000, 1/30); // Cap at 30fps
      lastUpdateTime.current = now;

      // Update tanks
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

          // Initialize velocity if not present
          const currentVelocityX = (tank as any).velocityX || 0;
          const currentVelocityY = (tank as any).velocityY || 0;
          
          let velocityX = currentVelocityX;
          let velocityY = currentVelocityY;
          let newRotation = tank.rotation;

          if (tank.isPlayer) {
            // Player input handling
            let inputX = 0;
            let inputY = 0;

            // WASD movement - independent of rotation
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

            // Normalize diagonal input
            if (inputX !== 0 && inputY !== 0) {
              const normalizer = Math.sqrt(2) / 2;
              inputX *= normalizer;
              inputY *= normalizer;
            }

            // Apply acceleration or deceleration
            if (inputX !== 0) {
              velocityX += inputX * TANK_ACCELERATION * deltaTime;
              velocityX = Math.max(-TANK_MAX_SPEED, Math.min(TANK_MAX_SPEED, velocityX));
            } else {
              // Apply deceleration
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
              velocityY += inputY * TANK_ACCELERATION * deltaTime;
              velocityY = Math.max(-TANK_MAX_SPEED, Math.min(TANK_MAX_SPEED, velocityY));
            } else {
              // Apply deceleration
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
            // AI movement with velocity
            const player = prevTanks.find(t => t.isPlayer && !t.isRespawning);
            if (player && Math.random() < 0.02) {
              const dx = player.x - tank.x;
              const dy = player.y - tank.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 150) {
                const moveX = (dx / distance) * TANK_ACCELERATION * deltaTime * 0.6;
                const moveY = (dy / distance) * TANK_ACCELERATION * deltaTime * 0.6;
                velocityX += moveX;
                velocityY += moveY;
              } else if (distance < 100) {
                const moveX = -(dx / distance) * TANK_ACCELERATION * deltaTime * 0.4;
                const moveY = -(dy / distance) * TANK_ACCELERATION * deltaTime * 0.4;
                velocityX += moveX;
                velocityY += moveY;
              }
              
              // Clamp AI velocity
              velocityX = Math.max(-TANK_MAX_SPEED * 0.7, Math.min(TANK_MAX_SPEED * 0.7, velocityX));
              velocityY = Math.max(-TANK_MAX_SPEED * 0.7, Math.min(TANK_MAX_SPEED * 0.7, velocityY));
              
              // AI rotation for aiming
              const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
              let angleDiff = targetAngle - tank.rotation;
              if (angleDiff > 180) angleDiff -= 360;
              if (angleDiff < -180) angleDiff += 360;
              
              if (Math.abs(angleDiff) > 15) {
                newRotation += angleDiff > 0 ? TANK_ROTATION_SPEED * deltaTime * 0.8 : -TANK_ROTATION_SPEED * deltaTime * 0.8;
              }
              
              // AI shooting
              if (now - tank.lastShotTime > WEAPON_COOLDOWN * 2.5 && 
                  Math.abs(angleDiff) < 30 && 
                  distance < 200 && 
                  Math.random() < 0.04) {
                setTimeout(() => onShoot(tank.id), 0);
              }
            }
            
            // Apply AI deceleration
            velocityX *= 0.95;
            velocityY *= 0.95;
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

      // Update projectiles
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

              return prevTanks.map(tank => {
                if (tank.id === targetTank.id) {
                  const newHealth = Math.max(0, tank.health - projectile.damage);
                  
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
                      ...tank,
                      health: 0,
                      isRespawning: true,
                      respawnTime: now + RESPAWN_TIME,
                    };
                  }
                  
                  return { ...tank, health: newHealth };
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
  }, [gameActive, tanks, projectiles, keysPressed, setTanks, setProjectiles, setParticles, setKills, setScore, onShoot, onToast]);

  return null;
};
