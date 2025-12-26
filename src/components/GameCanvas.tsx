import { useEffect, useRef } from 'react'
import { GameRenderer } from '../game/GameRenderer'

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear any existing canvas (handles StrictMode double-mount)
    containerRef.current.innerHTML = ''

    const renderer = new GameRenderer()
    let mounted = true

    const initRenderer = async () => {
      try {
        await renderer.init(containerRef.current!)
        // If unmounted during init, clean up
        if (!mounted) {
          renderer.destroy()
        }
      } catch (error) {
        console.error('Failed to initialize renderer:', error)
      }
    }

    initRenderer()

    return () => {
      mounted = false
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
