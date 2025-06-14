
import { useEffect, useState } from 'react';

interface ScreenShakeProps {
  intensity: number;
  duration: number;
  onComplete: () => void;
}

export const useScreenShake = () => {
  const [shake, setShake] = useState({ x: 0, y: 0, active: false });

  const triggerShake = (intensity: number = 5, duration: number = 300) => {
    setShake({ x: 0, y: 0, active: true });
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        setShake({ x: 0, y: 0, active: false });
        return;
      }
      
      const currentIntensity = intensity * (1 - progress);
      setShake({
        x: (Math.random() - 0.5) * currentIntensity,
        y: (Math.random() - 0.5) * currentIntensity,
        active: true,
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
  };

  return { shake, triggerShake };
};
