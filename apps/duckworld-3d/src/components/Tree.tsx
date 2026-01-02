import { RigidBody, CylinderCollider } from '@react-three/rapier'

interface TreeProps {
  position: [number, number, number]
}

export function Tree({ position }: TreeProps) {
  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      {/* Collision cylinder for the trunk */}
      <CylinderCollider args={[1.5, 0.5]} position={[0, 1.5, 0]} />

      {/* Trunk - brown cylinder */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1.5, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Foliage - green cone */}
      <mesh position={[0, 2.2, 0]}>
        <coneGeometry args={[1, 2, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
    </RigidBody>
  )
}
