
import { TankData, ProjectileData } from '../GameArena';
import { PowerUpData } from '../PowerUp';
import { 
  checkCollision, 
  checkBoundaryCollision, 
  checkObstacleCollision, 
  obstacles,
  TANK_SIZE,
  PROJECTILE_SIZE
} from '../CollisionDetection';

export interface CollisionGrid {
  grid: Map<string, TankData[]>;
  cellSize: number;
}

export const createCollisionGrid = (tanks: TankData[]): CollisionGrid => {
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
  
  return { grid, cellSize };
};

export const checkTankCollision = (
  tank: TankData, 
  newX: number, 
  newY: number, 
  collisionGrid: CollisionGrid
): TankData | null => {
  const { grid, cellSize } = collisionGrid;
  const cellX = Math.floor(newX / cellSize);
  const cellY = Math.floor(newY / cellSize);
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${cellX + dx},${cellY + dy}`;
      const cellTanks = grid.get(key) || [];
      const collidingTank = cellTanks.find(otherTank => 
        otherTank.id !== tank.id && 
        !otherTank.isRespawning &&
        checkCollision(newX, newY, TANK_SIZE, otherTank.x, otherTank.y, TANK_SIZE)
      );
      if (collidingTank) return collidingTank;
    }
  }
  return null;
};

export const checkPowerUpCollisions = (tanks: TankData[], powerUps: PowerUpData[]): Array<{ tankId: string; powerUpId: string }> => {
  const collisions: Array<{ tankId: string; powerUpId: string }> = [];
  
  tanks.forEach(tank => {
    if (tank.isRespawning) return;
    
    powerUps.forEach(powerUp => {
      if (checkCollision(tank.x, tank.y, TANK_SIZE, powerUp.x, powerUp.y, 20)) {
        collisions.push({ tankId: tank.id, powerUpId: powerUp.id });
      }
    });
  });
  
  return collisions;
};

export const checkProjectileCollisions = (
  projectiles: ProjectileData[], 
  tanks: TankData[], 
  deltaTime: number
): {
  hits: Array<{ projectile: ProjectileData; tank: TankData; x: number; y: number }>;
  wallHits: Array<{ x: number; y: number; type: 'obstacle' | 'boundary' }>;
  validProjectiles: ProjectileData[];
} => {
  const hits: Array<{ projectile: ProjectileData; tank: TankData; x: number; y: number }> = [];
  const wallHits: Array<{ x: number; y: number; type: 'obstacle' | 'boundary' }> = [];
  const validProjectiles: ProjectileData[] = [];
  const now = Date.now();
  const PROJECTILE_LIFETIME = 3000;

  projectiles.forEach(p => {
    if (now - p.createdAt >= PROJECTILE_LIFETIME) {
      return; // Projectile expired
    }

    const newX = p.x + Math.cos((p.rotation * Math.PI) / 180) * p.speed * deltaTime;
    const newY = p.y + Math.sin((p.rotation * Math.PI) / 180) * p.speed * deltaTime;

    if (checkBoundaryCollision(newX, newY, PROJECTILE_SIZE)) {
      wallHits.push({ x: newX, y: newY, type: 'boundary' });
      return;
    }

    if (checkObstacleCollision(newX, newY, PROJECTILE_SIZE, obstacles)) {
      wallHits.push({ x: newX, y: newY, type: 'obstacle' });
      return;
    }

    const hitTank = tanks.find(tank => 
      !tank.isRespawning &&
      tank.id !== p.ownerId &&
      checkCollision(newX, newY, PROJECTILE_SIZE, tank.x, tank.y, TANK_SIZE)
    );

    if (hitTank) {
      hits.push({ projectile: p, tank: hitTank, x: newX, y: newY });
      return;
    }

    validProjectiles.push({ ...p, x: newX, y: newY });
  });

  return { hits, wallHits, validProjectiles };
};
