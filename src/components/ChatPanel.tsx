import { useState } from 'react'
import { executeSandboxedCode } from '../sandbox/executor'
import { useHistoryStore } from '../store/historyStore'
import { callLLM, buildGameContext } from '../services/llmService'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'game'; content: string }>>([
    { role: 'game', content: "Hi! I'm DuckWorld! Try saying 'make the grass purple' or 'add a red ball'" },
  ])

  const { undo, redo, canUndo, canRedo, addEntry } = useHistoryStore()

  const addMessage = (role: 'user' | 'game', content: string) => {
    setMessages((prev) => [...prev, { role, content }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userInput = input.trim()
    setInput('')
    addMessage('user', userInput)

    // Handle special commands
    if (userInput.toLowerCase() === 'undo') {
      if (canUndo()) {
        undo()
        addMessage('game', 'Undone! ✨')
      } else {
        addMessage('game', 'Nothing to undo.')
      }
      return
    }

    if (userInput.toLowerCase() === 'redo') {
      if (canRedo()) {
        redo()
        addMessage('game', 'Redone! ✨')
      } else {
        addMessage('game', 'Nothing to redo.')
      }
      return
    }

    // Check if it looks like direct code (for testing)
    const isDirectCode = userInput.startsWith('game.')

    if (isDirectCode) {
      // Execute directly
      const result = executeSandboxedCode(userInput)
      if (result.success) {
        addEntry(userInput, result)
        addMessage('game', result.message || 'Done!')
      } else {
        addMessage('game', `Error: ${result.error}`)
      }
      return
    }

    // Natural language - call LLM
    setIsLoading(true)

    try {
      const context = buildGameContext()
      const llmResponse = await callLLM(userInput, context)

      if (llmResponse.error) {
        addMessage('game', `Oops! ${llmResponse.error}`)
        setIsLoading(false)
        return
      }

      // Execute the LLM-generated code
      const result = executeSandboxedCode(llmResponse.code)

      if (result.success) {
        addEntry(userInput, result)
        addMessage('game', result.message || 'Done!')
      } else {
        addMessage('game', `Oops, something went wrong! ${result.error}`)
      }
    } catch (error) {
      addMessage('game', 'Oh no! I had trouble understanding that.')
    }

    setIsLoading(false)
  }

  return (
    <div className="w-80 bg-amber-50 border-4 border-amber-600 rounded-lg flex flex-col h-96">
      {/* Header */}
      <div className="bg-amber-600 text-white px-3 py-2 font-bold">
        🦆 Talk to DuckWorld!
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 rounded-lg text-sm ${
              msg.role === 'user'
                ? 'bg-blue-100 text-blue-800 ml-4'
                : 'bg-amber-100 text-amber-800 mr-4'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="bg-amber-100 text-amber-800 mr-4 p-2 rounded-lg text-sm animate-pulse">
            Thinking... 🦆
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-amber-300">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say something..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-amber-400"
          >
            {isLoading ? '...' : '💬'}
          </button>
        </div>
      </form>
    </div>
  )
}
