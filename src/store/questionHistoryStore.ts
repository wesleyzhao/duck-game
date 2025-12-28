import { create } from 'zustand'

export type QuestionType = 'math' | 'spelling' | 'pronunciation'

export interface AnswerRecord {
  answer: string | number
  correct: boolean
  timestamp: number
}

export interface QuestionRecord {
  id: string
  treeId: string
  type: QuestionType
  question: string
  correctAnswer: string | number
  userAnswers: AnswerRecord[]
  solved: boolean
  level: number
}

interface QuestionHistoryStore {
  history: QuestionRecord[]

  // Actions
  addQuestion: (record: Omit<QuestionRecord, 'userAnswers' | 'solved'>) => void
  recordAnswer: (questionId: string, answer: string | number, correct: boolean) => void
  markSolved: (questionId: string) => void
  getStats: () => {
    totalQuestions: number
    totalCorrect: number
    totalIncorrect: number
    byType: Record<QuestionType, { correct: number; incorrect: number }>
    byLevel: Record<number, { correct: number; incorrect: number }>
  }
  getHistoryForLLM: () => string
  clearHistory: () => void
}

export const useQuestionHistoryStore = create<QuestionHistoryStore>((set, get) => ({
  history: [],

  addQuestion: (record) => {
    set((state) => ({
      history: [
        ...state.history,
        {
          ...record,
          userAnswers: [],
          solved: false,
        },
      ],
    }))
  },

  recordAnswer: (questionId, answer, correct) => {
    set((state) => ({
      history: state.history.map((q) =>
        q.id === questionId
          ? {
              ...q,
              userAnswers: [
                ...q.userAnswers,
                { answer, correct, timestamp: Date.now() },
              ],
            }
          : q
      ),
    }))
  },

  markSolved: (questionId) => {
    set((state) => ({
      history: state.history.map((q) =>
        q.id === questionId ? { ...q, solved: true } : q
      ),
    }))
  },

  getStats: () => {
    const history = get().history
    const byType: Record<QuestionType, { correct: number; incorrect: number }> = {
      math: { correct: 0, incorrect: 0 },
      spelling: { correct: 0, incorrect: 0 },
      pronunciation: { correct: 0, incorrect: 0 },
    }
    const byLevel: Record<number, { correct: number; incorrect: number }> = {}

    let totalCorrect = 0
    let totalIncorrect = 0

    for (const question of history) {
      // Initialize level stats if needed
      if (!byLevel[question.level]) {
        byLevel[question.level] = { correct: 0, incorrect: 0 }
      }

      for (const answer of question.userAnswers) {
        if (answer.correct) {
          totalCorrect++
          byType[question.type].correct++
          byLevel[question.level].correct++
        } else {
          totalIncorrect++
          byType[question.type].incorrect++
          byLevel[question.level].incorrect++
        }
      }
    }

    return {
      totalQuestions: history.length,
      totalCorrect,
      totalIncorrect,
      byType,
      byLevel,
    }
  },

  getHistoryForLLM: () => {
    const history = get().history
    const stats = get().getStats()

    if (history.length === 0) {
      return 'No questions answered yet.'
    }

    // Get recent questions (last 10)
    const recentQuestions = history.slice(-10)

    // Build a summary for the LLM
    const lines: string[] = [
      `Student Progress Summary:`,
      `- Total questions attempted: ${stats.totalQuestions}`,
      `- Correct answers: ${stats.totalCorrect}`,
      `- Incorrect answers: ${stats.totalIncorrect}`,
      `- Success rate: ${stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / (stats.totalCorrect + stats.totalIncorrect)) * 100) : 0}%`,
      '',
      'Recent questions:',
    ]

    for (const q of recentQuestions) {
      const attempts = q.userAnswers.length
      const wrongAttempts = q.userAnswers.filter((a) => !a.correct).length
      const status = q.solved ? 'Solved' : 'Not solved'
      lines.push(
        `- "${q.question}" (${q.type}, Level ${q.level}): ${status}, ${attempts} attempt(s), ${wrongAttempts} wrong`
      )
    }

    // Add insights about what the student struggles with
    if (stats.totalIncorrect > 0) {
      lines.push('')
      lines.push('Observations:')

      // Check for patterns in wrong answers
      const mathStats = stats.byType.math
      if (mathStats.incorrect > mathStats.correct && mathStats.incorrect > 2) {
        lines.push('- Student may need easier math problems or more practice')
      }

      // Check level difficulty
      for (const [level, levelStats] of Object.entries(stats.byLevel)) {
        if (levelStats.incorrect > levelStats.correct * 2) {
          lines.push(`- Level ${level} seems challenging - consider adjusting difficulty`)
        }
      }
    }

    return lines.join('\n')
  },

  clearHistory: () => {
    set({ history: [] })
  },
}))
