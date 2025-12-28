import { create } from 'zustand'
import { MathProblem, Difficulty, generateMathProblemWithContext } from '../services/mathService'
import { useGameStore } from './gameStore'
import { useQuestionHistoryStore } from './questionHistoryStore'
import { speak } from '../services/voiceService'
import { playMathTreeSound, playCorrectSound, playWrongSound } from '../services/soundEffects'

// Map level to difficulty
function getLevelDifficulty(level: number): Difficulty {
  switch (level) {
    case 1: return 'easy'
    case 2: return 'medium'
    case 3: return 'hard'
    default: return 'easy'
  }
}

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
  currentQuestionId: string | null  // For history tracking
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
  currentQuestionId: null,
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
      currentQuestionId: null,
      attempts: 0,
      lastFeedback: null
    })

    // Play discovery sound
    playMathTreeSound()

    // Get current level (will be from levelStore once implemented, default to 1)
    const currentLevel = 1 // TODO: Get from levelStore
    const difficulty = getLevelDifficulty(currentLevel)

    // Get history context for LLM
    const historyContext = useQuestionHistoryStore.getState().getHistoryForLLM()

    // Generate problem using LLM with context (falls back to local if API unavailable)
    const problem = await generateMathProblemWithContext(difficulty, historyContext)

    // Generate unique question ID and add to history
    const questionId = `math-${treeId}-${Date.now()}`
    useQuestionHistoryStore.getState().addQuestion({
      id: questionId,
      treeId: treeId,
      type: 'math',
      question: problem.question,
      correctAnswer: problem.answer,
      level: currentLevel,
    })

    set({ currentProblem: problem, currentQuestionId: questionId, isLoading: false })

    // Speak the problem after a short delay for the sound effect
    setTimeout(() => {
      speak(problem.speakText)
    }, 400)
  },

  submitAnswer: async (answer: number) => {
    const { currentProblem, currentTreeId, currentQuestionId, attempts } = get()

    if (!currentProblem || !currentTreeId || !currentQuestionId) {
      return { correct: false, feedback: 'No problem active' }
    }

    const isCorrect = answer === currentProblem.answer

    // Record the answer in history
    useQuestionHistoryStore.getState().recordAnswer(currentQuestionId, answer, isCorrect)

    if (isCorrect) {
      // Mark as solved in history
      useQuestionHistoryStore.getState().markSolved(currentQuestionId)

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
        currentQuestionId: null,
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
      currentQuestionId: null,
      isLoading: false,
      attempts: 0,
      lastFeedback: null,
      showCelebration: false,
    })
  },
}))
