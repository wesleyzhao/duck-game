import { useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { useCodeEditorStore } from '../store/codeEditorStore'
import { executeSandboxedCode } from '../sandbox/executor'
import { useHistoryStore } from '../store/historyStore'

export function CodeIDEPanel() {
  const {
    code,
    setCode,
    executionStatus,
    executionMessage,
    setExecutionResult,
    isGenerating,
    clearEditor,
  } = useCodeEditorStore()

  const { addEntry } = useHistoryStore()

  const handleRunCode = useCallback(() => {
    if (!code.trim()) return

    setExecutionResult('running')

    // Small delay to show "running" state
    setTimeout(() => {
      const result = executeSandboxedCode(code)

      if (result.success) {
        addEntry('Code execution', result)
        setExecutionResult('success', result.message || 'Code executed successfully!')
      } else {
        setExecutionResult('error', result.error || 'Unknown error')
      }
    }, 100)
  }, [code, setExecutionResult, addEntry])

  const handleClear = useCallback(() => {
    clearEditor()
  }, [clearEditor])

  return (
    <div className="w-full max-w-[1200px] bg-gray-900 border-4 border-gray-700 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-green-400 text-2xl font-mono">{'</>'}</span>
          <span className="text-white font-bold text-lg">Code Editor</span>
          {isGenerating && (
            <span className="text-yellow-400 animate-pulse ml-2 text-sm">
              Writing code...
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 text-sm font-medium transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleRunCode}
            disabled={!code.trim() || executionStatus === 'running'}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed font-bold text-sm transition-colors"
          >
            {executionStatus === 'running' ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="border-t border-gray-700">
        <CodeMirror
          value={code}
          height="180px"
          theme="dark"
          extensions={[javascript()]}
          onChange={(value) => setCode(value)}
          placeholder={`// Type code here or use the chat to generate it!
// Example: game.setSkyColor("purple")
// Then click "Run Code" to see it work!`}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: false,
          }}
        />
      </div>

      {/* Output Bar */}
      {executionMessage && (
        <div
          className={`px-4 py-2 text-sm font-mono border-t ${
            executionStatus === 'success'
              ? 'bg-green-900/50 text-green-300 border-green-700'
              : executionStatus === 'error'
                ? 'bg-red-900/50 text-red-300 border-red-700'
                : 'bg-gray-800 text-gray-300 border-gray-700'
          }`}
        >
          {executionStatus === 'success' && '✓ '}
          {executionStatus === 'error' && '✗ '}
          {executionMessage}
        </div>
      )}
    </div>
  )
}
