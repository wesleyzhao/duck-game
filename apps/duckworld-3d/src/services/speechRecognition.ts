type SpeechCallback = (text: string) => void
type ErrorCallback = (error: string) => void

interface SpeechRecognitionEvent {
  results: { [key: number]: { [key: number]: { transcript: string } } }
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: SpeechRecognitionErrorEvent) => void
  onend: () => void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

let recognition: SpeechRecognition | null = null

export function isSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function startListening(
  onResult: SpeechCallback,
  onError: ErrorCallback
): void {
  if (!isSupported()) {
    onError('Speech recognition not supported in this browser')
    return
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()

  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    onResult(transcript)
  }

  recognition.onerror = (event) => {
    onError(`Speech error: ${event.error}`)
  }

  recognition.onend = () => {
    recognition = null
  }

  recognition.start()
}

export function stopListening(): void {
  if (recognition) {
    recognition.stop()
    recognition = null
  }
}
