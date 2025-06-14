
import { TankData } from '../GameArena';
import { checkBoundaryCollision, checkObstacleCollision, obstacles, TANK_SIZE } from '../CollisionDetection';
import { CollisionGrid, checkTankCollision } from './CollisionSystem';

const TANK_MAX_SPEED = 200;
const TANK_ACCELERATION = 600;
const TANK_DECELERATION = 800;
const TANK_ROTATION_SPEED = 180;
const VELOCITY_THRESHOLD = 5;

export const updateTankPhysics = (
  tank: TankData,
  keysPressed: Set<string>,
  deltaTime: number,
  collisionGrid: CollisionGrid
): TankData => {
  if (tank.isRespawning) return tank;

  const speedMultiplier = tank.speed || 1;
  let currentVelocityX = tank.velocityX || 0;
  let currentVelocityY = tank.velocityY || 0;
  let newRotation = tank.rotation;

  if (tank.isPlayer) {
    // Get input direction
    let inputX = 0;
    let inputY = 0;

    if (keysPressed.has('w') || keysPressed.has('W') || keysPressed.has('ArrowUp')) {
      inputY = -1;
    }
    if (keysPressed.has('s') || keysPressed.has('S') || keysPressed.has('ArrowDown')) {
      inputY = 1;
    }
    if (keysPressed.has('a') || keysPressed.has('A') || keysPressed.has('ArrowLeft')) {
      inputX = -1;
    }
    if (keysPressed.has('d') || keysPressed.has('D') || keysPressed.has('ArrowRight')) {
      inputX = 1;
    }

    // Normalize diagonal movement
    const inputMagnitude = Math.sqrt(inputX * inputX + inputY * inputY);
    if (inputMagnitude > 0) {
      inputX /= inputMagnitude;
      inputY /= inputMagnitude;
    }

    const maxSpeed = TANK_MAX_SPEED * speedMultiplier;
    
    // Apply physics-based movement
    if (inputMagnitude > 0) {
      // Accelerate towards target velocity
      const targetVelX = inputX * maxSpeed;
      const targetVelY = inputY * maxSpeed;
      
      const accel = TANK_ACCELERATION * speedMultiplier * deltaTime;
      
      currentVelocityX += (targetVelX - currentVelocityX) * Math.min(accel / maxSpeed, 1);
      currentVelocityY += (targetVelY - currentVelocityY) * Math.min(accel / maxSpeed, 1);
    } else {
      // Decelerate when no input
      const decelFactor = Math.exp(-TANK_DECELERATION * deltaTime);
      currentVelocityX *= decelFactor;
      currentVelocityY *= decelFactor;
      
      // Stop completely when velocity is very small
      if (Math.abs(currentVelocityX) < VELOCITY_THRESHOLD) currentVelocityX = 0;
      if (Math.abs(currentVelocityY) < VELOCITY_THRESHOLD) currentVelocityY = 0;
    }

    // Smooth rotation towards movement direction
    const movementSpeed = Math.sqrt(currentVelocityX ** 2 + currentVelocityY ** 2);
    if (movementSpeed > VELOCITY_THRESHOLD) {
      const targetAngle = (Math.atan2(currentVelocityY, currentVelocityX) * 180) / Math.PI;
      let angleDiff = targetAngle - tank.rotation;
      
      // Normalize angle difference to [-180, 180]
      while (angleDiff > 180) angleDiff -= 360;
      while (angleDiff < -180) angleDiff += 360;
      
      // Smooth rotation with speed-based interpolation
      const rotationSpeed = TANK_ROTATION_SPEED * deltaTime;
      const rotationFactor = Math.min(Math.abs(angleDiff) / 180, 1) * rotationSpeed;
      
      if (Math.abs(angleDiff) > 2) {
        newRotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), rotationFactor);
      }
    }
  }

  // Calculate new position
  let newX = tank.x + currentVelocityX * deltaTime;
  let newY = tank.y + currentVelocityY * deltaTime;
  let finalVelocityX = currentVelocityX;
  let finalVelocityY = currentVelocityY;

  // Boundary collision with bounce
  if (checkBoundaryCollision(newX, newY, TANK_SIZE)) {
    if (checkBoundaryCollision(newX, tank.y, TANK_SIZE)) {
      newX = tank.x;
      finalVelocityX = -currentVelocityX * 0.3;
    }
    if (checkBoundaryCollision(tank.x, newY, TANK_SIZE)) {
      newY = tank.y;
      finalVelocityY = -currentVelocityY * 0.3;
    }
  }

  // Obstacle collision
  if (checkObstacleCollision(newX, newY, TANK_SIZE, obstacles)) {
    if (checkObstacleCollision(newX, tank.y, TANK_SIZE, obstacles)) {
      newX = tank.x;
      finalVelocityX = -currentVelocityX * 0.2;
    }
    if (checkObstacleCollision(tank.x, newY, TANK_SIZE, obstacles)) {
      newY = tank.y;
      finalVelocityY = -currentVelocityY * 0.2;
    }
  }

  // Tank collision with proper separation
  const collidingTank = checkTankCollision(tank, newX, newY, collisionGrid);
  if (collidingTank) {
    const dx = newX - collidingTank.x;
    const dy = newY - collidingTank.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0 && distance < TANK_SIZE) {
      const overlap = TANK_SIZE - distance;
      const separationX = (dx / distance) * overlap * 0.6;
      const separationY = (dy / distance) * overlap * 0.6;
      
      newX = tank.x + separationX;
      newY = tank.y + separationY;
      
      // Elastic collision response
      const normalX = dx / distance;
      const normalY = dy / distance;
      const relativeVelX = currentVelocityX - (collidingTank.velocityX || 0);
      const relativeVelY = currentVelocityY - (collidingTank.velocityY || 0);
      const velocityAlongNormal = relativeVelX * normalX + relativeVelY * normalY;
      
      if (velocityAlongNormal > 0) {
        const restitution = 0.4;
        const impulse = velocityAlongNormal * restitution;
        finalVelocityX = currentVelocityX - impulse * normalX;
        finalVelocityY = currentVelocityY - impulse * normalY;
      }
    }
  }

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
  };
};
