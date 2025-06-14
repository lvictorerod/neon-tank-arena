// Object Pool System for Performance Optimization
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10, maxSize = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  getPoolSize(): number {
    return this.pool.length;
  }
}

// Particle Pool Implementation
export interface PooledParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: string;
  active: boolean;
}

export const createParticle = (): PooledParticle => ({
  id: '',
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  life: 0,
  maxLife: 1,
  type: '',
  active: false,
});

export const resetParticle = (particle: PooledParticle): void => {
  particle.active = false;
  particle.life = 0;
  particle.x = 0;
  particle.y = 0;
  particle.vx = 0;
  particle.vy = 0;
};

export const particlePool = new ObjectPool(
  createParticle,
  resetParticle,
  50,
  200
);