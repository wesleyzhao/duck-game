import { create } from 'zustand'
import type { Question } from '../services/questionService'

interface QuestionStore {
  currentProblem: Question | null
  solvedTrees: Set<string>
  attempts: number
  isCelebrating: boolean

  // Actions
  showProblem: (problem: Question) => void
  hideProblem: () => void
  checkAnswer: (answer: string | number) => boolean
  markTreeSolved: (treeId: string) => void
  isTreeSolved: (treeId: string) => boolean
  getSolvedTreeCount: () => number
  resetSolvedTrees: () => void
  startCelebration: () => void
  stopCelebration: () => void
}

export const useMathStore = create<QuestionStore>((set, get) => ({
  currentProblem: null,
  solvedTrees: new Set(),
  attempts: 0,
  isCelebrating: false,

  showProblem: (problem) => {
    set({ currentProblem: problem, attempts: 0 })
  },

  hideProblem: () => {
    set({ currentProblem: null, attempts: 0 })
  },

  checkAnswer: (answer) => {
    const { currentProblem, attempts } = get()
    if (!currentProblem) return false

    // Compare answers (handle both string and number)
    const correctAnswer = currentProblem.answer
    const isCorrect =
      typeof correctAnswer === 'number'
        ? Number(answer) === correctAnswer
        : String(answer).toLowerCase() === String(correctAnswer).toLowerCase()

    if (isCorrect) {
      return true
    } else {
      set({ attempts: attempts + 1 })
      return false
    }
  },

  markTreeSolved: (treeId) => {
    set((state) => {
      const newSolved = new Set(state.solvedTrees)
      newSolved.add(treeId)
      return { solvedTrees: newSolved }
    })
  },

  isTreeSolved: (treeId) => {
    return get().solvedTrees.has(treeId)
  },

  getSolvedTreeCount: () => {
    return get().solvedTrees.size
  },

  resetSolvedTrees: () => {
    set({ solvedTrees: new Set() })
  },

  startCelebration: () => {
    set({ isCelebrating: true })
    // Auto-stop after 2.5 seconds
    setTimeout(() => {
      get().stopCelebration()
    }, 2500)
  },

  stopCelebration: () => {
    set({ isCelebrating: false })
  },
}))
