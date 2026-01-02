// Voice service with ElevenLabs TTS and browser fallback

export type VoiceProvider = 'browser' | 'elevenlabs'

interface VoiceConfig {
  provider: VoiceProvider
  elevenLabsVoiceId: string
}

// Default config - ElevenLabs if API key available
let currentConfig: VoiceConfig = {
  provider: 'elevenlabs',
  elevenLabsVoiceId: 'jBpfuIE2acCO8z3wKNLl', // "Lily" - warm, friendly British female voice
}

// Audio element for ElevenLabs playback
let currentAudio: HTMLAudioElement | null = null

// Debounce tracking to prevent rapid repeated calls
let lastSpeakTime = 0
let lastSpeakText = ''
const DEBOUNCE_MS = 300

export function setVoiceProvider(provider: VoiceProvider): void {
  currentConfig.provider = provider
}

export function setElevenLabsVoice(voiceId: string): void {
  currentConfig.elevenLabsVoiceId = voiceId
}

export function getVoiceProvider(): VoiceProvider {
  return currentConfig.provider
}

// Stop any currently playing audio
export function stopSpeaking(): void {
  window.speechSynthesis.cancel()

  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
}

// Main speak function - routes to appropriate provider
export async function speak(text: string): Promise<void> {
  // Debounce: skip if same text requested within debounce window
  const now = Date.now()
  if (text === lastSpeakText && now - lastSpeakTime < DEBOUNCE_MS) {
    return
  }
  lastSpeakTime = now
  lastSpeakText = text

  stopSpeaking()

  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY

  // Use ElevenLabs if configured and API key exists
  if (currentConfig.provider === 'elevenlabs' && apiKey) {
    try {
      await speakWithElevenLabs(text, apiKey)
      return
    } catch (error) {
      // Only log if it's not an abort error (those are expected when stopping)
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.warn('ElevenLabs failed, falling back to browser speech:', error)
      }
      // Fall back to browser speech
    }
  }

  // Use browser speech as fallback or if configured
  speakWithBrowser(text)
}

// ElevenLabs TTS
async function speakWithElevenLabs(text: string, apiKey: string): Promise<void> {
  const voiceId = currentConfig.elevenLabsVoiceId

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.6,
          use_speaker_boost: true,
          speed: 0.95,
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`)
  }

  const audioBlob = await response.blob()
  const audioUrl = URL.createObjectURL(audioBlob)

  return new Promise((resolve, reject) => {
    currentAudio = new Audio(audioUrl)
    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      currentAudio = null
      resolve()
    }
    currentAudio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl)
      currentAudio = null
      reject(e)
    }
    currentAudio.play().catch(reject)
  })
}

// Browser built-in TTS
function speakWithBrowser(text: string): void {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.9
  utterance.pitch = 1.1
  utterance.volume = 1

  const voices = window.speechSynthesis.getVoices()
  const preferredVoice = voices.find(v =>
    v.name.includes('Samantha') ||
    v.name.includes('Victoria') ||
    v.name.includes('Karen') ||
    v.lang.startsWith('en')
  )
  if (preferredVoice) {
    utterance.voice = preferredVoice
  }

  window.speechSynthesis.speak(utterance)
}

// Number to word conversion for math problems
const numberWords: Record<number, string> = {
  0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four',
  5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine',
  10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen',
  14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen',
  18: 'eighteen', 19: 'nineteen', 20: 'twenty',
}

export function speakMathProblem(question: string): void {
  // Convert "3 + 5 = ?" to "What is three plus five?"
  const match = question.match(/(\d+)\s*([+\-])\s*(\d+)/)
  if (match) {
    const a = parseInt(match[1])
    const op = match[2] === '+' ? 'plus' : 'minus'
    const b = parseInt(match[3])

    const aWord = numberWords[a] || a.toString()
    const bWord = numberWords[b] || b.toString()

    speak(`What is ${aWord} ${op} ${bWord}?`)
  } else {
    speak(question)
  }
}

// Popular ElevenLabs voice IDs for reference:
// - jBpfuIE2acCO8z3wKNLl: Lily (warm British female) - CURRENT
// - EXAVITQu4vr4xnSDxMaL: Sarah (friendly female)
// - 21m00Tcm4TlvDq8ikWAM: Rachel (calm female)
// - AZnzlk1XvdvUeBnXmlld: Domi (young female)
// - MF3mGyEYCl7XYWbV9V6O: Elli (young female)
// - TxGEqnHWrfWFTfGW9XjX: Josh (young male)
// - yoZ06aMxZJJ28mfd3POQ: Sam (young male)
