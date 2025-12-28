import { useGameStore } from '../store/gameStore'
import { useEffect, useRef, useState } from 'react'

interface FlyingCake {
  id: number
  startX: number
  startY: number
  emoji: string
  delay: number
  rotation: number
}

export function HUD() {
  const health = useGameStore((state) => state.player.health)
  const maxHealth = useGameStore((state) => state.player.maxHealth)
  const points = useGameStore((state) => state.player.points)

  const [flyingCakes, setFlyingCakes] = useState<FlyingCake[]>([])
  const [pointsHighlight, setPointsHighlight] = useState(false)
  const prevPointsRef = useRef(points)
  const pointsMeterRef = useRef<HTMLDivElement>(null)
  const cakeIdRef = useRef(0)

  // Variety of cake/dessert emojis for visual interest
  const cakeEmojis = ['🍰', '🧁', '🎂', '🍩', '🍪', '🍬']

  // Detect point increases and spawn flying cakes
  useEffect(() => {
    const pointsGained = points - prevPointsRef.current
    if (pointsGained > 0) {
      // Spawn multiple cake pieces based on points gained
      const numCakes = Math.min(pointsGained, 10) // Cap at 10 cakes
      const newCakes: FlyingCake[] = []

      for (let i = 0; i < numCakes; i++) {
        newCakes.push({
          id: cakeIdRef.current++,
          // Random starting position in the center-ish area of screen
          startX: window.innerWidth / 2 + (Math.random() - 0.5) * 400,
          startY: window.innerHeight / 2 + (Math.random() - 0.5) * 300,
          // Random emoji from variety
          emoji: cakeEmojis[Math.floor(Math.random() * cakeEmojis.length)],
          // Stagger the animation start
          delay: i * 50,
          // Random rotation amount
          rotation: (Math.random() - 0.5) * 720,
        })
      }

      setFlyingCakes(prev => [...prev, ...newCakes])

      // Trigger points highlight
      setPointsHighlight(true)

      // Remove cakes after animation completes (account for max delay + animation time)
      setTimeout(() => {
        setFlyingCakes(prev => prev.filter(c => !newCakes.find(nc => nc.id === c.id)))
      }, 1200)

      // End points highlight after animation
      setTimeout(() => {
        setPointsHighlight(false)
      }, 1000)
    }
    prevPointsRef.current = points
  }, [points])

  // Calculate number of hearts (each heart = 20 HP, so 5 hearts for 100 HP)
  const totalHearts = Math.ceil(maxHealth / 20)
  const fullHearts = Math.floor(health / 20)
  const hasHalfHeart = (health % 20) >= 10

  // Get target position for flying cakes (the points meter)
  const getMeterPosition = () => {
    if (pointsMeterRef.current) {
      const rect = pointsMeterRef.current.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
    return { x: window.innerWidth - 80, y: 40 }
  }

  return (
    <>
      <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-start pointer-events-none">
        {/* Health Hearts */}
        <div className="flex gap-2">
          {Array.from({ length: totalHearts }).map((_, i) => (
            <span
              key={i}
              className="text-4xl"
              style={{
                opacity: i < fullHearts ? 1 : (i === fullHearts && hasHalfHeart) ? 0.5 : 0.2,
              }}
            >
              ❤️
            </span>
          ))}
        </div>

        {/* Points with Cake icon */}
        <div
          ref={pointsMeterRef}
          className="bg-pink-100 border-3 border-pink-400 rounded-xl px-5 py-3 transition-all duration-200"
          style={{
            animation: flyingCakes.length > 0 ? 'pulse 0.3s ease-in-out' : 'none',
            transform: pointsHighlight ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          <span className="font-bold transition-all duration-200" style={{
            fontSize: pointsHighlight ? '2rem' : '1.5rem',
            color: pointsHighlight ? '#db2777' : '#be185d',
            textShadow: pointsHighlight ? '0 0 8px rgba(219, 39, 119, 0.5)' : 'none',
          }}>
            🎂 {points}
          </span>
        </div>
      </div>

      {/* Flying cake pieces */}
      {flyingCakes.map(cake => {
        const target = getMeterPosition()
        return (
          <div
            key={cake.id}
            className="fixed pointer-events-none text-3xl z-50"
            style={{
              left: cake.startX,
              top: cake.startY,
              animation: `flyToCake 0.8s ease-out ${cake.delay}ms forwards`,
              '--target-x': `${target.x - cake.startX}px`,
              '--target-y': `${target.y - cake.startY}px`,
              '--rotation': `${cake.rotation}deg`,
            } as React.CSSProperties}
          >
            {cake.emoji}
          </div>
        )
      })}

      {/* CSS for flying animation */}
      <style>{`
        @keyframes flyToCake {
          0% {
            transform: translate(0, 0) scale(1.3) rotate(0deg);
            opacity: 1;
          }
          30% {
            transform: translate(calc(var(--target-x) * 0.3), calc(var(--target-y) * 0.3 - 40px)) scale(1.1) rotate(calc(var(--rotation) * 0.3));
          }
          100% {
            transform: translate(var(--target-x), var(--target-y)) scale(0.4) rotate(var(--rotation));
            opacity: 0;
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </>
  )
}
