import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { useMathStore } from '../store/mathStore'
import { getQuestionForTree } from '../services/questionService'

const TRIGGER_DISTANCE = 2.5  // Larger to ensure player can trigger from any angle

export function MathCollisionDetector() {
  const player = useGameStore((state) => state.player)
  const entities = useGameStore((state) => state.entities)
  const currentLevel = useGameStore((state) => state.currentLevel)
  const { currentProblem, showProblem, isTreeSolved } = useMathStore()
  const lastTriggeredTree = useRef<string | null>(null)
  const isLoadingQuestion = useRef(false)

  useEffect(() => {
    // Don't check if already showing a problem or loading
    if (currentProblem || isLoadingQuestion.current) return

    // Find math trees (unsolved only)
    const mathTrees = entities.filter((e) => e.isMathTree && !isTreeSolved(e.id))

    // First, check if we should reset the last triggered tree
    // Reset when player moves away from THAT specific tree
    if (lastTriggeredTree.current) {
      const lastTree = entities.find((e) => e.id === lastTriggeredTree.current)
      if (lastTree) {
        const dx = player.x - lastTree.position.x
        const dz = player.z - lastTree.position.z
        const distance = Math.sqrt(dx * dx + dz * dz)
        // Reset when player is far enough away from the last triggered tree
        if (distance > TRIGGER_DISTANCE * 1.5) {
          lastTriggeredTree.current = null
        }
      } else {
        // Tree no longer exists (maybe solved or removed)
        lastTriggeredTree.current = null
      }
    }

    // Now check for collisions with any unsolved math tree
    for (const tree of mathTrees) {
      const dx = player.x - tree.position.x
      const dz = player.z - tree.position.z
      const distance = Math.sqrt(dx * dx + dz * dz)

      if (distance < TRIGGER_DISTANCE && lastTriggeredTree.current !== tree.id) {
        // Trigger question loading (async)
        isLoadingQuestion.current = true
        lastTriggeredTree.current = tree.id

        // Get question from service (uses LLM or fallback)
        getQuestionForTree(currentLevel, tree.id, 'math')
          .then((question) => {
            showProblem(question)
          })
          .catch((error) => {
            console.error('Failed to get question:', error)
          })
          .finally(() => {
            isLoadingQuestion.current = false
          })

        break
      }
    }
  }, [player.x, player.z, entities, currentProblem, showProblem, isTreeSolved, currentLevel])

  return null
}
