interface LakeProps {
  position: [number, number, number]
  size?: [number, number] // width, depth
}

export function Lake({ position, size = [6, 4] }: LakeProps) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[position[0], position[1] + 0.01, position[2]]}
      scale={[size[0] / 2, size[1] / 2, 1]} // Scale to make ellipse
    >
      <circleGeometry args={[1, 32]} />
      <meshStandardMaterial color="#4AA8D8" />
    </mesh>
  )
}
