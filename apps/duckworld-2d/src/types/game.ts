// Position in 2D space
export interface Position {
  x: number
  y: number
}

// Entity shape types - built-in shapes plus custom shape names
export type EntityShape = 'circle' | 'rectangle' | 'ellipse' | 'tree' | 'lake' | string

// Behavior types for animations
export type BehaviorType = 'bounce' | 'spin' | 'pulse' | 'float'

export interface BehaviorConfig {
  type: BehaviorType
  speed?: number
  range?: number
}

// Question types for different tree puzzles
export type QuestionType = 'math' | 'spelling' | 'pronunciation'

// Game entities (trees, lake, objects created by LLM)
export interface EntityConfig {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  shape: EntityShape
  color?: string  // Optional - trees fall back to level color if not set
  solid: boolean
  behaviors: BehaviorConfig[]
  // Question tree properties
  questionType?: QuestionType       // Type of question (default: 'math')
  hasMathSymbol?: boolean           // Legacy: has any question symbol
  mathSolved?: boolean              // Legacy: question has been solved
  // Enemy properties
  isEnemy?: boolean                 // Is this entity an enemy that hurts the player
}

// Shape primitives for custom shapes
export type ShapePrimitive =
  | { type: 'circle'; x: number; y: number; radius: number; color: string }
  | { type: 'ellipse'; x: number; y: number; rx: number; ry: number; color: string }
  | { type: 'rect'; x: number; y: number; width: number; height: number; color: string }
  | { type: 'triangle'; x: number; y: number; width: number; height: number; color: string }

// Player appearance - shape can be built-in name or custom name
export type PlayerShape = string

export interface PlayerAppearance {
  shape: PlayerShape
  color: string
  size: number
}

// Player state
export interface PlayerState {
  x: number
  y: number
  health: number
  maxHealth: number
  lives: number
  maxLives: number
  invincibleUntil: number  // Timestamp for invincibility after taking damage
  points: number
  appearance: PlayerAppearance
  // Jump state
  isJumping: boolean
  jumpVelocity: number
  groundY: number  // Y position before jumping (to return to)
  // Movement direction
  facingX: number  // -1 left, 0 none, 1 right
  facingY: number  // -1 up, 0 none, 1 down
}

// World state
export interface WorldState {
  width: number
  height: number
  terrainColor: string
  skyColor: string
}

// Full game state
export interface GameState {
  player: PlayerState
  world: WorldState
  entities: EntityConfig[]
}

// Change tracking for undo/redo
export interface Change {
  type: string
  forward: () => void
  reverse: () => void
}

// Chat messages
export type ChatRole = 'user' | 'game'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: number
}
