import { TankData } from '../GameArena';
import { obstacles } from '../CollisionDetection';

// Enhanced AI with behavior trees and pathfinding
export interface AIBehaviorNode {
  type: 'selector' | 'sequence' | 'action' | 'condition';
  children?: AIBehaviorNode[];
  action?: (context: AIContext) => AIResult;
  condition?: (context: AIContext) => boolean;
}

export interface AIContext {
  tank: TankData;
  allTanks: TankData[];
  deltaTime: number;
  playerTank?: TankData;
  obstacles: typeof obstacles;
  lastDecision: AIDecision;
}

export interface AIResult {
  success: boolean;
  running?: boolean;
}

export interface AIDecision {
  velocityX: number;
  velocityY: number;
  rotation: number;
  shouldShoot: boolean;
  targetPosition?: { x: number; y: number };
  behavior: 'aggressive' | 'defensive' | 'flanking' | 'retreating' | 'patrolling';
}

// AI Difficulty levels
export const AI_DIFFICULTIES = {
  easy: {
    reactionTime: 0.8,
    accuracy: 0.6,
    aggressiveness: 0.4,
    pathfindingAccuracy: 0.7,
    maxEngagementRange: 200,
  },
  medium: {
    reactionTime: 0.5,
    accuracy: 0.75,
    aggressiveness: 0.6,
    pathfindingAccuracy: 0.85,
    maxEngagementRange: 250,
  },
  hard: {
    reactionTime: 0.2,
    accuracy: 0.9,
    aggressiveness: 0.8,
    pathfindingAccuracy: 0.95,
    maxEngagementRange: 300,
  },
  expert: {
    reactionTime: 0.1,
    accuracy: 0.95,
    aggressiveness: 0.9,
    pathfindingAccuracy: 1.0,
    maxEngagementRange: 350,
  }
};

// Simple A* pathfinding implementation
class AStarPathfinder {
  private gridSize = 20;
  private grid: boolean[][] = [];
  private width: number;
  private height: number;

  constructor(arenaWidth: number, arenaHeight: number) {
    this.width = Math.ceil(arenaWidth / this.gridSize);
    this.height = Math.ceil(arenaHeight / this.gridSize);
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(false));
    
    // Mark obstacles
    obstacles.forEach(obstacle => {
      const startX = Math.floor(obstacle.x / this.gridSize);
      const startY = Math.floor(obstacle.y / this.gridSize);
      const endX = Math.ceil((obstacle.x + obstacle.width) / this.gridSize);
      const endY = Math.ceil((obstacle.y + obstacle.height) / this.gridSize);
      
      for (let y = startY; y < endY && y < this.height; y++) {
        for (let x = startX; x < endX && x < this.width; x++) {
          if (x >= 0 && y >= 0) {
            this.grid[y][x] = true;
          }
        }
      }
    });
  }

  findPath(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const startGrid = {
      x: Math.floor(start.x / this.gridSize),
      y: Math.floor(start.y / this.gridSize)
    };
    const endGrid = {
      x: Math.floor(end.x / this.gridSize),
      y: Math.floor(end.y / this.gridSize)
    };

    // Simple pathfinding - return direct path if no obstacles in between
    const path = this.getDirectPath(startGrid, endGrid);
    if (path.length > 0) {
      return path.map(p => ({ x: p.x * this.gridSize, y: p.y * this.gridSize }));
    }

    // Fallback to simple avoidance
    return [end];
  }

  private getDirectPath(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const sx = start.x < end.x ? 1 : -1;
    const sy = start.y < end.y ? 1 : -1;
    let err = dx - dy;
    let x = start.x;
    let y = start.y;

    while (true) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height && this.grid[y][x]) {
        return []; // Path blocked
      }

      path.push({ x, y });

      if (x === end.x && y === end.y) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return path;
  }
}

const pathfinder = new AStarPathfinder(800, 600);

// Behavior tree nodes
const createAggressiveBehavior = (): AIBehaviorNode => ({
  type: 'sequence',
  children: [
    {
      type: 'condition',
      condition: (context) => !!context.playerTank && !context.playerTank.isRespawning
    },
    {
      type: 'action',
      action: (context) => {
        const player = context.playerTank!;
        const tank = context.tank;
        const dx = player.x - tank.x;
        const dy = player.y - tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 100) {
          // Move towards player
          const moveX = (dx / distance) * 0.8;
          const moveY = (dy / distance) * 0.8;
          
          context.lastDecision.velocityX = moveX * 150;
          context.lastDecision.velocityY = moveY * 150;
          context.lastDecision.behavior = 'aggressive';
        } else {
          // Strafe around player
          const strafeAngle = Math.atan2(dy, dx) + Math.PI * 0.5;
          context.lastDecision.velocityX = Math.cos(strafeAngle) * 100;
          context.lastDecision.velocityY = Math.sin(strafeAngle) * 100;
        }

        // Aim at player
        const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
        context.lastDecision.rotation = targetAngle;
        context.lastDecision.shouldShoot = distance < 250 && Math.random() < 0.1;

        return { success: true };
      }
    }
  ]
});

const createDefensiveBehavior = (): AIBehaviorNode => ({
  type: 'sequence',
  children: [
    {
      type: 'condition',
      condition: (context) => context.tank.health < 50
    },
    {
      type: 'action',
      action: (context) => {
        const player = context.playerTank;
        if (!player) return { success: false };

        const tank = context.tank;
        const dx = player.x - tank.x;
        const dy = player.y - tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          // Retreat
          const retreatX = -dx / distance * 0.9;
          const retreatY = -dy / distance * 0.9;
          
          context.lastDecision.velocityX = retreatX * 120;
          context.lastDecision.velocityY = retreatY * 120;
          context.lastDecision.behavior = 'retreating';
        }

        return { success: true };
      }
    }
  ]
});

const createFlankingBehavior = (): AIBehaviorNode => ({
  type: 'action',
  action: (context) => {
    const player = context.playerTank;
    if (!player) return { success: false };

    const tank = context.tank;
    const dx = player.x - tank.x;
    const dy = player.y - tank.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Try to flank from the side
    const flankAngle = Math.atan2(dy, dx) + (Math.random() > 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5);
    const flankX = Math.cos(flankAngle) * 0.7;
    const flankY = Math.sin(flankAngle) * 0.7;

    context.lastDecision.velocityX = flankX * 130;
    context.lastDecision.velocityY = flankY * 130;
    context.lastDecision.behavior = 'flanking';

    // Aim at player
    const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    context.lastDecision.rotation = targetAngle;
    context.lastDecision.shouldShoot = distance < 200 && Math.random() < 0.08;

    return { success: true };
  }
});

// Main AI behavior tree
const createAIBehaviorTree = (): AIBehaviorNode => ({
  type: 'selector',
  children: [
    createDefensiveBehavior(),
    createAggressiveBehavior(),
    createFlankingBehavior(),
  ]
});

// Execute behavior tree
function executeBehaviorTree(node: AIBehaviorNode, context: AIContext): AIResult {
  switch (node.type) {
    case 'selector':
      for (const child of node.children || []) {
        const result = executeBehaviorTree(child, context);
        if (result.success) {
          return result;
        }
      }
      return { success: false };

    case 'sequence':
      for (const child of node.children || []) {
        const result = executeBehaviorTree(child, context);
        if (!result.success) {
          return result;
        }
      }
      return { success: true };

    case 'condition':
      return { success: node.condition ? node.condition(context) : false };

    case 'action':
      return node.action ? node.action(context) : { success: false };

    default:
      return { success: false };
  }
}

export const updateEnhancedAIBehavior = (
  tank: TankData,
  allTanks: TankData[],
  deltaTime: number,
  onShoot: (tankId: string) => void,
  difficulty: keyof typeof AI_DIFFICULTIES = 'medium'
): AIDecision => {
  const player = allTanks.find(t => t.isPlayer && !t.isRespawning);
  const difficultyConfig = AI_DIFFICULTIES[difficulty];
  
  const context: AIContext = {
    tank,
    allTanks,
    deltaTime,
    playerTank: player,
    obstacles,
    lastDecision: {
      velocityX: 0,
      velocityY: 0,
      rotation: tank.rotation,
      shouldShoot: false,
      behavior: 'patrolling'
    }
  };

  // Execute behavior tree
  const behaviorTree = createAIBehaviorTree();
  executeBehaviorTree(behaviorTree, context);

  // Apply difficulty modifiers
  if (context.lastDecision.shouldShoot && Math.random() < difficultyConfig.accuracy) {
    setTimeout(() => onShoot(tank.id), difficultyConfig.reactionTime * 1000);
  }

  // Add some randomness to movement
  context.lastDecision.velocityX += (Math.random() - 0.5) * 20;
  context.lastDecision.velocityY += (Math.random() - 0.5) * 20;

  return context.lastDecision;
};