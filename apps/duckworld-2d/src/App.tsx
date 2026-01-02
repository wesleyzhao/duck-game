import { useEffect } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { HUD } from './components/HUD'
import { ChatPanel } from './components/ChatPanel'
import { CodeIDEPanel } from './components/CodeIDEPanel'
import { MathProblemModal } from './components/MathProblemModal'
import { LevelCompleteOverlay } from './components/LevelCompleteOverlay'
import { GameOverOverlay } from './components/GameOverOverlay'
import { useLevelStore } from './store/levelStore'
import { useTimerStore } from './store/timerStore'
import { useGameStore } from './store/gameStore'
import { getLevelConfig } from './config/levels'

// Spawn turtles for a level
function spawnTurtlesForLevel(level: number) {
  const gameStore = useGameStore.getState()
  const config = getLevelConfig(level)
  const world = gameStore.world

  // Remove existing turtles
  const existingTurtles = gameStore.entities.filter(e => e.shape === 'turtle')
  existingTurtles.forEach(turtle => {
    gameStore.removeEntity(turtle.id)
  })

  // Spawn new turtles
  for (let i = 0; i < config.turtleCount; i++) {
    // Random position avoiding the center (where duck spawns)
    let x: number, y: number
    do {
      x = 100 + Math.random() * (world.width - 200)
      y = 100 + Math.random() * (world.height - 200)
    } while (Math.abs(x - 1000) < 200 && Math.abs(y - 700) < 200) // Avoid center

    // Speed based on level config with slight variation
    const speed = config.turtleSpeed + Math.random() * 0.4

    gameStore.addEntity({
      id: `turtle-${level}-${i}-${Date.now()}`,
      name: `Turtle ${i + 1}`,
      x,
      y,
      width: 50,
      height: 40,
      shape: 'turtle',
      color: '#2D5A27',
      solid: false,
      behaviors: [{ type: 'bounce', speed }],
      isEnemy: true,
    })
  }
}

function App() {
  // Initialize game when first loaded
  useEffect(() => {
    // Pre-generate questions for level 1
    useLevelStore.getState().generateQuestionsForLevel()
    // Spawn turtles for level 1
    spawnTurtlesForLevel(1)
    // Start the game timer
    useTimerStore.getState().startTimer()
  }, [])

  return (
    <div className="min-h-screen bg-sky-200 flex flex-col items-center p-4 gap-4">
      {/* Game and Chat side by side */}
      <div className="flex gap-4">
        <div className="relative">
          <GameCanvas />
          <HUD />
        </div>
        <ChatPanel />
      </div>

      {/* Code Editor below */}
      <CodeIDEPanel />

      {/* Modals */}
      <MathProblemModal />
      <LevelCompleteOverlay />
      <GameOverOverlay />
    </div>
  )
}

export default App
