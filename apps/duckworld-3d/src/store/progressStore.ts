import { create } from 'zustand'

// Extensible question types - only math implemented for now
export type QuestionType = 'math' | 'spelling' | 'pronunciation'

export interface QuestionAttempt {
  questionType: QuestionType
  question: string
  correctAnswer: string
  userAnswer: string
  correct: boolean
  attempts: number        // How many tries before getting it right (or giving up)
  timestamp: number
  level: number
  treeId: string
}

interface ProgressState {
  history: QuestionAttempt[]
  totalCorrect: number
  totalIncorrect: number
  currentStreak: number   // Consecutive correct answers

  // Actions
  recordAttempt: (attempt: QuestionAttempt) => void
  getRecentHistory: (count?: number) => QuestionAttempt[]
  getHistoryByType: (type: QuestionType) => QuestionAttempt[]
  getSummaryForLLM: () => string
  resetProgress: () => void
}

const MAX_HISTORY_SIZE = 100

export const useProgressStore = create<ProgressState>((set, get) => ({
  history: [],
  totalCorrect: 0,
  totalIncorrect: 0,
  currentStreak: 0,

  recordAttempt: (attempt) => {
    set((state) => {
      const newHistory = [...state.history, attempt].slice(-MAX_HISTORY_SIZE)

      return {
        history: newHistory,
        totalCorrect: state.totalCorrect + (attempt.correct ? 1 : 0),
        totalIncorrect: state.totalIncorrect + (attempt.correct ? 0 : 1),
        currentStreak: attempt.correct ? state.currentStreak + 1 : 0,
      }
    })
  },

  getRecentHistory: (count = 10) => {
    const { history } = get()
    return history.slice(-count)
  },

  getHistoryByType: (type) => {
    const { history } = get()
    return history.filter((h) => h.questionType === type)
  },

  getSummaryForLLM: () => {
    const { history, totalCorrect, totalIncorrect, currentStreak } = get()
    const recent = history.slice(-20)

    if (recent.length === 0) {
      return 'No previous attempts. This is a new player.'
    }

    // Calculate stats by question type
    const mathAttempts = recent.filter((h) => h.questionType === 'math')
    const mathCorrect = mathAttempts.filter((h) => h.correct).length

    // Find patterns in wrong answers
    const wrongAnswers = recent
      .filter((h) => !h.correct)
      .map((h) => `Q: "${h.question}" - User said "${h.userAnswer}", correct was "${h.correctAnswer}"`)
      .slice(-5)

    // Get recent questions to avoid repetition
    const recentQuestions = recent
      .map((h) => h.question)
      .slice(-10)

    // Build summary
    const lines = [
      `Player stats: ${totalCorrect} correct, ${totalIncorrect} incorrect total.`,
      `Current streak: ${currentStreak} correct in a row.`,
      `Recent performance (last ${recent.length}): ${mathCorrect}/${mathAttempts.length} math correct.`,
    ]

    if (wrongAnswers.length > 0) {
      lines.push(`Recent mistakes: ${wrongAnswers.join('; ')}`)
    }

    if (recentQuestions.length > 0) {
      lines.push(`DO NOT REPEAT these recent questions: ${recentQuestions.join(', ')}`)
    }

    // Detect if player is struggling
    const recentCorrectRate = recent.filter((h) => h.correct).length / recent.length
    if (recentCorrectRate < 0.5) {
      lines.push('Player appears to be struggling - consider easier questions.')
    } else if (recentCorrectRate > 0.8 && recent.length >= 5) {
      lines.push('Player is doing well - can increase difficulty.')
    }

    return lines.join(' ')
  },

  resetProgress: () => {
    set({
      history: [],
      totalCorrect: 0,
      totalIncorrect: 0,
      currentStreak: 0,
    })
  },
}))
