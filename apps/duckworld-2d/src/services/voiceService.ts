// Voice service with support for multiple TTS providers

export type VoiceProvider = 'browser' | 'elevenlabs'

interface VoiceConfig {
  provider: VoiceProvider
  elevenLabsVoiceId?: string
}

// Default config - can be changed at runtime
let currentConfig: VoiceConfig = {
  provider: 'elevenlabs', // Default to ElevenLabs if API key is available
  elevenLabsVoiceId: 'jBpfuIE2acCO8z3wKNLl', // "Lily" - warm, friendly British female voice
}

// Audio element for ElevenLabs playback
let currentAudio: HTMLAudioElement | null = null

export function setVoiceProvider(provider: VoiceProvider) {
  currentConfig.provider = provider
}

export function setElevenLabsVoice(voiceId: string) {
  currentConfig.elevenLabsVoiceId = voiceId
}

export function getVoiceProvider(): VoiceProvider {
  return currentConfig.provider
}

// Stop any currently playing audio
export function stopSpeaking() {
  // Stop browser speech
  window.speechSynthesis.cancel()

  // Stop ElevenLabs audio
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
}

// Main speak function - routes to appropriate provider
export async function speak(text: string): Promise<void> {
  stopSpeaking()

  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY

  // Use ElevenLabs if configured and API key exists
  if (currentConfig.provider === 'elevenlabs' && apiKey) {
    try {
      await speakWithElevenLabs(text, apiKey)
      return
    } catch (error) {
      console.warn('ElevenLabs failed, falling back to browser speech:', error)
      // Fall back to browser speech
    }
  }

  // Use browser speech as fallback or if configured
  speakWithBrowser(text)
}

// ElevenLabs TTS
async function speakWithElevenLabs(text: string, apiKey: string): Promise<void> {
  const voiceId = currentConfig.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL'

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
        model_id: 'eleven_multilingual_v2', // Higher quality, better pacing
        voice_settings: {
          stability: 0.5, // Balanced for natural variation
          similarity_boost: 0.8,
          style: 0.6, // More expressive and friendly
          use_speaker_boost: true,
          speed: 0.95, // Slightly slower than normal
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

// Popular ElevenLabs voice IDs for reference:
// - jBpfuIE2acCO8z3wKNLl: Lily (warm British female) - CURRENT
// - EXAVITQu4vr4xnSDxMaL: Sarah (friendly female)
// - 21m00Tcm4TlvDq8ikWAM: Rachel (calm female)
// - AZnzlk1XvdvUeBnXmlld: Domi (young female)
// - MF3mGyEYCl7XYWbV9V6O: Elli (young female)
// - TxGEqnHWrfWFTfGW9XjX: Josh (young male)
// - yoZ06aMxZJJ28mfd3POQ: Sam (young male)
