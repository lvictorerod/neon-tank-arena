
import { useEffect, useRef } from 'react';
import { TankData, ProjectileData, ParticleData } from './GameArena';
import { PowerUpData } from './PowerUp';
import { updateAIBehavior } from './systems/AISystem';
import { updateTankPhysics } from './systems/PhysicsSystem';
import { 
  createCollisionGrid, 
  checkPowerUpCollisions, 
  checkProjectileCollisions 
} from './systems/CollisionSystem';
import { processProjectileHits, createWallHitParticles } from './systems/ProjectileSystem';

interface GameLoopProps {
  gameActive: boolean;
  gamePaused?: boolean;
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
  getSafeSpawnPositions?: () => Array<{ x: number; y: number }>;
}

export const GameLoop: React.FC<GameLoopProps> = ({
  gameActive,
  gamePaused = false,
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
  getSafeSpawnPositions,
}) => {
  const lastUpdateTime = useRef<number>(Date.now());
  const gameLoopRef = useRef<number>();

  useEffect(() => {
    if (!gameActive || gamePaused) return;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastUpdateTime.current) / 1000, 1/30);
      lastUpdateTime.current = now;

      // Create collision grid for optimized collision detection
      const collisionGrid = createCollisionGrid(tanks);

      // Check power-up collisions
      const powerUpCollisions = checkPowerUpCollisions(tanks, powerUps);
      powerUpCollisions.forEach(({ tankId, powerUpId }) => {
        onCollectPowerUp(tankId, powerUpId);
      });

      // Update tank movement and physics
      setTanks(prevTanks => {
        return prevTanks.map(tank => {
          if (tank.isRespawning) {
            if (tank.respawnTime && now > tank.respawnTime) {
              const safePositions = getSafeSpawnPositions ? getSafeSpawnPositions() : [
                { x: 100, y: 80 }, { x: 700, y: 520 }, { x: 80, y: 300 }, 
                { x: 720, y: 300 }, { x: 400, y: 80 }, { x: 400, y: 520 }
              ];
              
              // Find a safe spawn position away from other tanks
              let spawnPos = safePositions[Math.floor(Math.random() * safePositions.length)];
              for (const pos of safePositions) {
                const tooClose = prevTanks.some(otherTank => 
                  !otherTank.isRespawning && otherTank.id !== tank.id &&
                  Math.sqrt((pos.x - otherTank.x) ** 2 + (pos.y - otherTank.y) ** 2) < 75
                );
                if (!tooClose) {
                  spawnPos = pos;
                  break;
                }
              }
              
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

          if (tank.isPlayer) {
            return updateTankPhysics(tank, keysPressed.current, deltaTime, collisionGrid);
          } else {
            // AI behavior
            const aiUpdate = updateAIBehavior(tank, prevTanks, deltaTime, onShoot);
            const updatedTank = {
              ...tank,
              velocityX: aiUpdate.velocityX,
              velocityY: aiUpdate.velocityY,
              rotation: aiUpdate.rotation
            };
            return updateTankPhysics(updatedTank, new Set(), deltaTime, collisionGrid);
          }
        });
      });

      // Handle projectile collisions and movement
      const projectileResults = checkProjectileCollisions(projectiles, tanks, deltaTime);
      setProjectiles(projectileResults.validProjectiles);

      // Process wall hits
      if (projectileResults.wallHits.length > 0) {
        const wallParticles = createWallHitParticles(projectileResults.wallHits);
        setParticles(prev => [...prev, ...wallParticles]);
        
        const maxIntensity = Math.max(
          ...projectileResults.wallHits.map(hit => hit.type === 'obstacle' ? 4 : 2)
        );
        onScreenShake(maxIntensity, maxIntensity >= 4 ? 200 : 100);
      }

      // Process projectile hits
      if (projectileResults.hits.length > 0) {
        const { updatedTanks, particles } = processProjectileHits(
          projectileResults.hits,
          tanks,
          (shooter, victim) => {
            if (shooter.isPlayer) {
              setKills(prev => prev + 1);
              setScore(prev => prev + 100);
              onToast({
                title: "Elimination!",
                description: `You eliminated ${victim.name}`,
              });
            }
          },
          onToast
        );
        
        setTanks(prevTanks => {
          return prevTanks.map(tank => {
            const updated = updatedTanks.find(t => t.id === tank.id);
            return updated || tank;
          });
        });
        
        setParticles(prev => [...prev, ...particles]);
        onScreenShake(6, 300);
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameActive, gamePaused, tanks, projectiles, powerUps, keysPressed, setTanks, setProjectiles, setParticles, setPowerUps, setKills, setScore, onShoot, onCollectPowerUp, onToast, onScreenShake, getSafeSpawnPositions]);

  return null;
};
