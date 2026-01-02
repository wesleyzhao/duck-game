import { EntityConfig, PlayerAppearance, BehaviorConfig, ShapePrimitive } from '../types/game'

// Entity creation options (subset of EntityConfig, id is auto-generated)
export interface CreateEntityOptions {
  name: string
  x: number
  y: number
  width: number
  height: number
  shape: EntityConfig['shape']
  color: string
  solid?: boolean
}

// Player info returned by getPlayer
export interface PlayerInfo {
  x: number
  y: number
  health: number
  maxHealth: number
  points: number
  appearance: PlayerAppearance
}

// World info returned by getWorldInfo
export interface WorldInfo {
  width: number
  height: number
  terrainColor: string
  skyColor: string
}

// The API available to LLM-generated code
export interface GameSandboxAPI {
  // Entity methods
  createEntity(options: CreateEntityOptions): EntityConfig
  getEntity(id: string): EntityConfig | undefined
  getLastEntity(): EntityConfig | undefined
  getCreated(name: string): EntityConfig | undefined
  getCreatedEntities(): EntityConfig[]
  findByName(name: string): EntityConfig | undefined
  findAllByName(name: string): EntityConfig[]
  updateEntity(id: string, updates: Partial<EntityConfig>): boolean
  deleteEntity(id: string): boolean
  getAllEntities(): EntityConfig[]
  findEntities(predicate: (entity: EntityConfig) => boolean): EntityConfig[]

  // Convenience methods
  makeBouncy(name: string): boolean
  makeFloat(name: string): boolean

  // Player methods
  getPlayer(): PlayerInfo
  movePlayer(dx: number, dy: number): void
  teleportPlayer(x: number, y: number): void
  setPlayerAppearance(appearance: Partial<PlayerAppearance>): void
  modifyHealth(amount: number): void
  modifyPoints(amount: number): void
  enableCheats(code: string): boolean

  // World methods
  getWorldInfo(): WorldInfo
  setTerrainColor(color: string): void
  setSkyColor(color: string): void

  // Behavior methods
  addBehavior(entityId: string, behavior: BehaviorConfig): boolean
  updateBehavior(entityId: string, behaviorType: string, updates: Partial<BehaviorConfig>): boolean
  removeBehavior(entityId: string, behaviorType: string): boolean

  // Speed/enemy convenience methods
  setSpeed(name: string, speed: number): boolean
  slowEnemies(speed?: number): number
  speedUpEnemies(speed?: number): number

  // Custom shape methods
  defineShape(name: string, parts: ShapePrimitive[]): void

  // Communication
  say(message: string): void
  log(...args: unknown[]): void

  // Utilities
  random(min: number, max: number): number
  distance(x1: number, y1: number, x2: number, y2: number): number
}

// Change record for undo/redo
export interface Change {
  type: string
  description: string
  forward: () => void
  reverse: () => void
}

// Result of executing sandboxed code
export interface SandboxExecutionResult {
  success: boolean
  message?: string
  error?: string
  changes: Change[]
  rollback: () => void
}
