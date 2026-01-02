// Sound effects using Web Audio API

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

// Play a tone
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
) {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch (e) {
    // Ignore audio errors
  }
}

// Math tree discovery sound - magical "found something" chime
export function playMathTreeSound() {
  playTone(523, 0.1, 'sine', 0.25) // C5
  setTimeout(() => playTone(659, 0.1, 'sine', 0.25), 80) // E5
  setTimeout(() => playTone(784, 0.15, 'sine', 0.3), 160) // G5
}

// Correct answer celebration - triumphant fanfare
export function playCorrectSound() {
  // Ascending triumphant notes
  playTone(523, 0.12, 'sine', 0.3)  // C5
  setTimeout(() => playTone(659, 0.12, 'sine', 0.3), 100)  // E5
  setTimeout(() => playTone(784, 0.12, 'sine', 0.3), 200)  // G5
  setTimeout(() => playTone(1047, 0.25, 'sine', 0.35), 300) // C6 (held)

  // Add a sparkle overlay
  setTimeout(() => playTone(1319, 0.08, 'sine', 0.2), 400) // E6
  setTimeout(() => playTone(1568, 0.08, 'sine', 0.15), 450) // G6
}

// Wrong answer - gentle "try again" sound
export function playWrongSound() {
  playTone(330, 0.15, 'triangle', 0.2) // E4
  setTimeout(() => playTone(277, 0.2, 'triangle', 0.15), 120) // C#4
}

// Hurt by enemy - quick descending "ouch" sound
export function playHurtSound() {
  playTone(440, 0.08, 'sawtooth', 0.25) // A4
  setTimeout(() => playTone(330, 0.08, 'sawtooth', 0.2), 60) // E4
  setTimeout(() => playTone(220, 0.15, 'sawtooth', 0.15), 120) // A3
}
