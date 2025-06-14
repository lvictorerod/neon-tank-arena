
import React, { useEffect, useState } from 'react';
import { ParticleData } from './GameArena';

interface ParticleSystemProps {
  particles: ParticleData[];
}

interface AnimatedParticle extends ParticleData {
  opacity: number;
  scale: number;
  age: number;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ particles }) => {
  const [animatedParticles, setAnimatedParticles] = useState<AnimatedParticle[]>([]);

  useEffect(() => {
    const now = Date.now();
    
    // Add new particles
    const newParticles = particles
      .filter(p => !animatedParticles.find(ap => ap.id === p.id))
      .map(particle => ({
        ...particle,
        opacity: 1,
        scale: particle.type === 'explosion' ? 0.5 : 1,
        age: 0,
      }));

    if (newParticles.length > 0) {
      setAnimatedParticles(prev => [...prev, ...newParticles]);
    }

    // Animate existing particles
    const animationTimer = setInterval(() => {
      setAnimatedParticles(prev => 
        prev.map(particle => {
          const age = (Date.now() - particle.createdAt) / 1000; // age in seconds
          
          let opacity = 1;
          let scale = particle.scale;
          
          switch (particle.type) {
            case 'explosion':
              opacity = Math.max(0, 1 - (age / 0.8)); // fade over 0.8 seconds
              scale = 0.5 + (age * 2); // grow quickly
              break;
            case 'muzzle':
              opacity = Math.max(0, 1 - (age / 0.2)); // quick fade
              scale = 1 + (age * 3); // quick expansion
              break;
            case 'trail':
              opacity = Math.max(0, 1 - (age / 0.5)); // medium fade
              scale = 1;
              break;
            case 'smoke':
              opacity = Math.max(0, 0.7 - (age / 1.5)); // slow fade
              scale = 1 + (age * 1.5); // slow expansion
              break;
          }
          
          return {
            ...particle,
            opacity,
            scale,
            age,
          };
        }).filter(p => p.opacity > 0.01) // remove fully faded particles
      );
    }, 50); // 20 FPS for particles

    return () => clearInterval(animationTimer);
  }, [particles, animatedParticles]);

  return (
    <>
      {animatedParticles.map((particle) => {
        const baseStyle = {
          left: `${particle.x}px`,
          top: `${particle.y}px`,
          opacity: particle.opacity,
          transform: `translate(-50%, -50%) scale(${particle.scale})`,
        };

        if (particle.type === 'explosion') {
          return (
            <div
              key={particle.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={baseStyle}
            >
              <div className="w-8 h-8 bg-gradient-radial from-orange-400 via-red-500 to-yellow-300 rounded-full">
                <div className="w-full h-full bg-gradient-radial from-white/60 via-orange-400/80 to-transparent rounded-full animate-pulse"></div>
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
