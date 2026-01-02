import { SandboxAPI } from './SandboxAPI'

export function executeCode(code: string): { success: boolean; error?: string } {
  try {
    // Create restricted function with only 'game' available
    const fn = new Function('game', code)
    fn(SandboxAPI)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
