import { useEffect, useState, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { SoundEffects } from '../services/soundEffects'

export function LevelTransition() {
  const isLevelingUp = useGameStore((state) => state.isLevelingUp)
  const currentLevel = useGameStore((state) => state.currentLevel)
  const [showTransition, setShowTransition] = useState(false)
  const [displayLevel, setDisplayLevel] = useState(2)
  const [stars, setStars] = useState<{ id: number; x: number; y: number; delay: number; size: number }[]>([])
  const wasLevelingUp = useRef(false)

  useEffect(() => {
    // Only trigger when isLevelingUp becomes TRUE (not when it stays true)
    if (isLevelingUp && !wasLevelingUp.current) {
      wasLevelingUp.current = true

      // Show the NEXT level (we haven't advanced yet)
      const nextLevel = Math.min(currentLevel + 1, 3)
      setDisplayLevel(nextLevel)
      setShowTransition(true)
      SoundEffects.levelUp()

      // Create star burst effect
      const newStars = []
      for (let i = 0; i < 20; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: Math.random() * 0.5,
          size: Math.random() * 30 + 20,
        })
      }
      setStars(newStars)

      // Hide after animation
      const timer = setTimeout(() => {
        setShowTransition(false)
        setStars([])
      }, 2500)

      return () => clearTimeout(timer)
    } else if (!isLevelingUp) {
      wasLevelingUp.current = false
    }
  }, [isLevelingUp, currentLevel])

  if (!showTransition) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Dark overlay that fades in and out */}
      <div className="absolute inset-0 bg-black/60 animate-fade-in-out" />

      {/* Star burst effect */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute animate-star-burst"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            animationDelay: `${star.delay}s`,
            fontSize: `${star.size}px`,
          }}
        >
          ⭐
        </div>
      ))}

      {/* Level announcement */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center animate-level-announce">
          <div className="text-6xl md:text-8xl font-bold text-yellow-400 drop-shadow-lg animate-bounce-in">
            Level {displayLevel}!
          </div>
          <div className="text-2xl md:text-4xl font-bold text-white mt-4 animate-slide-up">
            {displayLevel === 2 && "You earned a beret! 🎨"}
            {displayLevel === 3 && "You earned a cape! 🦸"}
          </div>
          <div className="text-xl text-yellow-200 mt-2 animate-slide-up-delay">
            Get ready for harder challenges!
          </div>
        </div>
      </div>

      {/* Confetti rain */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-confetti-fall"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          >
            <span
              style={{
                fontSize: `${20 + Math.random() * 20}px`,
                filter: `hue-rotate(${Math.random() * 360}deg)`,
              }}
            >
              🎊
            </span>
          </div>
        ))}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-fade-in-out {
          animation: fadeInOut 2.5s ease-in-out forwards;
        }

        @keyframes bounceIn {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(5deg); }
          70% { transform: scale(0.9) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounceIn 0.8s ease-out forwards;
        }

        @keyframes slideUp {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 0.5s ease-out 0.4s forwards;
          opacity: 0;
        }
        .animate-slide-up-delay {
          animation: slideUp 0.5s ease-out 0.6s forwards;
          opacity: 0;
        }

        @keyframes starBurst {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.5) rotate(180deg); opacity: 1; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
        .animate-star-burst {
          animation: starBurst 1s ease-out forwards;
        }

        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confettiFall 3s linear forwards;
        }

        @keyframes levelAnnounce {
          0% { transform: scale(0.5); }
          100% { transform: scale(1); }
        }
        .animate-level-announce {
          animation: levelAnnounce 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
