import { useGameStore } from '../store/gameStore'

export function HUD() {
  const health = useGameStore((state) => state.player.health)
  const maxHealth = useGameStore((state) => state.player.maxHealth)
  const points = useGameStore((state) => state.player.points)

  // Calculate number of hearts (each heart = 20 HP, so 5 hearts for 100 HP)
  const totalHearts = Math.ceil(maxHealth / 20)
  const fullHearts = Math.floor(health / 20)
  const hasHalfHeart = (health % 20) >= 10

  return (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
      {/* Health Hearts */}
      <div className="flex gap-1">
        {Array.from({ length: totalHearts }).map((_, i) => (
          <span
            key={i}
            className="text-2xl"
            style={{
              opacity: i < fullHearts ? 1 : (i === fullHearts && hasHalfHeart) ? 0.5 : 0.2,
            }}
          >
            ❤️
          </span>
        ))}
      </div>

      {/* Points */}
      <div className="bg-amber-100 border-2 border-amber-600 rounded-lg px-4 py-2">
        <span className="text-amber-800 font-bold text-xl">⭐ {points}</span>
      </div>
    </div>
  )
}
