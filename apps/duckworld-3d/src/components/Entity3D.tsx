import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, Group, Vector3 } from 'three'
import type { Entity } from '../types/entities'
import { useMathStore } from '../store/mathStore'
import { useGameStore } from '../store/gameStore'

interface Entity3DProps {
  entity: Entity
}

export function Entity3D({ entity }: Entity3DProps) {
  const { position, size, color, shape, behaviors } = entity
  const meshRef = useRef<Mesh>(null)
  const groupRef = useRef<Group>(null)
  const solvedTrees = useMathStore((state) => state.solvedTrees)
  const updateTurtlePosition = useGameStore((state) => state.updateTurtlePosition)
  const isSolved = entity.isMathTree ? solvedTrees.has(entity.id) : false
  const basePosition = useRef(new Vector3(position.x, position.y, position.z))

  // Initialize velocity based on behavior speed
  const bounceSpeed = behaviors.find(b => b.type === 'bounce')?.speed ?? 1
  const velocity = useRef(new Vector3(
    (Math.random() - 0.5) * bounceSpeed * 0.04,
    0,
    (Math.random() - 0.5) * bounceSpeed * 0.04
  ))

  // Update base position when entity position changes
  basePosition.current.set(position.x, position.y, position.z)

  useFrame((state) => {
    if (!meshRef.current) return

    const time = state.clock.elapsedTime
    let offsetY = 0
    let scaleMultiplier = 1
    let rotationSpeed = 0

    for (const behavior of behaviors) {
      const speed = behavior.speed ?? 1
      const range = behavior.range ?? 1

      switch (behavior.type) {
        case 'float':
          // Smooth up/down oscillation
          offsetY += Math.sin(time * speed * 2) * range * 0.5
          break

        case 'bounce':
          // Bouncy movement with velocity
          meshRef.current.position.x += velocity.current.x
          meshRef.current.position.z += velocity.current.z

          // Bounce off world boundaries
          if (meshRef.current.position.x > 22 || meshRef.current.position.x < -22) {
            velocity.current.x *= -1
          }
          if (meshRef.current.position.z > 22 || meshRef.current.position.z < -22) {
            velocity.current.z *= -1
          }

          // Track turtle position for collision detection
          if (entity.isTurtle) {
            updateTurtlePosition(
              entity.id,
              meshRef.current.position.x,
              meshRef.current.position.z
            )
          }
          break

        case 'spin':
          rotationSpeed = speed * 2
          break

        case 'pulse':
          // Scale up and down
          scaleMultiplier = 1 + Math.sin(time * speed * 3) * 0.2 * range
          break
      }
    }

    // Apply float offset
    if (!behaviors.some((b) => b.type === 'bounce')) {
      meshRef.current.position.set(
        basePosition.current.x,
        basePosition.current.y + offsetY,
        basePosition.current.z
      )
    } else {
      meshRef.current.position.y = basePosition.current.y + offsetY
    }

    // Apply rotation
    if (rotationSpeed > 0) {
      meshRef.current.rotation.y += rotationSpeed * 0.02
    }

    // Apply scale (but preserve base scale for special shapes)
    if (shape === 'lake') {
      meshRef.current.scale.set(size.x * scaleMultiplier, size.z * scaleMultiplier, 1)
    } else if (shape === 'tree') {
      // Tree scale handled in its own rendering
    } else {
      meshRef.current.scale.setScalar(scaleMultiplier)
    }
  })

  // Lake shape - flat ellipse on the ground
  if (shape === 'lake') {
    return (
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[position.x, 0.05, position.z]}
      >
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
    )
  }

  // Tree shape needs special rendering - size affects scale
  if (shape === 'tree') {
    const scale = size.y // Use y size as the main scale factor
    const trunkHeight = 1.5 * scale
    const trunkRadius = 0.25 * scale
    const foliageHeight = 2 * scale
    const foliageRadius = 1 * scale

    return (
      <group ref={groupRef} position={[position.x, position.y, position.z]}>
        {/* Trunk */}
        <mesh position={[0, trunkHeight / 2, 0]}>
          <cylinderGeometry args={[trunkRadius * 0.8, trunkRadius, trunkHeight, 8]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        {/* Foliage - green if solved, original color if not */}
        <mesh position={[0, trunkHeight + foliageHeight / 2, 0]}>
          <coneGeometry args={[foliageRadius, foliageHeight, 8]} />
          <meshStandardMaterial color={isSolved ? '#32CD32' : color} />
        </mesh>
        {/* Math symbol badge for unsolved math trees */}
        {entity.isMathTree && !isSolved && (
          <mesh position={[0, trunkHeight + foliageHeight + 0.3, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
        )}
        {/* Checkmark for solved trees */}
        {entity.isMathTree && isSolved && (
          <mesh position={[0, trunkHeight + foliageHeight + 0.3, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#00FF00" />
          </mesh>
        )}
      </group>
    )
  }

  // Turtle shape - cute snapping turtle
  if (shape === 'turtle') {
    const turtleScale = 0.8
    return (
      <group ref={groupRef}>
        <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
          {/* Shell (dome) */}
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.5 * turtleScale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#2E8B57" />
          </mesh>
          {/* Shell pattern - darker green stripes */}
          <mesh position={[0, 0.22, 0]} rotation={[0, 0.3, 0]}>
            <sphereGeometry args={[0.48 * turtleScale, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#1E6B47" wireframe />
          </mesh>
          {/* Body/belly */}
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.45 * turtleScale, 16]} />
            <meshStandardMaterial color="#90EE90" />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.15, 0.5 * turtleScale]}>
            <sphereGeometry args={[0.18 * turtleScale, 12, 12]} />
            <meshStandardMaterial color="#90EE90" />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.08 * turtleScale, 0.2, 0.6 * turtleScale]}>
            <sphereGeometry args={[0.05 * turtleScale, 8, 8]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          <mesh position={[0.08 * turtleScale, 0.2, 0.6 * turtleScale]}>
            <sphereGeometry args={[0.05 * turtleScale, 8, 8]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          {/* Front left leg */}
          <mesh position={[-0.35 * turtleScale, 0.08, 0.25 * turtleScale]} rotation={[0, 0.5, 0]}>
            <boxGeometry args={[0.2 * turtleScale, 0.1 * turtleScale, 0.15 * turtleScale]} />
            <meshStandardMaterial color="#90EE90" />
          </mesh>
          {/* Front right leg */}
          <mesh position={[0.35 * turtleScale, 0.08, 0.25 * turtleScale]} rotation={[0, -0.5, 0]}>
            <boxGeometry args={[0.2 * turtleScale, 0.1 * turtleScale, 0.15 * turtleScale]} />
            <meshStandardMaterial color="#90EE90" />
          </mesh>
          {/* Back left leg */}
          <mesh position={[-0.3 * turtleScale, 0.08, -0.25 * turtleScale]} rotation={[0, 0.3, 0]}>
            <boxGeometry args={[0.18 * turtleScale, 0.1 * turtleScale, 0.12 * turtleScale]} />
            <meshStandardMaterial color="#90EE90" />
          </mesh>
          {/* Back right leg */}
          <mesh position={[0.3 * turtleScale, 0.08, -0.25 * turtleScale]} rotation={[0, -0.3, 0]}>
            <boxGeometry args={[0.18 * turtleScale, 0.1 * turtleScale, 0.12 * turtleScale]} />
            <meshStandardMaterial color="#90EE90" />
          </mesh>
          {/* Tail */}
          <mesh position={[0, 0.1, -0.45 * turtleScale]}>
            <coneGeometry args={[0.06 * turtleScale, 0.15 * turtleScale, 6]} />
            <meshStandardMaterial color="#90EE90" />
          </mesh>
        </mesh>
      </group>
    )
  }

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      {shape === 'box' && <boxGeometry args={[size.x, size.y, size.z]} />}
      {shape === 'sphere' && <sphereGeometry args={[size.x / 2, 32, 32]} />}
      {shape === 'cylinder' && <cylinderGeometry args={[size.x / 2, size.x / 2, size.y, 16]} />}
      {shape === 'cone' && <coneGeometry args={[size.x / 2, size.y, 16]} />}
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
