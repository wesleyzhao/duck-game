import { create } from 'zustand'
import type { Entity } from '../types/entities'
import { SoundEffects } from '../services/soundEffects'

// Level configuration - easy to modify per level
export const LEVEL_CONFIG = {
  1: {
    treesRequired: 3,
    grassColor: '#4ade80',
    treeColor: '#228B22',
    skyColor: 'lightblue',
    duckSize: 1.0,
    duckAccessory: null as null | 'beret' | 'cape',
    turtleCount: 2,
  },
  2: {
    treesRequired: 5,
    grassColor: '#86efac',
    treeColor: '#2d5a27',
    skyColor: '#87CEEB',
    duckSize: 1.15,
    duckAccessory: 'beret' as const,
    turtleCount: 3,
  },
  3: {
    treesRequired: 7,
    grassColor: '#a7f3d0',
    treeColor: '#1a472a',
    skyColor: '#B0E0E6',
    duckSize: 1.3,
    duckAccessory: 'cape' as const,
    turtleCount: 5,
  },
} as const

export type LevelNumber = keyof typeof LEVEL_CONFIG

interface PlayerState {
  x: number
  y: number
  z: number
  rotation: number
  lives: number
  maxLives: number
  isInvincible: boolean
  points: number
  color: string
  size: number
}

interface TreeCollider {
  x: number
  z: number
  radius: number
}

interface WorldState {
  skyColor: string
  terrainColor: string
  treeColor: string
}

interface GameStore {
  player: PlayerState
  world: WorldState
  treeColliders: TreeCollider[]
  entities: Entity[]
  cheatsEnabled: boolean
  currentLevel: LevelNumber
  isLevelingUp: boolean
  isGameOver: boolean

  // Timer state
  gameStartTime: number | null
  isGameTimerRunning: boolean
  bestTime: number | null

  // Turtle position tracking (for collision detection)
  turtlePositions: Record<string, { x: number; z: number }>

  // Actions
  movePlayer: (dx: number, dy: number, dz: number) => void
  teleportPlayer: (x: number, y: number, z: number) => void
  loseLife: () => boolean  // Returns true if game over
  modifyPoints: (amount: number, requireCheats?: boolean) => void
  enableCheats: (code: string) => boolean
  setSkyColor: (color: string) => void
  setTerrainColor: (color: string) => void
  setTreeColor: (color: string) => void
  setPlayerAppearance: (updates: { color?: string; size?: number }) => void
  addEntity: (entity: Entity) => void
  removeEntity: (id: string) => void
  updateEntity: (id: string, updates: Partial<Entity>) => void
  clearEntities: () => void

  // Level actions
  getCurrentLevelConfig: () => typeof LEVEL_CONFIG[LevelNumber]
  startLevelTransition: () => void  // Trigger transition animation immediately
  advanceLevel: () => boolean
  initializeLevel: (level: LevelNumber) => void
  resetGame: () => void

  // Timer actions
  startGameTimer: () => void
  stopGameTimer: () => void
  getElapsedTime: () => number

  // Turtle actions
  updateTurtlePosition: (id: string, x: number, z: number) => void
}

// Constants for tree generation
const TOTAL_TREES = 25  // Many trees for scenery
const TREE_RADIUS = 0.8
const MAP_SIZE = 22  // Keep trees within bounds
const MIN_TREE_DISTANCE = 3  // Minimum distance between trees
const LAKE_EXCLUSION_RADIUS = 6  // Keep trees away from lake
const SPAWN_EXCLUSION_RADIUS = 4  // Keep trees away from spawn point

// Lake position (constant)
const LAKE_POSITION = { x: -8, z: 2 }

// Generate random tree positions avoiding collisions
function generateRandomTreePositions(count: number): Array<{ x: number; z: number }> {
  const positions: Array<{ x: number; z: number }> = []
  let attempts = 0
  const maxAttempts = count * 50  // Prevent infinite loops

  while (positions.length < count && attempts < maxAttempts) {
    attempts++
    const x = (Math.random() - 0.5) * 2 * MAP_SIZE
    const z = (Math.random() - 0.5) * 2 * MAP_SIZE

    // Check distance from spawn
    const distFromSpawn = Math.sqrt(x * x + z * z)
    if (distFromSpawn < SPAWN_EXCLUSION_RADIUS) continue

    // Check distance from lake
    const distFromLake = Math.sqrt(
      (x - LAKE_POSITION.x) ** 2 + (z - LAKE_POSITION.z) ** 2
    )
    if (distFromLake < LAKE_EXCLUSION_RADIUS) continue

    // Check distance from other trees
    let tooClose = false
    for (const pos of positions) {
      const dist = Math.sqrt((x - pos.x) ** 2 + (z - pos.z) ** 2)
      if (dist < MIN_TREE_DISTANCE) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue

    positions.push({ x, z })
  }

  return positions
}

// Generate tree entities for a level
function generateTreesForLevel(
  level: LevelNumber,
  treeColor: string
): { trees: Entity[]; colliders: TreeCollider[] } {
  const config = LEVEL_CONFIG[level]
  const positions = generateRandomTreePositions(TOTAL_TREES)

  // Shuffle positions so math trees are random
  const shuffled = [...positions].sort(() => Math.random() - 0.5)

  const trees: Entity[] = shuffled.map((pos, i) => ({
    id: `tree_${level}_${i + 1}`,
    name: `tree${i + 1}`,
    shape: 'tree' as const,
    position: { x: pos.x, y: 0, z: pos.z },
    size: { x: 1, y: 1, z: 1 },
    color: treeColor,
    solid: true,
    behaviors: [],
    isMathTree: i < config.treesRequired,  // First N trees are question trees
  }))

  const colliders: TreeCollider[] = shuffled.map((pos) => ({
    x: pos.x,
    z: pos.z,
    radius: TREE_RADIUS,
  }))

  return { trees, colliders }
}

// Initial lake entity
function createLakeEntity(): Entity {
  return {
    id: 'lake_1',
    name: 'lake',
    shape: 'lake' as const,
    position: { x: LAKE_POSITION.x, y: 0.02, z: LAKE_POSITION.z },
    size: { x: 4, y: 1, z: 2.5 },
    color: '#4AA8D8',
    solid: false,
    behaviors: [],
  }
}

// Generate turtles for a level
const TURTLE_SPAWN_EXCLUSION = 6  // Keep turtles away from spawn
function generateTurtlesForLevel(level: LevelNumber): Entity[] {
  const config = LEVEL_CONFIG[level]
  const turtles: Entity[] = []
  const bounceSpeed = 3 + level * 1.5  // Faster at higher levels (4.5, 6, 7.5)

  for (let i = 0; i < config.turtleCount; i++) {
    // Random position avoiding spawn area
    let x: number, z: number
    do {
      x = (Math.random() - 0.5) * 2 * (MAP_SIZE - 2)
      z = (Math.random() - 0.5) * 2 * (MAP_SIZE - 2)
    } while (Math.sqrt(x * x + z * z) < TURTLE_SPAWN_EXCLUSION)

    turtles.push({
      id: `turtle_${level}_${i + 1}`,
      name: `turtle${i + 1}`,
      shape: 'turtle' as const,
      position: { x, y: 0.3, z },
      size: { x: 0.6, y: 0.4, z: 0.8 },
      color: '#228B22',  // Forest green
      solid: false,  // Don't block player movement
      behaviors: [{ type: 'bounce', speed: bounceSpeed, range: 50 }],
      isTurtle: true,
    })
  }

  return turtles
}

// Generate initial entities for level 1
function generateInitialEntities(): { entities: Entity[]; colliders: TreeCollider[] } {
  const level = 1 as LevelNumber
  const config = LEVEL_CONFIG[level]
  const { trees, colliders } = generateTreesForLevel(level, config.treeColor)
  const turtles = generateTurtlesForLevel(level)
  return {
    entities: [...trees, createLakeEntity(), ...turtles],
    colliders,
  }
}

const initialData = generateInitialEntities()

const PLAYER_RADIUS = 0.5
const MAP_BOUNDARY = 24 // Slightly inside the fence at 25

// Throttle boundary sound
let lastBoundarySoundTime = 0
const BOUNDARY_SOUND_COOLDOWN = 500 // ms

export const useGameStore = create<GameStore>((set, get) => ({
  player: {
    x: 0,
    y: 0.5,
    z: 0,
    rotation: 0,
    lives: 3,
    maxLives: 3,
    isInvincible: false,
    points: 0,
    color: '#FFD700',
    size: LEVEL_CONFIG[1].duckSize,
  },
  world: {
    skyColor: LEVEL_CONFIG[1].skyColor,
    terrainColor: LEVEL_CONFIG[1].grassColor,
    treeColor: LEVEL_CONFIG[1].treeColor,
  },
  treeColliders: initialData.colliders,
  entities: initialData.entities,
  cheatsEnabled: false,
  currentLevel: 1 as LevelNumber,
  isLevelingUp: false,
  isGameOver: false,
  gameStartTime: null,
  isGameTimerRunning: false,
  bestTime: null,
  turtlePositions: {},

  loseLife: () => {
    const state = get()
    if (state.player.isInvincible) return false  // Can't lose life while invincible

    const newLives = state.player.lives - 1
    const isGameOver = newLives <= 0

    SoundEffects.hurt()

    if (isGameOver) {
      // Game over - set flag and stop timer
      set({ isGameOver: true })
      return true
    }

    // Reset player to center and make invincible
    set({
      player: {
        ...state.player,
        lives: newLives,
        x: 0,
        y: 0.5,
        z: 0,
        isInvincible: true,
      },
    })

    // Remove invincibility after 2 seconds
    setTimeout(() => {
      set((s) => ({
        player: {
          ...s.player,
          isInvincible: false,
        },
      }))
    }, 2000)

    return isGameOver
  },

  modifyPoints: (amount, requireCheats = true) => {
    const state = get()
    if (requireCheats && !state.cheatsEnabled) return
    set({
      player: {
        ...state.player,
        points: Math.max(0, state.player.points + amount),
      },
    })
    if (amount > 0) {
      SoundEffects.points()
    }
  },

  enableCheats: (code) => {
    if (code === 'quackquack') {
      set({ cheatsEnabled: true })
      SoundEffects.cheats()
      return true
    }
    return false
  },

  setSkyColor: (color) => {
    set((state) => ({
      world: { ...state.world, skyColor: color },
    }))
  },

  setTerrainColor: (color) => {
    set((state) => ({
      world: { ...state.world, terrainColor: color },
    }))
  },

  setTreeColor: (color) => {
    set((state) => ({
      world: { ...state.world, treeColor: color },
    }))
  },

  setPlayerAppearance: (updates) => {
    set((state) => ({
      player: {
        ...state.player,
        ...(updates.color !== undefined && { color: updates.color }),
        ...(updates.size !== undefined && { size: updates.size }),
      },
    }))
  },

  addEntity: (entity) => {
    set((state) => ({ entities: [...state.entities, entity] }))
  },

  removeEntity: (id) => {
    set((state) => ({ entities: state.entities.filter((e) => e.id !== id) }))
  },

  updateEntity: (id, updates) => {
    set((state) => ({
      entities: state.entities.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    }))
  },

  clearEntities: () => {
    set({ entities: [] })
  },

  movePlayer: (dx, dy, dz) => {
    const state = get()
    let newX = state.player.x + dx
    let newZ = state.player.z + dz

    // Check collision with trees
    let canMove = true
    for (const tree of state.treeColliders) {
      const distX = newX - tree.x
      const distZ = newZ - tree.z
      const distance = Math.sqrt(distX * distX + distZ * distZ)

      if (distance < tree.radius + PLAYER_RADIUS) {
        canMove = false
        break
      }
    }

    if (!canMove) return

    // Check and clamp to map boundaries
    let hitBoundary = false
    if (newX > MAP_BOUNDARY) {
      newX = MAP_BOUNDARY
      hitBoundary = true
    } else if (newX < -MAP_BOUNDARY) {
      newX = -MAP_BOUNDARY
      hitBoundary = true
    }
    if (newZ > MAP_BOUNDARY) {
      newZ = MAP_BOUNDARY
      hitBoundary = true
    } else if (newZ < -MAP_BOUNDARY) {
      newZ = -MAP_BOUNDARY
      hitBoundary = true
    }

    // Play boundary sound if we hit the edge (with cooldown)
    if (hitBoundary) {
      const now = Date.now()
      if (now - lastBoundarySoundTime > BOUNDARY_SOUND_COOLDOWN) {
        SoundEffects.boundary()
        lastBoundarySoundTime = now
      }
    }

    // Calculate rotation based on movement direction
    let newRotation = state.player.rotation
    if (dx !== 0 || dz !== 0) {
      newRotation = Math.atan2(dx, dz)
    }

    set({
      player: {
        ...state.player,
        x: newX,
        y: state.player.y + dy,
        z: newZ,
        rotation: newRotation,
      },
    })
  },

  teleportPlayer: (x, y, z) => {
    const state = get()
    set({
      player: {
        ...state.player,
        x,
        y,
        z,
      },
    })
  },

  // Level management
  getCurrentLevelConfig: () => {
    const { currentLevel } = get()
    return LEVEL_CONFIG[currentLevel]
  },

  startLevelTransition: () => {
    set({ isLevelingUp: true })
  },

  advanceLevel: () => {
    const { currentLevel } = get()

    // Check if we can advance
    if (currentLevel >= 3) {
      // Already at max level - game complete!
      return false
    }

    const nextLevel = (currentLevel + 1) as LevelNumber
    const config = LEVEL_CONFIG[nextLevel]

    // Generate new trees and turtles for the next level
    const { trees, colliders } = generateTreesForLevel(nextLevel, config.treeColor)
    const turtles = generateTurtlesForLevel(nextLevel)

    set({
      currentLevel: nextLevel,
      // Note: isLevelingUp is already true from startLevelTransition()
      treeColliders: colliders,
      entities: [...trees, createLakeEntity(), ...turtles],
      turtlePositions: {},  // Reset turtle positions
      world: {
        skyColor: config.skyColor,
        terrainColor: config.grassColor,
        treeColor: config.treeColor,
      },
      player: {
        ...get().player,
        size: config.duckSize,
        // Teleport duck back to spawn
        x: 0,
        y: 0.5,
        z: 0,
      },
    })

    // Reset leveling up flag after animation
    setTimeout(() => {
      set({ isLevelingUp: false })
    }, 2000)

    return true
  },

  initializeLevel: (level) => {
    const config = LEVEL_CONFIG[level]
    const { trees, colliders } = generateTreesForLevel(level, config.treeColor)
    const turtles = generateTurtlesForLevel(level)

    set({
      currentLevel: level,
      treeColliders: colliders,
      entities: [...trees, createLakeEntity(), ...turtles],
      turtlePositions: {},
      world: {
        skyColor: config.skyColor,
        terrainColor: config.grassColor,
        treeColor: config.treeColor,
      },
      player: {
        ...get().player,
        size: config.duckSize,
        x: 0,
        y: 0.5,
        z: 0,
      },
    })
  },

  resetGame: () => {
    const config = LEVEL_CONFIG[1]
    const { trees, colliders } = generateTreesForLevel(1, config.treeColor)
    const turtles = generateTurtlesForLevel(1)

    set({
      currentLevel: 1,
      isLevelingUp: false,
      treeColliders: colliders,
      entities: [...trees, createLakeEntity(), ...turtles],
      turtlePositions: {},
      world: {
        skyColor: config.skyColor,
        terrainColor: config.grassColor,
        treeColor: config.treeColor,
      },
      player: {
        x: 0,
        y: 0.5,
        z: 0,
        rotation: 0,
        lives: 3,
        maxLives: 3,
        isInvincible: false,
        points: 0,
        color: '#FFD700',
        size: config.duckSize,
      },
      cheatsEnabled: false,
      isGameOver: false,
      // Reset timer (but keep bestTime!)
      gameStartTime: null,
      isGameTimerRunning: false,
    })
  },

  // Timer actions
  startGameTimer: () => {
    const { isGameTimerRunning } = get()
    if (!isGameTimerRunning) {
      set({
        gameStartTime: Date.now(),
        isGameTimerRunning: true,
      })
    }
  },

  stopGameTimer: () => {
    const { gameStartTime, bestTime, isGameTimerRunning } = get()
    if (!isGameTimerRunning || !gameStartTime) return

    const elapsed = (Date.now() - gameStartTime) / 1000

    // Update best time if this is better (or first completion)
    const newBestTime = bestTime === null ? elapsed : Math.min(bestTime, elapsed)

    set({
      isGameTimerRunning: false,
      bestTime: newBestTime,
    })
  },

  getElapsedTime: () => {
    const { gameStartTime, isGameTimerRunning } = get()
    if (!gameStartTime) return 0
    if (!isGameTimerRunning) {
      // Timer stopped - return final time
      return (Date.now() - gameStartTime) / 1000
    }
    return (Date.now() - gameStartTime) / 1000
  },

  // Turtle actions
  updateTurtlePosition: (id, x, z) => {
    set((state) => ({
      turtlePositions: {
        ...state.turtlePositions,
        [id]: { x, z },
      },
    }))
  },
}))
