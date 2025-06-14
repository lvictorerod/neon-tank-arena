
import { useEffect, useRef } from 'react';

interface GameControlsProps {
  onShoot: () => void;
  keysPressed: React.MutableRefObject<Set<string>>;
  onMouseMove?: (mouseX: number, mouseY: number) => void;
  gameContainerRef?: React.RefObject<HTMLDivElement>;
}

export const GameControls: React.FC<GameControlsProps> = ({ 
  onShoot, 
  keysPressed, 
  onMouseMove,
  gameContainerRef 
}) => {
  const mousePosition = useRef({ x: 0, y: 0 });

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

    const handleMouseMove = (e: MouseEvent) => {
      if (!gameContainerRef?.current || !onMouseMove) return;

      const rect = gameContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      mousePosition.current = { x: mouseX, y: mouseY };
      onMouseMove(mouseX, mouseY);
    };

    const handleMouseClick = (e: MouseEvent) => {
      if (e.button === 0) { // Left click
        onShoot();
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    if (gameContainerRef?.current) {
      gameContainerRef.current.addEventListener('mousemove', handleMouseMove);
      gameContainerRef.current.addEventListener('click', handleMouseClick);
    }

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (gameContainerRef?.current) {
        gameContainerRef.current.removeEventListener('mousemove', handleMouseMove);
        gameContainerRef.current.removeEventListener('click', handleMouseClick);
      }
    };
  }, [onShoot, keysPressed, onMouseMove, gameContainerRef]);

  return null;
};
