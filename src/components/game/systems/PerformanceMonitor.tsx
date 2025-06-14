
import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderTime: number;
  updateTime: number;
  objectCount: number;
}

interface PerformanceMonitorProps {
  isVisible?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible = false,
  onMetricsUpdate
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    renderTime: 0,
    updateTime: 0,
    objectCount: 0
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  const animationFrame = useRef<number>();

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const now = performance.now();
      const deltaTime = now - lastTime.current;
      
      frameCount.current++;
      
      // Calculate FPS
      fpsHistory.current.push(1000 / deltaTime);
      if (fpsHistory.current.length > 60) {
        fpsHistory.current.shift();
      }
      
      const averageFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
      
      // Get memory usage if available
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0;
      
      const newMetrics: PerformanceMetrics = {
        fps: Math.round(averageFps),
        frameTime: Math.round(deltaTime * 100) / 100,
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        renderTime: Math.round(deltaTime * 0.6 * 100) / 100, // Estimated
        updateTime: Math.round(deltaTime * 0.4 * 100) / 100, // Estimated
        objectCount: 0 // This would be passed from game state
      };
      
      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
      
      lastTime.current = now;
      animationFrame.current = requestAnimationFrame(updateMetrics);
    };

    animationFrame.current = requestAnimationFrame(updateMetrics);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [isVisible, onMetricsUpdate]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="grid grid-cols-2 gap-2">
        <div>FPS: {metrics.fps}</div>
        <div>Frame: {metrics.frameTime}ms</div>
        <div>Memory: {metrics.memoryUsage}MB</div>
        <div>Render: {metrics.renderTime}ms</div>
        <div>Update: {metrics.updateTime}ms</div>
        <div>Objects: {metrics.objectCount}</div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
