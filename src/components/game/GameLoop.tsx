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

// Enhanced game constants
const WEAPON_COOLDOWN = 350;
const PROJECTILE_LIFETIME = 3000;
const RESPAWN_TIME = 3000;

// Improved movement constants for better feel
const TANK_MAX_SPEED = 140;
const TANK_ACCELERATION = 350;
const TANK_DECELERATION = 450;
const TANK_ROTATION_SPEED = 180;
const VELOCITY_THRESHOLD = 15; // Higher threshold to prevent micro-movements

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
  const collisionGrid = useRef<Map<string, TankData[]>>(new Map());

  // Optimized spatial partitioning for collision detection
  const updateCollisionGrid = (tanks: TankData[]) => {
    const grid = new Map<string, TankData[]>();
    const cellSize = TANK_SIZE * 2;
    
    tanks.forEach(tank => {
      if (tank.isRespawning) return;
      
      const cellX = Math.floor(tank.x / cellSize);
      const cellY = Math.floor(tank.y / cellSize);
      const key = `${cellX},${cellY}`;
      
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(tank);
    });
    
    collisionGrid.current = grid;
  };

  // Improved AI behavior with better decision making
  const updateAIBehavior = (tank: TankData, allTanks: TankData[], deltaTime: number) => {
    const player = allTanks.find(t => t.isPlayer && !t.isRespawning);
    if (!player) return { velocityX: 0, velocityY: 0, rotation: tank.rotation };

    const dx = player.x - tank.x;
    const dy = player.y - tank.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let targetX = 0;
    let targetY = 0;
    let shouldShoot = false;
    
    // Enhanced AI decision making
    if (distance > 250) {
      // Approach player but with obstacle avoidance
      targetX = (dx / distance) * 0.9;
      targetY = (dy / distance) * 0.9;
    } else if (distance < 120) {
      // Retreat with strafing
      const retreatAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * Math.PI * 0.5;
      targetX = -Math.cos(retreatAngle) * 0.8;
      targetY = -Math.sin(retreatAngle) * 0.8;
    } else {
      // Strafe around player
      const strafeAngle = Math.atan2(dy, dx) + Math.PI * 0.5 * (Math.random() > 0.5 ? 1 : -1);
      targetX = Math.cos(strafeAngle) * 0.7;
      targetY = Math.sin(strafeAngle) * 0.7;
    }
    
    // Check if AI should shoot
    const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    let angleDiff = targetAngle - tank.rotation;
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;
    
    shouldShoot = Math.abs(angleDiff) < 25 && distance < 280 && 
                  Date.now() - tank.lastShotTime > WEAPON_COOLDOWN * 1.2 &&
                  Math.random() < 0.15; // Increased shooting probability
    
    if (shouldShoot) {
      setTimeout(() => onShoot(tank.id), 0);
    }
    
    // Apply AI movement with physics
    const aiAcceleration = TANK_ACCELERATION * 0.8;
    const aiMaxSpeed = TANK_MAX_SPEED * 0.85;
    
    const currentVelX = (tank as any).velocityX || 0;
    const currentVelY = (tank as any).velocityY || 0;
    
    const newVelX = Math.max(-aiMaxSpeed, Math.min(aiMaxSpeed, 
      currentVelX + targetX * aiAcceleration * deltaTime));
    const newVelY = Math.max(-aiMaxSpeed, Math.min(aiMaxSpeed, 
      currentVelY + targetY * aiAcceleration * deltaTime));
    
    // Smooth AI rotation
    let newRotation = tank.rotation;
    if (Math.abs(angleDiff) > 15) {
      const rotationStep = TANK_ROTATION_SPEED * deltaTime * 0.9;
      newRotation += angleDiff > 0 ? rotationStep : -rotationStep;
    }
    
    return {
      velocityX: newVelX * 0.95, // Apply friction
      velocityY: newVelY * 0.95,
      rotation: newRotation
    };
  };

  useEffect(() => {
    if (!gameActive || gamePaused) return;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastUpdateTime.current) / 1000, 1/30);
      lastUpdateTime.current = now;

      // Update collision grid for optimized collision detection
      updateCollisionGrid(tanks);

      // Check power-up collisions with improved efficiency
      tanks.forEach(tank => {
        if (tank.isRespawning) return;
        
        powerUps.forEach(powerUp => {
          if (checkCollision(tank.x, tank.y, TANK_SIZE, powerUp.x, powerUp.y, 20)) {
            onCollectPowerUp(tank.id, powerUp.id);
          }
        });
      });

      // Enhanced tank movement system
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
                  Math.sqrt((pos.x - otherTank.x) ** 2 + (pos.y - otherTank.y) ** 2) < TANK_SIZE * 3
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

          const enhancedTank = tank as any;
          const speedMultiplier = enhancedTank.speed || 1;
          let currentVelocityX = enhancedTank.velocityX || 0;
          let currentVelocityY = enhancedTank.velocityY || 0;
          let newRotation = tank.rotation;

          if (tank.isPlayer) {
            // Enhanced player movement with better physics
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

            // Proper diagonal movement normalization
            const inputMagnitude = Math.sqrt(inputX * inputX + inputY * inputY);
            if (inputMagnitude > 0) {
              inputX /= inputMagnitude;
              inputY /= inputMagnitude;
            }

            const accelerationRate = TANK_ACCELERATION * speedMultiplier;
            const maxSpeed = TANK_MAX_SPEED * speedMultiplier;

            // Apply acceleration or deceleration
            if (inputMagnitude > 0) {
              currentVelocityX += inputX * accelerationRate * deltaTime;
              currentVelocityY += inputY * accelerationRate * deltaTime;
              
              // Cap velocity
              const currentSpeed = Math.sqrt(currentVelocityX ** 2 + currentVelocityY ** 2);
              if (currentSpeed > maxSpeed) {
                currentVelocityX = (currentVelocityX / currentSpeed) * maxSpeed;
                currentVelocityY = (currentVelocityY / currentSpeed) * maxSpeed;
              }
            } else {
              // Apply deceleration
              const currentSpeed = Math.sqrt(currentVelocityX ** 2 + currentVelocityY ** 2);
              if (currentSpeed > VELOCITY_THRESHOLD) {
                const decelerationFactor = Math.max(0, 1 - (TANK_DECELERATION * deltaTime) / currentSpeed);
                currentVelocityX *= decelerationFactor;
                currentVelocityY *= decelerationFactor;
              } else {
                currentVelocityX = 0;
                currentVelocityY = 0;
              }
            }

            // Update rotation based on movement direction (only when moving significantly)
            const movementSpeed = Math.sqrt(currentVelocityX ** 2 + currentVelocityY ** 2);
            if (movementSpeed > VELOCITY_THRESHOLD) {
              const targetAngle = (Math.atan2(currentVelocityY, currentVelocityX) * 180) / Math.PI;
              let angleDiff = targetAngle - tank.rotation;
              
              // Normalize angle difference
              while (angleDiff > 180) angleDiff -= 360;
              while (angleDiff < -180) angleDiff += 360;
              
              // Smooth rotation with speed-based factor
              if (Math.abs(angleDiff) > 8) {
                const rotationStep = TANK_ROTATION_SPEED * deltaTime;
                if (Math.abs(angleDiff) < rotationStep) {
                  newRotation = targetAngle;
                } else {
                  newRotation += angleDiff > 0 ? rotationStep : -rotationStep;
                }
              }
            }

          } else {
            // Enhanced AI behavior
            const aiUpdate = updateAIBehavior(tank, prevTanks, deltaTime);
            currentVelocityX = aiUpdate.velocityX;
            currentVelocityY = aiUpdate.velocityY;
            newRotation = aiUpdate.rotation;
          }

          // Physics integration with improved collision response
          let newX = tank.x + currentVelocityX * deltaTime;
          let newY = tank.y + currentVelocityY * deltaTime;
          let finalVelocityX = currentVelocityX;
          let finalVelocityY = currentVelocityY;

          // Boundary collision with proper physics
          if (checkBoundaryCollision(newX, newY, TANK_SIZE)) {
            if (checkBoundaryCollision(newX, tank.y, TANK_SIZE)) {
              newX = tank.x;
              finalVelocityX = -currentVelocityX * 0.2;
            }
            if (checkBoundaryCollision(tank.x, newY, TANK_SIZE)) {
              newY = tank.y;
              finalVelocityY = -currentVelocityY * 0.2;
            }
          }

          // Obstacle collision with better response
          if (checkObstacleCollision(newX, newY, TANK_SIZE, obstacles)) {
            if (checkObstacleCollision(newX, tank.y, TANK_SIZE, obstacles)) {
              newX = tank.x;
              finalVelocityX = -currentVelocityX * 0.1;
            }
            if (checkObstacleCollision(tank.x, newY, TANK_SIZE, obstacles)) {
              newY = tank.y;
              finalVelocityY = -currentVelocityY * 0.1;
            }
          }

          // Optimized tank-to-tank collision using spatial grid
          const cellSize = TANK_SIZE * 2;
          const cellX = Math.floor(newX / cellSize);
          const cellY = Math.floor(newY / cellSize);
          
          let collidingTank = null;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const key = `${cellX + dx},${cellY + dy}`;
              const cellTanks = collisionGrid.current.get(key) || [];
              collidingTank = cellTanks.find(otherTank => 
                otherTank.id !== tank.id && 
                !otherTank.isRespawning &&
                checkCollision(newX, newY, TANK_SIZE, otherTank.x, otherTank.y, TANK_SIZE)
              );
              if (collidingTank) break;
            }
            if (collidingTank) break;
          }

          if (collidingTank) {
            const dx = newX - collidingTank.x;
            const dy = newY - collidingTank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              // Improved separation
              const overlap = TANK_SIZE - distance + 1;
              const separationX = (dx / distance) * overlap * 0.5;
              const separationY = (dy / distance) * overlap * 0.5;
              
              newX = tank.x + separationX;
              newY = tank.y + separationY;
              
              // Better momentum exchange
              const relativeVelX = currentVelocityX - (collidingTank as any).velocityX;
              const relativeVelY = currentVelocityY - (collidingTank as any).velocityY;
              const velocityAlongNormal = relativeVelX * (dx / distance) + relativeVelY * (dy / distance);
              
              if (velocityAlongNormal > 0) {
                const restitution = 0.3;
                const impulse = 2 * velocityAlongNormal / 2; // Assuming equal mass
                finalVelocityX = currentVelocityX - impulse * restitution * (dx / distance);
                finalVelocityY = currentVelocityY - impulse * restitution * (dy / distance);
              }
            }
          }

          // Zero out tiny velocities to prevent jitter
          if (Math.abs(finalVelocityX) < VELOCITY_THRESHOLD * 0.5) finalVelocityX = 0;
          if (Math.abs(finalVelocityY) < VELOCITY_THRESHOLD * 0.5) finalVelocityY = 0;

          // Normalize rotation
          while (newRotation >= 360) newRotation -= 360;
          while (newRotation < 0) newRotation += 360;

          return {
            ...tank,
            x: newX,
            y: newY,
            rotation: newRotation,
            velocityX: finalVelocityX,
            velocityY: finalVelocityY,
          } as TankData & { velocityX: number; velocityY: number };
        });
      });

      // Refactored projectile update logic
      const projectileHits: {
        projectile: ProjectileData;
        tank: TankData;
        x: number;
        y: number;
      }[] = [];
      const wallHits: { x: number; y: number; type: 'obstacle' | 'boundary' }[] = [];

      const nextProjectiles = projectiles
        .map(p => {
          if (now - p.createdAt >= PROJECTILE_LIFETIME) {
            return null;
          }

          const newX = p.x + Math.cos((p.rotation * Math.PI) / 180) * p.speed * deltaTime;
          const newY = p.y + Math.sin((p.rotation * Math.PI) / 180) * p.speed * deltaTime;

          if (checkBoundaryCollision(newX, newY, PROJECTILE_SIZE)) {
            wallHits.push({ x: newX, y: newY, type: 'boundary' });
            return null;
          }
    
          if (checkObstacleCollision(newX, newY, PROJECTILE_SIZE, obstacles)) {
            wallHits.push({ x: newX, y: newY, type: 'obstacle' });
            return null;
          }

          const hitTank = tanks.find(tank => 
            !tank.isRespawning &&
            tank.id !== p.ownerId &&
            checkCollision(newX, newY, PROJECTILE_SIZE, tank.x, tank.y, TANK_SIZE)
          );
    
          if (hitTank) {
            projectileHits.push({ projectile: p, tank: hitTank, x: newX, y: newY });
            return null;
          }
    
          return { ...p, x: newX, y: newY };
        })
        .filter((p): p is ProjectileData => p !== null);
      
      setProjectiles(nextProjectiles);

      if (wallHits.length > 0) {
        let maxIntensity = 0;
        wallHits.forEach(hit => {
            setParticles(prev => [...prev, {
              id: window.crypto?.randomUUID?.() || `explosion_${Date.now()}_${Math.random()}`,
              x: hit.x, y: hit.y, type: 'explosion', createdAt: now,
            }]);
            maxIntensity = Math.max(maxIntensity, hit.type === 'obstacle' ? 4 : 2);
        });
        if (maxIntensity > 0) {
            onScreenShake(maxIntensity, maxIntensity >= 4 ? 200 : 100);
        }
      }

      if (projectileHits.length > 0) {
        const damageMap = new Map<string, { totalDamage: number, lastHitter: ProjectileData }>();
        
        projectileHits.forEach(hit => {
          setParticles(prev => [...prev, {
            id: window.crypto?.randomUUID?.() || `explosion_${Date.now()}_${Math.random()}`,
            x: hit.x, y: hit.y, type: 'explosion', createdAt: now,
          }]);

          const entry = damageMap.get(hit.tank.id) || { totalDamage: 0, lastHitter: hit.projectile };
          entry.totalDamage += hit.projectile.damage;
          entry.lastHitter = hit.projectile;
          damageMap.set(hit.tank.id, entry);
        });
        
        onScreenShake(6, 300);

        setTanks(prevTanks => {
          const updatedTanks = [...prevTanks];
          damageMap.forEach(({ totalDamage, lastHitter }, tankId) => {
            const tankIndex = updatedTanks.findIndex(t => t.id === tankId);
            if (tankIndex === -1) return;

            const tank = updatedTanks[tankIndex];
            const enhancedTank = { ...tank } as any;
            
            if (enhancedTank.shield && enhancedTank.shield > 0) {
              const shieldAbsorbed = Math.min(totalDamage, enhancedTank.shield);
              totalDamage -= shieldAbsorbed;
              enhancedTank.shield -= shieldAbsorbed;
            }
    
            const newHealth = Math.max(0, tank.health - totalDamage);
            
            if (newHealth === 0 && !tank.isRespawning) {
              const shooter = prevTanks.find(t => t.id === lastHitter.ownerId);
              if (shooter?.isPlayer) {
                setKills(prev => prev + 1);
                setScore(prev => prev + 100);
                onToast({
                  title: "Elimination!",
                  description: `You eliminated ${tank.name}`,
                });
              }
    
              updatedTanks[tankIndex] = {
                ...enhancedTank,
                health: 0,
                isRespawning: true,
                respawnTime: now + RESPAWN_TIME,
                velocityX: 0,
                velocityY: 0,
              };
            } else {
              updatedTanks[tankIndex] = { ...enhancedTank, health: newHealth };
            }
          });
          return updatedTanks;
        });
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
