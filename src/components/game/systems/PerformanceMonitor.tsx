import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  entityCount: number;
  particleCount: number;
  renderTime: number;
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private frameTimeHistory: number[] = [];
  private maxHistoryLength = 60;
  
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    entityCount: 0,
    particleCount: 0,
    renderTime: 0,
  };

  update(entityCount: number, particleCount: number): PerformanceMetrics {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    this.frameTimeHistory.push(deltaTime);
    if (this.frameTimeHistory.length > this.maxHistoryLength) {
      this.frameTimeHistory.shift();
    }
    
    this.frameCount++;
    
    // Update metrics every second
    if (this.frameCount % 60 === 0) {
      const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      
      this.metrics = {
        fps: Math.round(1000 / avgFrameTime),
        frameTime: Math.round(avgFrameTime * 100) / 100,
        memoryUsage: this.getMemoryUsage(),
        entityCount,
        particleCount,
        renderTime: 0, // Will be set by renderer
      };
    }
    
    this.lastTime = currentTime;
    return this.metrics;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
    }
    return 0;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.frameCount = 0;
    this.frameTimeHistory = [];
    this.lastTime = performance.now();
  }
}

export const usePerformanceMonitor = () => {
  const monitorRef = useRef(new PerformanceMonitor());
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    entityCount: 0,
    particleCount: 0,
    renderTime: 0,
  });

  const updateMetrics = (entityCount: number, particleCount: number) => {
    const newMetrics = monitorRef.current.update(entityCount, particleCount);
    setMetrics(newMetrics);
  };

  return { metrics, updateMetrics, monitor: monitorRef.current };
};

// Performance HUD Component
export const PerformanceHUD: React.FC<{ metrics: PerformanceMetrics; visible?: boolean }> = ({ 
  metrics, 
  visible = false 
}) => {
  if (!visible) return null;

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg font-mono text-xs z-50">
      <div className="space-y-1">
        <div className={`flex justify-between ${getFPSColor(metrics.fps)}`}>
          <span>FPS:</span>
          <span>{metrics.fps}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Frame Time:</span>
          <span>{metrics.frameTime}ms</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Memory:</span>
          <span>{metrics.memoryUsage}MB</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Entities:</span>
          <span>{metrics.entityCount}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Particles:</span>
          <span>{metrics.particleCount}</span>
        </div>
      </div>
    </div>
  );
};

// Performance optimization utilities
export const optimizationUtils = {
  // Throttle function calls
  throttle: <T extends (...args: any[]) => any>(func: T, delay: number): T => {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;
    
    return ((...args: any[]) => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    }) as T;
  },

  // Debounce function calls
  debounce: <T extends (...args: any[]) => any>(func: T, delay: number): T => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return ((...args: any[]) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  },

  // Check if object is in viewport
  isInViewport: (x: number, y: number, size: number, viewX: number, viewY: number, viewWidth: number, viewHeight: number): boolean => {
    return x + size >= viewX && 
           x - size <= viewX + viewWidth && 
           y + size >= viewY && 
           y - size <= viewY + viewHeight;
  },

  // Distance-based level of detail
  getLODLevel: (distance: number): 'high' | 'medium' | 'low' => {
    if (distance < 200) return 'high';
    if (distance < 400) return 'medium';
    return 'low';
  },
};
}