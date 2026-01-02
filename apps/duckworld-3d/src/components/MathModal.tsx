import { useState, useEffect, useRef } from 'react'
import { useMathStore } from '../store/mathStore'
import { useGameStore, LEVEL_CONFIG } from '../store/gameStore'
import { useProgressStore } from '../store/progressStore'
import { speak } from '../services/speechOutput'
import { SoundEffects } from '../services/soundEffects'
import { pregenerateQuestionsForLevel } from '../services/questionService'

const ENCOURAGEMENTS = [
  "Try again!",
  "Almost there!",
  "Keep trying!",
  "You can do it!",
  "Give it another shot!",
]

export function MathModal() {
  const { currentProblem, hideProblem, checkAnswer, markTreeSolved, attempts, startCelebration, getSolvedTreeCount, resetSolvedTrees } = useMathStore()
  const modifyPoints = useGameStore((state) => state.modifyPoints)
  const currentLevel = useGameStore((state) => state.currentLevel)
  const advanceLevel = useGameStore((state) => state.advanceLevel)
  const startLevelTransition = useGameStore((state) => state.startLevelTransition)
  const stopGameTimer = useGameStore((state) => state.stopGameTimer)
  const recordAttempt = useProgressStore((state) => state.recordAttempt)
  const attemptCountRef = useRef(0)  // Track attempts for this problem
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  // Speak the problem when it appears and reset attempt counter
  useEffect(() => {
    if (currentProblem) {
      attemptCountRef.current = 0  // Reset for new problem
      SoundEffects.mathAppear()

      // Use spokenPrompt if available, otherwise generate from question
      if (currentProblem.spokenPrompt) {
        speak(currentProblem.spokenPrompt)
      } else {
        // Fallback: Convert "3 + 5 = ?" to spoken form
        const match = currentProblem.question.match(/(\d+)\s*([+-×÷])\s*(\d+)/)
        if (match) {
          const a = match[1]
          const opMap: Record<string, string> = { '+': 'plus', '-': 'minus', '×': 'times', '÷': 'divided by' }
          const op = opMap[match[2]] || match[2]
          const b = match[3]
          speak(`What is ${a} ${op} ${b}?`)
        }
      }
    }
  }, [currentProblem])

  if (!currentProblem) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const answer = parseInt(input, 10)

    if (isNaN(answer)) {
      setFeedback('Please enter a number')
      return
    }

    attemptCountRef.current += 1

    const treeId = currentProblem.treeId ?? 'unknown'

    if (checkAnswer(answer)) {
      // Correct! Record the successful attempt
      recordAttempt({
        questionType: currentProblem.type,
        question: currentProblem.question,
        correctAnswer: String(currentProblem.answer),
        userAnswer: String(answer),
        correct: true,
        attempts: attemptCountRef.current,
        timestamp: Date.now(),
        level: currentLevel,
        treeId,
      })

      // Correct! Hide modal immediately so celebration is visible
      SoundEffects.correct()
      markTreeSolved(treeId)
      modifyPoints(10, false) // Award 10 points (bypass cheats check)
      startCelebration() // Trigger duck bounce and cake animation

      // Check if level is complete (getSolvedTreeCount already includes the one we just marked)
      const solvedCount = getSolvedTreeCount()
      const treesRequired = LEVEL_CONFIG[currentLevel].treesRequired

      if (solvedCount >= treesRequired) {
        // Level complete! Start celebration immediately
        if (currentLevel < 3) {
          // Trigger transition overlay RIGHT AWAY (before loading)
          startLevelTransition()
          speak(`Amazing! Level ${currentLevel} complete! Get ready for level ${currentLevel + 1}!`)

          // Pre-generate questions for next level in background
          const nextLevel = (currentLevel + 1) as 1 | 2 | 3
          pregenerateQuestionsForLevel(nextLevel).then(() => {
            // Advance to next level after celebration finishes
            setTimeout(() => {
              resetSolvedTrees()
              advanceLevel()
            }, 2000)
          })
        } else {
          // Game complete!
          stopGameTimer() // Stop the timer and record best time
          startLevelTransition()
          speak('Congratulations! You completed all levels! You are a math champion!')
        }
      } else {
        speak('Correct! Great job!')
      }

      // Hide modal right away
      hideProblem()
      setInput('')
      setFeedback('')
      setShowSuccess(false)
    } else {
      // Wrong - record the incorrect attempt
      recordAttempt({
        questionType: currentProblem.type,
        question: currentProblem.question,
        correctAnswer: String(currentProblem.answer),
        userAnswer: String(answer),
        correct: false,
        attempts: attemptCountRef.current,
        timestamp: Date.now(),
        level: currentLevel,
        treeId,
      })

      SoundEffects.wrong()
      const encouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
      setFeedback(encouragement)
      speak(encouragement)
      setInput('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
          Math Challenge!
        </h2>

        <div className="text-4xl font-bold text-center mb-6 text-blue-600">
          {currentProblem.question}
        </div>

        {!showSuccess ? (
          <form onSubmit={handleSubmit}>
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your answer"
              className="w-full text-2xl text-center p-3 border-2 border-gray-300 rounded-lg mb-4 text-gray-800"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-blue-500 text-white text-xl py-3 rounded-lg hover:bg-blue-600 transition"
            >
              Submit
            </button>
          </form>
        ) : (
          <div className="text-center text-4xl">🎉</div>
        )}

        {feedback && (
          <div className={`text-center mt-4 text-lg font-semibold ${
            showSuccess ? 'text-green-600' : 'text-orange-500'
          }`}>
            {feedback}
          </div>
        )}

        {attempts > 0 && !showSuccess && (
          <div className="text-center mt-2 text-sm text-gray-500">
            Attempts: {attempts}
          </div>
        )}

        {!showSuccess && (
          <button
            onClick={() => {
              hideProblem()
              setInput('')
              setFeedback('')
            }}
            className="w-full mt-4 text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
