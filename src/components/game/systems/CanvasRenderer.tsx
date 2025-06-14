import React, { useRef, useEffect, useCallback } from 'react';
import { TankData, ProjectileData } from '../GameArena';
import { PowerUpData } from '../PowerUp';
import { obstacles } from '../CollisionDetection';

interface CanvasRendererProps {
  width: number;
  height: number;
  tanks: TankData[];
  projectiles: ProjectileData[];
  powerUps: PowerUpData[];
  particles: any[];
  className?: string;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  width,
  height,
  tanks,
  projectiles,
  powerUps,
  particles,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set high DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Render background
    renderBackground(ctx, width, height);

    // Render obstacles
    renderObstacles(ctx);

    // Render power-ups
    powerUps.forEach(powerUp => renderPowerUp(ctx, powerUp));

    // Render particles (background layer)
    particles.filter(p => p.type === 'smoke').forEach(particle => renderParticle(ctx, particle));

    // Render projectiles
    projectiles.forEach(projectile => renderProjectile(ctx, projectile));

    // Render tanks
    tanks.filter(tank => !tank.isRespawning).forEach(tank => renderTank(ctx, tank));

    // Render particles (foreground layer)
    particles.filter(p => p.type !== 'smoke').forEach(particle => renderParticle(ctx, particle));

    // Render UI elements
    renderMiniMap(ctx, width, height, tanks);

  }, [width, height, tanks, projectiles, powerUps, particles]);

  useEffect(() => {
    const animate = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        imageRendering: 'pixelated'
      }}
    />
  );
};

function renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a4a3a');
  gradient.addColorStop(0.5, '#2d5a4d');
  gradient.addColorStop(1, '#1a4a3a');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Grid pattern
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;
  
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function renderObstacles(ctx: CanvasRenderingContext2D) {
  obstacles.forEach(obstacle => {
    // Main obstacle body
    const gradient = ctx.createLinearGradient(
      obstacle.x, obstacle.y,
      obstacle.x + obstacle.width, obstacle.y + obstacle.height
    );
    gradient.addColorStop(0, '#666');
    gradient.addColorStop(1, '#333');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    // Border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    // Highlight
    ctx.fillStyle = '#999';
    ctx.fillRect(obstacle.x + 2, obstacle.y + 2, 4, 4);
  });
}

function renderTank(ctx: CanvasRenderingContext2D, tank: TankData) {
  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate((tank.rotation * Math.PI) / 180);

  // Tank body
  const bodyGradient = ctx.createLinearGradient(-15, -10, 15, 10);
  if (tank.isPlayer) {
    bodyGradient.addColorStop(0, '#00bcd4');
    bodyGradient.addColorStop(1, '#0097a7');
  } else {
    bodyGradient.addColorStop(0, '#f44336');
    bodyGradient.addColorStop(1, '#c62828');
  }
  
  ctx.fillStyle = bodyGradient;
  ctx.fillRect(-15, -10, 30, 20);
  
  // Tank barrel
  ctx.fillStyle = tank.isPlayer ? '#00acc1' : '#d32f2f';
  ctx.fillRect(15, -2, 20, 4);
  
  // Tank tracks
  ctx.fillStyle = '#424242';
  ctx.fillRect(-16, -12, 32, 3);
  ctx.fillRect(-16, 9, 32, 3);
  
  // Tank details
  ctx.fillStyle = tank.isPlayer ? '#b2ebf2' : '#ffcdd2';
  ctx.fillRect(-5, -5, 10, 10);

  ctx.restore();

  // Health bar
  const healthPercentage = (tank.health / tank.maxHealth) * 100;
  const barWidth = 40;
  const barHeight = 4;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(tank.x - barWidth/2, tank.y - 25, barWidth, barHeight);
  
  const healthColor = healthPercentage > 60 ? '#4caf50' : 
                     healthPercentage > 30 ? '#ff9800' : '#f44336';
  ctx.fillStyle = healthColor;
  ctx.fillRect(tank.x - barWidth/2, tank.y - 25, (barWidth * healthPercentage) / 100, barHeight);

  // Name tag
  ctx.fillStyle = 'white';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(tank.name, tank.x, tank.y - 30);
}

function renderProjectile(ctx: CanvasRenderingContext2D, projectile: ProjectileData) {
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate((projectile.rotation * Math.PI) / 180);

  // Projectile trail
  const trailGradient = ctx.createLinearGradient(-8, 0, 0, 0);
  trailGradient.addColorStop(0, 'rgba(255, 165, 0, 0)');
  trailGradient.addColorStop(1, 'rgba(255, 165, 0, 0.8)');
  
  ctx.fillStyle = trailGradient;
  ctx.fillRect(-8, -1, 8, 2);

  // Main projectile
  const projectileGradient = ctx.createLinearGradient(-2, -1, 2, 1);
  projectileGradient.addColorStop(0, '#ffeb3b');
  projectileGradient.addColorStop(1, '#ff9800');
  
  ctx.fillStyle = projectileGradient;
  ctx.fillRect(-2, -1, 4, 2);

  ctx.restore();
}

function renderPowerUp(ctx: CanvasRenderingContext2D, powerUp: PowerUpData) {
  const time = Date.now() * 0.005;
  const pulse = Math.sin(time) * 0.2 + 1;
  
  ctx.save();
  ctx.translate(powerUp.x, powerUp.y);
  ctx.scale(pulse, pulse);

  // Glow effect
  const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
  const colors = {
    health: ['#4caf50', '#81c784'],
    speed: ['#2196f3', '#64b5f6'],
    damage: ['#f44336', '#e57373'],
    shield: ['#9c27b0', '#ba68c8']
  };
  
  const [color1, color2] = colors[powerUp.type as keyof typeof colors] || ['#fff', '#ccc'];
  glowGradient.addColorStop(0, color1);
  glowGradient.addColorStop(1, 'transparent');
  
  ctx.fillStyle = glowGradient;
  ctx.fillRect(-20, -20, 40, 40);

  // Main power-up body
  ctx.fillStyle = color1;
  ctx.fillRect(-8, -8, 16, 16);
  
  ctx.fillStyle = color2;
  ctx.fillRect(-6, -6, 12, 12);

  // Icon
  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const icons = { health: '+', speed: '⚡', damage: '💥', shield: '🛡' };
  ctx.fillText(icons[powerUp.type as keyof typeof icons] || '?', 0, 0);

  ctx.restore();
}

function renderParticle(ctx: CanvasRenderingContext2D, particle: any) {
  if (!particle.opacity || particle.opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = particle.opacity;
  ctx.translate(particle.x, particle.y);
  
  if (particle.rotation) {
    ctx.rotate((particle.rotation * Math.PI) / 180);
  }
  
  if (particle.scale) {
    ctx.scale(particle.scale, particle.scale);
  }

  switch (particle.type) {
    case 'explosion':
      const explosionGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
      explosionGradient.addColorStop(0, '#ffeb3b');
      explosionGradient.addColorStop(0.3, '#ff9800');
      explosionGradient.addColorStop(0.7, '#f44336');
      explosionGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = explosionGradient;
      ctx.fillRect(-15, -15, 30, 30);
      break;

    case 'smoke':
      const smokeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
      smokeGradient.addColorStop(0, 'rgba(100, 100, 100, 0.6)');
      smokeGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = smokeGradient;
      ctx.fillRect(-10, -10, 20, 20);
      break;

    case 'muzzle':
      const muzzleGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
      muzzleGradient.addColorStop(0, '#ffffff');
      muzzleGradient.addColorStop(0.5, '#ffeb3b');
      muzzleGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = muzzleGradient;
      ctx.fillRect(-8, -8, 16, 16);
      break;
  }

  ctx.restore();
}

function renderMiniMap(ctx: CanvasRenderingContext2D, width: number, height: number, tanks: TankData[]) {
  const miniMapSize = 120;
  const miniMapX = width - miniMapSize - 10;
  const miniMapY = 10;
  const scaleX = miniMapSize / width;
  const scaleY = miniMapSize / height;

  // Mini-map background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(miniMapX, miniMapY, miniMapSize, miniMapSize);
  
  ctx.strokeStyle = '#00bcd4';
  ctx.lineWidth = 2;
  ctx.strokeRect(miniMapX, miniMapY, miniMapSize, miniMapSize);

  // Render tanks on mini-map
  tanks.forEach(tank => {
    if (tank.isRespawning) return;
    
    const x = miniMapX + tank.x * scaleX;
    const y = miniMapY + tank.y * scaleY;
    
    ctx.fillStyle = tank.isPlayer ? '#00bcd4' : '#f44336';
    ctx.fillRect(x - 2, y - 2, 4, 4);
  });

  // Render obstacles on mini-map
  obstacles.forEach(obstacle => {
    const x = miniMapX + obstacle.x * scaleX;
    const y = miniMapY + obstacle.y * scaleY;
    const w = obstacle.width * scaleX;
    const h = obstacle.height * scaleY;
    
    ctx.fillStyle = '#666';
    ctx.fillRect(x, y, w, h);
  });
}