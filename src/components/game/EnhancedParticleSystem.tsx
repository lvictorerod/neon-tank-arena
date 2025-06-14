import React, { useEffect, useState } from 'react';
import { ParticleData } from './GameArena';

interface EnhancedParticle extends ParticleData {
  opacity: number;
  scale: number;
  velocityX?: number;
  velocityY?: number;
  rotation?: number;
  color?: string;
}

interface EnhancedParticleSystemProps {
  particles: ParticleData[];
}

export const EnhancedParticleSystem: React.FC<EnhancedParticleSystemProps> = ({ particles }) => {
  const [animatedParticles, setAnimatedParticles] = useState<EnhancedParticle[]>([]);

  useEffect(() => {
    const now = Date.now();
    
    // Add new particles with enhanced properties
    const newParticles = particles
      .filter(p => !animatedParticles.find(ap => ap.id === p.id))
      .map(particle => ({
        ...particle,
        opacity: 1,
        scale: particle.type === 'explosion' ? 0.1 : 1,
        velocityX: particle.type === 'explosion' ? (Math.random() - 0.5) * 100 : 0,
        velocityY: particle.type === 'explosion' ? (Math.random() - 0.5) * 100 : 0,
        rotation: Math.random() * 360,
        color: particle.type === 'explosion' ? 
          ['#ff6b35', '#f7931e', '#ffb347', '#ff4757'][Math.floor(Math.random() * 4)] : 
          '#ffffff',
      }));

    if (newParticles.length > 0) {
      setAnimatedParticles(prev => [...prev, ...newParticles]);
    }

    // Enhanced animation with physics
    const animationTimer = setInterval(() => {
      setAnimatedParticles(prev => 
        prev.map(particle => {
          const age = (Date.now() - particle.createdAt) / 1000;
          const deltaTime = 0.05;
          
          let opacity = 1;
          let scale = particle.scale;
          let x = particle.x;
          let y = particle.y;
          let rotation = particle.rotation || 0;
          
          switch (particle.type) {
            case 'explosion':
              opacity = Math.max(0, 1 - (age / 1.2));
              scale = 0.1 + (age * 8);
              
              // Physics for explosion particles
              if (particle.velocityX && particle.velocityY) {
                x += particle.velocityX * deltaTime;
                y += particle.velocityY * deltaTime;
                particle.velocityY += 50 * deltaTime; // gravity
                particle.velocityX *= 0.98; // air resistance
                particle.velocityY *= 0.98;
              }
              rotation += age * 180;
              break;
              
            case 'muzzle':
              opacity = Math.max(0, 1 - (age / 0.15));
              scale = 1 + (age * 4);
              break;
              
            case 'trail':
              opacity = Math.max(0, 1 - (age / 0.8));
              scale = 1 - (age * 0.5);
              break;
              
            case 'smoke':
              opacity = Math.max(0, 0.6 - (age / 2));
              scale = 1 + (age * 2);
              y -= 20 * deltaTime; // rise up
              break;
          }
          
          return {
            ...particle,
            x,
            y,
            opacity,
            scale,
            rotation,
          };
        }).filter(p => p.opacity > 0.01)
      );
    }, 50);

    return () => clearInterval(animationTimer);
  }, [particles, animatedParticles]);

  return (
    <>
      {animatedParticles.map((particle) => {
        const baseStyle = {
          left: `${particle.x}px`,
          top: `${particle.y}px`,
          opacity: particle.opacity,
          transform: `translate(-50%, -50%) scale(${particle.scale}) rotate(${particle.rotation}deg)`,
        };

        if (particle.type === 'explosion') {
          return (
            <div
              key={particle.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={baseStyle}
            >
              <div 
                className="w-6 h-6 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${particle.color}AA, ${particle.color}55, transparent)`,
                  boxShadow: `0 0 20px ${particle.color}88`,
                }}
              >
                <div className="w-full h-full rounded-full bg-gradient-radial from-white/60 via-transparent to-transparent"></div>
              </div>
            </div>
          );
        }

        if (particle.type === 'muzzle') {
          return (
            <div
              key={particle.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={baseStyle}
            >
              <div className="w-4 h-4 bg-gradient-radial from-yellow-200 via-orange-400 to-red-500 rounded-full">
                <div className="w-full h-full bg-gradient-radial from-white/80 via-yellow-300/60 to-transparent rounded-full"></div>
              </div>
            </div>
          );
        }

        if (particle.type === 'trail') {
          return (
            <div
              key={particle.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={baseStyle}
            >
              <div className="w-1 h-1 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full shadow-sm shadow-yellow-400/75"></div>
            </div>
          );
        }

        if (particle.type === 'smoke') {
          return (
            <div
              key={particle.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={baseStyle}
            >
              <div className="w-6 h-6 bg-gradient-radial from-gray-400/40 via-gray-500/20 to-transparent rounded-full"></div>
            </div>
          );
        }

        return null;
      })}
    </>
  );
};
