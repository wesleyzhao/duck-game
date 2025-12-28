import { GameCanvas } from './components/GameCanvas'
import { HUD } from './components/HUD'
import { ChatPanel } from './components/ChatPanel'
import { MathProblemModal } from './components/MathProblemModal'
import { LevelCompleteOverlay } from './components/LevelCompleteOverlay'

function App() {
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
