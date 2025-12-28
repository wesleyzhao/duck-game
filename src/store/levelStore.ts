import { create } from 'zustand'
import { LevelConfig, getLevelConfig, Accessory } from '../config/levels'

interface LevelStore {
  // State
  currentLevel: 1 | 2 | 3
  treesSolved: number
  levelComplete: boolean
  showLevelTransition: boolean

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
}

export const useLevelStore = create<LevelStore>((set, get) => ({
  currentLevel: 1,
  treesSolved: 0,
  levelComplete: false,
  showLevelTransition: false,

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
      })
    }
  },

  resetLevel: () => {
    set({
      currentLevel: 1,
      treesSolved: 0,
      levelComplete: false,
      showLevelTransition: false,
    })
  },

  setShowLevelTransition: (show) => {
    set({ showLevelTransition: show })
  },
}))
