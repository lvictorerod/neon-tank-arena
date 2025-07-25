import { useState, useEffect, useRef } from 'react';
import { TankData, ProjectileData, ParticleData } from './GameArena';
import { PowerUpData } from './PowerUp';
import { useToast } from '@/hooks/use-toast';

const WEAPON_COOLDOWN = 350; // Reduced for better responsiveness
const POWERUP_SPAWN_INTERVAL = 8000;
const POWERUP_LIFETIME = 15000;
const POWERUP_EFFECT_DURATION = 10000; // Power-ups now have limited duration

interface GameLogicProps {
  playerName: string;
  onGameEnd: (score: number, kills: number) => void;
}

// Enhanced tank interface with power-up timers and turret rotation
interface EnhancedTankData extends TankData {
  speedBoostEnd?: number;
  damageBoostEnd?: number;
  shieldBoostEnd?: number;
  turretRotation?: number;
}

export const useGameLogic = ({ playerName, onGameEnd }: GameLogicProps) => {
  const [tanks, setTanks] = useState<EnhancedTankData[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUpData[]>([]);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [gameTime, setGameTime] = useState(300);
  const [gameActive, setGameActive] = useState(true);
  const [gamePaused, setGamePaused] = useState(false);
  const keysPressed = useRef<Set<string>>(new Set());
  const mousePosition = useRef({ x: 400, y: 300 }); // Default center position
  const lastTurretUpdate = useRef<number>(0); // Throttle turret updates
  const { toast } = useToast();

  // Robust ID generator
  const getUID = (() => {
    let counter = 0;
    return (prefix: string) => {
      if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
      }
      return `${prefix}_${Date.now()}_${counter++}_${Math.random().toString(36).substr(2, 9)}`;
    };
  })();

  // Safe spawn positions that avoid obstacles
  const getSafeSpawnPositions = () => [
    { x: 100, y: 80 },
    { x: 700, y: 520 },
    { x: 80, y: 300 },
    { x: 720, y: 300 },
    { x: 400, y: 80 },
    { x: 400, y: 520 },
  ];

  // Enhanced mouse movement handling with interpolation and throttling
  const handleMouseMove = (mouseX: number, mouseY: number) => {
    const now = performance.now();

    // Throttle updates to 60fps for better performance
    if (now - lastTurretUpdate.current < 16) return;
    lastTurretUpdate.current = now;

    mousePosition.current = { x: mouseX, y: mouseY };

    // Update player tank turret rotation with smooth interpolation
    setTanks(prevTanks =>
      prevTanks.map(tank => {
        if (!tank.isPlayer || tank.isRespawning) return tank;

        const dx = mouseX - tank.x;
        const dy = mouseY - tank.y;
        const targetRotation = (Math.atan2(dy, dx) * 180) / Math.PI;
        const currentRotation = tank.turretRotation ?? tank.rotation ?? 0;

        // Smooth interpolation, handle angle wrapping
        let angleDiff = targetRotation - currentRotation;
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;
        const smoothingFactor = 0.38; // 0.3-0.5 is responsive yet smooth
        const newRotation = currentRotation + (angleDiff * smoothingFactor);

        if (Math.abs(newRotation - currentRotation) > 0.1) {
          return { ...tank, turretRotation: newRotation };
        }
        return tank;
      })
    );
  };

  // Initialize game
  useEffect(() => {
    const spawnPositions = getSafeSpawnPositions();

    const initialTanks: EnhancedTankData[] = [
      {
        id: 'player',
        x: spawnPositions[0].x,
        y: spawnPositions[0].y,
        rotation: 0,
        turretRotation: 0,
        health: 100,
        maxHealth: 100,
        name: playerName,
        isPlayer: true,
        lastShotTime: 0,
        kills: 0,
        isRespawning: false,
        speed: 1,
        damage: 25,
        shield: 0,
        velocityX: 0,
        velocityY: 0,
      },
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `bot_${i + 1}`,
        x: spawnPositions[i + 1].x,
        y: spawnPositions[i + 1].y,
        rotation: Math.random() * 360,
        turretRotation: Math.random() * 360,
        health: 100,
        maxHealth: 100,
        name: ['Alpha-7', 'Storm', 'Viper'][i],
        isPlayer: false,
        lastShotTime: 0,
        kills: 0,
        isRespawning: false,
        speed: 1,
        damage: 25,
        shield: 0,
        velocityX: 0,
        velocityY: 0,
      }))
    ];
    setTanks(initialTanks);
  }, [playerName]);

  // Power-up effect cleanup
  useEffect(() => {
    if (!gameActive || gamePaused) return;
    
    const effectCleanup = setInterval(() => {
      const now = Date.now();
      setTanks(prevTanks => prevTanks.map(tank => {
        let updated = { ...tank };
        let hasChanges = false;

        // Remove expired speed boost
        if (tank.speedBoostEnd && now > tank.speedBoostEnd) {
          updated.speed = 1;
          updated.speedBoostEnd = undefined;
          hasChanges = true;
        }

        // Remove expired damage boost
        if (tank.damageBoostEnd && now > tank.damageBoostEnd) {
          updated.damage = 25;
          updated.damageBoostEnd = undefined;
          hasChanges = true;
        }

        // Remove expired shield boost
        if (tank.shieldBoostEnd && now > tank.shieldBoostEnd) {
          updated.shield = 0;
          updated.shieldBoostEnd = undefined;
          hasChanges = true;
        }

        if (hasChanges && tank.isPlayer) {
          toast({
            title: "Power-up expired",
            description: "Enhancement effects have worn off",
          });
        }

        return hasChanges ? updated : tank;
      }));
    }, 1000);

    return () => clearInterval(effectCleanup);
  }, [gameActive, gamePaused, toast]);

  // Power-up spawning system
  useEffect(() => {
    if (!gameActive) return;
    
    const spawnPowerUp = () => {
      const types: PowerUpData['type'][] = ['health', 'speed', 'damage', 'shield'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const newPowerUp: PowerUpData = {
        id: `powerup_${Date.now()}_${Math.random()}`,
        x: 100 + Math.random() * 600,
        y: 100 + Math.random() * 400,
        type,
        createdAt: Date.now(),
      };
      
      setPowerUps(prev => [...prev, newPowerUp]);
      
      toast({
        title: "Power-up spawned!",
        description: `A ${type} boost has appeared on the battlefield`,
      });
    };

    const powerUpTimer = setInterval(spawnPowerUp, POWERUP_SPAWN_INTERVAL);
    return () => clearInterval(powerUpTimer);
  }, [gameActive, toast]);

  // Power-up cleanup
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setPowerUps(prev => prev.filter(powerUp => now - powerUp.createdAt < POWERUP_LIFETIME));
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  // Game timer with pause support
  useEffect(() => {
    if (!gameActive || gamePaused) return;
    
    const timer = setInterval(() => {
      setGameTime((prev) => {
        if (prev <= 1) {
          setGameActive(false);
          onGameEnd(score, kills);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, gamePaused, score, kills, onGameEnd]);

  // Enhanced particle cleanup with object pooling consideration
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setParticles(prev => {
        const activeParticles = prev.filter(particle => now - particle.createdAt < 2000);
        // Log if we're creating too many particles for performance monitoring
        if (prev.length > 100) {
          console.warn(`High particle count: ${prev.length}, cleaned to: ${activeParticles.length}`);
        }
        return activeParticles;
      });
    }, 500); // More frequent cleanup

    return () => clearInterval(cleanup);
  }, []);

  // --- CRITICAL FIX: SHOOTING LOGIC ---
  const handleShoot = (tankId: string) => {
    const now = Date.now();

    setTanks(prevTanks => {
      const tank = prevTanks.find(t => t.id === tankId);
      if (!tank || tank.isRespawning || now - tank.lastShotTime < WEAPON_COOLDOWN) {
        return prevTanks;
      }

      // CRITICAL FIX: Use the correct turret rotation for projectile direction
      let shootingAngle: number;
      
      if (tank.isPlayer) {
        // For player tank, use turretRotation if available, otherwise use body rotation
        shootingAngle = typeof tank.turretRotation === 'number' ? tank.turretRotation : tank.rotation;
      } else {
        // For AI tanks, use body rotation (they don't have separate turret control)
        shootingAngle = tank.rotation;
      }

      // Calculate muzzle position at the tip of the barrel
      const BARREL_LENGTH = 27;   // Distance from tank center to barrel tip
      const TANK_RADIUS = 12;     // Tank center to edge
      const muzzleDistance = TANK_RADIUS + BARREL_LENGTH;

      // Convert angle to radians for calculation
      const angleRad = (shootingAngle * Math.PI) / 180;
      const muzzleX = tank.x + Math.cos(angleRad) * muzzleDistance;
      const muzzleY = tank.y + Math.sin(angleRad) * muzzleDistance;

      // Create projectile with CORRECT rotation matching the shooting angle
      const newProjectile: ProjectileData = {
        id: getUID('proj'),
        x: muzzleX,
        y: muzzleY,
        rotation: shootingAngle,  // CRITICAL: Use the actual shooting angle
        speed: 450,
        ownerId: tank.id,
        damage: tank.damage || 25,
        createdAt: now,
      };

      setProjectiles(prev => [...prev, newProjectile]);
      
      // Add muzzle flash at the correct muzzle position
      setParticles(prev => [...prev, {
        id: getUID('muzzle'),
        x: muzzleX,
        y: muzzleY,
        type: 'muzzle',
        createdAt: now,
      }]);

      return prevTanks.map(t =>
        t.id === tankId ? { ...t, lastShotTime: now } : t
      );
    });
  };

  const collectPowerUp = (tankId: string, powerUpId: string) => {
    const powerUp = powerUps.find(p => p.id === powerUpId);
    if (!powerUp) return;

    const now = Date.now();

    setTanks(prevTanks => prevTanks.map(tank => {
      if (tank.id !== tankId) return tank;

      const enhancedTank = { ...tank } as EnhancedTankData;
      
      switch (powerUp.type) {
        case 'health':
          enhancedTank.health = Math.min(tank.maxHealth, tank.health + 50);
          break;
        case 'speed':
          enhancedTank.speed = 1.8; // Fixed boost amount
          enhancedTank.speedBoostEnd = now + POWERUP_EFFECT_DURATION;
          break;
        case 'damage':
          enhancedTank.damage = 40; // Fixed boost amount
          enhancedTank.damageBoostEnd = now + POWERUP_EFFECT_DURATION;
          break;
        case 'shield':
          enhancedTank.shield = 50; // Fixed shield amount
          enhancedTank.shieldBoostEnd = now + POWERUP_EFFECT_DURATION;
          break;
      }

      if (tank.isPlayer) {
        toast({
          title: "Power-up collected!",
          description: `${powerUp.type.charAt(0).toUpperCase() + powerUp.type.slice(1)} boost activated for ${POWERUP_EFFECT_DURATION/1000}s`,
        });
      }

      return enhancedTank;
    }));

    setPowerUps(prev => prev.filter(p => p.id !== powerUpId));
    setScore(prev => prev + 50); // Increased power-up score
  };

  return {
    tanks,
    projectiles,
    particles,
    powerUps,
    score,
    kills,
    gameTime,
    gameActive,
    gamePaused,
    keysPressed,
    setTanks,
    setProjectiles,
    setParticles,
    setPowerUps,
    setKills,
    setScore,
    setGamePaused,
    handleShoot,
    collectPowerUp,
    getSafeSpawnPositions,
    handleMouseMove,
    toast,
  };
};