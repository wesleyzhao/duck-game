import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useGameStore } from '../store/gameStore'
import { useMathStore } from '../store/mathStore'

interface CakeSlice {
  id: number
  startPos: Vector3
  delay: number
}

// A single cake slice component
function CakeSlice({ startPos, delay, targetPos, celebrationTime }: {
  startPos: Vector3
  delay: number
  targetPos: Vector3
  celebrationTime: number
}) {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    if (!groupRef.current) return

    const t = Math.max(0, celebrationTime - delay)

    if (t > 0) {
      // Fly toward duck with easing
      const progress = Math.min(1, t / 0.8)
      const eased = 1 - Math.pow(1 - progress, 3) // ease out cubic

      groupRef.current.position.x = startPos.x + (targetPos.x - startPos.x) * eased
      groupRef.current.position.y = startPos.y + (targetPos.y - startPos.y) * eased + Math.sin(progress * Math.PI) * 0.5
      groupRef.current.position.z = startPos.z + (targetPos.z - startPos.z) * eased

      // Spin while flying
      groupRef.current.rotation.y += 0.2
      groupRef.current.rotation.z = Math.sin(t * 10) * 0.3

      // Fade out near the end
      const scale = progress > 0.8 ? 1 - (progress - 0.8) / 0.2 : 1
      groupRef.current.scale.setScalar(scale * 0.6)
    } else {
      groupRef.current.scale.setScalar(0.6)
    }
  })

  return (
    <group ref={groupRef} position={[startPos.x, startPos.y, startPos.z]}>
      {/* Cake base - wedge shape approximated with a box */}
      <mesh>
        <boxGeometry args={[0.4, 0.3, 0.5]} />
        <meshStandardMaterial color="#FFE4B5" /> {/* Cream color */}
      </mesh>

      {/* Pink frosting on top */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.42, 0.08, 0.52]} />
        <meshStandardMaterial color="#FF69B4" /> {/* Pink */}
      </mesh>

      {/* Cherry on top */}
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#FF0000" />
      </mesh>

      {/* Chocolate layers */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.38, 0.02, 0.48]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.38, 0.02, 0.48]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  )
}

// Confetti particle
function Confetti({ startPos, velocity, color, celebrationTime }: {
  startPos: Vector3
  velocity: Vector3
  color: string
  celebrationTime: number
}) {
  const meshRef = useRef<Group>(null)

  useFrame(() => {
    if (!meshRef.current) return

    meshRef.current.position.x = startPos.x + velocity.x * celebrationTime
    meshRef.current.position.y = startPos.y + velocity.y * celebrationTime - 2 * celebrationTime * celebrationTime
    meshRef.current.position.z = startPos.z + velocity.z * celebrationTime

    meshRef.current.rotation.x += 0.1
    meshRef.current.rotation.y += 0.15

    // Fade out
    const opacity = Math.max(0, 1 - celebrationTime / 2.5)
    meshRef.current.scale.setScalar(0.1 * opacity)
  })

  return (
    <group ref={meshRef} position={[startPos.x, startPos.y, startPos.z]}>
      <mesh>
        <boxGeometry args={[1, 1, 0.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

export function CelebrationEffect() {
  const isCelebrating = useMathStore((state) => state.isCelebrating)
  const isLevelingUp = useGameStore((state) => state.isLevelingUp)
  const player = useGameStore((state) => state.player)
  const [celebrationTime, setCelebrationTime] = useState(0)
  const [cakes, setCakes] = useState<CakeSlice[]>([])
  const [confetti, setConfetti] = useState<{ id: number; startPos: Vector3; velocity: Vector3; color: string }[]>([])

  // Bigger celebration for level-up!
  const isLevelCelebration = isCelebrating && isLevelingUp

  // Reset and create new cakes when celebration starts
  useEffect(() => {
    if (isCelebrating) {
      setCelebrationTime(0)

      // Create cake slices around the player - more for level-up!
      const cakeCount = isLevelCelebration ? 12 : 6
      const newCakes: CakeSlice[] = []
      for (let i = 0; i < cakeCount; i++) {
        const angle = (i / cakeCount) * Math.PI * 2
        const radius = isLevelCelebration ? 4 : 3
        newCakes.push({
          id: i,
          startPos: new Vector3(
            player.x + Math.cos(angle) * radius,
            player.y + 1 + Math.random() * (isLevelCelebration ? 1 : 0.5),
            player.z + Math.sin(angle) * radius
          ),
          delay: i * (isLevelCelebration ? 0.08 : 0.12),
        })
      }
      setCakes(newCakes)

      // Create confetti particles - more for level-up!
      const confettiCount = isLevelCelebration ? 60 : 30
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFD700', '#FF69B4']
      const newConfetti: { id: number; startPos: Vector3; velocity: Vector3; color: string }[] = []
      for (let i = 0; i < confettiCount; i++) {
        const spread = isLevelCelebration ? 3 : 2
        newConfetti.push({
          id: i,
          startPos: new Vector3(
            player.x + (Math.random() - 0.5) * spread,
            player.y + 1,
            player.z + (Math.random() - 0.5) * spread
          ),
          velocity: new Vector3(
            (Math.random() - 0.5) * (isLevelCelebration ? 6 : 4),
            Math.random() * (isLevelCelebration ? 5 : 3) + 2,
            (Math.random() - 0.5) * (isLevelCelebration ? 6 : 4)
          ),
          color: colors[Math.floor(Math.random() * colors.length)],
        })
      }
      setConfetti(newConfetti)
    } else {
      setCakes([])
      setConfetti([])
    }
  }, [isCelebrating, isLevelCelebration, player.x, player.y, player.z])

  // Update celebration time
  useFrame((_, delta) => {
    if (isCelebrating) {
      setCelebrationTime((t) => t + delta)
    }
  })

  if (!isCelebrating) return null

  const targetPos = new Vector3(player.x, player.y + 0.5, player.z)

  return (
    <group>
      {/* Cake slices flying toward duck */}
      {cakes.map((cake) => (
        <CakeSlice
          key={cake.id}
          startPos={cake.startPos}
          delay={cake.delay}
          targetPos={targetPos}
          celebrationTime={celebrationTime}
        />
      ))}

      {/* Confetti particles */}
      {confetti.map((c) => (
        <Confetti
          key={c.id}
          startPos={c.startPos}
          velocity={c.velocity}
          color={c.color}
          celebrationTime={celebrationTime}
        />
      ))}
    </group>
  )
}
