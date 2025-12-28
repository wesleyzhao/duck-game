import { useEffect } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { HUD } from './components/HUD'
import { ChatPanel } from './components/ChatPanel'
import { MathProblemModal } from './components/MathProblemModal'
import { LevelCompleteOverlay } from './components/LevelCompleteOverlay'
import { useLevelStore } from './store/levelStore'
import { useTimerStore } from './store/timerStore'

function App() {
  // Initialize game when first loaded
  useEffect(() => {
    // Pre-generate questions for level 1
    useLevelStore.getState().generateQuestionsForLevel()
    // Start the game timer
    useTimerStore.getState().startTimer()
  }, [])

  return (
    <div className="min-h-screen bg-sky-200 flex items-center justify-center p-8 gap-4">
      <div className="relative">
        <GameCanvas />
        <HUD />
      </div>
      <ChatPanel />
      <MathProblemModal />
      <LevelCompleteOverlay />
    </div>
  )
}

export default App
