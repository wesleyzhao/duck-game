import { create } from 'zustand'
import { MathProblem, generateLocalMathProblem } from '../services/mathService'
import { useGameStore } from './gameStore'
import { speak } from '../services/voiceService'
import { playMathTreeSound, playCorrectSound, playWrongSound } from '../services/soundEffects'

// Local encouraging feedback for wrong answers (faster than LLM)
const wrongAnswerFeedback = [
  "Almost! Try again, you've got this!",
  "Not quite, but keep trying!",
  "Oops! Give it another shot!",
  "So close! Try one more time!",
  "That's okay! Math takes practice. Try again!",
  "Hmm, not that one. You can do it!",
]

function getRandomFeedback(): string {
  return wrongAnswerFeedback[Math.floor(Math.random() * wrongAnswerFeedback.length)]
}

interface MathStore {
  // Current state
  isActive: boolean
  currentProblem: MathProblem | null
  currentTreeId: string | null
  isLoading: boolean
  attempts: number
  lastFeedback: string | null
  showCelebration: boolean

  // Actions
  triggerMathProblem: (treeId: string) => Promise<void>
  submitAnswer: (answer: number) => Promise<{ correct: boolean; feedback: string }>
  closeProblem: () => void
}

export const useMathStore = create<MathStore>((set, get) => ({
  isActive: false,
  currentProblem: null,
  currentTreeId: null,
  isLoading: false,
  attempts: 0,
  lastFeedback: null,
  showCelebration: false,

  triggerMathProblem: async (treeId: string) => {
    const state = get()

    // Don't trigger if already active
    if (state.isActive || state.isLoading) {
      return
    }

    // Check if tree is already solved
    const entity = useGameStore.getState().getEntity(treeId)
    if (!entity || entity.mathSolved) {
      return
    }

    // Reset everything and set loading
    set({
      isLoading: true,
      isActive: true,
      currentTreeId: treeId,
      currentProblem: null,
      attempts: 0,
      lastFeedback: null
    })

    // Play discovery sound
    playMathTreeSound()

    // Always use local generation for reliability (LLM can be slow/unreliable)
    // This ensures unique random problems each time
    const problem = generateLocalMathProblem()

    set({ currentProblem: problem, isLoading: false })

    // Speak the problem after a short delay for the sound effect
    setTimeout(() => {
      speak(problem.speakText)
    }, 400)
  },

  submitAnswer: async (answer: number) => {
    const { currentProblem, currentTreeId, attempts } = get()

    if (!currentProblem || !currentTreeId) {
      return { correct: false, feedback: 'No problem active' }
    }

    const isCorrect = answer === currentProblem.answer

    if (isCorrect) {
      // Play celebration sound immediately
      playCorrectSound()

      // Show visual celebration (this triggers the game map celebration)
      set({ showCelebration: true })

      // Mark tree as solved
      useGameStore.getState().updateEntity(currentTreeId, { mathSolved: true })

      // Add points
      useGameStore.getState().modifyPoints(10)

      const feedback = "That's right! Great job! You earned 10 points!"

      // Close modal immediately so user can see the duck celebration on the map!
      set({
        isActive: false,
        currentProblem: null,
        currentTreeId: null,
        isLoading: false,
        attempts: 0,
        lastFeedback: null,
        // Keep showCelebration true - it will be cleared after the animation
      })

      // Delay voice until after sound effect plays
      setTimeout(() => {
        speak(feedback)
      }, 500)

      // End celebration after animation completes
      setTimeout(() => {
        set({ showCelebration: false })
      }, 2500)

      return { correct: true, feedback }
    } else {
      // Wrong answer - play gentle sound and give encouraging feedback
      playWrongSound()
      set({ attempts: attempts + 1 })

      const feedback = getRandomFeedback()

      // Short delay so sound plays first
      setTimeout(() => {
        speak(feedback)
      }, 200)

      set({ lastFeedback: feedback })

      return { correct: false, feedback }
    }
  },

  closeProblem: () => {
    set({
      isActive: false,
      currentProblem: null,
      currentTreeId: null,
      isLoading: false,
      attempts: 0,
      lastFeedback: null,
      showCelebration: false,
    })
  },
}))
