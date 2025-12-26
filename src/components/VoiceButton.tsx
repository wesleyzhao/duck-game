import { useState, useCallback } from 'react'
import { speechRecognition } from '../services/speechRecognition'

interface VoiceButtonProps {
  onResult: (transcript: string) => void
  onError?: (error: string) => void
  onListeningChange?: (isListening: boolean) => void
  disabled?: boolean
}

export function VoiceButton({ onResult, onError, onListeningChange, disabled }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [hasError, setHasError] = useState(false)

  const updateListening = useCallback((listening: boolean) => {
    setIsListening(listening)
    onListeningChange?.(listening)
  }, [onListeningChange])

  const handleClick = useCallback(() => {
    if (!speechRecognition.isSupported) {
      onError?.('Speech recognition not supported in this browser')
      return
    }

    if (isListening) {
      speechRecognition.stopListening()
      updateListening(false)
      return
    }

    setHasError(false)

    const started = speechRecognition.startListening(
      (transcript) => {
        updateListening(false)
        onResult(transcript)
      },
      (error) => {
        updateListening(false)
        setHasError(true)
        onError?.(error)
        // Clear error state after 2 seconds
        setTimeout(() => setHasError(false), 2000)
      },
      () => {
        updateListening(false)
      }
    )

    if (started) {
      updateListening(true)
    }
  }, [isListening, onResult, onError, updateListening])

  const isDisabled = disabled || !speechRecognition.isSupported

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        p-3 rounded-full transition-all duration-200
        ${isDisabled
          ? 'bg-gray-300 cursor-not-allowed'
          : isListening
            ? 'bg-red-500 animate-pulse shadow-lg shadow-red-300'
            : hasError
              ? 'bg-orange-500'
              : 'bg-blue-500 hover:bg-blue-600'
        }
        text-white
      `}
      title={
        isDisabled
          ? 'Speech recognition not supported'
          : isListening
            ? 'Click to stop listening'
            : 'Click to speak'
      }
    >
      {isListening ? (
        // Listening icon (filled mic with waves)
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      ) : (
        // Mic icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 10v2a7 7 0 01-14 0v-2"
          />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  )
}
