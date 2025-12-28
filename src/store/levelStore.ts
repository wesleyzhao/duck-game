import { create } from 'zustand'
import { LevelConfig, getLevelConfig, Accessory } from '../config/levels'
import { MathProblem, generateLocalMathProblem } from '../services/mathService'

interface LevelStore {
  // State
  currentLevel: 1 | 2 | 3
  treesSolved: number
  levelComplete: boolean
  showLevelTransition: boolean
  preGeneratedQuestions: MathProblem[]
  isGeneratingQuestions: boolean

  // Computed getters
  getLevelConfig: () => LevelConfig
  getTreesRequired: () => number
  getAccessory: () => Accessory
  getDuckSize: () => number
  getTerrainColor: () => string
  getTreeColor: () => string

  // Actions
  incrementTreesSolved: () => void
  checkLevelComplete: () => boolean
  advanceLevel: () => void
  resetLevel: () => void
  setShowLevelTransition: (show: boolean) => void

  // Question pre-generation
  generateQuestionsForLevel: () => Promise<void>
  getNextQuestion: () => MathProblem
}

export const useLevelStore = create<LevelStore>((set, get) => ({
  currentLevel: 1,
  treesSolved: 0,
  levelComplete: false,
  showLevelTransition: false,
  preGeneratedQuestions: [],
  isGeneratingQuestions: false,

  getLevelConfig: () => getLevelConfig(get().currentLevel),

  getTreesRequired: () => getLevelConfig(get().currentLevel).treesRequired,

  getAccessory: () => getLevelConfig(get().currentLevel).accessory,

  getDuckSize: () => getLevelConfig(get().currentLevel).duckSize,

  getTerrainColor: () => getLevelConfig(get().currentLevel).terrainColor,

  getTreeColor: () => getLevelConfig(get().currentLevel).treeColor,

  incrementTreesSolved: () => {
    set((state) => ({ treesSolved: state.treesSolved + 1 }))
  },

  checkLevelComplete: () => {
    const state = get()
    const config = getLevelConfig(state.currentLevel)
    const isComplete = state.treesSolved >= config.treesRequired

    if (isComplete && !state.levelComplete) {
      set({ levelComplete: true })
    }

    return isComplete
  },

  advanceLevel: () => {
    const state = get()
    if (state.currentLevel < 3) {
      const nextLevel = (state.currentLevel + 1) as 1 | 2 | 3
      set({
        currentLevel: nextLevel,
        treesSolved: 0,
        levelComplete: false,
        showLevelTransition: false,
        preGeneratedQuestions: [], // Clear for new level
        isGeneratingQuestions: false, // Reset so new questions can be generated
      })
    }
  },

  resetLevel: () => {
    set({
      currentLevel: 1,
      treesSolved: 0,
      levelComplete: false,
      showLevelTransition: false,
      preGeneratedQuestions: [],
    })
  },

  setShowLevelTransition: (show) => {
    set({ showLevelTransition: show })
  },

  generateQuestionsForLevel: async () => {
    const state = get()
    if (state.isGeneratingQuestions) return

    set({ isGeneratingQuestions: true })

    const config = getLevelConfig(state.currentLevel)
    const questions: MathProblem[] = []

    // Generate all questions for this level
    // Use local generation for variety (LLM tends to repeat with same context)
    for (let i = 0; i < config.treesRequired; i++) {
      const problem = generateLocalMathProblem(config.difficulty)
      questions.push(problem)
    }

    set({
      preGeneratedQuestions: questions,
      isGeneratingQuestions: false,
    })

    console.log(`Pre-generated ${questions.length} questions for level ${state.currentLevel}:`,
      questions.map(q => q.question))
  },

  getNextQuestion: () => {
    const state = get()
    if (state.preGeneratedQuestions.length === 0) {
      // Fallback if no pre-generated questions available
      console.log('getNextQuestion: No pre-generated questions, generating locally')
      const config = getLevelConfig(state.currentLevel)
      return generateLocalMathProblem(config.difficulty)
    }

    // Get the next question (based on trees solved)
    const questionIndex = state.treesSolved
    console.log(`getNextQuestion: treesSolved=${questionIndex}, returning question[${questionIndex}]:`,
      state.preGeneratedQuestions[questionIndex]?.question)

    if (questionIndex < state.preGeneratedQuestions.length) {
      return state.preGeneratedQuestions[questionIndex]
    }

    // Fallback if we've used all pre-generated questions
    const config = getLevelConfig(state.currentLevel)
    return generateLocalMathProblem(config.difficulty)
  },
}))
