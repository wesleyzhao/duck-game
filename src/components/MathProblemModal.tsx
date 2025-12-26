import { useState, useEffect } from 'react'
import { useMathStore } from '../store/mathStore'

export function MathProblemModal() {
  const { isActive, currentProblem, isLoading, lastFeedback, submitAnswer, closeProblem } = useMathStore()
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset local state when problem changes or modal opens/closes
  useEffect(() => {
    setSelectedAnswer(null)
    setIsSubmitting(false)
  }, [currentProblem, isActive])

  if (!isActive) return null

  const handleNumberClick = async (num: number) => {
    if (isSubmitting || isLoading) return

    setSelectedAnswer(num)
    setIsSubmitting(true)

    const result = await submitAnswer(num)

    if (!result.correct) {
      // Reset selection after a moment for wrong answers
      setTimeout(() => {
        setSelectedAnswer(null)
        setIsSubmitting(false)
      }, 1500)
    }
  }

  const handleClose = () => {
    setSelectedAnswer(null)
    setIsSubmitting(false)
    closeProblem()
  }

  // Number buttons 0-15
  const numbers = Array.from({ length: 16 }, (_, i) => i)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-amber-50 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border-4 border-amber-600 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full text-2xl font-bold flex items-center justify-center"
        >
          &times;
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-amber-800">Math Time!</h2>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-2xl text-amber-700 animate-pulse">
              Thinking of a problem...
            </div>
          </div>
        ) : currentProblem ? (
          <>
            {/* Problem display */}
            <div className="bg-white rounded-2xl p-6 mb-6 text-center shadow-inner">
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {currentProblem.question}
              </div>
            </div>

            {/* Feedback message */}
            {lastFeedback && (
              <div className={`text-center mb-4 p-3 rounded-xl text-xl ${
                lastFeedback.includes('right') || lastFeedback.includes('Great')
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {lastFeedback}
              </div>
            )}

            {/* Number buttons */}
            <div className="grid grid-cols-4 gap-3">
              {numbers.map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  disabled={isSubmitting}
                  className={`
                    p-4 text-3xl font-bold rounded-xl transition-all
                    ${selectedAnswer === num
                      ? 'bg-blue-500 text-white scale-110'
                      : 'bg-white text-blue-600 hover:bg-blue-100 shadow-md'
                    }
                    ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                    border-2 border-blue-300
                  `}
                >
                  {num}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
