import { create } from 'zustand'
import { MathProblem, generateMathProblem, generateLocalMathProblem, getWrongAnswerFeedback } from '../services/mathService'
import { useGameStore } from './gameStore'
import { speak } from '../services/voiceService'

interface MathStore {
  // Current state
  isActive: boolean
  currentProblem: MathProblem | null
  currentTreeId: string | null
  isLoading: boolean
  attempts: number
  lastFeedback: string | null

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

  triggerMathProblem: async (treeId: string) => {
    // Check if tree is already solved
    const entity = useGameStore.getState().getEntity(treeId)
    if (!entity || entity.mathSolved) {
      return
    }

    set({ isLoading: true, isActive: true, currentTreeId: treeId, attempts: 0, lastFeedback: null })

    // Try to get problem from LLM, fall back to local generation
    let problem = await generateMathProblem()
    if (!problem) {
      problem = generateLocalMathProblem()
    }

    set({ currentProblem: problem, isLoading: false })

    // Speak the problem
    speak(problem.speakText)
  },

  submitAnswer: async (answer: number) => {
    const { currentProblem, currentTreeId, attempts } = get()

    if (!currentProblem || !currentTreeId) {
      return { correct: false, feedback: 'No problem active' }
    }

    const isCorrect = answer === currentProblem.answer

    if (isCorrect) {
      // Mark tree as solved
      useGameStore.getState().updateEntity(currentTreeId, { mathSolved: true })

      // Add points
      useGameStore.getState().modifyPoints(10)

      const feedback = "That's right! Great job! You earned 10 points!"
      speak(feedback)

      set({ lastFeedback: feedback })

      // Close after a short delay
      setTimeout(() => {
        get().closeProblem()
      }, 2000)

      return { correct: true, feedback }
    } else {
      // Wrong answer - get encouragement from LLM
      set({ attempts: attempts + 1 })

      const response = await getWrongAnswerFeedback(
        currentProblem.question,
        answer,
        currentProblem.answer
      )

      const feedback = response.hint
        ? `${response.encouragement} ${response.hint}`
        : response.encouragement

      speak(feedback)
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
    })
  },
}))
