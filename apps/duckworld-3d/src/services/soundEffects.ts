// Sound effects using Web Audio API (no external files needed)

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

// Play a tone with specified frequency and duration
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
): void {
  const ctx = getAudioContext()

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  // Envelope: quick attack, sustain, quick release
  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + duration - 0.05)
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

// Play a sequence of tones
function playMelody(notes: { freq: number; dur: number }[], type: OscillatorType = 'sine'): void {
  const ctx = getAudioContext()
  let time = ctx.currentTime

  for (const note of notes) {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(note.freq, time)

    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(0.2, time + 0.01)
    gainNode.gain.linearRampToValueAtTime(0.2, time + note.dur - 0.02)
    gainNode.gain.linearRampToValueAtTime(0, time + note.dur)

    oscillator.start(time)
    oscillator.stop(time + note.dur)

    time += note.dur
  }
}

// Exported sound effects
export const SoundEffects = {
  // Correct answer - happy ascending tones
  correct(): void {
    playMelody([
      { freq: 523.25, dur: 0.1 },  // C5
      { freq: 659.25, dur: 0.1 },  // E5
      { freq: 783.99, dur: 0.2 },  // G5
    ], 'sine')
  },

  // Wrong answer - descending buzz
  wrong(): void {
    playTone(200, 0.3, 'sawtooth', 0.15)
  },

  // Points collected - coin sound
  points(): void {
    playMelody([
      { freq: 987.77, dur: 0.08 },  // B5
      { freq: 1318.51, dur: 0.15 }, // E6
    ], 'square')
  },

  // Entity created - pop sound
  create(): void {
    playTone(880, 0.1, 'sine', 0.2)
  },

  // Entity removed - reverse pop
  remove(): void {
    playTone(440, 0.15, 'sine', 0.2)
  },

  // Collision - soft thud
  collision(): void {
    playTone(150, 0.1, 'triangle', 0.3)
  },

  // Walking/stepping - light tap
  step(): void {
    playTone(300 + Math.random() * 50, 0.05, 'triangle', 0.1)
  },

  // Teleport - woosh
  teleport(): void {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(200, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  },

  // Undo - rewind sound
  undo(): void {
    playMelody([
      { freq: 600, dur: 0.08 },
      { freq: 500, dur: 0.08 },
      { freq: 400, dur: 0.08 },
    ], 'triangle')
  },

  // Redo - forward sound
  redo(): void {
    playMelody([
      { freq: 400, dur: 0.08 },
      { freq: 500, dur: 0.08 },
      { freq: 600, dur: 0.08 },
    ], 'triangle')
  },

  // Health lost - hurt sound
  hurt(): void {
    playMelody([
      { freq: 400, dur: 0.1 },
      { freq: 300, dur: 0.15 },
    ], 'sawtooth')
  },

  // Health gained - heal sound
  heal(): void {
    playMelody([
      { freq: 523.25, dur: 0.1 },
      { freq: 659.25, dur: 0.1 },
      { freq: 523.25, dur: 0.1 },
    ], 'sine')
  },

  // Cheats enabled - secret sound
  cheats(): void {
    playMelody([
      { freq: 392, dur: 0.1 },   // G4
      { freq: 523.25, dur: 0.1 }, // C5
      { freq: 659.25, dur: 0.1 }, // E5
      { freq: 783.99, dur: 0.1 }, // G5
      { freq: 1046.5, dur: 0.2 }, // C6
    ], 'square')
  },

  // Math problem appears
  mathAppear(): void {
    playMelody([
      { freq: 698.46, dur: 0.1 },  // F5
      { freq: 880, dur: 0.15 },     // A5
    ], 'sine')
  },

  // Hit map boundary
  boundary(): void {
    playTone(150, 0.15, 'square', 0.25)
  },

  // Level up - triumphant fanfare
  levelUp(): void {
    playMelody([
      { freq: 523.25, dur: 0.15 },  // C5
      { freq: 659.25, dur: 0.15 },  // E5
      { freq: 783.99, dur: 0.15 },  // G5
      { freq: 1046.5, dur: 0.15 },  // C6
      { freq: 783.99, dur: 0.1 },   // G5
      { freq: 1046.5, dur: 0.3 },   // C6
    ], 'square')
  },

  // Game complete - victory fanfare
  gameComplete(): void {
    playMelody([
      { freq: 523.25, dur: 0.2 },   // C5
      { freq: 523.25, dur: 0.2 },   // C5
      { freq: 523.25, dur: 0.2 },   // C5
      { freq: 523.25, dur: 0.4 },   // C5
      { freq: 415.30, dur: 0.4 },   // Ab4
      { freq: 466.16, dur: 0.4 },   // Bb4
      { freq: 523.25, dur: 0.2 },   // C5
      { freq: 466.16, dur: 0.15 },  // Bb4
      { freq: 523.25, dur: 0.6 },   // C5
    ], 'square')
  },

  // Game over - sad descending tones
  gameOver(): void {
    playMelody([
      { freq: 392, dur: 0.3 },    // G4
      { freq: 349.23, dur: 0.3 }, // F4
      { freq: 329.63, dur: 0.3 }, // E4
      { freq: 261.63, dur: 0.5 }, // C4
    ], 'sawtooth')
  },
}
