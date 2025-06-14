// Centralized Event System for Game Actions
export type GameEventType = 
  | 'tank_hit'
  | 'tank_destroyed'
  | 'projectile_fired'
  | 'powerup_collected'
  | 'game_over'
  | 'score_changed'
  | 'explosion'
  | 'screen_shake';

export interface GameEvent {
  type: GameEventType;
  data: any;
  timestamp: number;
  id: string;
}

export interface EventListener {
  id: string;
  callback: (event: GameEvent) => void;
  once?: boolean;
}

class GameEventSystem {
  private listeners: Map<GameEventType, EventListener[]> = new Map();
  private eventQueue: GameEvent[] = [];
  private isProcessing = false;

  subscribe(eventType: GameEventType, callback: (event: GameEvent) => void, once = false): string {
    const id = `listener_${Date.now()}_${Math.random()}`;
    const listener: EventListener = { id, callback, once };
    
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType)!.push(listener);
    return id;
  }

  unsubscribe(eventType: GameEventType, listenerId: string): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(eventType: GameEventType, data: any): void {
    const event: GameEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
      id: `event_${Date.now()}_${Math.random()}`
    };

    this.eventQueue.push(event);
    
    if (!this.isProcessing) {
      this.processEvents();
    }
  }

  private processEvents(): void {
    this.isProcessing = true;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      const listeners = this.listeners.get(event.type);
      
      if (listeners) {
        const listenersToRemove: string[] = [];
        
        listeners.forEach(listener => {
          try {
            listener.callback(event);
            if (listener.once) {
              listenersToRemove.push(listener.id);
            }
          } catch (error) {
            console.error(`Error in event listener for ${event.type}:`, error);
          }
        });
        
        // Remove one-time listeners
        listenersToRemove.forEach(id => {
          this.unsubscribe(event.type, id);
        });
      }
    }
    
    this.isProcessing = false;
  }

  clear(): void {
    this.listeners.clear();
    this.eventQueue.length = 0;
  }

  getListenerCount(eventType: GameEventType): number {
    return this.listeners.get(eventType)?.length || 0;
  }
}

export const gameEvents = new GameEventSystem();

// React hook for using the event system
import { useEffect, useRef } from 'react';

export const useGameEvent = (
  eventType: GameEventType,
  callback: (event: GameEvent) => void,
  deps: any[] = []
) => {
  const listenerIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Unsubscribe previous listener
    if (listenerIdRef.current) {
      gameEvents.unsubscribe(eventType, listenerIdRef.current);
    }

    // Subscribe new listener
    listenerIdRef.current = gameEvents.subscribe(eventType, callback);

    return () => {
      if (listenerIdRef.current) {
        gameEvents.unsubscribe(eventType, listenerIdRef.current);
      }
    };
  }, [eventType, ...deps]);
};

// Event helper functions
export const emitTankHit = (tankId: string, damage: number, position: { x: number; y: number }) => {
  gameEvents.emit('tank_hit', { tankId, damage, position });
};

export const emitExplosion = (x: number, y: number, intensity: number) => {
  gameEvents.emit('explosion', { x, y, intensity });
};

export const emitScreenShake = (intensity: number, duration: number) => {
  gameEvents.emit('screen_shake', { intensity, duration });
};

export const emitScoreChange = (playerId: string, newScore: number, change: number) => {
  gameEvents.emit('score_changed', { playerId, newScore, change });
};