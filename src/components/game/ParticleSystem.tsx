
import React, { useEffect, useState } from 'react';
import { ParticleData } from './GameArena';

interface ParticleSystemProps {
  particles: ParticleData[];
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ particles }) => {
  const [animatedParticles, setAnimatedParticles] = useState<(ParticleData & { opacity: number; scale: number })[]>([]);

  useEffect(() => {
    setAnimatedParticles(
      particles.map(particle => ({
        ...particle,
        opacity: 1,
        scale: 1,
      }))
    );

    // Animate particles
    const timer = setTimeout(() => {
      setAnimatedParticles(prev =>
        prev.map(particle => ({
          ...particle,
          opacity: Math.max(0, particle.opacity - 0.1),
          scale: particle.scale + 0.1,
        }))
      );
    }, 100);

    return () => clearTimeout(timer);
  }, [particles]);

  return (
    <>
      {animatedParticles.map((particle) => {
        if (particle.type === 'explosion') {
          return (
            <div
              key={particle.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                opacity: particle.opacity,
                transform: `translate(-50%, -50%) scale(${particle.scale})`,
              }}
            >
              <div className="w-8 h-8 bg-gradient-radial from-orange-400 via-red-500 to-transparent rounded-full animate-ping"></div>
            </div>
          );
        }

        if (particle.type === 'trail') {
          return (
            <div
              key={particle.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                opacity: particle.opacity,
              }}
            >
              <div className="w-2 h-2 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full"></div>
            </div>
          );
        }

        return null;
      })}
    </>
  );
};
