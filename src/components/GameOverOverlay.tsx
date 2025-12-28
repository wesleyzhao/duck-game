import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useLevelStore } from '../store/levelStore'
import { useTimerStore } from '../store/timerStore'
import { getLevelConfig } from '../config/levels'
import { speak } from '../services/voiceService'

export function GameOverOverlay() {
  const lives = useGameStore((state) => state.player.lives)
  const [showOverlay, setShowOverlay] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)

  useEffect(() => {
    // Trigger game over when lives reach 0
    if (lives === 0 && !showOverlay && !isRestarting) {
      setShowOverlay(true)
      useTimerStore.getState().stopTimer()
      speak('Oh no! Game over. Try again!')
    }
  }, [lives, showOverlay, isRestarting])

  const handleRestart = () => {
    setIsRestarting(true)

    // Reset game state
    const gameStore = useGameStore.getState()
    const timerStore = useTimerStore.getState()
    const levelStore = useLevelStore.getState()

    // Reset lives
    gameStore.resetLives()

    // Reset to level 1
    levelStore.resetLevel()

    // Reset timer (but keep best time)
    timerStore.resetTimer()
    timerStore.startTimer()

    // Reset duck position
    gameStore.teleportPlayer(1000, 700)

    // Remove all turtles and respawn for level 1
    const existingTurtles = gameStore.entities.filter(e => e.shape === 'turtle')
    existingTurtles.forEach(turtle => {
      gameStore.removeEntity(turtle.id)
    })

    // Spawn turtles for level 1
    const config = getLevelConfig(1)
    const world = gameStore.world
    for (let i = 0; i < config.turtleCount; i++) {
      let x: number, y: number
      do {
        x = 100 + Math.random() * (world.width - 200)
        y = 100 + Math.random() * (world.height - 200)
      } while (Math.abs(x - 1000) < 200 && Math.abs(y - 700) < 200)

      const speed = 1.5 + Math.random() * 0.5

      gameStore.addEntity({
        id: `turtle-restart-${i}-${Date.now()}`,
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

    // Reset all trees
    const allTrees = gameStore.entities.filter(e => e.shape === 'tree')
    const shuffled = [...allTrees].sort(() => Math.random() - 0.5)
    const treesNeeded = config.treesRequired

    allTrees.forEach(tree => {
      gameStore.updateEntity(tree.id, {
        hasMathSymbol: false,
        mathSolved: false,
      })
    })

    shuffled.slice(0, treesNeeded).forEach(tree => {
      gameStore.updateEntity(tree.id, {
        hasMathSymbol: true,
        mathSolved: false,
      })
    })

    // Pre-generate questions
    levelStore.generateQuestionsForLevel()

    // Hide overlay
    setShowOverlay(false)
    setIsRestarting(false)
  }

  if (!showOverlay) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center animate-bounce-in">
        <div className="text-8xl mb-4">💔</div>
        <h1 className="text-6xl font-bold text-red-500 drop-shadow-lg mb-4">
          GAME OVER
        </h1>
        <p className="text-2xl text-white mb-6">
          The turtles got you!
        </p>
        <button
          onClick={handleRestart}
          className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white text-2xl font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
        >
          Try Again
        </button>
      </div>

      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
