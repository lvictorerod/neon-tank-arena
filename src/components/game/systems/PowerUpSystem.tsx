import { PowerUpData } from '../PowerUp';
import { TankData } from '../GameArena';
import { gameEvents } from './EventSystem';

export type PowerUpType = 'health' | 'speed' | 'damage' | 'shield' | 'rapid_fire' | 'stealth' | 'armor_piercing';

export interface EnhancedPowerUpData extends PowerUpData {
  type: PowerUpType;
  duration: number;
  intensity: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  stackable: boolean;
}

export interface PowerUpEffect {
  type: PowerUpType;
  startTime: number;
  duration: number;
  intensity: number;
  stackCount: number;
}

export const POWERUP_CONFIGS: Record<PowerUpType, {
  duration: number;
  intensity: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  stackable: boolean;
  spawnWeight: number;
  description: string;
}> = {
  health: {
    duration: 0, // Instant effect
    intensity: 50,
    rarity: 'common',
    stackable: true,
    spawnWeight: 30,
    description: 'Restores 50 health points'
  },
  speed: {
    duration: 15000,
    intensity: 1.5,
    rarity: 'common',
    stackable: false,
    spawnWeight: 25,
    description: 'Increases movement speed by 50%'
  },
  damage: {
    duration: 12000,
    intensity: 1.8,
    rarity: 'rare',
    stackable: false,
    spawnWeight: 20,
    description: 'Increases damage by 80%'
  },
  shield: {
    duration: 20000,
    intensity: 75,
    rarity: 'rare',
    stackable: true,
    spawnWeight: 15,
    description: 'Provides 75 shield points'
  },
  rapid_fire: {
    duration: 10000,
    intensity: 0.3,
    rarity: 'epic',
    stackable: false,
    spawnWeight: 7,
    description: 'Reduces weapon cooldown by 70%'
  },
  stealth: {
    duration: 8000,
    intensity: 0.3,
    rarity: 'epic',
    stackable: false,
    spawnWeight: 2,
    description: 'Become partially invisible to enemies'
  },
  armor_piercing: {
    duration: 15000,
    intensity: 2.5,
    rarity: 'legendary',
    stackable: false,
    spawnWeight: 1,
    description: 'Projectiles pierce through armor and obstacles'
  }
};

export class PowerUpManager {
  private activePowerUps: Map<string, PowerUpEffect[]> = new Map();
  private spawnTimer = 0;
  private spawnInterval = 8000; // 8 seconds
  private maxPowerUps = 3;

  constructor() {
    // Subscribe to power-up collection events
    gameEvents.subscribe('powerup_collected', this.handlePowerUpCollected.bind(this));
  }

  update(deltaTime: number, currentPowerUps: EnhancedPowerUpData[]): {
    newPowerUps: EnhancedPowerUpData[];
    expiredEffects: { tankId: string; effects: PowerUpEffect[] }[];
  } {
    this.spawnTimer += deltaTime * 1000;
    const newPowerUps: EnhancedPowerUpData[] = [...currentPowerUps];
    const expiredEffects: { tankId: string; effects: PowerUpEffect[] }[] = [];

    // Spawn new power-ups
    if (this.spawnTimer >= this.spawnInterval && currentPowerUps.length < this.maxPowerUps) {
      const newPowerUp = this.generateRandomPowerUp();
      if (newPowerUp) {
        newPowerUps.push(newPowerUp);
        this.spawnTimer = 0;
      }
    }

    // Update active power-up effects
    const now = Date.now();
    this.activePowerUps.forEach((effects, tankId) => {
      const activeEffects = effects.filter(effect => {
        const isExpired = now > effect.startTime + effect.duration;
        return !isExpired;
      });

      const expiredForTank = effects.filter(effect => {
        const isExpired = now > effect.startTime + effect.duration;
        return isExpired;
      });

      if (expiredForTank.length > 0) {
        expiredEffects.push({ tankId, effects: expiredForTank });
      }

      if (activeEffects.length > 0) {
        this.activePowerUps.set(tankId, activeEffects);
      } else {
        this.activePowerUps.delete(tankId);
      }
    });

    return { newPowerUps, expiredEffects };
  }

  private generateRandomPowerUp(): EnhancedPowerUpData | null {
    const totalWeight = Object.values(POWERUP_CONFIGS).reduce((sum, config) => sum + config.spawnWeight, 0);
    let random = Math.random() * totalWeight;

    for (const [type, config] of Object.entries(POWERUP_CONFIGS)) {
      random -= config.spawnWeight;
      if (random <= 0) {
        return {
          id: `powerup_${Date.now()}_${Math.random()}`,
          x: 100 + Math.random() * 600,
          y: 100 + Math.random() * 400,
          type: type as PowerUpType,
          createdAt: Date.now(),
          duration: config.duration,
          intensity: config.intensity,
          rarity: config.rarity,
          stackable: config.stackable,
        };
      }
    }

    return null;
  }

  private handlePowerUpCollected(event: any): void {
    const { tankId, powerUp } = event.data;
    this.applyPowerUpEffect(tankId, powerUp);
  }

  applyPowerUpEffect(tankId: string, powerUp: EnhancedPowerUpData): void {
    const config = POWERUP_CONFIGS[powerUp.type];
    const now = Date.now();

    if (!this.activePowerUps.has(tankId)) {
      this.activePowerUps.set(tankId, []);
    }

    const effects = this.activePowerUps.get(tankId)!;
    const existingEffect = effects.find(e => e.type === powerUp.type);

    if (existingEffect && config.stackable) {
      // Stack the effect
      existingEffect.stackCount++;
      existingEffect.startTime = now; // Refresh duration
    } else if (existingEffect && !config.stackable) {
      // Refresh the effect
      existingEffect.startTime = now;
      existingEffect.duration = config.duration;
    } else {
      // Add new effect
      const newEffect: PowerUpEffect = {
        type: powerUp.type,
        startTime: now,
        duration: config.duration,
        intensity: config.intensity,
        stackCount: 1,
      };
      effects.push(newEffect);
    }

    // Emit event for UI updates
    gameEvents.emit('powerup_collected', {
      tankId,
      powerUpType: powerUp.type,
      description: config.description,
    });
  }

  getTankEffects(tankId: string): PowerUpEffect[] {
    return this.activePowerUps.get(tankId) || [];
  }

  calculateTankModifiers(tankId: string): {
    speedMultiplier: number;
    damageMultiplier: number;
    shieldAmount: number;
    weaponCooldownMultiplier: number;
    stealthLevel: number;
    armorPiercing: boolean;
  } {
    const effects = this.getTankEffects(tankId);
    let speedMultiplier = 1;
    let damageMultiplier = 1;
    let shieldAmount = 0;
    let weaponCooldownMultiplier = 1;
    let stealthLevel = 0;
    let armorPiercing = false;

    effects.forEach(effect => {
      switch (effect.type) {
        case 'speed':
          speedMultiplier = effect.intensity;
          break;
        case 'damage':
          damageMultiplier = effect.intensity;
          break;
        case 'shield':
          shieldAmount += effect.intensity * effect.stackCount;
          break;
        case 'rapid_fire':
          weaponCooldownMultiplier = effect.intensity;
          break;
        case 'stealth':
          stealthLevel = effect.intensity;
          break;
        case 'armor_piercing':
          armorPiercing = true;
          break;
      }
    });

    return {
      speedMultiplier,
      damageMultiplier,
      shieldAmount,
      weaponCooldownMultiplier,
      stealthLevel,
      armorPiercing,
    };
  }

  clear(): void {
    this.activePowerUps.clear();
    this.spawnTimer = 0;
  }
}

export const powerUpManager = new PowerUpManager();