
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

          const speed = 120 * (deltaTime / 1000);
          const rotationSpeed = 180 * (deltaTime / 1000);

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
            // Simplified AI behavior
            const player = prevTanks.find(t => t.isPlayer && !t.isRespawning);
            if (player && Math.random() < 0.02) {
              const dx = player.x - tank.x;
              const dy = player.y - tank.y;
              const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
              
              let angleDiff = targetAngle - tank.rotation;
              if (angleDiff > 180) angleDiff -= 360;
              if (angleDiff < -180) angleDiff += 360;
              
              if (Math.abs(angleDiff) > 10) {
                newRotation += angleDiff > 0 ? rotationSpeed : -rotationSpeed;
              }
              
              if (Math.random() < 0.1) {
                newX += Math.cos((tank.rotation * Math.PI) / 180) * speed;
                newY += Math.sin((tank.rotation * Math.PI) / 180) * speed;
              }
              
              // AI shooting - use setTimeout to avoid render loop
              if (now - tank.lastShotTime > WEAPON_COOLDOWN * 2 && Math.random() < 0.03) {
                setTimeout(() => onShoot(tank.id), 0);
              }
            }
          }

          // Collision detection
          if (checkBoundaryCollision(newX, newY, TANK_SIZE) || checkObstacleCollision(newX, newY, TANK_SIZE, obstacles)) {
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
