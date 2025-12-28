import { create } from 'zustand'

type ExecutionStatus = 'idle' | 'running' | 'success' | 'error'

interface CodeEditorStore {
  // Editor state
  code: string
  setCode: (code: string) => void

  // Execution state
  executionStatus: ExecutionStatus
  executionMessage: string | null
  setExecutionResult: (status: ExecutionStatus, message?: string) => void

  // LLM loading state
  isGenerating: boolean
  setIsGenerating: (isGenerating: boolean) => void

  // Clear all
  clearEditor: () => void
}

export const useCodeEditorStore = create<CodeEditorStore>((set) => ({
  code: '',
  setCode: (code) => set({ code }),

  executionStatus: 'idle',
  executionMessage: null,
  setExecutionResult: (status, message) =>
    set({
      executionStatus: status,
      executionMessage: message || null,
    }),

  isGenerating: false,
  setIsGenerating: (isGenerating) => set({ isGenerating }),

  clearEditor: () =>
    set({
      code: '',
      executionStatus: 'idle',
      executionMessage: null,
    }),
}))
