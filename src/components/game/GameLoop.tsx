
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
      const deltaTime = now - lastUpdateTime.current;
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

          let newX = tank.x;
          let newY = tank.y;
          let newRotation = tank.rotation;

          // Realistic tank movement speeds
          const speed = 80 * (deltaTime / 1000); // Slower, more realistic
          const rotationSpeed = 120 * (deltaTime / 1000); // Separate rotation speed

          if (tank.isPlayer) {
            // Realistic tank movement - WASD for directional movement, independent of facing
            let moveX = 0;
            let moveY = 0;

            // Forward/backward movement
            if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
              moveY = -speed; // Move up
            }
            if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
              moveY = speed; // Move down
            }

            // Left/right movement (strafing)
            if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) {
              moveX = -speed; // Move left
            }
            if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) {
              moveX = speed; // Move right
            }

            // Apply movement
            newX += moveX;
            newY += moveY;

            // Diagonal movement compensation (normalize speed)
            if (moveX !== 0 && moveY !== 0) {
              const normalizer = Math.sqrt(2) / 2;
              newX = tank.x + (moveX * normalizer);
              newY = tank.y + (moveY * normalizer);
            }

          } else {
            // Improved AI behavior with more realistic movement
            const player = prevTanks.find(t => t.isPlayer && !t.isRespawning);
            if (player && Math.random() < 0.015) { // Less frequent updates for smoother movement
              const dx = player.x - tank.x;
              const dy = player.y - tank.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // AI tries to maintain optimal distance and move more tactically
              if (distance > 150) {
                // Move towards player
                const moveX = (dx / distance) * speed * 0.7;
                const moveY = (dy / distance) * speed * 0.7;
                newX += moveX;
                newY += moveY;
              } else if (distance < 100) {
                // Move away from player to maintain distance
                const moveX = -(dx / distance) * speed * 0.5;
                const moveY = -(dy / distance) * speed * 0.5;
                newX += moveX;
                newY += moveY;
              }
              
              // AI rotation for aiming
              const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
              let angleDiff = targetAngle - tank.rotation;
              if (angleDiff > 180) angleDiff -= 360;
              if (angleDiff < -180) angleDiff += 360;
              
              if (Math.abs(angleDiff) > 15) {
                newRotation += angleDiff > 0 ? rotationSpeed * 0.8 : -rotationSpeed * 0.8;
              }
              
              // AI shooting with better timing
              if (now - tank.lastShotTime > WEAPON_COOLDOWN * 2.5 && 
                  Math.abs(angleDiff) < 30 && 
                  distance < 200 && 
                  Math.random() < 0.04) {
                setTimeout(() => onShoot(tank.id), 0);
              }
            }
          }

          // Smooth collision detection with slide mechanics
          let finalX = newX;
          let finalY = newY;

          // Check boundary collision with sliding
          if (checkBoundaryCollision(newX, newY, TANK_SIZE)) {
            // Try sliding along walls
            if (!checkBoundaryCollision(tank.x, newY, TANK_SIZE)) {
              finalX = tank.x; // Slide horizontally
            } else if (!checkBoundaryCollision(newX, tank.y, TANK_SIZE)) {
              finalY = tank.y; // Slide vertically
            } else {
              finalX = tank.x;
              finalY = tank.y; // Stop completely
            }
          }

          // Check obstacle collision with sliding
          if (checkObstacleCollision(finalX, finalY, TANK_SIZE, obstacles)) {
            // Try sliding around obstacles
            if (!checkObstacleCollision(tank.x, finalY, TANK_SIZE, obstacles)) {
              finalX = tank.x; // Slide horizontally
            } else if (!checkObstacleCollision(finalX, tank.y, TANK_SIZE, obstacles)) {
              finalY = tank.y; // Slide vertically
            } else {
              finalX = tank.x;
              finalY = tank.y; // Stop completely
            }
          }

          // Tank-to-tank collision with better separation
          const collidingTank = prevTanks.find(otherTank => 
            otherTank.id !== tank.id && 
            !otherTank.isRespawning &&
            checkCollision(finalX, finalY, TANK_SIZE, otherTank.x, otherTank.y, TANK_SIZE)
          );

          if (collidingTank) {
            // Push tanks apart slightly
            const dx = tank.x - collidingTank.x;
            const dy = tank.y - collidingTank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              const pushDistance = (TANK_SIZE - distance + 2) / 2;
              const pushX = (dx / distance) * pushDistance;
              const pushY = (dy / distance) * pushDistance;
              
              finalX = tank.x + pushX;
              finalY = tank.y + pushY;
            } else {
              finalX = tank.x;
              finalY = tank.y;
            }
          }

          return {
            ...tank,
            x: finalX,
            y: finalY,
            rotation: newRotation % 360,
          };
        });

        return updatedTanks;
      });

      // Update projectiles
      setProjectiles(prevProjectiles => {
        const activeProjectiles: ProjectileData[] = [];
        
        for (const projectile of prevProjectiles) {
          // Check lifetime
          if (now - projectile.createdAt >= PROJECTILE_LIFETIME) {
            continue;
          }

          const newX = projectile.x + Math.cos((projectile.rotation * Math.PI) / 180) * projectile.speed * (deltaTime / 1000);
          const newY = projectile.y + Math.sin((projectile.rotation * Math.PI) / 180) * projectile.speed * (deltaTime / 1000);

          // Check boundary collision
          if (checkBoundaryCollision(newX, newY, PROJECTILE_SIZE)) {
            continue;
          }

          // Check obstacle collision
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

          // Check tank collision
          let hitTank = false;
          setTanks(prevTanks => {
            const targetTank = prevTanks.find(tank => 
              !tank.isRespawning &&
              tank.id !== projectile.ownerId &&
              checkCollision(newX, newY, PROJECTILE_SIZE, tank.x, tank.y, TANK_SIZE)
            );

            if (targetTank) {
              hitTank = true;
              
              // Create explosion
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
