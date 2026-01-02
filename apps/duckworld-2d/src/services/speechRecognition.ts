// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export type SpeechRecognitionCallback = (transcript: string) => void
export type SpeechRecognitionErrorCallback = (error: string) => void

class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null
  private _isListening = false
  private onResultCallback: SpeechRecognitionCallback | null = null
  private onErrorCallback: SpeechRecognitionErrorCallback | null = null
  private onEndCallback: (() => void) | null = null

  constructor() {
    this.initRecognition()
  }

  private initRecognition(): void {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      console.warn('Speech recognition not supported in this browser')
      return
    }

    this.recognition = new SpeechRecognitionAPI()
    this.recognition.continuous = false
    this.recognition.interimResults = false
    this.recognition.lang = 'en-US'

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex]
      if (result.isFinal) {
        const transcript = result[0].transcript.trim()
        if (transcript && this.onResultCallback) {
          this.onResultCallback(transcript)
        }
      }
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      this._isListening = false

      if (this.onErrorCallback) {
        let errorMessage = 'Speech recognition error'
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Try again!'
            break
          case 'audio-capture':
            errorMessage = 'No microphone found'
            break
          case 'not-allowed':
            errorMessage = 'Microphone access denied'
            break
          case 'network':
            errorMessage = 'Network error occurred'
            break
          case 'aborted':
            // User or system aborted, don't show error
            return
        }
        this.onErrorCallback(errorMessage)
      }
    }

    this.recognition.onend = () => {
      this._isListening = false
      if (this.onEndCallback) {
        this.onEndCallback()
      }
    }

    this.recognition.onstart = () => {
      this._isListening = true
    }
  }

  get isSupported(): boolean {
    return this.recognition !== null
  }

  get isListening(): boolean {
    return this._isListening
  }

  startListening(
    onResult: SpeechRecognitionCallback,
    onError?: SpeechRecognitionErrorCallback,
    onEnd?: () => void
  ): boolean {
    if (!this.recognition) {
      onError?.('Speech recognition not supported')
      return false
    }

    if (this._isListening) {
      return true
    }

    this.onResultCallback = onResult
    this.onErrorCallback = onError || null
    this.onEndCallback = onEnd || null

    try {
      this.recognition.start()
      return true
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      onError?.('Failed to start listening')
      return false
    }
  }

  stopListening(): void {
    if (this.recognition && this._isListening) {
      this.recognition.stop()
    }
  }

  abort(): void {
    if (this.recognition && this._isListening) {
      this.recognition.abort()
    }
  }
}

// Singleton instance
export const speechRecognition = new SpeechRecognitionService()
