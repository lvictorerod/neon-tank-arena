
import { TankData } from '../GameArena';

const TANK_MAX_SPEED = 140;
const TANK_ACCELERATION = 350;
const TANK_ROTATION_SPEED = 180;
const WEAPON_COOLDOWN = 350;

export interface AIDecision {
  velocityX: number;
  velocityY: number;
  rotation: number;
  shouldShoot: boolean;
}

export const updateAIBehavior = (
  tank: TankData, 
  allTanks: TankData[], 
  deltaTime: number,
  onShoot: (tankId: string) => void
): { velocityX: number; velocityY: number; rotation: number } => {
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
    // Approach player with obstacle avoidance
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
                Math.random() < 0.15;
  
  if (shouldShoot) {
    setTimeout(() => onShoot(tank.id), 0);
  }
  
  // Apply AI movement with physics
  const aiAcceleration = TANK_ACCELERATION * 0.8;
  const aiMaxSpeed = TANK_MAX_SPEED * 0.85;
  
  const currentVelX = tank.velocityX || 0;
  const currentVelY = tank.velocityY || 0;
  
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
