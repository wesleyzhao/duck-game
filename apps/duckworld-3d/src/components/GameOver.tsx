import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { useMathStore } from '../store/mathStore'
import { SoundEffects } from '../services/soundEffects'
import { speak } from '../services/speechOutput'

export function GameOver() {
  const isGameOver = useGameStore((state) => state.isGameOver)
  const resetGame = useGameStore((state) => state.resetGame)
  const stopGameTimer = useGameStore((state) => state.stopGameTimer)
  const hideProblem = useMathStore((state) => state.hideProblem)
  const resetSolvedTrees = useMathStore((state) => state.resetSolvedTrees)

  useEffect(() => {
    if (isGameOver) {
      stopGameTimer()
      SoundEffects.gameOver()
      speak('Game over. Tap play again to restart.')
    }
  }, [isGameOver, stopGameTimer])

  if (!isGameOver) return null

  const handleRestart = () => {
    hideProblem()
    resetSolvedTrees()
    resetGame()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white/95 rounded-3xl px-10 py-12 text-center shadow-2xl max-w-lg w-[90%] animate-pop-in">
        <div className="text-5xl md:text-6xl font-bold text-red-600">Game Over</div>
        <div className="mt-4 text-xl md:text-2xl text-gray-700">
          You ran out of lives. Want to try again?
        </div>
        <button
          onClick={handleRestart}
          className="mt-8 px-8 py-4 text-2xl bg-green-500 text-white rounded-2xl hover:bg-green-600 transition"
        >
          Play Again
        </button>
      </div>

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.85); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in {
          animation: popIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
