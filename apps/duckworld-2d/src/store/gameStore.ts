import { create } from 'zustand'
import {
  PlayerState,
  WorldState,
  EntityConfig,
  PlayerAppearance,
  BehaviorConfig,
  ShapePrimitive,
} from '../types/game'

interface GameStore {
  // State
  player: PlayerState
  world: WorldState
  entities: EntityConfig[]
  customShapes: Map<string, ShapePrimitive[]>

  // Player actions
  movePlayer: (dx: number, dy: number) => void
  teleportPlayer: (x: number, y: number) => void
  setPlayerAppearance: (appearance: Partial<PlayerAppearance>) => void
  modifyHealth: (amount: number) => void
  modifyPoints: (amount: number) => void
  loseLife: () => number              // Returns remaining lives
  resetLives: () => void
  setInvincible: (durationMs: number) => void
  isInvincible: () => boolean
  // Jump actions
  startJump: () => void
  updateJump: (deltaTime: number) => void
  isPlayerAirborne: () => boolean

  // Entity actions
  addEntity: (entity: EntityConfig) => void
  updateEntity: (id: string, updates: Partial<EntityConfig>) => void
  removeEntity: (id: string) => void
  getEntity: (id: string) => EntityConfig | undefined
  getAllEntities: () => EntityConfig[]

  // World actions
  setTerrainColor: (color: string) => void
  setSkyColor: (color: string) => void

  // Behavior actions
  addBehavior: (entityId: string, behavior: BehaviorConfig) => void
  updateBehavior: (entityId: string, behaviorType: string, updates: Partial<BehaviorConfig>) => void
  removeBehavior: (entityId: string, behaviorType: string) => void

  // Custom shape actions
  defineShape: (name: string, parts: ShapePrimitive[]) => void
  getShape: (name: string) => ShapePrimitive[] | undefined
}

// Initial entities: 2 lakes and 11 trees (positioned for 2000x1400 world)
const initialEntities: EntityConfig[] = [
  {
    id: 'lake-1',
    name: 'Lake',
    x: 1500,
    y: 900,
    width: 220,
    height: 150,
    shape: 'lake',
    color: '#4A90D9',
    solid: true,
    behaviors: [],
  },
  {
    id: 'lake-2',
    name: 'Lake',
    x: 300,
    y: 400,
    width: 180,
    height: 120,
    shape: 'lake',
    color: '#4A90D9',
    solid: true,
    behaviors: [],
  },
  // Trees near the starting position (visible in initial viewport)
  // Note: Trees don't have color set - they use level color from levelStore
  // Sandbox can override by setting entity.color
  {
    id: 'tree-center-1',
    name: 'Tree',
    x: 750,
    y: 500,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
    hasMathSymbol: true,
  },
  {
    id: 'tree-center-2',
    name: 'Tree',
    x: 1200,
    y: 600,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
  },
  {
    id: 'tree-center-3',
    name: 'Tree',
    x: 850,
    y: 850,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
    hasMathSymbol: true,
  },
  // Trees spread around the world
  {
    id: 'tree-1',
    name: 'Tree',
    x: 150,
    y: 200,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
    hasMathSymbol: true,
  },
  {
    id: 'tree-2',
    name: 'Tree',
    x: 600,
    y: 150,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
  },
  {
    id: 'tree-3',
    name: 'Tree',
    x: 1100,
    y: 300,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
    hasMathSymbol: true,
  },
  {
    id: 'tree-4',
    name: 'Tree',
    x: 1700,
    y: 250,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
  },
  {
    id: 'tree-5',
    name: 'Tree',
    x: 250,
    y: 1000,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
    hasMathSymbol: true,
  },
  {
    id: 'tree-6',
    name: 'Tree',
    x: 800,
    y: 1100,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
  },
  {
    id: 'tree-7',
    name: 'Tree',
    x: 1400,
    y: 1200,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
    hasMathSymbol: true,
  },
  {
    id: 'tree-8',
    name: 'Tree',
    x: 1800,
    y: 1000,
    width: 60,
    height: 90,
    shape: 'tree',
    solid: true,
    behaviors: [],
  },
]

// Helper: check if player position collides with an entity
const checkCollision = (
  px: number,
  py: number,
  entity: EntityConfig,
  playerRadius = 15
): boolean => {
  if (!entity.solid) return false

  // For lake (ellipse), use ellipse collision
  if (entity.shape === 'lake') {
    const centerX = entity.x + entity.width / 2
    const centerY = entity.y + entity.height / 2
    const rx = entity.width / 2 + playerRadius
    const ry = entity.height / 2 + playerRadius
    const dx = px - centerX
    const dy = py - centerY
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1
  }

  // For trees and other shapes, use rectangle collision with padding
  const left = entity.x - playerRadius
  const right = entity.x + entity.width + playerRadius
  const top = entity.y - playerRadius
  const bottom = entity.y + entity.height + playerRadius

  return px > left && px < right && py > top && py < bottom
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  player: {
    x: 1000,
    y: 700,
    health: 100,
    maxHealth: 100,
    lives: 5,
    maxLives: 5,
    invincibleUntil: 0,
    points: 0,
    appearance: {
      shape: 'unicorn',
      color: '#FFB6C1',  // Light pink
      size: 1.3,
    },
    // Jump state
    isJumping: false,
    jumpVelocity: 0,
    groundY: 700,
    // Movement direction (default facing right)
    facingX: 1,
    facingY: 0,
  },

  world: {
    width: 2000,
    height: 1400,
    terrainColor: '#90EE90',
    skyColor: '#87CEEB',
  },

  entities: initialEntities,

  customShapes: new Map<string, ShapePrimitive[]>(),

  // Player actions
  movePlayer: (dx, dy) =>
    set((state) => {
      let newX = Math.max(20, Math.min(state.world.width - 20, state.player.x + dx))
      let newY = Math.max(20, Math.min(state.world.height - 20, state.player.y + dy))

      // Track facing direction based on input
      let facingX = state.player.facingX
      let facingY = state.player.facingY
      if (dx !== 0 || dy !== 0) {
        // Normalize the direction
        const len = Math.sqrt(dx * dx + dy * dy)
        facingX = dx / len
        facingY = dy / len
      }

      // Skip collision checks if player is jumping/airborne
      if (!state.player.isJumping) {
        // Check collision with solid entities
        for (const entity of state.entities) {
          if (checkCollision(newX, newY, entity)) {
            // Try moving only in X
            if (!checkCollision(newX, state.player.y, entity)) {
              newY = state.player.y
            }
            // Try moving only in Y
            else if (!checkCollision(state.player.x, newY, entity)) {
              newX = state.player.x
            }
            // Can't move at all in this direction
            else {
              newX = state.player.x
              newY = state.player.y
            }
          }
        }
      }

      return { player: { ...state.player, x: newX, y: newY, facingX, facingY } }
    }),

  teleportPlayer: (x, y) =>
    set((state) => ({
      player: { ...state.player, x, y },
    })),

  setPlayerAppearance: (appearance) =>
    set((state) => ({
      player: {
        ...state.player,
        appearance: { ...state.player.appearance, ...appearance },
      },
    })),

  modifyHealth: (amount) =>
    set((state) => ({
      player: {
        ...state.player,
        health: Math.max(0, Math.min(state.player.maxHealth, state.player.health + amount)),
      },
    })),

  modifyPoints: (amount) =>
    set((state) => ({
      player: {
        ...state.player,
        points: Math.max(0, state.player.points + amount),
      },
    })),

  loseLife: () => {
    const state = get()
    const newLives = Math.max(0, state.player.lives - 1)
    set({
      player: {
        ...state.player,
        lives: newLives,
      },
    })
    return newLives
  },

  resetLives: () =>
    set((state) => ({
      player: {
        ...state.player,
        lives: state.player.maxLives,
      },
    })),

  setInvincible: (durationMs: number) => {
    const invincibleUntil = Date.now() + durationMs
    set((state) => ({
      player: {
        ...state.player,
        invincibleUntil,
      },
    }))
  },

  isInvincible: () => {
    return Date.now() < get().player.invincibleUntil
  },

  // Jump actions
  startJump: () => {
    const state = get()
    if (state.player.isJumping) return // Can't double jump

    set({
      player: {
        ...state.player,
        isJumping: true,
        jumpVelocity: -15, // Initial upward velocity (negative = up)
        groundY: state.player.y,
      },
    })
  },

  updateJump: (_deltaTime: number) => {
    const state = get()
    if (!state.player.isJumping) return

    const GRAVITY = 0.6
    const FORWARD_SPEED = 16 // Fast forward momentum during jump
    const newVelocity = state.player.jumpVelocity + GRAVITY

    // Apply forward movement in facing direction
    const forwardX = state.player.facingX * FORWARD_SPEED
    const forwardY = state.player.facingY * FORWARD_SPEED

    // Calculate new position with forward momentum
    let newX = state.player.x + forwardX
    let newY = state.player.y + newVelocity + forwardY

    // Clamp to world bounds
    newX = Math.max(20, Math.min(state.world.width - 20, newX))
    newY = Math.max(20, Math.min(state.world.height - 20, newY))

    // Check if landed (visual Y position returns to ground)
    if (newY >= state.player.groundY + forwardY) {
      set({
        player: {
          ...state.player,
          x: newX,
          y: state.player.groundY + forwardY,
          groundY: state.player.groundY + forwardY, // Update ground to new position
          isJumping: false,
          jumpVelocity: 0,
        },
      })
    } else {
      set({
        player: {
          ...state.player,
          x: newX,
          y: newY,
          jumpVelocity: newVelocity,
        },
      })
    }
  },

  isPlayerAirborne: () => get().player.isJumping,

  // Entity actions
  addEntity: (entity) =>
    set((state) => ({
      entities: [...state.entities, entity],
    })),

  updateEntity: (id, updates) =>
    set((state) => ({
      entities: state.entities.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  removeEntity: (id) =>
    set((state) => ({
      entities: state.entities.filter((e) => e.id !== id),
    })),

  getEntity: (id) => get().entities.find((e) => e.id === id),

  getAllEntities: () => get().entities,

  // World actions
  setTerrainColor: (color) =>
    set((state) => ({
      world: { ...state.world, terrainColor: color },
    })),

  setSkyColor: (color) =>
    set((state) => ({
      world: { ...state.world, skyColor: color },
    })),

  // Behavior actions
  addBehavior: (entityId, behavior) =>
    set((state) => ({
      entities: state.entities.map((e) =>
        e.id === entityId
          ? { ...e, behaviors: [...e.behaviors, behavior] }
          : e
      ),
    })),

  updateBehavior: (entityId, behaviorType, updates) =>
    set((state) => ({
      entities: state.entities.map((e) =>
        e.id === entityId
          ? {
              ...e,
              behaviors: e.behaviors.map((b) =>
                b.type === behaviorType ? { ...b, ...updates } : b
              ),
            }
          : e
      ),
    })),

  removeBehavior: (entityId, behaviorType) =>
    set((state) => ({
      entities: state.entities.map((e) =>
        e.id === entityId
          ? { ...e, behaviors: e.behaviors.filter((b) => b.type !== behaviorType) }
          : e
      ),
    })),

  // Custom shape actions
  defineShape: (name, parts) =>
    set((state) => {
      const newShapes = new Map(state.customShapes)
      newShapes.set(name.toLowerCase(), parts)
      return { customShapes: newShapes }
    }),

  getShape: (name) => get().customShapes.get(name.toLowerCase()),
}))
