import { SandboxAPI } from './SandboxAPI'
import { SandboxExecutionResult } from './types'

export function executeSandboxedCode(code: string): SandboxExecutionResult {
  const sandbox = new SandboxAPI()

  // Safe globals available to the code
  const safeGlobals = {
    game: sandbox,
    Math,
    parseInt,
    parseFloat,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    console: {
      log: (...args: unknown[]) => sandbox.log(...args),
    },
    // Block dangerous globals
    window: undefined,
    document: undefined,
    fetch: undefined,
    localStorage: undefined,
    sessionStorage: undefined,
    XMLHttpRequest: undefined,
    WebSocket: undefined,
    eval: undefined,
    Function: undefined,
  }

  const globalNames = Object.keys(safeGlobals)
  const globalValues = Object.values(safeGlobals)

  try {
    // Create function with restricted scope
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...globalNames, code)

    // Execute the code
    fn(...globalValues)

    // Get the message from say() calls
    const messages = sandbox.getMessages()
    const message = messages.length > 0 ? messages[messages.length - 1] : undefined

    return {
      success: true,
      message,
      changes: sandbox.getChanges(),
      rollback: () => sandbox.rollback(),
    }
  } catch (error) {
    // Rollback any changes that were made before the error
    sandbox.rollback()

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      changes: [],
      rollback: () => {},
    }
  }
}
