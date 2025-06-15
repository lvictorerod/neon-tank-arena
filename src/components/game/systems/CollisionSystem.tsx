
import { TankData, ProjectileData } from '../GameArena';
import { PowerUpData } from '../PowerUp';

export interface ProjectileHit {
  projectile: ProjectileData;
  tank: TankData;
  x: number;
  y: number;
}

export interface WallHit {
  x: number;
  y: number;
  type: 'obstacle' | 'boundary';
}

export interface ProjectileCollisionResult {
  validProjectiles: ProjectileData[];
  hits: ProjectileHit[];
  wallHits: WallHit[];
}

export interface CollisionGrid {
  grid: Map<string, TankData[]>;
  GRID_SIZE: number;
}

// Create a spatial grid for efficient collision detection
export const createCollisionGrid = (tanks: TankData[]): CollisionGrid => {
  const GRID_SIZE = 50;
  const grid = new Map<string, TankData[]>();
  
  tanks.forEach(tank => {
    if (tank.isRespawning) return;
    
    const gridX = Math.floor(tank.x / GRID_SIZE);
    const gridY = Math.floor(tank.y / GRID_SIZE);
    const key = `${gridX},${gridY}`;
    
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key)!.push(tank);
  });
  
  return { grid, GRID_SIZE };
};

// Check tank collision at specific coordinates
export const checkTankCollision = (
  tank: TankData,
  newX: number,
  newY: number,
  collisionGrid: CollisionGrid
): TankData | undefined => {
  const { grid, GRID_SIZE } = collisionGrid;
  
  // Get grid cells to check (current and adjacent)
  const gridX = Math.floor(newX / GRID_SIZE);
  const gridY = Math.floor(newY / GRID_SIZE);
  
  const cellsToCheck = [
    `${gridX},${gridY}`,
    `${gridX-1},${gridY}`,
    `${gridX+1},${gridY}`,
    `${gridX},${gridY-1}`,
    `${gridX},${gridY+1}`,
    `${gridX-1},${gridY-1}`,
    `${gridX+1},${gridY-1}`,
    `${gridX-1},${gridY+1}`,
    `${gridX+1},${gridY+1}`
  ];
  
  for (const cellKey of cellsToCheck) {
    const cellTanks = grid.get(cellKey);
    if (!cellTanks) continue;
    
    for (const otherTank of cellTanks) {
      if (otherTank.id === tank.id || otherTank.isRespawning) continue;
      
      const distance = Math.sqrt((newX - otherTank.x) ** 2 + (newY - otherTank.y) ** 2);
      if (distance < 40) { // Tank collision radius (20 + 20)
        return otherTank;
      }
    }
  }
  
  return undefined;
};

// Check projectile collisions with improved movement logic
export const checkProjectileCollisions = (
  projectiles: ProjectileData[],
  tanks: TankData[],
  deltaTime: number
): ProjectileCollisionResult => {
  const ARENA_WIDTH = 800;
  const ARENA_HEIGHT = 600;
  const OBSTACLE_ZONES = [
    { x: 200, y: 150, width: 100, height: 30 },
    { x: 500, y: 350, width: 100, height: 30 },
    { x: 350, y: 250, width: 30, height: 100 },
  ];
  
  const validProjectiles: ProjectileData[] = [];
  const hits: ProjectileHit[] = [];
  const wallHits: WallHit[] = [];

  projectiles.forEach(projectile => {
    // CRITICAL FIX: Calculate velocity based on projectile's rotation
    const rotationRad = (projectile.rotation * Math.PI) / 180;
    const velocityX = Math.cos(rotationRad) * projectile.speed * deltaTime;
    const velocityY = Math.sin(rotationRad) * projectile.speed * deltaTime;
    
    // Debug logging for projectile movement
    if (projectile.ownerId === 'player') {
      console.log(`Player projectile - Rotation: ${projectile.rotation}°, VelX: ${velocityX.toFixed(2)}, VelY: ${velocityY.toFixed(2)}`);
    }
    
    // Update projectile position using calculated velocity
    const newX = projectile.x + velocityX;
    const newY = projectile.y + velocityY;

    // Check arena boundaries
    if (newX < 10 || newX > ARENA_WIDTH - 10 || newY < 10 || newY > ARENA_HEIGHT - 10) {
      wallHits.push({
        x: Math.max(10, Math.min(ARENA_WIDTH - 10, newX)),
        y: Math.max(10, Math.min(ARENA_HEIGHT - 10, newY)),
        type: 'boundary'
      });
      return; // Projectile hits boundary
    }

    // Check obstacle collisions
    let hitObstacle = false;
    for (const obstacle of OBSTACLE_ZONES) {
      if (newX >= obstacle.x && newX <= obstacle.x + obstacle.width &&
          newY >= obstacle.y && newY <= obstacle.y + obstacle.height) {
        wallHits.push({
          x: newX,
          y: newY,
          type: 'obstacle'
        });
        hitObstacle = true;
        break;
      }
    }
    if (hitObstacle) return;

    // Check tank collisions
    let hitTank = false;
    for (const tank of tanks) {
      if (tank.isRespawning || tank.id === projectile.ownerId) continue;
      
      const distance = Math.sqrt((newX - tank.x) ** 2 + (newY - tank.y) ** 2);
      if (distance < 20) { // Tank collision radius
        hits.push({
          projectile,
          tank,
          x: newX,
          y: newY,
        });
        hitTank = true;
        break;
      }
    }
    if (hitTank) return;

    // Check projectile lifetime (remove old projectiles)
    const now = Date.now();
    if (now - projectile.createdAt > 3000) { // 3 second lifetime
      return;
    }

    // Projectile is still valid, update its position
    validProjectiles.push({
      ...projectile,
      x: newX,
      y: newY,
    });
  });

  return { validProjectiles, hits, wallHits };
};

// Power-up collision detection
export const checkPowerUpCollisions = (
  tanks: TankData[],
  powerUps: PowerUpData[]
): Array<{ tankId: string; powerUpId: string }> => {
  const collisions: Array<{ tankId: string; powerUpId: string }> = [];
  
  tanks.forEach(tank => {
    if (tank.isRespawning) return;
    
    powerUps.forEach(powerUp => {
      const distance = Math.sqrt((tank.x - powerUp.x) ** 2 + (tank.y - powerUp.y) ** 2);
      if (distance < 25) { // Collection radius
        collisions.push({ tankId: tank.id, powerUpId: powerUp.id });
      }
    });
  });
  
  return collisions;
};
