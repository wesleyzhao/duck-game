import { useGameStore } from '../store/gameStore'
import { useHistoryStore } from '../store/historyStore'
import { speak } from '../services/speechOutput'
import { SoundEffects } from '../services/soundEffects'
import type { Entity, EntityShape, BehaviorType } from '../types/entities'

let entityCounter = 0

function generateId(): string {
  return `entity_${++entityCounter}`
}

export const SandboxAPI = {
  // Create a new entity
  create(options: {
    name?: string
    shape?: EntityShape
    x?: number
    y?: number
    z?: number
    size?: number
    color?: string
    solid?: boolean
  }): string {
    const id = generateId()
    const entity: Entity = {
      id,
      name: options.name || 'object',
      shape: options.shape || 'box',
      position: {
        x: options.x ?? 0,
        y: options.y ?? 0.5,
        z: options.z ?? 0,
      },
      size: {
        x: options.size ?? 1,
        y: options.size ?? 1,
        z: options.size ?? 1,
      },
      color: options.color || '#ff0000',
      solid: options.solid ?? true,
      behaviors: [],
    }
    useGameStore.getState().addEntity(entity)
    SoundEffects.create()

    // Record for undo
    useHistoryStore.getState().record({
      description: `Create ${entity.name}`,
      undo: () => useGameStore.getState().removeEntity(entity.id),
      redo: () => useGameStore.getState().addEntity(entity),
    })

    return id
  },

  // Remove an entity by ID or name
  remove(idOrName: string): boolean {
    const state = useGameStore.getState()
    const entity = state.entities.find(
      (e) => e.id === idOrName || e.name === idOrName
    )
    if (entity) {
      const removedEntity = { ...entity }
      state.removeEntity(entity.id)
      SoundEffects.remove()

      // Record for undo
      useHistoryStore.getState().record({
        description: `Remove ${entity.name}`,
        undo: () => useGameStore.getState().addEntity(removedEntity),
        redo: () => useGameStore.getState().removeEntity(removedEntity.id),
      })

      return true
    }
    return false
  },

  // Update an entity
  update(
    idOrName: string,
    options: {
      x?: number
      y?: number
      z?: number
      color?: string
      size?: number
    }
  ): boolean {
    const state = useGameStore.getState()
    const entity = state.entities.find(
      (e) => e.id === idOrName || e.name === idOrName
    )
    if (!entity) return false

    const updates: Partial<Entity> = {}
    if (options.x !== undefined || options.y !== undefined || options.z !== undefined) {
      updates.position = {
        x: options.x ?? entity.position.x,
        y: options.y ?? entity.position.y,
        z: options.z ?? entity.position.z,
      }
    }
    if (options.color !== undefined) {
      updates.color = options.color
    }
    if (options.size !== undefined) {
      updates.size = { x: options.size, y: options.size, z: options.size }
    }

    const oldEntity = { ...entity }
    state.updateEntity(entity.id, updates)

    // Record for undo
    useHistoryStore.getState().record({
      description: `Update ${entity.name}`,
      undo: () => useGameStore.getState().updateEntity(entity.id, {
        position: oldEntity.position,
        color: oldEntity.color,
        size: oldEntity.size,
      }),
      redo: () => useGameStore.getState().updateEntity(entity.id, updates),
    })

    return true
  },

  // Clear all entities
  clear(): void {
    const entities = [...useGameStore.getState().entities]
    useGameStore.getState().clearEntities()

    // Record for undo
    useHistoryStore.getState().record({
      description: `Clear all entities`,
      undo: () => {
        entities.forEach((e) => useGameStore.getState().addEntity(e))
      },
      redo: () => useGameStore.getState().clearEntities(),
    })
  },

  // Get player position
  getPlayerPosition(): { x: number; y: number; z: number } {
    const player = useGameStore.getState().player
    return { x: player.x, y: player.y, z: player.z }
  },

  // List all entities
  list(): string[] {
    return useGameStore.getState().entities.map((e) => e.name)
  },

  // Get entity by ID
  getEntity(id: string): Entity | undefined {
    return useGameStore.getState().entities.find((e) => e.id === id)
  },

  // Get last created entity
  getLastEntity(): Entity | undefined {
    const entities = useGameStore.getState().entities
    return entities[entities.length - 1]
  },

  // Find first entity by name
  findByName(name: string): Entity | undefined {
    return useGameStore.getState().entities.find((e) => e.name === name)
  },

  // Find all entities by name
  findAllByName(name: string): Entity[] {
    return useGameStore.getState().entities.filter((e) => e.name === name)
  },

  // Find entities with custom predicate
  findEntities(predicate: (e: Entity) => boolean): Entity[] {
    return useGameStore.getState().entities.filter(predicate)
  },

  // Get player info (position, lives, points)
  getPlayer(): { x: number; y: number; z: number; lives: number; points: number } {
    const player = useGameStore.getState().player
    return {
      x: player.x,
      y: player.y,
      z: player.z,
      lives: player.lives,
      points: player.points,
    }
  },

  // Set player appearance (color, size)
  setPlayerAppearance(options: { color?: string; size?: number }): void {
    const oldPlayer = useGameStore.getState().player
    useGameStore.getState().setPlayerAppearance(options)

    useHistoryStore.getState().record({
      description: `Change player appearance`,
      undo: () => useGameStore.getState().setPlayerAppearance({
        color: oldPlayer.color,
        size: oldPlayer.size
      }),
      redo: () => useGameStore.getState().setPlayerAppearance(options),
    })
  },

  // Teleport player to position
  teleportPlayer(x: number, y: number, z: number): void {
    const oldPos = useGameStore.getState().player
    useGameStore.getState().teleportPlayer(x, y, z)
    SoundEffects.teleport()

    useHistoryStore.getState().record({
      description: `Teleport player`,
      undo: () => useGameStore.getState().teleportPlayer(oldPos.x, oldPos.y, oldPos.z),
      redo: () => useGameStore.getState().teleportPlayer(x, y, z),
    })
  },

  // Modify player points (requires cheats)
  modifyPoints(amount: number): void {
    useGameStore.getState().modifyPoints(amount, true)
  },

  // Enable cheats with code
  enableCheats(code: string): boolean {
    return useGameStore.getState().enableCheats(code)
  },

  // Undo last action
  undo(): void {
    useHistoryStore.getState().undo()
  },

  // Redo last undone action
  redo(): void {
    useHistoryStore.getState().redo()
  },

  // Add behavior to entity
  addBehavior(idOrName: string, behavior: BehaviorType, speed?: number, range?: number): boolean {
    const state = useGameStore.getState()
    const entity = state.entities.find(
      (e) => e.id === idOrName || e.name === idOrName
    )
    if (!entity) return false

    // Check if behavior already exists
    if (entity.behaviors.some((b) => b.type === behavior)) return false

    const newBehavior = { type: behavior, speed: speed ?? 1, range: range ?? 1 }
    const oldBehaviors = [...entity.behaviors]

    state.updateEntity(entity.id, {
      behaviors: [...entity.behaviors, newBehavior],
    })

    useHistoryStore.getState().record({
      description: `Add ${behavior} to ${entity.name}`,
      undo: () => useGameStore.getState().updateEntity(entity.id, { behaviors: oldBehaviors }),
      redo: () => useGameStore.getState().updateEntity(entity.id, { behaviors: [...oldBehaviors, newBehavior] }),
    })

    return true
  },

  // Remove behavior from entity
  removeBehavior(idOrName: string, behavior: BehaviorType): boolean {
    const state = useGameStore.getState()
    const entity = state.entities.find(
      (e) => e.id === idOrName || e.name === idOrName
    )
    if (!entity) return false

    const oldBehaviors = [...entity.behaviors]
    const newBehaviors = entity.behaviors.filter((b) => b.type !== behavior)

    if (newBehaviors.length === oldBehaviors.length) return false

    state.updateEntity(entity.id, { behaviors: newBehaviors })

    useHistoryStore.getState().record({
      description: `Remove ${behavior} from ${entity.name}`,
      undo: () => useGameStore.getState().updateEntity(entity.id, { behaviors: oldBehaviors }),
      redo: () => useGameStore.getState().updateEntity(entity.id, { behaviors: newBehaviors }),
    })

    return true
  },

  // Convenience: make entity bouncy
  makeBouncy(idOrName: string): boolean {
    return this.addBehavior(idOrName, 'bounce')
  },

  // Convenience: make entity float
  makeFloat(idOrName: string): boolean {
    return this.addBehavior(idOrName, 'float')
  },

  // Convenience: make entity spin
  makeSpin(idOrName: string): boolean {
    return this.addBehavior(idOrName, 'spin')
  },

  // Convenience: make entity pulse
  makePulse(idOrName: string): boolean {
    return this.addBehavior(idOrName, 'pulse')
  },

  // Random number between min and max
  random(min: number, max: number): number {
    return Math.random() * (max - min) + min
  },

  // Distance between two 3D points
  distance(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    const dz = z2 - z1
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  },

  // Log to console (for debugging)
  log(...args: unknown[]): void {
    console.log('[Game]', ...args)
  },

  // Speak text aloud (text-to-speech)
  say(text: string): void {
    speak(text)
  },

  // Set sky color
  setSkyColor(color: string): void {
    const oldColor = useGameStore.getState().world.skyColor
    useGameStore.getState().setSkyColor(color)

    useHistoryStore.getState().record({
      description: `Set sky color to ${color}`,
      undo: () => useGameStore.getState().setSkyColor(oldColor),
      redo: () => useGameStore.getState().setSkyColor(color),
    })
  },

  // Set terrain/ground color
  setTerrainColor(color: string): void {
    const oldColor = useGameStore.getState().world.terrainColor
    useGameStore.getState().setTerrainColor(color)

    useHistoryStore.getState().record({
      description: `Set terrain color to ${color}`,
      undo: () => useGameStore.getState().setTerrainColor(oldColor),
      redo: () => useGameStore.getState().setTerrainColor(color),
    })
  },

  // Get world info
  getWorldInfo(): { skyColor: string; terrainColor: string } {
    return useGameStore.getState().world
  },
}
