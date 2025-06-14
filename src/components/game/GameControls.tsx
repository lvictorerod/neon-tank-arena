
import { useEffect } from 'react';

interface GameControlsProps {
  onShoot: () => void;
  keysPressed: React.MutableRefObject<Set<string>>;
}

export const GameControls: React.FC<GameControlsProps> = ({ onShoot, keysPressed }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't prevent default for escape key to allow pause functionality
      if (e.key !== 'Escape') {
        e.preventDefault();
      }
      
      // Add the exact key value to support both cases
      keysPressed.current.add(e.key);
      
      if (e.key === ' ' || e.key === 'Space') {
        onShoot();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Remove the exact key value
      keysPressed.current.delete(e.key);
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onShoot, keysPressed]);

  return null;
};
