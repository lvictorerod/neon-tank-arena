
import { TankData } from '../GameArena';
import { checkBoundaryCollision, checkObstacleCollision, obstacles, TANK_SIZE } from '../CollisionDetection';
import { CollisionGrid, checkTankCollision } from './CollisionSystem';

const TANK_MAX_SPEED = 180;
const TANK_ACCELERATION = 400;
const TANK_DECELERATION = 500;
const TANK_ROTATION_SPEED = 200;
const VELOCITY_THRESHOLD = 10;

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
    // Enhanced player movement with better physics
    let inputX = 0;
    let inputY = 0;

    // Check for movement keys - using both WASD and arrow keys
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
      if (Math.abs(angleDiff) > 5) {
        const rotationStep = TANK_ROTATION_SPEED * deltaTime;
        if (Math.abs(angleDiff) < rotationStep) {
          newRotation = targetAngle;
        } else {
          newRotation += angleDiff > 0 ? rotationStep : -rotationStep;
        }
      }
    }
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
      finalVelocityX = -currentVelocityX * 0.1;
    }
    if (checkBoundaryCollision(tank.x, newY, TANK_SIZE)) {
      newY = tank.y;
      finalVelocityY = -currentVelocityY * 0.1;
    }
  }

  // Obstacle collision with better response
  if (checkObstacleCollision(newX, newY, TANK_SIZE, obstacles)) {
    if (checkObstacleCollision(newX, tank.y, TANK_SIZE, obstacles)) {
      newX = tank.x;
      finalVelocityX = -currentVelocityX * 0.05;
    }
    if (checkObstacleCollision(tank.x, newY, TANK_SIZE, obstacles)) {
      newY = tank.y;
      finalVelocityY = -currentVelocityY * 0.05;
    }
  }

  // Tank-to-tank collision using spatial grid
  const collidingTank = checkTankCollision(tank, newX, newY, collisionGrid);
  if (collidingTank) {
    const dx = newX - collidingTank.x;
    const dy = newY - collidingTank.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      // Improved separation
      const overlap = TANK_SIZE - distance + 2;
      const separationX = (dx / distance) * overlap * 0.5;
      const separationY = (dy / distance) * overlap * 0.5;
      
      newX = tank.x + separationX;
      newY = tank.y + separationY;
      
      // Better momentum exchange
      const relativeVelX = currentVelocityX - (collidingTank.velocityX || 0);
      const relativeVelY = currentVelocityY - (collidingTank.velocityY || 0);
      const velocityAlongNormal = relativeVelX * (dx / distance) + relativeVelY * (dy / distance);
      
      if (velocityAlongNormal > 0) {
        const restitution = 0.2;
        const impulse = 2 * velocityAlongNormal / 2; // Assuming equal mass
        finalVelocityX = currentVelocityX - impulse * restitution * (dx / distance);
        finalVelocityY = currentVelocityY - impulse * restitution * (dy / distance);
      }
    }
  }

  // Zero out tiny velocities to prevent jitter
  if (Math.abs(finalVelocityX) < VELOCITY_THRESHOLD * 0.3) finalVelocityX = 0;
  if (Math.abs(finalVelocityY) < VELOCITY_THRESHOLD * 0.3) finalVelocityY = 0;

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
