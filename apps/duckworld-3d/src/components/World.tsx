import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Color } from 'three'
import { useGameStore } from '../store/gameStore'

export function World() {
  const { scene } = useThree()
  const skyColor = useGameStore((state) => state.world.skyColor)

  useEffect(() => {
    scene.background = new Color(skyColor)
  }, [scene, skyColor])

  return null
}
