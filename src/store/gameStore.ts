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
  removeBehavior: (entityId: string, behaviorType: string) => void

  // Custom shape actions
  defineShape: (name: string, parts: ShapePrimitive[]) => void
  getShape: (name: string) => ShapePrimitive[] | undefined
}

// Initial entities: 1 lake and 5 trees
const initialEntities: EntityConfig[] = [
  {
    id: 'lake-1',
    name: 'Lake',
    x: 600,
    y: 400,
    width: 150,
    height: 100,
    shape: 'lake',
    color: '#4A90D9',
    solid: true,
    behaviors: [],
  },
  {
    id: 'tree-1',
    name: 'Tree',
    x: 100,
    y: 150,
    width: 40,
    height: 60,
    shape: 'tree',
    color: '#228B22',
    solid: true,
    behaviors: [],
  },
  {
    id: 'tree-2',
    name: 'Tree',
    x: 250,
    y: 100,
    width: 40,
    height: 60,
    shape: 'tree',
    color: '#228B22',
    solid: true,
    behaviors: [],
  },
  {
    id: 'tree-3',
    name: 'Tree',
    x: 450,
    y: 200,
    width: 40,
    height: 60,
    shape: 'tree',
    color: '#228B22',
    solid: true,
    behaviors: [],
  },
  {
    id: 'tree-4',
    name: 'Tree',
    x: 150,
    y: 450,
    width: 40,
    height: 60,
    shape: 'tree',
    color: '#228B22',
    solid: true,
    behaviors: [],
  },
  {
    id: 'tree-5',
    name: 'Tree',
    x: 350,
    y: 500,
    width: 40,
    height: 60,
    shape: 'tree',
    color: '#228B22',
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
    x: 400,
    y: 300,
    health: 100,
    maxHealth: 100,
    points: 0,
    appearance: {
      shape: 'duck',
      color: '#FFD700',
      size: 1,
    },
  },

  world: {
    width: 800,
    height: 600,
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

      return { player: { ...state.player, x: newX, y: newY } }
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
