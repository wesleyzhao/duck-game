import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const MAP_SIZE = 25 // Half-size of the map (total is 50x50)
const BORDER_HEIGHT = 2
const BORDER_THICKNESS = 0.5

// Animated border post component
function BorderPost({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulsing glow effect
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 2 + position[0] + position[2]) * 0.2
      meshRef.current.scale.y = pulse
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <cylinderGeometry args={[0.3, 0.4, BORDER_HEIGHT, 8]} />
      <meshStandardMaterial color="#8B4513" />
    </mesh>
  )
}

export function MapBoundary() {
  // Create fence posts along each edge
  const posts: [number, number, number][] = []
  const postSpacing = 5

  // North edge (positive Z)
  for (let x = -MAP_SIZE; x <= MAP_SIZE; x += postSpacing) {
    posts.push([x, BORDER_HEIGHT / 2, MAP_SIZE])
  }
  // South edge (negative Z)
  for (let x = -MAP_SIZE; x <= MAP_SIZE; x += postSpacing) {
    posts.push([x, BORDER_HEIGHT / 2, -MAP_SIZE])
  }
  // East edge (positive X)
  for (let z = -MAP_SIZE + postSpacing; z < MAP_SIZE; z += postSpacing) {
    posts.push([MAP_SIZE, BORDER_HEIGHT / 2, z])
  }
  // West edge (negative X)
  for (let z = -MAP_SIZE + postSpacing; z < MAP_SIZE; z += postSpacing) {
    posts.push([-MAP_SIZE, BORDER_HEIGHT / 2, z])
  }

  return (
    <group>
      {/* Fence posts */}
      {posts.map((pos, i) => (
        <BorderPost key={i} position={pos} />
      ))}

      {/* Horizontal rails - North */}
      <mesh position={[0, BORDER_HEIGHT * 0.7, MAP_SIZE]}>
        <boxGeometry args={[MAP_SIZE * 2, 0.2, BORDER_THICKNESS]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      <mesh position={[0, BORDER_HEIGHT * 0.3, MAP_SIZE]}>
        <boxGeometry args={[MAP_SIZE * 2, 0.2, BORDER_THICKNESS]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>

      {/* Horizontal rails - South */}
      <mesh position={[0, BORDER_HEIGHT * 0.7, -MAP_SIZE]}>
        <boxGeometry args={[MAP_SIZE * 2, 0.2, BORDER_THICKNESS]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      <mesh position={[0, BORDER_HEIGHT * 0.3, -MAP_SIZE]}>
        <boxGeometry args={[MAP_SIZE * 2, 0.2, BORDER_THICKNESS]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>

      {/* Horizontal rails - East */}
      <mesh position={[MAP_SIZE, BORDER_HEIGHT * 0.7, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[MAP_SIZE * 2, 0.2, BORDER_THICKNESS]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      <mesh position={[MAP_SIZE, BORDER_HEIGHT * 0.3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[MAP_SIZE * 2, 0.2, BORDER_THICKNESS]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>

      {/* Horizontal rails - West */}
      <mesh position={[-MAP_SIZE, BORDER_HEIGHT * 0.7, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[MAP_SIZE * 2, 0.2, BORDER_THICKNESS]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      <mesh position={[-MAP_SIZE, BORDER_HEIGHT * 0.3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[MAP_SIZE * 2, 0.2, BORDER_THICKNESS]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>

      {/* Corner posts - taller and thicker */}
      {[
        [MAP_SIZE, 0, MAP_SIZE],
        [MAP_SIZE, 0, -MAP_SIZE],
        [-MAP_SIZE, 0, MAP_SIZE],
        [-MAP_SIZE, 0, -MAP_SIZE],
      ].map((pos, i) => (
        <mesh key={`corner-${i}`} position={[pos[0], BORDER_HEIGHT * 0.6, pos[2]]}>
          <cylinderGeometry args={[0.5, 0.6, BORDER_HEIGHT * 1.2, 8]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
      ))}

      {/* Warning stripe on ground near edges */}
      <mesh position={[0, 0.02, MAP_SIZE - 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAP_SIZE * 2, 1.5]} />
        <meshStandardMaterial color="#FFD700" opacity={0.5} transparent />
      </mesh>
      <mesh position={[0, 0.02, -MAP_SIZE + 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAP_SIZE * 2, 1.5]} />
        <meshStandardMaterial color="#FFD700" opacity={0.5} transparent />
      </mesh>
      <mesh position={[MAP_SIZE - 1, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[MAP_SIZE * 2, 1.5]} />
        <meshStandardMaterial color="#FFD700" opacity={0.5} transparent />
      </mesh>
      <mesh position={[-MAP_SIZE + 1, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[MAP_SIZE * 2, 1.5]} />
        <meshStandardMaterial color="#FFD700" opacity={0.5} transparent />
      </mesh>
    </group>
  )
}

export const MAP_BOUNDARY_SIZE = MAP_SIZE
