import { TankData } from '../GameArena';
import { checkBoundaryCollision, checkObstacleCollision, obstacles, TANK_SIZE } from '../CollisionDetection';
import { CollisionGrid, checkTankCollision } from './CollisionSystem';

// Enhanced physics constants
const PHYSICS_CONFIG = {
  TANK_MAX_SPEED: 200,
  TANK_ACCELERATION: 600,
  TANK_DECELERATION: 800,
  TANK_ROTATION_SPEED: 180,
  VELOCITY_THRESHOLD: 5,
  FRICTION_COEFFICIENT: 0.95,
  BOUNCE_DAMPING: 0.3,
  COLLISION_SEPARATION_FORCE: 0.6,
  FRAME_RATE_COMPENSATION: true,
};

export interface PhysicsBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  mass: number;
  restitution: number;
}

export const updateTankPhysicsEnhanced = (
  tank: TankData,
  keysPressed: Set<string>,
  deltaTime: number,
  collisionGrid: CollisionGrid
): TankData => {
  if (tank.isRespawning) return tank;

  // Frame rate compensation
  const dt = PHYSICS_CONFIG.FRAME_RATE_COMPENSATION ? 
    Math.min(deltaTime, 1/30) : deltaTime;

  const speedMultiplier = tank.speed || 1;
  let currentVelocityX = tank.velocityX || 0;
  let currentVelocityY = tank.velocityY || 0;
  let newRotation = tank.rotation;
  let angularVelocity = 0;

  if (tank.isPlayer) {
    // Enhanced input handling with diagonal movement normalization
    const input = getInputVector(keysPressed);
    const inputMagnitude = Math.sqrt(input.x * input.x + input.y * input.y);
    
    if (inputMagnitude > 0) {
      // Normalize diagonal movement
      input.x /= inputMagnitude;
      input.y /= inputMagnitude;
    }

    const maxSpeed = PHYSICS_CONFIG.TANK_MAX_SPEED * speedMultiplier;
    
    // Enhanced acceleration with momentum
    if (inputMagnitude > 0) {
      const targetVelX = input.x * maxSpeed;
      const targetVelY = input.y * maxSpeed;
      
      const accel = PHYSICS_CONFIG.TANK_ACCELERATION * speedMultiplier * dt;
      const lerpFactor = Math.min(accel / maxSpeed, 1);
      
      currentVelocityX = lerp(currentVelocityX, targetVelX, lerpFactor);
      currentVelocityY = lerp(currentVelocityY, targetVelY, lerpFactor);
    } else {
      // Enhanced deceleration with exponential decay
      const decelFactor = Math.exp(-PHYSICS_CONFIG.TANK_DECELERATION * dt);
      currentVelocityX *= decelFactor;
      currentVelocityY *= decelFactor;
      
      // Stop completely when velocity is very small
      if (Math.abs(currentVelocityX) < PHYSICS_CONFIG.VELOCITY_THRESHOLD) currentVelocityX = 0;
      if (Math.abs(currentVelocityY) < PHYSICS_CONFIG.VELOCITY_THRESHOLD) currentVelocityY = 0;
    }

    // Smooth rotation towards movement direction
    const movementSpeed = Math.sqrt(currentVelocityX ** 2 + currentVelocityY ** 2);
    if (movementSpeed > PHYSICS_CONFIG.VELOCITY_THRESHOLD) {
      const targetAngle = (Math.atan2(currentVelocityY, currentVelocityX) * 180) / Math.PI;
      newRotation = smoothRotation(tank.rotation, targetAngle, PHYSICS_CONFIG.TANK_ROTATION_SPEED * dt);
    }
  }

  // Apply friction
  currentVelocityX *= PHYSICS_CONFIG.FRICTION_COEFFICIENT;
  currentVelocityY *= PHYSICS_CONFIG.FRICTION_COEFFICIENT;

  // Enhanced collision detection and response
  const { newX, newY, finalVelX, finalVelY } = resolveCollisions(
    tank,
    currentVelocityX,
    currentVelocityY,
    dt,
    collisionGrid
  );

  // Normalize rotation
  while (newRotation >= 360) newRotation -= 360;
  while (newRotation < 0) newRotation += 360;

  return {
    ...tank,
    x: newX,
    y: newY,
    rotation: newRotation,
    velocityX: finalVelX,
    velocityY: finalVelY,
  };
};

function getInputVector(keysPressed: Set<string>): { x: number; y: number } {
  let x = 0, y = 0;
  
  if (keysPressed.has('w') || keysPressed.has('W') || keysPressed.has('ArrowUp')) y = -1;
  if (keysPressed.has('s') || keysPressed.has('S') || keysPressed.has('ArrowDown')) y = 1;
  if (keysPressed.has('a') || keysPressed.has('A') || keysPressed.has('ArrowLeft')) x = -1;
  if (keysPressed.has('d') || keysPressed.has('D') || keysPressed.has('ArrowRight')) x = 1;
  
  return { x, y };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothRotation(current: number, target: number, maxChange: number): number {
  let diff = target - current;
  
  // Handle angle wrapping
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  
  const change = Math.sign(diff) * Math.min(Math.abs(diff), maxChange);
  return current + change;
}

function resolveCollisions(
  tank: TankData,
  velX: number,
  velY: number,
  dt: number,
  collisionGrid: CollisionGrid
): { newX: number; newY: number; finalVelX: number; finalVelY: number } {
  let newX = tank.x + velX * dt;
  let newY = tank.y + velY * dt;
  let finalVelX = velX;
  let finalVelY = velY;

  // Boundary collision with enhanced bounce
  if (checkBoundaryCollision(newX, newY, TANK_SIZE)) {
    const { x, y, vx, vy } = resolveBoundaryCollision(tank.x, tank.y, newX, newY, velX, velY);
    newX = x;
    newY = y;
    finalVelX = vx;
    finalVelY = vy;
  }

  // Obstacle collision with sliding
  if (checkObstacleCollision(newX, newY, TANK_SIZE, obstacles)) {
    const { x, y, vx, vy } = resolveObstacleCollision(tank.x, tank.y, newX, newY, velX, velY);
    newX = x;
    newY = y;
    finalVelX = vx;
    finalVelY = vy;
  }

  // Enhanced tank-to-tank collision
  const collidingTank = checkTankCollision(tank, newX, newY, collisionGrid);
  if (collidingTank) {
    const collision = resolveTankCollision(tank, collidingTank, newX, newY, velX, velY);
    newX = collision.x;
    newY = collision.y;
    finalVelX = collision.vx;
    finalVelY = collision.vy;
  }

  return { newX, newY, finalVelX, finalVelY };
}

function resolveBoundaryCollision(
  oldX: number, oldY: number, newX: number, newY: number, 
  velX: number, velY: number
): { x: number; y: number; vx: number; vy: number } {
  const halfSize = TANK_SIZE / 2;
  let x = newX, y = newY, vx = velX, vy = velY;

  // X boundary collision
  if (newX - halfSize < 0 || newX + halfSize > 800) {
    x = oldX;
    vx = -velX * PHYSICS_CONFIG.BOUNCE_DAMPING;
  }

  // Y boundary collision
  if (newY - halfSize < 0 || newY + halfSize > 600) {
    y = oldY;
    vy = -velY * PHYSICS_CONFIG.BOUNCE_DAMPING;
  }

  return { x, y, vx, vy };
}

function resolveObstacleCollision(
  oldX: number, oldY: number, newX: number, newY: number,
  velX: number, velY: number
): { x: number; y: number; vx: number; vy: number } {
  // Try sliding along obstacles
  let x = newX, y = newY, vx = velX, vy = velY;

  // Try X movement only
  if (!checkObstacleCollision(newX, oldY, TANK_SIZE, obstacles)) {
    y = oldY;
    vy = 0;
  }
  // Try Y movement only
  else if (!checkObstacleCollision(oldX, newY, TANK_SIZE, obstacles)) {
    x = oldX;
    vx = 0;
  }
  // Full stop
  else {
    x = oldX;
    y = oldY;
    vx = -velX * PHYSICS_CONFIG.BOUNCE_DAMPING;
    vy = -velY * PHYSICS_CONFIG.BOUNCE_DAMPING;
  }

  return { x, y, vx, vy };
}

function resolveTankCollision(
  tank: TankData, otherTank: TankData, newX: number, newY: number,
  velX: number, velY: number
): { x: number; y: number; vx: number; vy: number } {
  const dx = newX - otherTank.x;
  const dy = newY - otherTank.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > 0 && distance < TANK_SIZE) {
    const overlap = TANK_SIZE - distance;
    const separationX = (dx / distance) * overlap * PHYSICS_CONFIG.COLLISION_SEPARATION_FORCE;
    const separationY = (dy / distance) * overlap * PHYSICS_CONFIG.COLLISION_SEPARATION_FORCE;
    
    const x = tank.x + separationX;
    const y = tank.y + separationY;
    
    // Elastic collision response
    const normalX = dx / distance;
    const normalY = dy / distance;
    const relativeVelX = velX - (otherTank.velocityX || 0);
    const relativeVelY = velY - (otherTank.velocityY || 0);
    const velocityAlongNormal = relativeVelX * normalX + relativeVelY * normalY;
    
    if (velocityAlongNormal > 0) {
      const restitution = 0.4;
      const impulse = velocityAlongNormal * restitution;
      const vx = velX - impulse * normalX;
      const vy = velY - impulse * normalY;
      
      return { x, y, vx, vy };
    }
  }
  
  return { x: newX, y: newY, vx: velX, vy: velY };
}