import { create } from 'zustand'
import { SoundEffects } from '../services/soundEffects'

interface Change {
  description: string
  undo: () => void
  redo: () => void
}

interface HistoryStore {
  past: Change[]
  future: Change[]

  // Record a change
  record: (change: Change) => void

  // Undo last change
  undo: () => void

  // Redo last undone change
  redo: () => void

  // Clear history
  clear: () => void

  // Check if can undo/redo
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],

  record: (change) => {
    set((state) => ({
      past: [...state.past, change],
      future: [], // Clear redo stack on new action
    }))
  },

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return

    const change = past[past.length - 1]
    change.undo()
    SoundEffects.undo()

    set({
      past: past.slice(0, -1),
      future: [change, ...future],
    })
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return

    const change = future[0]
    change.redo()
    SoundEffects.redo()

    set({
      past: [...past, change],
      future: future.slice(1),
    })
  },

  clear: () => {
    set({ past: [], future: [] })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))
