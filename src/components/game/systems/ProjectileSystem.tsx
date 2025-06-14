
import { TankData, ProjectileData, ParticleData } from '../GameArena';

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

export const processProjectileHits = (
  hits: ProjectileHit[],
  tanks: TankData[],
  onKill: (killerTank: TankData, victimTank: TankData) => void,
  onToast: (toast: { title: string; description: string }) => void
): { updatedTanks: TankData[]; particles: ParticleData[] } => {
  const now = Date.now();
  const particles: ParticleData[] = [];
  const RESPAWN_TIME = 3000;

  if (hits.length === 0) {
    return { updatedTanks: tanks, particles };
  }

  // Group damage by tank
  const damageMap = new Map<string, { totalDamage: number, lastHitter: ProjectileData }>();
  
  hits.forEach(hit => {
    // Create explosion particle
    particles.push({
      id: window.crypto?.randomUUID?.() || `explosion_${Date.now()}_${Math.random()}`,
      x: hit.x,
      y: hit.y,
      type: 'explosion',
      createdAt: now,
    });

    const entry = damageMap.get(hit.tank.id) || { totalDamage: 0, lastHitter: hit.projectile };
    entry.totalDamage += hit.projectile.damage;
    entry.lastHitter = hit.projectile;
    damageMap.set(hit.tank.id, entry);
  });

  const updatedTanks = tanks.map(tank => {
    const damageEntry = damageMap.get(tank.id);
    if (!damageEntry) return tank;

    const enhancedTank = { ...tank } as any;
    let totalDamage = damageEntry.totalDamage;
    
    // Apply shield protection
    if (enhancedTank.shield && enhancedTank.shield > 0) {
      const shieldAbsorbed = Math.min(totalDamage, enhancedTank.shield);
      totalDamage -= shieldAbsorbed;
      enhancedTank.shield -= shieldAbsorbed;
    }

    const newHealth = Math.max(0, tank.health - totalDamage);
    
    if (newHealth === 0 && !tank.isRespawning) {
      const shooter = tanks.find(t => t.id === damageEntry.lastHitter.ownerId);
      if (shooter) {
        onKill(shooter, tank);
      }

      return {
        ...enhancedTank,
        health: 0,
        isRespawning: true,
        respawnTime: now + RESPAWN_TIME,
        velocityX: 0,
        velocityY: 0,
      };
    } else {
      return { ...enhancedTank, health: newHealth };
    }
  });

  return { updatedTanks, particles };
};

export const createWallHitParticles = (wallHits: WallHit[]): ParticleData[] => {
  const now = Date.now();
  return wallHits.map(hit => ({
    id: window.crypto?.randomUUID?.() || `explosion_${Date.now()}_${Math.random()}`,
    x: hit.x,
    y: hit.y,
    type: 'explosion' as const,
    createdAt: now,
  }));
};
