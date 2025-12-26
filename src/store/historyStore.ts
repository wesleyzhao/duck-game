import { create } from 'zustand'
import { SandboxExecutionResult } from '../sandbox/types'

interface HistoryEntry {
  id: string
  timestamp: number
  userInput: string
  result: SandboxExecutionResult
}

interface HistoryStore {
  entries: HistoryEntry[]
  currentIndex: number

  addEntry: (userInput: string, result: SandboxExecutionResult) => void
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: [],
  currentIndex: -1,

  addEntry: (userInput, result) =>
    set((state) => {
      // Remove any entries after current index (discard redo history)
      const entries = state.entries.slice(0, state.currentIndex + 1)

      const newEntry: HistoryEntry = {
        id: `history-${Date.now()}`,
        timestamp: Date.now(),
        userInput,
        result,
      }

      return {
        entries: [...entries, newEntry],
        currentIndex: entries.length,
      }
    }),

  undo: () => {
    const { entries, currentIndex } = get()

    if (currentIndex < 0) return false

    const entry = entries[currentIndex]
    entry.result.rollback()

    set({ currentIndex: currentIndex - 1 })
    return true
  },

  redo: () => {
    const { entries, currentIndex } = get()

    if (currentIndex >= entries.length - 1) return false

    const nextEntry = entries[currentIndex + 1]

    // Re-apply all forward changes
    for (const change of nextEntry.result.changes) {
      change.forward()
    }

    set({ currentIndex: currentIndex + 1 })
    return true
  },

  canUndo: () => get().currentIndex >= 0,

  canRedo: () => {
    const { entries, currentIndex } = get()
    return currentIndex < entries.length - 1
  },

  clear: () => set({ entries: [], currentIndex: -1 }),
}))
