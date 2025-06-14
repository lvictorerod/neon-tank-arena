
export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 600;
export const TANK_SIZE = 25;
export const PROJECTILE_SIZE = 5;

export const checkCollision = (x1: number, y1: number, size1: number, x2: number, y2: number, size2: number): boolean => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (size1 + size2) / 2;
};

export const checkObstacleCollision = (x: number, y: number, size: number, obstacles: Obstacle[]): boolean => {
  const halfSize = size / 2;
  return obstacles.some(obstacle => 
    x - halfSize < obstacle.x + obstacle.width &&
    x + halfSize > obstacle.x &&
    y - halfSize < obstacle.y + obstacle.height &&
    y + halfSize > obstacle.y
  );
};

export const checkBoundaryCollision = (x: number, y: number, size: number): boolean => {
  const halfSize = size / 2;
  return x - halfSize < 0 || x + halfSize > ARENA_WIDTH || y - halfSize < 0 || y + halfSize > ARENA_HEIGHT;
};

export const obstacles: Obstacle[] = [
  { x: 100, y: 100, width: 60, height: 60 },
  { x: 640, y: 440, width: 80, height: 60 },
  { x: 360, y: 260, width: 80, height: 80 },
  { x: 150, y: 400, width: 60, height: 40 },
  { x: 590, y: 150, width: 40, height: 80 },
];
