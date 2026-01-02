import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Duck } from './components/Duck'
import { PlayerController } from './components/PlayerController'
import { FollowCamera } from './components/FollowCamera'
import { HUD } from './components/HUD'
import { Entities } from './components/Entities'
import { CommandPanel } from './components/CommandPanel'
import { World } from './components/World'
import { Ground } from './components/Ground'
import { MathCollisionDetector } from './components/MathCollisionDetector'
import { TurtleCollisionDetector } from './components/TurtleCollisionDetector'
import { MathModal } from './components/MathModal'
import { CelebrationEffect } from './components/CelebrationEffect'
import { MapBoundary } from './components/MapBoundary'
import { LevelTransition } from './components/LevelTransition'
import { GameOver } from './components/GameOver'
import { pregenerateQuestionsForLevel } from './services/questionService'

function App() {
  // Pre-generate questions for level 1 when app loads
  useEffect(() => {
    console.log('[App] Pre-generating questions for level 1...')
    pregenerateQuestionsForLevel(1).then(() => {
      console.log('[App] Level 1 questions ready!')
    })
  }, [])

  return (
    <div className="w-screen h-screen relative">
      <Canvas
        camera={{ position: [0, 5, 10], fov: 50 }}
      >
        {/* Dynamic sky background */}
        <World />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Physics world */}
        <Physics gravity={[0, -9.81, 0]}>
          {/* Ground plane with dynamic color */}
          <Ground />

          {/* Duck - reads position from store */}
          <Duck />

          {/* Dynamic entities (trees, lake, user-created) */}
          <Entities />

          {/* Player movement controller */}
          <PlayerController />
        </Physics>

        {/* Map boundary fence */}
        <MapBoundary />

        {/* Celebration effects (cake slices, confetti) */}
        <CelebrationEffect />

        {/* Collision detectors (must be inside Canvas for useFrame) */}
        <MathCollisionDetector />
        <TurtleCollisionDetector />

        {/* Camera follows the duck */}
        <FollowCamera />
      </Canvas>

      {/* HUD overlay */}
      <HUD />
      <CommandPanel />

      {/* Math modal (outside Canvas for DOM rendering) */}
      <MathModal />

      {/* Level transition overlay */}
      <LevelTransition />

      {/* Game over overlay */}
      <GameOver />
    </div>
  )
}

export default App
