import { useState } from 'react'
import { executeCode } from '../sandbox/executor'
import { generateCode } from '../services/llmService'
import { startListening, stopListening, isSupported } from '../services/speechRecognition'

export function CommandPanel() {
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    await processCommand(input)
  }

  const processCommand = async (text: string) => {
    setLoading(true)
    setMessage('Thinking...')

    try {
      const code = await generateCode(text)
      setMessage(`Running: ${code.slice(0, 50)}...`)

      const result = executeCode(code)

      if (result.success) {
        setMessage('Done!')
        setInput('')
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 4000)
    }
  }

  const handleMicClick = () => {
    if (listening) {
      stopListening()
      setListening(false)
      return
    }

    setListening(true)
    setMessage('Listening...')

    startListening(
      (text) => {
        setListening(false)
        setInput(text)
        setMessage(`Heard: "${text}"`)
        processCommand(text)
      },
      (error) => {
        setListening(false)
        setMessage(error)
        setTimeout(() => setMessage(''), 3000)
      }
    )
  }

  return (
    <div className="absolute top-6 right-6 w-96">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a red ball near me..."
            className="flex-1 bg-black/70 text-white text-xl px-5 py-4 rounded-xl"
            disabled={loading || listening}
          />
          {isSupported() && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={loading}
              className={`px-5 py-4 rounded-xl text-white text-2xl ${
                listening
                  ? 'bg-red-600 animate-pulse'
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              🎤
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || listening}
          className="bg-blue-600 text-white text-xl px-5 py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {loading ? 'Working...' : 'Send'}
        </button>
      </form>
      {message && (
        <div className="mt-3 text-lg text-white bg-black/60 px-5 py-3 rounded-xl">
          {message}
        </div>
      )}
    </div>
  )
}
