import { useGameStore } from '../store/gameStore'
import { useEffect, useRef, useState } from 'react'

interface FlyingCake {
  id: number
  startX: number
  startY: number
}

export function HUD() {
  const health = useGameStore((state) => state.player.health)
  const maxHealth = useGameStore((state) => state.player.maxHealth)
  const points = useGameStore((state) => state.player.points)

  const [flyingCakes, setFlyingCakes] = useState<FlyingCake[]>([])
  const prevPointsRef = useRef(points)
  const pointsMeterRef = useRef<HTMLDivElement>(null)
  const cakeIdRef = useRef(0)

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
          startX: window.innerWidth / 2 + (Math.random() - 0.5) * 300,
          startY: window.innerHeight / 2 + (Math.random() - 0.5) * 200,
        })
      }

      setFlyingCakes(prev => [...prev, ...newCakes])

      // Remove cakes after animation completes
      setTimeout(() => {
        setFlyingCakes(prev => prev.filter(c => !newCakes.find(nc => nc.id === c.id)))
      }, 800)
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
          className="bg-pink-100 border-3 border-pink-400 rounded-xl px-5 py-3 transition-transform"
          style={{
            animation: flyingCakes.length > 0 ? 'pulse 0.3s ease-in-out' : 'none'
          }}
        >
          <span className="text-pink-700 font-bold text-2xl">🎂 {points}</span>
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
              animation: 'flyToCake 0.7s ease-in forwards',
              '--target-x': `${target.x - cake.startX}px`,
              '--target-y': `${target.y - cake.startY}px`,
            } as React.CSSProperties}
          >
            🍰
          </div>
        )
      })}

      {/* CSS for flying animation */}
      <style>{`
        @keyframes flyToCake {
          0% {
            transform: translate(0, 0) scale(1.2);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--target-x), var(--target-y)) scale(0.3);
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
