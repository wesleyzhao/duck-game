import { useState, useCallback, useEffect } from 'react'
import { useHistoryStore } from '../store/historyStore'
import { useCodeEditorStore } from '../store/codeEditorStore'
import { callLLM, buildGameContext } from '../services/llmService'
import { speak, stopSpeaking } from '../services/voiceService'
import { VoiceButton } from './VoiceButton'

const WELCOME_MESSAGE = "Hi! I'm DuckWorld! Try saying 'make the grass purple' or click the mic to speak!"

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'game'; content: string }>>([
    { role: 'game', content: WELCOME_MESSAGE },
  ])

  const { undo, redo, canUndo, canRedo } = useHistoryStore()
  const { setCode, setIsGenerating, setExecutionResult } = useCodeEditorStore()

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  const addMessage = useCallback((role: 'user' | 'game', content: string) => {
    setMessages((prev) => [...prev, { role, content }])
    // Speak game responses out loud
    if (role === 'game') {
      speak(content)
    }
  }, [])

  const processMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isLoading) return

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
      // Put direct code in editor instead of executing
      setCode(userInput)
      setExecutionResult('idle')
      addMessage('game', 'Code ready! Click "Run Code" below to execute.')
      return
    }

    // Natural language - call LLM
    setIsLoading(true)
    setIsGenerating(true)

    try {
      const context = buildGameContext()
      const llmResponse = await callLLM(userInput, context)

      if (llmResponse.error) {
        addMessage('game', `Oops! ${llmResponse.error}`)
        setIsLoading(false)
        setIsGenerating(false)
        return
      }

      // Put LLM-generated code in editor (DON'T execute - let user click Run)
      setCode(llmResponse.code)
      setExecutionResult('idle')
      addMessage('game', 'I wrote some code for you! Check the editor below and click "Run Code" when ready!')
    } catch (error) {
      addMessage('game', 'Oh no! I had trouble understanding that.')
    }

    setIsLoading(false)
    setIsGenerating(false)
  }, [isLoading, addMessage, canUndo, canRedo, undo, redo, setCode, setIsGenerating, setExecutionResult])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const userInput = input.trim()
    setInput('')
    await processMessage(userInput)
  }

  const handleVoiceResult = useCallback((transcript: string) => {
    processMessage(transcript)
  }, [processMessage])

  const handleVoiceError = useCallback((error: string) => {
    addMessage('game', error)
  }, [addMessage])

  const handleListeningChange = useCallback((listening: boolean) => {
    setIsListening(listening)
  }, [])

  return (
    <div className="w-[420px] bg-amber-50 border-4 border-amber-600 rounded-2xl flex flex-col h-[550px]">
      {/* Header */}
      <div className="bg-amber-600 text-white px-5 py-4 font-bold text-2xl rounded-t-xl">
        🦆 Talk to DuckWorld!
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl text-xl leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-100 text-blue-800 ml-6'
                : 'bg-amber-100 text-amber-800 mr-6'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="bg-amber-100 text-amber-800 mr-6 p-4 rounded-xl text-xl animate-pulse">
            Thinking... 🦆
          </div>
        )}
        {isListening && (
          <div className="bg-red-100 text-red-800 mr-6 p-4 rounded-xl text-xl animate-pulse">
            🎤 Listening...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t-2 border-amber-300">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or click mic..."
            disabled={isLoading || isListening}
            className="flex-1 min-w-0 px-4 py-3 border-2 border-amber-300 rounded-xl text-xl focus:outline-none focus:border-amber-500 disabled:bg-gray-100"
          />
          <VoiceButton
            onResult={handleVoiceResult}
            onError={handleVoiceError}
            onListeningChange={handleListeningChange}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || isListening}
            className="px-4 py-3 bg-amber-600 text-white text-2xl rounded-xl hover:bg-amber-700 disabled:bg-amber-400 flex-shrink-0"
          >
            {isLoading ? '...' : '💬'}
          </button>
        </div>
      </form>
    </div>
  )
}
