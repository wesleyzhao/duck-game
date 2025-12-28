import { create } from 'zustand'

interface TimerStore {
  // State
  elapsedTime: number        // Current game time in seconds
  isRunning: boolean         // Is timer active
  bestTime: number | null    // Best completion time this session

  // Actions
  startTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
  tick: (deltaSeconds: number) => void
  recordBestTime: () => void
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  elapsedTime: 0,
  isRunning: false,
  bestTime: null,

  startTimer: () => {
    set({ isRunning: true })
  },

  stopTimer: () => {
    set({ isRunning: false })
  },

  resetTimer: () => {
    set({ elapsedTime: 0, isRunning: false })
  },

  tick: (deltaSeconds: number) => {
    const state = get()
    if (state.isRunning) {
      set({ elapsedTime: state.elapsedTime + deltaSeconds })
    }
  },

  recordBestTime: () => {
    const state = get()
    const currentTime = state.elapsedTime

    // Only record if we have a time and it's better than previous best
    if (currentTime > 0) {
      if (state.bestTime === null || currentTime < state.bestTime) {
        set({ bestTime: currentTime })
      }
    }
  },
}))

// Helper function to format time as M:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const wholeSecs = Math.floor(seconds % 60)

  return `${mins}:${wholeSecs.toString().padStart(2, '0')}`
}
