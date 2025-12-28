import { useEffect, useState } from 'react'
import { useLevelStore } from '../store/levelStore'
import { useGameStore } from '../store/gameStore'
import { useTimerStore, formatTime } from '../store/timerStore'
import { speak } from '../services/voiceService'

export function LevelCompleteOverlay() {
  const showTransition = useLevelStore((state) => state.showLevelTransition)
  const currentLevel = useLevelStore((state) => state.currentLevel)
  const elapsedTime = useTimerStore((state) => state.elapsedTime)
  const bestTime = useTimerStore((state) => state.bestTime)
  const [isPreparingNext, setIsPreparingNext] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  // Capture the completed level when transition starts (so it doesn't change mid-animation)
  const [completedLevel, setCompletedLevel] = useState(0)
  // Capture the final time when game is won
  const [finalTime, setFinalTime] = useState(0)

  useEffect(() => {
    if (showTransition && !isPreparingNext) {
      // Capture the level that was just completed
      setCompletedLevel(currentLevel)
      setShowMessage(true)
      setIsPreparingNext(true)

      // If game is won (level 3 complete), stop timer and record best time
      if (currentLevel >= 3) {
        setFinalTime(elapsedTime)
        useTimerStore.getState().stopTimer()
        useTimerStore.getState().recordBestTime()
      }

      // Announce level complete
      const nextLevel = currentLevel + 1
      if (currentLevel < 3) {
        speak(`Amazing! You completed level ${currentLevel}! Get ready for level ${nextLevel}!`)
      } else {
        speak(`Incredible! You completed all the levels! You are a math champion!`)
      }

      // Wait for celebration, then advance level
      setTimeout(() => {
        if (currentLevel < 3) {
          // Reset trees for new level
          regenerateTreesForLevel(currentLevel + 1)

          // Advance to next level
          useLevelStore.getState().advanceLevel()

          // Reset duck to center of map so it doesn't immediately touch a tree
          useGameStore.getState().teleportPlayer(1000, 700)

          // Pre-generate questions in background (non-blocking)
          useLevelStore.getState().generateQuestionsForLevel()
        }

        // Hide the overlay
        setShowMessage(false)
        setIsPreparingNext(false)
        useLevelStore.getState().setShowLevelTransition(false)
      }, 3000)
    }
  }, [showTransition, currentLevel, isPreparingNext])

  if (!showMessage) return null

  // Use the captured level for display (not the reactive currentLevel which changes mid-animation)
  const isGameComplete = completedLevel >= 3

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="text-center animate-bounce-in">
        {isGameComplete ? (
          <>
            <div className="text-8xl mb-4">🏆</div>
            <h1 className="text-6xl font-bold text-yellow-400 drop-shadow-lg mb-4">
              YOU WIN!
            </h1>
            <p className="text-2xl text-white">
              You completed all 3 levels!
            </p>
            <div className="mt-4 bg-slate-800/80 rounded-xl px-6 py-3 inline-block">
              <p className="text-3xl text-white font-mono">
                ⏱️ Time: {formatTime(finalTime)}
              </p>
              {bestTime !== null && finalTime <= bestTime && (
                <p className="text-xl text-yellow-300 mt-1">
                  🎉 New Best Time!
                </p>
              )}
            </div>
            <p className="text-xl text-yellow-200 mt-4">
              You're a math champion! 🎉
            </p>
          </>
        ) : (
          <>
            <div className="text-8xl mb-4">🎉</div>
            <h1 className="text-6xl font-bold text-green-400 drop-shadow-lg mb-4">
              Level {completedLevel} Complete!
            </h1>
            <p className="text-2xl text-white">
              Get ready for Level {completedLevel + 1}!
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {completedLevel + 1 === 2 && <span className="text-4xl">🎨</span>}
              {completedLevel + 1 === 3 && <span className="text-4xl">🦸</span>}
            </div>
          </>
        )}
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

// Helper function to regenerate trees for a new level
function regenerateTreesForLevel(level: number) {
  const gameStore = useGameStore.getState()
  const entities = gameStore.entities

  // Count how many trees we need for this level
  const treesNeeded = level === 1 ? 3 : level === 2 ? 4 : 5

  // Get current trees and reset their solved status
  const trees = entities.filter(e => e.shape === 'tree' && e.hasMathSymbol)

  // Reset existing math trees
  trees.forEach(tree => {
    gameStore.updateEntity(tree.id, { mathSolved: false })
  })

  // If we need more trees than we have, we'll add some
  // For now, we just enable more of the existing trees
  const allTrees = entities.filter(e => e.shape === 'tree')

  // Shuffle and pick trees to be math trees
  const shuffled = [...allTrees].sort(() => Math.random() - 0.5)
  const selectedTrees = shuffled.slice(0, treesNeeded)

  // Reset all trees first
  allTrees.forEach(tree => {
    gameStore.updateEntity(tree.id, {
      hasMathSymbol: false,
      mathSolved: false,
    })
  })

  // Enable selected trees for math
  selectedTrees.forEach(tree => {
    gameStore.updateEntity(tree.id, {
      hasMathSymbol: true,
      mathSolved: false,
    })
  })
}
