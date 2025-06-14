
import { useEffect, useRef } from 'react';

interface GameControlsProps {
  onShoot: () => void;
  keysPressed: React.MutableRefObject<Set<string>>;
}

export const GameControls: React.FC<GameControlsProps> = ({ onShoot, keysPressed }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      keysPressed.current.add(e.key.toLowerCase());
      
      if (e.key === ' ') {
        onShoot();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onShoot, keysPressed]);

  return null;
};
