import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useGameStore } from '../store/gameStore'

export function FollowCamera() {
  const { camera } = useThree()
  const player = useGameStore((state) => state.player)

  const targetPosition = useRef(new Vector3())
  const currentPosition = useRef(new Vector3(0, 5, 10))

  useFrame(() => {
    // Calculate target camera position (behind and above duck)
    const cameraOffset = { x: 0, y: 5, z: 10 }

    targetPosition.current.set(
      player.x + cameraOffset.x,
      player.y + cameraOffset.y,
      player.z + cameraOffset.z
    )

    // Smoothly interpolate camera position
    currentPosition.current.lerp(targetPosition.current, 0.08)

    camera.position.copy(currentPosition.current)

    // Look at the duck
    camera.lookAt(player.x, player.y, player.z)
  })

  return null
}
