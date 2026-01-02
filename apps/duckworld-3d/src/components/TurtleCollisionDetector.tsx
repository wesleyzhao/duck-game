import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'

const COLLISION_DISTANCE = 1.1
const HIT_COOLDOWN_MS = 800

export function TurtleCollisionDetector() {
  const lastHitAt = useRef(0)

  useFrame(() => {
    const state = useGameStore.getState()
    if (state.isGameOver || state.player.isInvincible) return

    const now = performance.now()
    if (now - lastHitAt.current < HIT_COOLDOWN_MS) return

    const { x: playerX, z: playerZ } = state.player
    const turtles = state.turtlePositions

    for (const id in turtles) {
      const turtle = turtles[id]
      const dx = playerX - turtle.x
      const dz = playerZ - turtle.z
      const distSq = dx * dx + dz * dz

      if (distSq < COLLISION_DISTANCE * COLLISION_DISTANCE) {
        state.loseLife()
        lastHitAt.current = now
        break
      }
    }
  })

  return null
}
