import { RigidBody } from '@react-three/rapier'
import { useGameStore } from '../store/gameStore'

const MAP_SIZE = 50 // Total map size (25 in each direction)

export function Ground() {
  const terrainColor = useGameStore((state) => state.world.terrainColor)

  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[MAP_SIZE, MAP_SIZE]} />
        <meshStandardMaterial color={terrainColor} />
      </mesh>
    </RigidBody>
  )
}
