import { useState, useEffect, useRef } from 'react';
import { TankData, ProjectileData, ParticleData } from './GameArena';
import { PowerUpData } from './PowerUp';
import { useToast } from '@/hooks/use-toast';

const WEAPON_COOLDOWN = 500;
const POWERUP_SPAWN_INTERVAL = 8000;
const POWERUP_LIFETIME = 15000;

interface GameLogicProps {
  playerName: string;
  onGameEnd: (score: number, kills: number) => void;
}

export const useGameLogic = ({ playerName, onGameEnd }: GameLogicProps) => {
  const [tanks, setTanks] = useState<TankData[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUpData[]>([]);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [gameTime, setGameTime] = useState(300);
  const [gameActive, setGameActive] = useState(true);
  const keysPressed = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  // Initialize game
  useEffect(() => {
    const spawnPositions = [
      { x: 100, y: 50 },
      { x: 700, y: 550 },
      { x: 50, y: 300 },
      { x: 750, y: 300 },
      { x: 400, y: 50 },
      { x: 400, y: 550 },
    ];

    const initialTanks: TankData[] = [
      {
        id: 'player',
        x: spawnPositions[0].x,
        y: spawnPositions[0].y,
        rotation: 0,
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
      },
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `bot_${i + 1}`,
        x: spawnPositions[i + 1].x,
        y: spawnPositions[i + 1].y,
        rotation: Math.random() * 360,
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
      }))
    ];
    setTanks(initialTanks);
  }, [playerName]);

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

  // Game timer
  useEffect(() => {
    if (!gameActive) return;
    
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
  }, [gameActive, score, kills, onGameEnd]);

  // Particle cleanup
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setParticles(prev => prev.filter(particle => now - particle.createdAt < 2000));
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  const handleShoot = (tankId: string) => {
    const now = Date.now();
    
    setTanks(prevTanks => {
      const tank = prevTanks.find(t => t.id === tankId);
      if (!tank || tank.isRespawning || now - tank.lastShotTime < WEAPON_COOLDOWN) {
        return prevTanks;
      }

      const barrelLength = 30;
      const projectileX = tank.x + Math.cos((tank.rotation * Math.PI) / 180) * barrelLength;
      const projectileY = tank.y + Math.sin((tank.rotation * Math.PI) / 180) * barrelLength;

      const newProjectile: ProjectileData = {
        id: `proj_${Date.now()}_${Math.random()}`,
        x: projectileX,
        y: projectileY,
        rotation: tank.rotation,
        speed: 400,
        ownerId: tank.id,
        damage: (tank as any).damage || 25,
        createdAt: now,
      };

      setProjectiles(prev => [...prev, newProjectile]);

      setParticles(prev => [...prev, {
        id: `muzzle_${Date.now()}`,
        x: projectileX,
        y: projectileY,
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

    setTanks(prevTanks => prevTanks.map(tank => {
      if (tank.id !== tankId) return tank;

      const enhancedTank = { ...tank } as any;
      
      switch (powerUp.type) {
        case 'health':
          enhancedTank.health = Math.min(tank.maxHealth, tank.health + 50);
          break;
        case 'speed':
          enhancedTank.speed = Math.min(2, (enhancedTank.speed || 1) + 0.5);
          break;
        case 'damage':
          enhancedTank.damage = Math.min(50, (enhancedTank.damage || 25) + 15);
          break;
        case 'shield':
          enhancedTank.shield = Math.min(50, (enhancedTank.shield || 0) + 25);
          break;
      }

      if (tank.isPlayer) {
        toast({
          title: "Power-up collected!",
          description: `${powerUp.type.charAt(0).toUpperCase() + powerUp.type.slice(1)} boost activated`,
        });
      }

      return enhancedTank;
    }));

    setPowerUps(prev => prev.filter(p => p.id !== powerUpId));
    setScore(prev => prev + 25);
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
    keysPressed,
    setTanks,
    setProjectiles,
    setParticles,
    setPowerUps,
    setKills,
    setScore,
    handleShoot,
    collectPowerUp,
    toast,
  };
};
