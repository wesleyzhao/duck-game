import { Difficulty } from '../services/mathService'

export type Accessory = 'none' | 'beret' | 'cape'

export interface LevelConfig {
  level: 1 | 2 | 3
  name: string
  terrainColor: string    // Grass color
  treeColor: string       // Tree foliage color
  duckSize: number        // Duck scale multiplier
  accessory: Accessory    // Duck accessory
  difficulty: Difficulty  // Math difficulty
  treesRequired: number   // Trees to solve to complete level
  turtleCount: number     // Number of enemy turtles
  turtleSpeed: number     // Base speed for turtles
}

export const LEVEL_CONFIGS: Record<1 | 2 | 3, LevelConfig> = {
  1: {
    level: 1,
    name: 'Meadow',
    terrainColor: '#90EE90',  // Light green
    treeColor: '#228B22',     // Forest green
    duckSize: 1.3,
    accessory: 'none',
    difficulty: 'easy',
    treesRequired: 3,
    turtleCount: 3,
    turtleSpeed: 1.8,
  },
  2: {
    level: 2,
    name: 'Forest',
    terrainColor: '#7CCD7C',  // Medium green
    treeColor: '#2E8B2E',     // Darker green
    duckSize: 1.4,
    accessory: 'beret',
    difficulty: 'medium',
    treesRequired: 4,
    turtleCount: 4,
    turtleSpeed: 2.2,
  },
  3: {
    level: 3,
    name: 'Deep Woods',
    terrainColor: '#6B8E6B',  // Sage green
    treeColor: '#355E35',     // Deep green
    duckSize: 1.5,
    accessory: 'cape',
    difficulty: 'hard',
    treesRequired: 5,
    turtleCount: 6,
    turtleSpeed: 2.6,
  },
}

// Get config for a level, with fallback to level 1
export function getLevelConfig(level: number): LevelConfig {
  if (level === 1 || level === 2 || level === 3) {
    return LEVEL_CONFIGS[level]
  }
  return LEVEL_CONFIGS[1]
}
