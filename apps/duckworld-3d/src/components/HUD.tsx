import { useGameStore, LEVEL_CONFIG } from '../store/gameStore'
import { useHistoryStore } from '../store/historyStore'
import { useMathStore } from '../store/mathStore'
import { useState, useEffect, useRef } from 'react'

interface FlyingCake {
  id: number
  x: number
  y: number
}

// Format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function HUD() {
  const player = useGameStore((state) => state.player)
  const currentLevel = useGameStore((state) => state.currentLevel)
  const solvedTreeCount = useMathStore((state) => state.getSolvedTreeCount())
  const treesRequired = LEVEL_CONFIG[currentLevel].treesRequired
  const { undo, redo, past, future } = useHistoryStore()

  // Timer state
  const isGameTimerRunning = useGameStore((state) => state.isGameTimerRunning)
  const gameStartTime = useGameStore((state) => state.gameStartTime)
  const bestTime = useGameStore((state) => state.bestTime)
  const [displayTime, setDisplayTime] = useState(0)

  const [isPointsPulsing, setIsPointsPulsing] = useState(false)
  const [flyingCakes, setFlyingCakes] = useState<FlyingCake[]>([])
  const prevPointsRef = useRef(player.points)
  const cakeIdRef = useRef(0)
  const pointsContainerRef = useRef<HTMLDivElement>(null)

  // Update timer display every 100ms
  useEffect(() => {
    if (!isGameTimerRunning || !gameStartTime) {
      return
    }

    const interval = setInterval(() => {
      setDisplayTime((Date.now() - gameStartTime) / 1000)
    }, 100)

    return () => clearInterval(interval)
  }, [isGameTimerRunning, gameStartTime])

  // Detect points increase and trigger animation
  useEffect(() => {
    if (player.points > prevPointsRef.current) {
      // Use setTimeout to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        setIsPointsPulsing(true)

        // Create more flying cakes from different directions
        const newCakes: FlyingCake[] = []
        for (let i = 0; i < 8; i++) {
          newCakes.push({
            id: cakeIdRef.current++,
            x: Math.random() * 300 + 20,
            y: Math.random() * 150 + 250,
          })
        }
        setFlyingCakes(prev => [...prev, ...newCakes])

        // End pulse animation after delay
        setTimeout(() => setIsPointsPulsing(false), 1200)

        // Remove cakes after animation
        setTimeout(() => {
          setFlyingCakes(prev => prev.filter(c => !newCakes.find(nc => nc.id === c.id)))
        }, 1200)
      }, 0)

      prevPointsRef.current = player.points
      return () => clearTimeout(timeoutId)
    }
    prevPointsRef.current = player.points
  }, [player.points])

  return (
    <>
      {/* Full screen flash effect when getting cake points */}
      {isPointsPulsing && (
        <div className="fixed inset-0 pointer-events-none z-50 animate-screen-flash" />
      )}

      {/* Top-left info - Extra large for children */}
      <div className="absolute top-6 left-6 text-white font-mono text-2xl bg-black/70 p-8 rounded-2xl min-w-[340px] shadow-xl">
        <div className="font-bold text-4xl">DuckWorld 3D</div>

        {/* Level indicator */}
        <div className="mt-4 flex justify-between items-center text-xl">
          <span className="text-purple-300">Level {currentLevel}</span>
          <span className="text-green-400 font-bold">
            {solvedTreeCount} / {treesRequired} Trees
          </span>
        </div>

        {/* Timer display */}
        <div className="mt-4 flex justify-between items-center text-xl">
          <span className="flex items-center gap-2">
            <span className="text-2xl">⏱️</span> Time
          </span>
          <span className="font-bold text-cyan-400 text-3xl font-mono">
            {formatTime(displayTime)}
          </span>
        </div>
        {bestTime !== null && (
          <div className="flex justify-between items-center text-lg">
            <span className="text-yellow-300">Best Time</span>
            <span className="font-bold text-yellow-400 font-mono">
              {formatTime(bestTime)}
            </span>
          </div>
        )}

        {/* Lives display */}
        <div className="mt-6">
          <div className="flex justify-between items-center text-xl">
            <span>Lives</span>
            <div className="flex gap-2 text-4xl">
              {Array.from({ length: player.maxLives }).map((_, i) => (
                <span
                  key={i}
                  className={`transition-all duration-300 ${
                    i < player.lives ? 'scale-100' : 'scale-75 grayscale opacity-40'
                  }`}
                >
                  {i < player.lives ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
          </div>
          {player.isInvincible && (
            <div className="text-center text-lg text-yellow-300 font-bold animate-pulse mt-2">
              INVINCIBLE!
            </div>
          )}
        </div>

        {/* Cake Points */}
        <div className="mt-6 relative" ref={pointsContainerRef}>
          <div className="flex justify-between items-center text-xl">
            <span className="flex items-center gap-2">
              🍰 Cake Points
            </span>
            <span
              className={`font-bold transition-all duration-500 ${
                isPointsPulsing
                  ? 'text-pink-400 text-7xl animate-points-bounce'
                  : 'text-yellow-400 text-5xl'
              }`}
              style={{
                textShadow: isPointsPulsing
                  ? '0 0 30px #ff69b4, 0 0 60px #ff69b4, 0 0 90px #ff1493'
                  : '0 0 10px rgba(255, 215, 0, 0.5)',
              }}
            >
              {player.points}
            </span>
          </div>

          {/* Flying cake emojis */}
          {flyingCakes.map(cake => (
            <div
              key={cake.id}
              className="absolute text-6xl pointer-events-none animate-fly-to-points"
              style={{
                left: cake.x,
                top: cake.y,
              }}
            >
              🍰
            </div>
          ))}
        </div>

        {/* Undo/Redo buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="flex-1 px-5 py-3 text-xl bg-gray-700 rounded-xl hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="flex-1 px-5 py-3 text-xl bg-gray-700 rounded-xl hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Redo
          </button>
        </div>
      </div>

      {/* Bottom controls hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white font-mono text-xl bg-black/70 px-8 py-4 rounded-2xl">
        WASD or Arrow Keys to move
      </div>

      {/* CSS for flying cake animation */}
      <style>{`
        @keyframes flyToPoints {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1.5) rotate(0deg);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-80px, -220px) scale(0.3) rotate(720deg);
          }
        }
        .animate-fly-to-points {
          animation: flyToPoints 1s ease-out forwards;
        }
        @keyframes pointsBounce {
          0%, 100% { transform: scale(1.5) translateY(0); }
          25% { transform: scale(1.6) translateY(-8px); }
          50% { transform: scale(1.5) translateY(0); }
          75% { transform: scale(1.6) translateY(-5px); }
        }
        .animate-points-bounce {
          animation: pointsBounce 0.6s ease-in-out infinite;
        }
        @keyframes screenFlash {
          0% {
            background: radial-gradient(circle at 15% 25%, rgba(255, 105, 180, 0.6), transparent 60%);
          }
          50% {
            background: radial-gradient(circle at 15% 25%, rgba(255, 20, 147, 0.4), transparent 70%);
          }
          100% {
            background: radial-gradient(circle at 15% 25%, rgba(255, 105, 180, 0), transparent);
          }
        }
        .animate-screen-flash {
          animation: screenFlash 0.8s ease-out forwards;
        }
      `}</style>
    </>
  )
}
