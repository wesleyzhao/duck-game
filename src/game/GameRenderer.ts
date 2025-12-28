import { Application, Graphics, Container } from 'pixi.js'
import { useGameStore } from '../store/gameStore'
import { useMathStore } from '../store/mathStore'
import { useLevelStore } from '../store/levelStore'
import { useTimerStore } from '../store/timerStore'
import { playHurtSound } from '../services/soundEffects'
import { Accessory } from '../config/levels'
import { EntityConfig, ShapePrimitive } from '../types/game'

export class GameRenderer {
  private app: Application | null = null
  private worldContainer: Container | null = null
  private terrainGraphics: Graphics | null = null
  private boundaryGraphics: Graphics | null = null
  private entityContainer: Container | null = null
  private playerContainer: Container | null = null
  private playerGraphics: Graphics | null = null
  private unsubscribe: (() => void) | null = null
  private unsubscribeMath: (() => void) | null = null
  private isDestroyed = false

  // Viewport size (what the player sees)
  private readonly VIEWPORT_WIDTH = 800
  private readonly VIEWPORT_HEIGHT = 550

  // Animation state
  private animationTime = 0
  private bobOffset = 0
  private breathScale = 1

  // Celebration state
  private isCelebrating = false
  private celebrationTime = 0
  private celebrationContainer: Container | null = null
  private cakeSprites: Graphics[] = []

  // Input state
  private keysPressed = new Set<string>()
  private readonly MOVE_SPEED = 12  // Faster duck movement

  // Keyboard event handlers (stored for cleanup)
  private onKeyDown: ((e: KeyboardEvent) => void) | null = null
  private onKeyUp: ((e: KeyboardEvent) => void) | null = null

  // Behavior state for entities (position offsets, etc.)
  private behaviorState = new Map<string, {
    bounceDir?: { dx: number; dy: number }
    spinAngle?: number
    baseX?: number
    baseY?: number
  }>()

  async init(container: HTMLElement): Promise<void> {
    if (this.isDestroyed) return

    const { world } = useGameStore.getState()

    // Create all objects fresh
    this.app = new Application()
    this.worldContainer = new Container()
    this.terrainGraphics = new Graphics()
    this.boundaryGraphics = new Graphics()
    this.entityContainer = new Container()
    this.playerContainer = new Container()
    this.playerGraphics = new Graphics()
    this.celebrationContainer = new Container()

    // Initialize PixiJS application with VIEWPORT size (not world size)
    await this.app.init({
      width: this.VIEWPORT_WIDTH,
      height: this.VIEWPORT_HEIGHT,
      backgroundColor: world.skyColor,
    })

    // Check if destroyed during async init
    if (this.isDestroyed) {
      try {
        this.app?.destroy(true)
      } catch (e) {
        // Ignore - already destroyed
      }
      return
    }

    // Add canvas to DOM
    container.appendChild(this.app.canvas)

    // Setup layer hierarchy inside world container
    this.worldContainer.addChild(this.terrainGraphics)
    this.worldContainer.addChild(this.boundaryGraphics)
    this.worldContainer.addChild(this.entityContainer)
    this.worldContainer.addChild(this.playerContainer)
    this.playerContainer.addChild(this.playerGraphics)
    this.worldContainer.addChild(this.celebrationContainer) // On top of everything

    // Add world container to stage
    this.app.stage.addChild(this.worldContainer)

    // Initial render
    this.renderTerrain()
    this.renderBoundary()
    this.renderEntities()
    this.renderPlayer()
    this.updateCamera()

    // Subscribe to store changes
    this.unsubscribe = useGameStore.subscribe(() => {
      if (!this.isDestroyed) {
        this.renderTerrain()
        this.renderBoundary()
      }
    })

    // Subscribe to math store for celebration
    this.unsubscribeMath = useMathStore.subscribe((state) => {
      if (!this.isDestroyed) {
        if (state.showCelebration && !this.isCelebrating) {
          this.startCelebration()
        } else if (!state.showCelebration && this.isCelebrating) {
          this.stopCelebration()
        }
      }
    })

    // Setup keyboard input
    this.setupKeyboardInput()

    // Start game loop for animations
    this.app.ticker.add(this.gameLoop.bind(this))
  }

  private setupKeyboardInput(): void {
    this.onKeyDown = (e: KeyboardEvent) => {
      this.keysPressed.add(e.key.toLowerCase())
    }

    this.onKeyUp = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  private gameLoop(): void {
    // Check if destroyed or not initialized
    if (this.isDestroyed || !this.app) return

    // Update game timer
    const deltaSeconds = this.app.ticker.deltaMS / 1000
    useTimerStore.getState().tick(deltaSeconds)

    // Update animation time (in seconds)
    this.animationTime += deltaSeconds

    // Calculate bobbing offset (gentle up/down motion)
    this.bobOffset = Math.sin(this.animationTime * 6) * 3

    // Calculate breathing scale (subtle size pulsing)
    this.breathScale = 1 + Math.sin(this.animationTime * 5) * 0.05

    // Process movement input
    this.processMovement()

    // Check for math tree collisions
    this.checkMathTreeCollision()

    // Check for enemy collisions
    this.checkEnemyCollision()

    // Process entity behaviors
    this.processBehaviors()

    // Update celebration if active
    if (this.isCelebrating) {
      this.celebrationTime += this.app.ticker.deltaMS / 1000
      this.updateCelebration()
    }

    // Re-render everything
    this.renderTerrain()
    this.renderBoundary()
    this.renderEntities()
    this.renderPlayer()

    // Update sky color (in case it changed via sandbox)
    this.updateSkyColor()

    // Update camera to follow player
    this.updateCamera()
  }

  private updateSkyColor(): void {
    if (!this.app) return
    const { world } = useGameStore.getState()
    // Update background color if it changed
    this.app.renderer.background.color = world.skyColor
  }

  private updateCamera(): void {
    if (!this.worldContainer) return

    const { player, world } = useGameStore.getState()

    // Calculate camera position to center on player
    let cameraX = player.x - this.VIEWPORT_WIDTH / 2
    let cameraY = player.y - this.VIEWPORT_HEIGHT / 2

    // Clamp camera to world bounds
    cameraX = Math.max(0, Math.min(world.width - this.VIEWPORT_WIDTH, cameraX))
    cameraY = Math.max(0, Math.min(world.height - this.VIEWPORT_HEIGHT, cameraY))

    // Move world container (negative because we move the world, not the camera)
    this.worldContainer.x = -cameraX
    this.worldContainer.y = -cameraY
  }

  private renderBoundary(): void {
    if (!this.boundaryGraphics) return

    const { world } = useGameStore.getState()
    const borderWidth = 12

    this.boundaryGraphics.clear()

    // Draw a dark border around the entire world edge
    this.boundaryGraphics.rect(0, 0, world.width, borderWidth) // top
    this.boundaryGraphics.fill('#5D4037')
    this.boundaryGraphics.rect(0, world.height - borderWidth, world.width, borderWidth) // bottom
    this.boundaryGraphics.fill('#5D4037')
    this.boundaryGraphics.rect(0, 0, borderWidth, world.height) // left
    this.boundaryGraphics.fill('#5D4037')
    this.boundaryGraphics.rect(world.width - borderWidth, 0, borderWidth, world.height) // right
    this.boundaryGraphics.fill('#5D4037')

    // Add a lighter inner border for depth
    const innerBorder = 4
    this.boundaryGraphics.rect(borderWidth, borderWidth, world.width - borderWidth * 2, innerBorder) // top inner
    this.boundaryGraphics.fill('#8D6E63')
    this.boundaryGraphics.rect(borderWidth, world.height - borderWidth - innerBorder, world.width - borderWidth * 2, innerBorder) // bottom inner
    this.boundaryGraphics.fill('#8D6E63')
    this.boundaryGraphics.rect(borderWidth, borderWidth, innerBorder, world.height - borderWidth * 2) // left inner
    this.boundaryGraphics.fill('#8D6E63')
    this.boundaryGraphics.rect(world.width - borderWidth - innerBorder, borderWidth, innerBorder, world.height - borderWidth * 2) // right inner
    this.boundaryGraphics.fill('#8D6E63')
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

    // Arrow keys only (WASD disabled to not interfere with typing)
    if (this.keysPressed.has('arrowup')) {
      dy -= this.MOVE_SPEED
    }
    if (this.keysPressed.has('arrowdown')) {
      dy += this.MOVE_SPEED
    }
    if (this.keysPressed.has('arrowleft')) {
      dx -= this.MOVE_SPEED
    }
    if (this.keysPressed.has('arrowright')) {
      dx += this.MOVE_SPEED
    }

    // Apply movement if any
    if (dx !== 0 || dy !== 0) {
      useGameStore.getState().movePlayer(dx, dy)
    }
  }

  private checkMathTreeCollision(): void {
    const mathStore = useMathStore.getState()

    // Don't check if a problem is already active
    if (mathStore.isActive) return

    const { player, entities } = useGameStore.getState()
    const playerRadius = 25 // Collision radius

    for (const entity of entities) {
      // Only check math trees that haven't been solved
      if (!entity.hasMathSymbol || entity.mathSolved) continue

      // Check distance to tree center
      const treeCenterX = entity.x + entity.width / 2
      const treeCenterY = entity.y + entity.height / 2
      const dx = player.x - treeCenterX
      const dy = player.y - treeCenterY
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Trigger if close enough (tree radius + player radius)
      const triggerDistance = entity.width / 2 + playerRadius + 10

      if (distance < triggerDistance) {
        // Trigger math problem!
        mathStore.triggerMathProblem(entity.id)
        break
      }
    }
  }

  private checkEnemyCollision(): void {
    const gameStore = useGameStore.getState()
    const { player, entities } = gameStore

    // Don't check if invincible
    if (gameStore.isInvincible()) return

    // Don't check if a math problem is active (player is "safe" while solving)
    if (useMathStore.getState().isActive) return

    const playerRadius = 20 // Collision radius for enemies

    for (const entity of entities) {
      // Only check enemy entities (turtles)
      if (!entity.isEnemy) continue

      // Check distance to entity center
      const entityCenterX = entity.x + entity.width / 2
      const entityCenterY = entity.y + entity.height / 2
      const dx = player.x - entityCenterX
      const dy = player.y - entityCenterY
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Collision if close enough
      const collisionDistance = Math.max(entity.width, entity.height) / 2 + playerRadius

      if (distance < collisionDistance) {
        // Hit by enemy!
        playHurtSound()

        // Lose a life
        gameStore.loseLife()

        // Reset duck to center
        gameStore.teleportPlayer(1000, 700)

        // Start invincibility (1.5 seconds)
        gameStore.setInvincible(1500)

        // Game over is handled by GameOverOverlay watching the store
        break
      }
    }
  }

  private renderTerrain(): void {
    if (!this.terrainGraphics) return

    const { world } = useGameStore.getState()

    this.terrainGraphics.clear()
    this.terrainGraphics.rect(0, 0, world.width, world.height)
    this.terrainGraphics.fill(world.terrainColor)
  }

  private renderEntities(): void {
    if (!this.entityContainer) return

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

  private renderPlayer(): void {
    if (!this.playerGraphics) return

    const gameStore = useGameStore.getState()
    const { player, customShapes } = gameStore
    const { x, y, appearance } = player
    // Use level duck size, with breath animation
    const levelDuckSize = useLevelStore.getState().getDuckSize()
    const scale = levelDuckSize * this.breathScale

    // Calculate Y offset - much bigger jump when celebrating!
    let animY = y + this.bobOffset
    if (this.isCelebrating) {
      // Rapid jumping animation
      const jumpHeight = 25 * Math.abs(Math.sin(this.celebrationTime * 12))
      animY = y - jumpHeight
    }

    const g = this.playerGraphics

    g.clear()

    // Flash effect during invincibility (blink at 10Hz)
    if (gameStore.isInvincible()) {
      const flash = Math.floor(this.animationTime * 10) % 2 === 0
      g.alpha = flash ? 0.3 : 1.0
    } else {
      g.alpha = 1.0
    }

    // Check for custom shape first
    const customShape = customShapes.get(appearance.shape.toLowerCase())
    if (customShape) {
      this.drawCustomShape(g, x, animY, scale, customShape)
      return
    }

    // Built-in shapes
    switch (appearance.shape) {
      case 'dinosaur':
        this.drawDinosaur(g, x, animY, scale, appearance.color)
        break
      case 'bunny':
        this.drawBunny(g, x, animY, scale, appearance.color)
        break
      case 'duck':
      default:
        this.drawDuck(g, x, animY, scale, appearance.color)
    }

    // Draw accessory on top (only for duck shape)
    if (appearance.shape === 'duck' || !customShapes.has(appearance.shape.toLowerCase())) {
      const accessory = useLevelStore.getState().getAccessory()
      if (accessory !== 'none') {
        this.drawAccessory(g, x, animY, scale, accessory)
      }
    }
  }

  private drawDuck(g: Graphics, x: number, y: number, scale: number, color: string): void {
    const bodyWidth = 30 * scale
    const bodyHeight = 20 * scale
    const headRadius = 10 * scale
    const beakWidth = 12 * scale
    const beakHeight = 6 * scale

    // Body
    g.ellipse(x, y, bodyWidth / 2, bodyHeight / 2)
    g.fill(color)

    // Head
    const headX = x + bodyWidth * 0.3
    const headY = y - bodyHeight * 0.3
    g.circle(headX, headY, headRadius)
    g.fill(color)

    // Beak
    const beakX = headX + headRadius + beakWidth / 2 - 2
    const beakY = headY + 2
    g.ellipse(beakX, beakY, beakWidth / 2, beakHeight / 2)
    g.fill('#FF8C00')

    // Eye
    const eyeX = headX + 3 * scale
    const eyeY = headY - 2 * scale
    g.circle(eyeX, eyeY, 3 * scale)
    g.fill('#000000')
    g.circle(eyeX + 1 * scale, eyeY - 1 * scale, 1 * scale)
    g.fill('#FFFFFF')
  }

  private drawDinosaur(g: Graphics, x: number, y: number, scale: number, color: string): void {
    // Body (larger oval)
    const bodyWidth = 40 * scale
    const bodyHeight = 25 * scale
    g.ellipse(x, y, bodyWidth / 2, bodyHeight / 2)
    g.fill(color)

    // Head (circle, to the right)
    const headX = x + bodyWidth * 0.4
    const headY = y - bodyHeight * 0.2
    const headRadius = 12 * scale
    g.circle(headX, headY, headRadius)
    g.fill(color)

    // Snout
    const snoutX = headX + headRadius + 6 * scale
    const snoutY = headY + 2 * scale
    g.ellipse(snoutX, snoutY, 8 * scale, 5 * scale)
    g.fill(color)

    // Spikes on back (3 triangles)
    const spikeColor = '#' + (parseInt(color.slice(1), 16) - 0x222222).toString(16).padStart(6, '0')
    for (let i = 0; i < 3; i++) {
      const spikeX = x - 15 * scale + i * 12 * scale
      const spikeY = y - bodyHeight / 2
      g.moveTo(spikeX, spikeY)
      g.lineTo(spikeX + 5 * scale, spikeY - 10 * scale)
      g.lineTo(spikeX + 10 * scale, spikeY)
      g.fill(spikeColor.startsWith('#') ? spikeColor : color)
    }

    // Tail
    const tailX = x - bodyWidth * 0.5
    const tailY = y
    g.moveTo(tailX, tailY)
    g.lineTo(tailX - 20 * scale, tailY + 5 * scale)
    g.lineTo(tailX - 15 * scale, tailY - 5 * scale)
    g.fill(color)

    // Eye
    g.circle(headX + 4 * scale, headY - 3 * scale, 3 * scale)
    g.fill('#000000')
    g.circle(headX + 5 * scale, headY - 4 * scale, 1 * scale)
    g.fill('#FFFFFF')

    // Tiny arms
    g.ellipse(x + 10 * scale, y + 5 * scale, 4 * scale, 6 * scale)
    g.fill(color)
  }

  private drawBunny(g: Graphics, x: number, y: number, scale: number, color: string): void {
    // Body
    const bodyWidth = 25 * scale
    const bodyHeight = 20 * scale
    g.ellipse(x, y, bodyWidth / 2, bodyHeight / 2)
    g.fill(color)

    // Head
    const headX = x + bodyWidth * 0.2
    const headY = y - bodyHeight * 0.4
    const headRadius = 10 * scale
    g.circle(headX, headY, headRadius)
    g.fill(color)

    // Ears (two tall ellipses)
    const earWidth = 5 * scale
    const earHeight = 18 * scale
    g.ellipse(headX - 5 * scale, headY - headRadius - earHeight / 2 + 3 * scale, earWidth / 2, earHeight / 2)
    g.fill(color)
    g.ellipse(headX + 5 * scale, headY - headRadius - earHeight / 2 + 3 * scale, earWidth / 2, earHeight / 2)
    g.fill(color)

    // Inner ears (pink)
    g.ellipse(headX - 5 * scale, headY - headRadius - earHeight / 2 + 3 * scale, earWidth / 3, earHeight / 3)
    g.fill('#FFB6C1')
    g.ellipse(headX + 5 * scale, headY - headRadius - earHeight / 2 + 3 * scale, earWidth / 3, earHeight / 3)
    g.fill('#FFB6C1')

    // Nose (pink)
    g.circle(headX + headRadius - 2 * scale, headY + 2 * scale, 3 * scale)
    g.fill('#FFB6C1')

    // Eye
    g.circle(headX + 3 * scale, headY - 2 * scale, 3 * scale)
    g.fill('#000000')
    g.circle(headX + 4 * scale, headY - 3 * scale, 1 * scale)
    g.fill('#FFFFFF')

    // Fluffy tail
    g.circle(x - bodyWidth * 0.4, y, 6 * scale)
    g.fill('#FFFFFF')
  }

  private drawAccessory(g: Graphics, x: number, y: number, scale: number, accessory: Accessory): void {
    // Duck head position (same as in drawDuck)
    const bodyWidth = 30 * scale
    const bodyHeight = 20 * scale
    const headRadius = 10 * scale
    const headX = x + bodyWidth * 0.3
    const headY = y - bodyHeight * 0.3

    if (accessory === 'beret') {
      // Draw a cute beret on top of the duck's head
      const beretWidth = 16 * scale
      const beretHeight = 8 * scale
      const beretX = headX - 2 * scale
      const beretY = headY - headRadius - 2 * scale

      // Main beret shape (tilted ellipse)
      g.ellipse(beretX, beretY, beretWidth / 2, beretHeight / 2)
      g.fill('#E63946') // Red beret

      // Little nub on top
      g.circle(beretX - beretWidth * 0.3, beretY - beretHeight * 0.2, 3 * scale)
      g.fill('#E63946')

      // Band at bottom of beret
      g.rect(beretX - beretWidth * 0.4, beretY + beretHeight * 0.2, beretWidth * 0.8, 2 * scale)
      g.fill('#C1121F')
    } else if (accessory === 'cape') {
      // Draw a flowing cape behind the duck
      const capeWidth = 35 * scale
      const capeHeight = 30 * scale
      const capeX = x - bodyWidth * 0.3
      const capeY = y - bodyHeight * 0.1

      // Cape main shape (flowing triangle-ish)
      g.moveTo(capeX, capeY - 5 * scale) // Top attachment
      g.lineTo(capeX - capeWidth * 0.4, capeY + capeHeight) // Bottom left
      g.lineTo(capeX + capeWidth * 0.1, capeY + capeHeight * 0.8) // Bottom middle
      g.lineTo(capeX - capeWidth * 0.1, capeY + capeHeight * 0.9) // Wave
      g.lineTo(capeX + capeWidth * 0.3, capeY + capeHeight * 0.6) // Bottom right
      g.lineTo(capeX + 5 * scale, capeY - 5 * scale) // Top right attachment
      g.closePath()
      g.fill('#7B2CBF') // Royal purple cape

      // Cape inner lining (lighter)
      g.moveTo(capeX + 2 * scale, capeY)
      g.lineTo(capeX - capeWidth * 0.25, capeY + capeHeight * 0.7)
      g.lineTo(capeX + capeWidth * 0.15, capeY + capeHeight * 0.5)
      g.closePath()
      g.fill('#9D4EDD') // Lighter purple

      // Collar/clasp
      g.circle(capeX + 2 * scale, capeY - 3 * scale, 4 * scale)
      g.fill('#FFD700') // Gold clasp
    }
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

    // Check for custom shape first
    const { customShapes } = useGameStore.getState()
    const customShape = customShapes.get(entity.shape.toLowerCase())
    if (customShape) {
      // Scale based on entity size (use average of width/height divided by base size of 40)
      const scale = (entity.width + entity.height) / 2 / 40
      this.drawCustomShape(graphics, centerX, centerY, scale, customShape)
      return
    }

    // Built-in shapes
    switch (entity.shape) {
      case 'lake':
        this.drawLake(graphics, entity)
        break
      case 'tree':
        this.drawTree(graphics, entity)
        break
      case 'turtle':
        this.drawTurtle(graphics, entity)
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

    // Foliage (green circle) - use entity color if set, or level color, or special color if solved
    const levelTreeColor = useLevelStore.getState().getTreeColor()
    const foliageX = entity.x + entity.width / 2
    const foliageY = entity.y + foliageRadius
    graphics.circle(foliageX, foliageY, foliageRadius)
    // Priority: solved color > entity color > level color
    const baseColor = entity.color || levelTreeColor
    const foliageColor = entity.mathSolved ? '#32CD32' : baseColor // Lime green if solved
    graphics.fill(foliageColor)

    // Draw question badge if this is a question tree (and not yet solved)
    if (entity.hasMathSymbol && !entity.mathSolved) {
      const badgeRadius = 14
      const badgeX = foliageX
      const badgeY = foliageY

      // Get badge colors based on question type
      const questionType = entity.questionType || 'math'
      const badgeColors = {
        math: { fill: '#FFD700', border: '#FF8C00' },        // Yellow/Orange
        spelling: { fill: '#4A90D9', border: '#2E6BA8' },    // Blue
        pronunciation: { fill: '#9B59B6', border: '#7D3C98' } // Purple
      }
      const colors = badgeColors[questionType] || badgeColors.math

      // Badge circle
      graphics.circle(badgeX, badgeY, badgeRadius)
      graphics.fill(colors.fill)
      graphics.circle(badgeX, badgeY, badgeRadius)
      graphics.stroke({ width: 2, color: colors.border })

      // Draw symbol based on question type
      if (questionType === 'math') {
        // Draw "+" symbol
        const plusSize = 8
        const plusThick = 3
        graphics.rect(badgeX - plusSize/2, badgeY - plusThick/2, plusSize, plusThick)
        graphics.fill('#333333')
        graphics.rect(badgeX - plusThick/2, badgeY - plusSize/2, plusThick, plusSize)
        graphics.fill('#333333')
      } else if (questionType === 'spelling') {
        // Draw "ABC" text placeholder (simple rectangles for now)
        graphics.rect(badgeX - 6, badgeY - 2, 12, 4)
        graphics.fill('#FFFFFF')
      } else if (questionType === 'pronunciation') {
        // Draw speaker icon placeholder (simple shape)
        graphics.rect(badgeX - 3, badgeY - 4, 6, 8)
        graphics.fill('#FFFFFF')
        graphics.moveTo(badgeX + 3, badgeY - 6)
        graphics.lineTo(badgeX + 8, badgeY - 8)
        graphics.lineTo(badgeX + 8, badgeY + 8)
        graphics.lineTo(badgeX + 3, badgeY + 6)
        graphics.closePath()
        graphics.fill('#FFFFFF')
      }
    }

    // Draw checkmark badge if solved
    if (entity.mathSolved) {
      const badgeRadius = 14
      const badgeX = foliageX
      const badgeY = foliageY

      // Green badge circle
      graphics.circle(badgeX, badgeY, badgeRadius)
      graphics.fill('#00AA00')

      // White border
      graphics.circle(badgeX, badgeY, badgeRadius)
      graphics.stroke({ width: 2, color: '#00FF00' })

      // Simple checkmark using a thick "V" shape with rectangles
      // Left part of check
      graphics.rect(badgeX - 5, badgeY - 1, 6, 3)
      graphics.fill('#FFFFFF')
      // Right part of check (rotated effect with position)
      graphics.rect(badgeX - 1, badgeY - 5, 3, 8)
      graphics.fill('#FFFFFF')
    }
  }

  private drawTurtle(graphics: Graphics, entity: EntityConfig): void {
    const centerX = entity.x + entity.width / 2
    const centerY = entity.y + entity.height / 2
    const shellWidth = entity.width * 0.8
    const shellHeight = entity.height * 0.6

    // Get movement direction from behavior state to orient the turtle
    const behaviorStateEntry = this.behaviorState.get(entity.id)
    const dx = behaviorStateEntry?.bounceDir?.dx ?? 1
    const facingRight = dx > 0

    // Shell (dark green oval)
    graphics.ellipse(centerX, centerY, shellWidth / 2, shellHeight / 2)
    graphics.fill('#2D5A27')

    // Shell pattern (lighter green inner oval)
    graphics.ellipse(centerX, centerY, shellWidth * 0.35, shellHeight * 0.35)
    graphics.fill('#4A7C43')

    // Shell border
    graphics.ellipse(centerX, centerY, shellWidth / 2, shellHeight / 2)
    graphics.stroke({ width: 2, color: '#1A3A18' })

    // Head (pokes out in movement direction)
    const headOffsetX = facingRight ? shellWidth * 0.4 : -shellWidth * 0.4
    const headX = centerX + headOffsetX
    const headY = centerY - shellHeight * 0.1
    const headRadius = entity.width * 0.15

    graphics.circle(headX, headY, headRadius)
    graphics.fill('#5B8C52')
    graphics.circle(headX, headY, headRadius)
    graphics.stroke({ width: 1, color: '#2D5A27' })

    // Eyes (two small dots)
    const eyeOffsetX = facingRight ? headRadius * 0.4 : -headRadius * 0.4
    const eyeY = headY - headRadius * 0.2
    graphics.circle(headX + eyeOffsetX, eyeY, 2)
    graphics.fill('#000000')

    // Snapping mouth line
    const mouthX = headX + (facingRight ? headRadius * 0.6 : -headRadius * 0.6)
    graphics.rect(mouthX - 3, headY + 2, 6, 2)
    graphics.fill('#1A3A18')

    // Legs (4 small circles at corners of shell)
    const legRadius = entity.width * 0.08
    const legPositions = [
      { x: centerX - shellWidth * 0.35, y: centerY + shellHeight * 0.3 },  // Back left
      { x: centerX + shellWidth * 0.35, y: centerY + shellHeight * 0.3 },  // Back right
      { x: centerX - shellWidth * 0.3, y: centerY - shellHeight * 0.2 },   // Front left
      { x: centerX + shellWidth * 0.3, y: centerY - shellHeight * 0.2 },   // Front right
    ]
    legPositions.forEach(pos => {
      graphics.circle(pos.x, pos.y, legRadius)
      graphics.fill('#5B8C52')
    })

    // Small tail on the back
    const tailX = centerX + (facingRight ? -shellWidth * 0.45 : shellWidth * 0.45)
    graphics.circle(tailX, centerY, legRadius * 0.7)
    graphics.fill('#5B8C52')
  }

  private startCelebration(): void {
    this.isCelebrating = true
    this.celebrationTime = 0
    this.cakeSprites = []

    if (!this.celebrationContainer) return

    const { player } = useGameStore.getState()

    // Create several cake slices that will fly toward the duck
    for (let i = 0; i < 5; i++) {
      const cake = new Graphics()

      // Draw a cute cake slice
      // Cake base (triangle-ish shape)
      cake.moveTo(0, 0)
      cake.lineTo(20, 10)
      cake.lineTo(20, 25)
      cake.lineTo(0, 25)
      cake.closePath()
      cake.fill('#FFE4B5') // Cream color

      // Frosting on top
      cake.rect(0, 0, 20, 6)
      cake.fill('#FF69B4') // Pink frosting

      // Cherry on top
      cake.circle(10, -3, 5)
      cake.fill('#FF0000')

      // Store initial position data
      const angle = (i / 5) * Math.PI * 2
      const startRadius = 120
      ;(cake as any).startX = player.x + Math.cos(angle) * startRadius
      ;(cake as any).startY = player.y + Math.sin(angle) * startRadius
      ;(cake as any).angle = angle
      ;(cake as any).delay = i * 0.15

      cake.x = (cake as any).startX
      cake.y = (cake as any).startY

      this.cakeSprites.push(cake)
      this.celebrationContainer.addChild(cake)
    }

    // Also add confetti particles
    for (let i = 0; i < 30; i++) {
      const confetti = new Graphics()
      const colors = ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF', '#1DD1A1']
      const color = colors[Math.floor(Math.random() * colors.length)]
      const size = 4 + Math.random() * 6

      confetti.rect(0, 0, size, size)
      confetti.fill(color)

      ;(confetti as any).startX = player.x + (Math.random() - 0.5) * 200
      ;(confetti as any).startY = player.y - 100 - Math.random() * 50
      ;(confetti as any).velX = (Math.random() - 0.5) * 3
      ;(confetti as any).velY = Math.random() * 2 + 1
      ;(confetti as any).rotation = Math.random() * Math.PI * 2
      ;(confetti as any).rotSpeed = (Math.random() - 0.5) * 0.3

      confetti.x = (confetti as any).startX
      confetti.y = (confetti as any).startY

      this.cakeSprites.push(confetti)
      this.celebrationContainer.addChild(confetti)
    }
  }

  private updateCelebration(): void {
    if (!this.celebrationContainer) return

    const { player } = useGameStore.getState()

    for (const sprite of this.cakeSprites) {
      const data = sprite as any

      if (data.angle !== undefined) {
        // This is a cake - fly toward the duck
        const delay = data.delay || 0
        const t = Math.max(0, this.celebrationTime - delay)

        if (t > 0) {
          // Move toward duck with easing
          const progress = Math.min(1, t / 0.8)
          const eased = 1 - Math.pow(1 - progress, 3) // ease out cubic

          sprite.x = data.startX + (player.x - data.startX) * eased
          sprite.y = data.startY + (player.y - 10 - data.startY) * eased

          // Rotate while flying
          sprite.rotation = t * 5

          // Shrink and fade as it reaches the duck (being eaten!)
          if (progress > 0.7) {
            const fadeProgress = (progress - 0.7) / 0.3
            sprite.scale.set(1 - fadeProgress * 0.8)
            sprite.alpha = 1 - fadeProgress
          }
        }
      } else if (data.velY !== undefined) {
        // This is confetti - fall down with physics
        data.velY += 0.1 // gravity
        sprite.x += data.velX
        sprite.y += data.velY
        sprite.rotation += data.rotSpeed

        // Fade out over time
        sprite.alpha = Math.max(0, 1 - this.celebrationTime / 2)
      }
    }
  }

  private stopCelebration(): void {
    this.isCelebrating = false
    this.celebrationTime = 0

    // Clear celebration graphics
    if (this.celebrationContainer) {
      this.celebrationContainer.removeChildren()
    }
    this.cakeSprites = []
  }

  destroy(): void {
    this.isDestroyed = true

    // Remove keyboard listeners
    if (this.onKeyDown) {
      window.removeEventListener('keydown', this.onKeyDown)
      this.onKeyDown = null
    }
    if (this.onKeyUp) {
      window.removeEventListener('keyup', this.onKeyUp)
      this.onKeyUp = null
    }

    // Unsubscribe from stores
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    if (this.unsubscribeMath) {
      this.unsubscribeMath()
      this.unsubscribeMath = null
    }

    // Destroy PixiJS app
    if (this.app) {
      try {
        this.app.destroy(true)
      } catch (e) {
        // Ignore destroy errors during unmount
      }
      this.app = null
    }

    // Clear all references
    this.worldContainer = null
    this.terrainGraphics = null
    this.boundaryGraphics = null
    this.entityContainer = null
    this.playerContainer = null
    this.playerGraphics = null
    this.celebrationContainer = null
    this.cakeSprites = []
  }
}
