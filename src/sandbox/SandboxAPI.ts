import { useGameStore } from '../store/gameStore'
import { EntityConfig, PlayerAppearance, BehaviorConfig, ShapePrimitive } from '../types/game'
import {
  GameSandboxAPI,
  CreateEntityOptions,
  PlayerInfo,
  WorldInfo,
  Change,
} from './types'

export class SandboxAPI implements GameSandboxAPI {
  private changes: Change[] = []
  private messages: string[] = []
  private entityCounter = 0
  private lastCreatedEntityId: string | null = null
  private cheatModeEnabled = false

  // Track all entities created in this session by name -> id
  // If multiple entities have same name, stores the most recent
  private createdEntities = new Map<string, string>()

  // --- Entity Methods ---

  createEntity(options: CreateEntityOptions): EntityConfig {
    const id = `entity-${Date.now()}-${this.entityCounter++}`
    const entity: EntityConfig = {
      id,
      name: options.name,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      shape: options.shape,
      color: options.color,
      solid: options.solid ?? false,
      behaviors: [],
    }

    useGameStore.getState().addEntity(entity)
    this.lastCreatedEntityId = id
    this.createdEntities.set(options.name.toLowerCase(), id)

    this.changes.push({
      type: 'createEntity',
      description: `Created ${options.name}`,
      forward: () => useGameStore.getState().addEntity(entity),
      reverse: () => {
        useGameStore.getState().removeEntity(id)
        this.createdEntities.delete(options.name.toLowerCase())
      },
    })

    return entity
  }

  // Get all entities created in this session
  getCreatedEntities(): EntityConfig[] {
    const entities: EntityConfig[] = []
    for (const id of this.createdEntities.values()) {
      const entity = this.getEntity(id)
      if (entity) entities.push(entity)
    }
    return entities
  }

  // Get a created entity by name (from this session's created entities)
  getCreated(name: string): EntityConfig | undefined {
    const id = this.createdEntities.get(name.toLowerCase())
    if (!id) return undefined
    return this.getEntity(id)
  }

  // Get the last created entity (convenient for chaining)
  getLastEntity(): EntityConfig | undefined {
    if (!this.lastCreatedEntityId) return undefined
    return this.getEntity(this.lastCreatedEntityId)
  }

  // Find first entity by name (case-insensitive)
  findByName(name: string): EntityConfig | undefined {
    const lowerName = name.toLowerCase()
    return this.getAllEntities().find(
      (e) => e.name.toLowerCase() === lowerName
    )
  }

  // Convenience: make an entity bouncy by name
  makeBouncy(name: string): boolean {
    const entity = this.findByName(name)
    if (!entity) return false
    return this.addBehavior(entity.id, { type: 'bounce' })
  }

  // Convenience: make an entity float by name
  makeFloat(name: string): boolean {
    const entity = this.findByName(name)
    if (!entity) return false
    return this.addBehavior(entity.id, { type: 'float', range: 15 })
  }

  getEntity(id: string): EntityConfig | undefined {
    return useGameStore.getState().getEntity(id)
  }

  updateEntity(id: string, updates: Partial<EntityConfig>): boolean {
    const entity = this.getEntity(id)
    if (!entity) return false

    const previousState = { ...entity }

    useGameStore.getState().updateEntity(id, updates)

    this.changes.push({
      type: 'updateEntity',
      description: `Updated ${entity.name}`,
      forward: () => useGameStore.getState().updateEntity(id, updates),
      reverse: () => useGameStore.getState().updateEntity(id, previousState),
    })

    return true
  }

  deleteEntity(id: string): boolean {
    const entity = this.getEntity(id)
    if (!entity) return false

    const entityCopy = { ...entity, behaviors: [...entity.behaviors] }

    useGameStore.getState().removeEntity(id)

    this.changes.push({
      type: 'deleteEntity',
      description: `Deleted ${entity.name}`,
      forward: () => useGameStore.getState().removeEntity(id),
      reverse: () => useGameStore.getState().addEntity(entityCopy),
    })

    return true
  }

  getAllEntities(): EntityConfig[] {
    return useGameStore.getState().getAllEntities()
  }

  findEntities(predicate: (entity: EntityConfig) => boolean): EntityConfig[] {
    return this.getAllEntities().filter(predicate)
  }

  // --- Player Methods ---

  getPlayer(): PlayerInfo {
    const { player } = useGameStore.getState()
    return {
      x: player.x,
      y: player.y,
      health: player.health,
      maxHealth: player.maxHealth,
      points: player.points,
      appearance: { ...player.appearance },
    }
  }

  movePlayer(dx: number, dy: number): void {
    const { player } = useGameStore.getState()
    const prevX = player.x
    const prevY = player.y

    useGameStore.getState().movePlayer(dx, dy)

    const { player: newPlayer } = useGameStore.getState()

    this.changes.push({
      type: 'movePlayer',
      description: `Moved player`,
      forward: () => useGameStore.getState().teleportPlayer(newPlayer.x, newPlayer.y),
      reverse: () => useGameStore.getState().teleportPlayer(prevX, prevY),
    })
  }

  teleportPlayer(x: number, y: number): void {
    const { player } = useGameStore.getState()
    const prevX = player.x
    const prevY = player.y

    useGameStore.getState().teleportPlayer(x, y)

    this.changes.push({
      type: 'teleportPlayer',
      description: `Teleported player to (${x}, ${y})`,
      forward: () => useGameStore.getState().teleportPlayer(x, y),
      reverse: () => useGameStore.getState().teleportPlayer(prevX, prevY),
    })
  }

  setPlayerAppearance(appearance: Partial<PlayerAppearance>): void {
    const { player } = useGameStore.getState()
    const prevAppearance = { ...player.appearance }

    useGameStore.getState().setPlayerAppearance(appearance)

    this.changes.push({
      type: 'setPlayerAppearance',
      description: `Changed player appearance`,
      forward: () => useGameStore.getState().setPlayerAppearance(appearance),
      reverse: () => useGameStore.getState().setPlayerAppearance(prevAppearance),
    })
  }

  modifyHealth(amount: number): void {
    const { player } = useGameStore.getState()
    const prevHealth = player.health

    useGameStore.getState().modifyHealth(amount)

    const { player: newPlayer } = useGameStore.getState()
    const actualChange = newPlayer.health - prevHealth

    this.changes.push({
      type: 'modifyHealth',
      description: `Changed health by ${amount}`,
      forward: () => useGameStore.getState().modifyHealth(actualChange),
      reverse: () => useGameStore.getState().modifyHealth(-actualChange),
    })
  }

  modifyPoints(amount: number): void {
    if (!this.cheatModeEnabled) {
      this.say("Points can only be earned through gameplay!")
      return
    }

    const { player } = useGameStore.getState()
    const prevPoints = player.points

    useGameStore.getState().modifyPoints(amount)

    const { player: newPlayer } = useGameStore.getState()
    const actualChange = newPlayer.points - prevPoints

    this.changes.push({
      type: 'modifyPoints',
      description: `Changed points by ${amount}`,
      forward: () => useGameStore.getState().modifyPoints(actualChange),
      reverse: () => useGameStore.getState().modifyPoints(-actualChange),
    })
  }

  // Enable cheat mode with secret code
  enableCheats(code: string): boolean {
    if (code === 'quackquack') {
      this.cheatModeEnabled = true
      this.say("🎮 Cheat mode enabled!")
      return true
    }
    this.say("Invalid cheat code.")
    return false
  }

  // --- World Methods ---

  getWorldInfo(): WorldInfo {
    const { world } = useGameStore.getState()
    return {
      width: world.width,
      height: world.height,
      terrainColor: world.terrainColor,
      skyColor: world.skyColor,
    }
  }

  setTerrainColor(color: string): void {
    const { world } = useGameStore.getState()
    const prevColor = world.terrainColor

    useGameStore.getState().setTerrainColor(color)

    this.changes.push({
      type: 'setTerrainColor',
      description: `Changed terrain to ${color}`,
      forward: () => useGameStore.getState().setTerrainColor(color),
      reverse: () => useGameStore.getState().setTerrainColor(prevColor),
    })
  }

  setSkyColor(color: string): void {
    const { world } = useGameStore.getState()
    const prevColor = world.skyColor

    useGameStore.getState().setSkyColor(color)

    this.changes.push({
      type: 'setSkyColor',
      description: `Changed sky to ${color}`,
      forward: () => useGameStore.getState().setSkyColor(color),
      reverse: () => useGameStore.getState().setSkyColor(prevColor),
    })
  }

  // --- Behavior Methods ---

  addBehavior(entityId: string, behavior: BehaviorConfig): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    useGameStore.getState().addBehavior(entityId, behavior)

    this.changes.push({
      type: 'addBehavior',
      description: `Added ${behavior.type} to ${entity.name}`,
      forward: () => useGameStore.getState().addBehavior(entityId, behavior),
      reverse: () => useGameStore.getState().removeBehavior(entityId, behavior.type),
    })

    return true
  }

  removeBehavior(entityId: string, behaviorType: string): boolean {
    const entity = this.getEntity(entityId)
    if (!entity) return false

    const behavior = entity.behaviors.find((b) => b.type === behaviorType)
    if (!behavior) return false

    useGameStore.getState().removeBehavior(entityId, behaviorType)

    this.changes.push({
      type: 'removeBehavior',
      description: `Removed ${behaviorType} from ${entity.name}`,
      forward: () => useGameStore.getState().removeBehavior(entityId, behaviorType),
      reverse: () => useGameStore.getState().addBehavior(entityId, behavior),
    })

    return true
  }

  // --- Custom Shape Methods ---

  defineShape(name: string, parts: ShapePrimitive[]): void {
    const prevShape = useGameStore.getState().getShape(name)

    useGameStore.getState().defineShape(name, parts)

    this.changes.push({
      type: 'defineShape',
      description: `Defined shape "${name}"`,
      forward: () => useGameStore.getState().defineShape(name, parts),
      reverse: () => {
        if (prevShape) {
          useGameStore.getState().defineShape(name, prevShape)
        } else {
          // Can't really "undefine" but we can set empty
          useGameStore.getState().defineShape(name, [])
        }
      },
    })
  }

  // --- Communication ---

  say(message: string): void {
    this.messages.push(message)
  }

  log(...args: unknown[]): void {
    console.log('[Sandbox]', ...args)
  }

  // --- Utilities ---

  random(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }

  distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }

  // --- Internal Methods ---

  getChanges(): Change[] {
    return this.changes
  }

  getMessages(): string[] {
    return this.messages
  }

  rollback(): void {
    // Apply reverses in reverse order
    for (let i = this.changes.length - 1; i >= 0; i--) {
      this.changes[i].reverse()
    }
    this.changes = []
  }
}
