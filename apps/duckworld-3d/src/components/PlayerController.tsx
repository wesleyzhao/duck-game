import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'

const MOVE_SPEED = 10 // Units per second

export function PlayerController() {
  const movePlayer = useGameStore((state) => state.movePlayer)
  const startGameTimer = useGameStore((state) => state.startGameTimer)
  const keysPressed = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase())
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // This runs every frame
  useFrame((_, delta) => {
    const keys = keysPressed.current
    let dx = 0
    let dz = 0

    if (keys.has('w') || keys.has('arrowup')) {
      dz -= MOVE_SPEED * delta
    }
    if (keys.has('s') || keys.has('arrowdown')) {
      dz += MOVE_SPEED * delta
    }
    if (keys.has('a') || keys.has('arrowleft')) {
      dx -= MOVE_SPEED * delta
    }
    if (keys.has('d') || keys.has('arrowright')) {
      dx += MOVE_SPEED * delta
    }

    if (dx !== 0 || dz !== 0) {
      startGameTimer() // Start timer on first movement (no-op if already running)
      movePlayer(dx, 0, dz)
    }
  })

  return null // This component doesn't render anything
}
