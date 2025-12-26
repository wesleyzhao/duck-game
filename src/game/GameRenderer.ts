import { Application, Graphics, Container } from 'pixi.js'
import { useGameStore } from '../store/gameStore'
import { EntityConfig, ShapePrimitive } from '../types/game'

export class GameRenderer {
  private app: Application
  private terrainGraphics: Graphics
  private entityContainer: Container
  private playerContainer: Container
  private playerGraphics: Graphics
  private initialized = false
  private unsubscribe: (() => void) | null = null

  // Animation state
  private animationTime = 0
  private bobOffset = 0
  private breathScale = 1

  // Input state
  private keysPressed = new Set<string>()
  private readonly MOVE_SPEED = 4

  // Behavior state for entities (position offsets, etc.)
  private behaviorState = new Map<string, {
    bounceDir?: { dx: number; dy: number }
    spinAngle?: number
    baseX?: number
    baseY?: number
  }>()

  constructor() {
    this.app = new Application()
    this.terrainGraphics = new Graphics()
    this.entityContainer = new Container()
    this.playerContainer = new Container()
    this.playerGraphics = new Graphics()
  }

  async init(container: HTMLElement): Promise<void> {
    const { world } = useGameStore.getState()

    // Initialize PixiJS application
    await this.app.init({
      width: world.width,
      height: world.height,
      backgroundColor: world.skyColor,
    })

    // Add canvas to DOM
    container.appendChild(this.app.canvas)

    // Setup layer hierarchy (terrain -> entities -> player)
    this.app.stage.addChild(this.terrainGraphics)
    this.app.stage.addChild(this.entityContainer)
    this.app.stage.addChild(this.playerContainer)
    this.playerContainer.addChild(this.playerGraphics)

    // Initial render
    this.renderTerrain()
    this.renderEntities()
    this.renderPlayer()

    // Subscribe to store changes (terrain only - entities handled in game loop)
    this.unsubscribe = useGameStore.subscribe(() => {
      this.renderTerrain()
    })

    // Setup keyboard input
    this.setupKeyboardInput()

    // Start game loop for animations
    this.app.ticker.add(this.gameLoop.bind(this))

    this.initialized = true
  }

  private setupKeyboardInput(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      this.keysPressed.add(e.key.toLowerCase())
    }

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Store cleanup references
    const originalDestroy = this.destroy.bind(this)
    this.destroy = () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      originalDestroy()
    }
  }

  private gameLoop(): void {
    // Update animation time (in seconds)
    this.animationTime += this.app.ticker.deltaMS / 1000

    // Calculate bobbing offset (gentle up/down motion)
    this.bobOffset = Math.sin(this.animationTime * 6) * 3

    // Calculate breathing scale (subtle size pulsing)
    this.breathScale = 1 + Math.sin(this.animationTime * 5) * 0.05

    // Process movement input
    this.processMovement()

    // Process entity behaviors
    this.processBehaviors()

    // Re-render entities and player
    this.renderEntities()
    this.renderPlayer()
  }

  private processBehaviors(): void {
    const { entities, world } = useGameStore.getState()

    for (const entity of entities) {
      if (entity.behaviors.length === 0) continue

      let state = this.behaviorState.get(entity.id)
      if (!state) {
        state = {
          baseX: entity.x,
          baseY: entity.y,
          bounceDir: { dx: 2, dy: 1.5 },
          spinAngle: 0,
        }
        this.behaviorState.set(entity.id, state)
      }

      for (const behavior of entity.behaviors) {
        const speed = behavior.speed ?? 1

        switch (behavior.type) {
          case 'bounce': {
            // Move entity and bounce off walls
            let newX = entity.x + (state.bounceDir?.dx ?? 2) * speed
            let newY = entity.y + (state.bounceDir?.dy ?? 1.5) * speed

            if (newX <= 0 || newX + entity.width >= world.width) {
              state.bounceDir!.dx *= -1
              newX = Math.max(0, Math.min(world.width - entity.width, newX))
            }
            if (newY <= 0 || newY + entity.height >= world.height) {
              state.bounceDir!.dy *= -1
              newY = Math.max(0, Math.min(world.height - entity.height, newY))
            }

            useGameStore.getState().updateEntity(entity.id, { x: newX, y: newY })
            break
          }

          case 'float': {
            // Oscillate y position
            const range = behavior.range ?? 10
            const floatOffset = Math.sin(this.animationTime * 3 * speed) * range
            const newY = (state.baseY ?? entity.y) + floatOffset
            useGameStore.getState().updateEntity(entity.id, { y: newY })
            break
          }

          // Note: 'spin' and 'pulse' would require graphics transform support
          // For MVP, we skip these or implement visually in drawEntity
        }
      }
    }
  }

  private processMovement(): void {
    let dx = 0
    let dy = 0

    // Arrow keys and WASD
    if (this.keysPressed.has('arrowup') || this.keysPressed.has('w')) {
      dy -= this.MOVE_SPEED
    }
    if (this.keysPressed.has('arrowdown') || this.keysPressed.has('s')) {
      dy += this.MOVE_SPEED
    }
    if (this.keysPressed.has('arrowleft') || this.keysPressed.has('a')) {
      dx -= this.MOVE_SPEED
    }
    if (this.keysPressed.has('arrowright') || this.keysPressed.has('d')) {
      dx += this.MOVE_SPEED
    }

    // Apply movement if any
    if (dx !== 0 || dy !== 0) {
      useGameStore.getState().movePlayer(dx, dy)
    }
  }

  renderTerrain(): void {
    const { world } = useGameStore.getState()

    this.terrainGraphics.clear()
    this.terrainGraphics.rect(0, 0, world.width, world.height)
    this.terrainGraphics.fill(world.terrainColor)
  }

  renderEntities(): void {
    const { entities } = useGameStore.getState()

    // Clear previous entities
    this.entityContainer.removeChildren()

    // Draw each entity
    for (const entity of entities) {
      const graphics = new Graphics()
      this.drawEntity(graphics, entity)
      this.entityContainer.addChild(graphics)
    }
  }

  renderPlayer(): void {
    const { player, customShapes } = useGameStore.getState()
    const { x, y, appearance } = player
    const scale = appearance.size * this.breathScale
    const animY = y + this.bobOffset

    this.playerGraphics.clear()

    // Check for custom shape first
    const customShape = customShapes.get(appearance.shape.toLowerCase())
    if (customShape) {
      this.drawCustomShape(this.playerGraphics, x, animY, scale, customShape)
      return
    }

    // Built-in shapes
    switch (appearance.shape) {
      case 'dinosaur':
        this.drawDinosaur(x, animY, scale, appearance.color)
        break
      case 'bunny':
        this.drawBunny(x, animY, scale, appearance.color)
        break
      case 'duck':
      default:
        this.drawDuck(x, animY, scale, appearance.color)
    }
  }

  private drawDuck(x: number, y: number, scale: number, color: string): void {
    const bodyWidth = 30 * scale
    const bodyHeight = 20 * scale
    const headRadius = 10 * scale
    const beakWidth = 12 * scale
    const beakHeight = 6 * scale

    // Body
    this.playerGraphics.ellipse(x, y, bodyWidth / 2, bodyHeight / 2)
    this.playerGraphics.fill(color)

    // Head
    const headX = x + bodyWidth * 0.3
    const headY = y - bodyHeight * 0.3
    this.playerGraphics.circle(headX, headY, headRadius)
    this.playerGraphics.fill(color)

    // Beak
    const beakX = headX + headRadius + beakWidth / 2 - 2
    const beakY = headY + 2
    this.playerGraphics.ellipse(beakX, beakY, beakWidth / 2, beakHeight / 2)
    this.playerGraphics.fill('#FF8C00')

    // Eye
    const eyeX = headX + 3 * scale
    const eyeY = headY - 2 * scale
    this.playerGraphics.circle(eyeX, eyeY, 3 * scale)
    this.playerGraphics.fill('#000000')
    this.playerGraphics.circle(eyeX + 1 * scale, eyeY - 1 * scale, 1 * scale)
    this.playerGraphics.fill('#FFFFFF')
  }

  private drawDinosaur(x: number, y: number, scale: number, color: string): void {
    // Body (larger oval)
    const bodyWidth = 40 * scale
    const bodyHeight = 25 * scale
    this.playerGraphics.ellipse(x, y, bodyWidth / 2, bodyHeight / 2)
    this.playerGraphics.fill(color)

    // Head (circle, to the right)
    const headX = x + bodyWidth * 0.4
    const headY = y - bodyHeight * 0.2
    const headRadius = 12 * scale
    this.playerGraphics.circle(headX, headY, headRadius)
    this.playerGraphics.fill(color)

    // Snout
    const snoutX = headX + headRadius + 6 * scale
    const snoutY = headY + 2 * scale
    this.playerGraphics.ellipse(snoutX, snoutY, 8 * scale, 5 * scale)
    this.playerGraphics.fill(color)

    // Spikes on back (3 triangles)
    const spikeColor = '#' + (parseInt(color.slice(1), 16) - 0x222222).toString(16).padStart(6, '0')
    for (let i = 0; i < 3; i++) {
      const spikeX = x - 15 * scale + i * 12 * scale
      const spikeY = y - bodyHeight / 2
      this.playerGraphics.moveTo(spikeX, spikeY)
      this.playerGraphics.lineTo(spikeX + 5 * scale, spikeY - 10 * scale)
      this.playerGraphics.lineTo(spikeX + 10 * scale, spikeY)
      this.playerGraphics.fill(spikeColor.startsWith('#') ? spikeColor : color)
    }

    // Tail
    const tailX = x - bodyWidth * 0.5
    const tailY = y
    this.playerGraphics.moveTo(tailX, tailY)
    this.playerGraphics.lineTo(tailX - 20 * scale, tailY + 5 * scale)
    this.playerGraphics.lineTo(tailX - 15 * scale, tailY - 5 * scale)
    this.playerGraphics.fill(color)

    // Eye
    this.playerGraphics.circle(headX + 4 * scale, headY - 3 * scale, 3 * scale)
    this.playerGraphics.fill('#000000')
    this.playerGraphics.circle(headX + 5 * scale, headY - 4 * scale, 1 * scale)
    this.playerGraphics.fill('#FFFFFF')

    // Tiny arms
    this.playerGraphics.ellipse(x + 10 * scale, y + 5 * scale, 4 * scale, 6 * scale)
    this.playerGraphics.fill(color)
  }

  private drawBunny(x: number, y: number, scale: number, color: string): void {
    // Body
    const bodyWidth = 25 * scale
    const bodyHeight = 20 * scale
    this.playerGraphics.ellipse(x, y, bodyWidth / 2, bodyHeight / 2)
    this.playerGraphics.fill(color)

    // Head
    const headX = x + bodyWidth * 0.2
    const headY = y - bodyHeight * 0.4
    const headRadius = 10 * scale
    this.playerGraphics.circle(headX, headY, headRadius)
    this.playerGraphics.fill(color)

    // Ears (two tall ellipses)
    const earWidth = 5 * scale
    const earHeight = 18 * scale
    this.playerGraphics.ellipse(headX - 5 * scale, headY - headRadius - earHeight / 2 + 3 * scale, earWidth / 2, earHeight / 2)
    this.playerGraphics.fill(color)
    this.playerGraphics.ellipse(headX + 5 * scale, headY - headRadius - earHeight / 2 + 3 * scale, earWidth / 2, earHeight / 2)
    this.playerGraphics.fill(color)

    // Inner ears (pink)
    this.playerGraphics.ellipse(headX - 5 * scale, headY - headRadius - earHeight / 2 + 3 * scale, earWidth / 3, earHeight / 3)
    this.playerGraphics.fill('#FFB6C1')
    this.playerGraphics.ellipse(headX + 5 * scale, headY - headRadius - earHeight / 2 + 3 * scale, earWidth / 3, earHeight / 3)
    this.playerGraphics.fill('#FFB6C1')

    // Nose (pink)
    this.playerGraphics.circle(headX + headRadius - 2 * scale, headY + 2 * scale, 3 * scale)
    this.playerGraphics.fill('#FFB6C1')

    // Eye
    this.playerGraphics.circle(headX + 3 * scale, headY - 2 * scale, 3 * scale)
    this.playerGraphics.fill('#000000')
    this.playerGraphics.circle(headX + 4 * scale, headY - 3 * scale, 1 * scale)
    this.playerGraphics.fill('#FFFFFF')

    // Fluffy tail
    this.playerGraphics.circle(x - bodyWidth * 0.4, y, 6 * scale)
    this.playerGraphics.fill('#FFFFFF')
  }

  private drawCustomShape(
    graphics: Graphics,
    centerX: number,
    centerY: number,
    scale: number,
    parts: ShapePrimitive[]
  ): void {
    for (const part of parts) {
      const px = centerX + part.x * scale
      const py = centerY + part.y * scale

      switch (part.type) {
        case 'circle':
          graphics.circle(px, py, part.radius * scale)
          graphics.fill(part.color)
          break
        case 'ellipse':
          graphics.ellipse(px, py, part.rx * scale, part.ry * scale)
          graphics.fill(part.color)
          break
        case 'rect':
          graphics.rect(
            px - (part.width * scale) / 2,
            py - (part.height * scale) / 2,
            part.width * scale,
            part.height * scale
          )
          graphics.fill(part.color)
          break
        case 'triangle':
          const hw = (part.width * scale) / 2
          const hh = (part.height * scale) / 2
          graphics.moveTo(px, py - hh) // top
          graphics.lineTo(px + hw, py + hh) // bottom right
          graphics.lineTo(px - hw, py + hh) // bottom left
          graphics.closePath()
          graphics.fill(part.color)
          break
      }
    }
  }

  private drawEntity(graphics: Graphics, entity: EntityConfig): void {
    const centerX = entity.x + entity.width / 2
    const centerY = entity.y + entity.height / 2

    switch (entity.shape) {
      case 'lake':
        this.drawLake(graphics, entity)
        break
      case 'tree':
        this.drawTree(graphics, entity)
        break
      case 'circle':
        graphics.circle(centerX, centerY, Math.min(entity.width, entity.height) / 2)
        graphics.fill(entity.color)
        break
      case 'ellipse':
        graphics.ellipse(centerX, centerY, entity.width / 2, entity.height / 2)
        graphics.fill(entity.color)
        break
      case 'rectangle':
      default:
        graphics.rect(entity.x, entity.y, entity.width, entity.height)
        graphics.fill(entity.color)
    }
  }

  private drawLake(graphics: Graphics, entity: EntityConfig): void {
    // Draw lake as blue ellipse
    const centerX = entity.x + entity.width / 2
    const centerY = entity.y + entity.height / 2
    graphics.ellipse(centerX, centerY, entity.width / 2, entity.height / 2)
    graphics.fill(entity.color)
  }

  private drawTree(graphics: Graphics, entity: EntityConfig): void {
    const trunkWidth = entity.width * 0.3
    const trunkHeight = entity.height * 0.5
    const foliageRadius = entity.width * 0.6

    // Trunk (brown rectangle)
    const trunkX = entity.x + (entity.width - trunkWidth) / 2
    const trunkY = entity.y + entity.height - trunkHeight
    graphics.rect(trunkX, trunkY, trunkWidth, trunkHeight)
    graphics.fill('#8B4513')

    // Foliage (green circle)
    const foliageX = entity.x + entity.width / 2
    const foliageY = entity.y + foliageRadius
    graphics.circle(foliageX, foliageY, foliageRadius)
    graphics.fill(entity.color)
  }

  destroy(): void {
    if (this.initialized) {
      if (this.unsubscribe) {
        this.unsubscribe()
      }
      this.app.destroy(true)
      this.initialized = false
    }
  }
}
