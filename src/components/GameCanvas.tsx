import { useEffect, useRef } from 'react'
import { GameRenderer } from '../game/GameRenderer'

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<GameRenderer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear any existing canvas (handles StrictMode double-mount)
    containerRef.current.innerHTML = ''

    const renderer = new GameRenderer()
    rendererRef.current = renderer

    let cancelled = false

    renderer.init(containerRef.current).then(() => {
      if (cancelled) {
        renderer.destroy()
      }
    })

    return () => {
      cancelled = true
      renderer.destroy()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="border-4 border-amber-800 rounded-lg overflow-hidden"
    />
  )
}
