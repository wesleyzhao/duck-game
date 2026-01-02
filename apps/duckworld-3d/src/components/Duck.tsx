import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils } from 'three'
import { useGameStore, LEVEL_CONFIG } from '../store/gameStore'
import { useMathStore } from '../store/mathStore'

export function Duck() {
  const player = useGameStore((state) => state.player)
  const currentLevel = useGameStore((state) => state.currentLevel)
  const isCelebrating = useMathStore((state) => state.isCelebrating)
  const groupRef = useRef<Group>(null)
  const capeRef = useRef<Group>(null)

  const accessory = LEVEL_CONFIG[currentLevel].duckAccessory
  const currentRotation = useRef(0)

  useFrame((state) => {
    if (!groupRef.current) return

    const time = state.clock.elapsedTime

    // Celebration bounce or gentle bobbing
    let bobOffset: number
    if (isCelebrating) {
      // Rapid, high bouncing when celebrating
      bobOffset = Math.abs(Math.sin(time * 12)) * 0.8
    } else {
      // Normal gentle bobbing
      bobOffset = Math.sin(time * 3) * 0.05
    }

    // Subtle breathing scale
    const breathScale = player.size * (1 + Math.sin(time * 2) * 0.02)

    // Smooth rotation interpolation
    currentRotation.current = MathUtils.lerp(
      currentRotation.current,
      player.rotation,
      0.15
    )

    groupRef.current.position.x = player.x
    groupRef.current.position.y = player.y + bobOffset
    groupRef.current.position.z = player.z
    groupRef.current.rotation.y = currentRotation.current
    groupRef.current.scale.set(breathScale, breathScale, breathScale)

    // Animate cape flowing
    if (capeRef.current) {
      capeRef.current.rotation.x = -0.3 + Math.sin(time * 4) * 0.1
    }
  })

  return (
    <group ref={groupRef} position={[player.x, player.y, player.z]}>
      {/* Body - ellipsoid */}
      <mesh scale={[1, 0.8, 1.2]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={player.color} />
      </mesh>

      {/* Head - smaller sphere */}
      <mesh position={[0, 0.35, 0.4]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color={player.color} />
      </mesh>

      {/* Beak - orange cone */}
      <mesh position={[0, 0.3, 0.65]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshStandardMaterial color="#FF8C00" />
      </mesh>

      {/* Left eye */}
      <mesh position={[-0.12, 0.45, 0.62]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Right eye */}
      <mesh position={[0.12, 0.45, 0.62]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Level 2: Beret */}
      {accessory === 'beret' && (
        <group position={[0, 0.55, 0.35]}>
          {/* Beret base */}
          <mesh rotation={[0.3, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.2, 0.08, 16]} />
            <meshStandardMaterial color="#8B0000" />
          </mesh>
          {/* Beret top puff */}
          <mesh position={[0.05, 0.04, 0]} scale={[1.2, 0.4, 1.2]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#8B0000" />
          </mesh>
        </group>
      )}

      {/* Level 3: Cape */}
      {accessory === 'cape' && (
        <group ref={capeRef} position={[0, 0.15, -0.45]}>
          {/* Cape main body */}
          <mesh rotation={[-0.3, 0, 0]}>
            <boxGeometry args={[0.8, 0.02, 0.6]} />
            <meshStandardMaterial color="#DC143C" />
          </mesh>
          {/* Cape collar */}
          <mesh position={[0, 0.1, 0.25]}>
            <boxGeometry args={[0.6, 0.15, 0.1]} />
            <meshStandardMaterial color="#DC143C" />
          </mesh>
        </group>
      )}
    </group>
  )
}
