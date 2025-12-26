// Math problem service - generates problems via LLM

export interface MathProblem {
  question: string      // Display text: "3 + 2 = ?"
  speakText: string     // Text to speak: "What is three plus two?"
  answer: number        // Correct answer
  difficulty: 'easy' | 'medium'
}

export interface WrongAnswerResponse {
  encouragement: string  // Encouraging message
  hint?: string          // Optional hint
}

const MATH_PROBLEM_PROMPT = `You are a friendly math teacher for a 6-year-old child playing a fun duck game. Generate ONE simple math problem.

Rules:
- Use only addition or subtraction
- Numbers should be between 1 and 10
- The answer should be a positive number between 0 and 15
- Make it fun and encouraging!

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{"question": "3 + 2 = ?", "speakText": "What is three plus two?", "answer": 5}

Generate a new random problem now:`

const WRONG_ANSWER_PROMPT = `You are a friendly, encouraging math teacher for a 6-year-old named Emerson who is playing a fun duck game.

The child just answered a math problem incorrectly. Be VERY encouraging and give a gentle hint without giving away the answer.

Problem: {problem}
Child's wrong answer: {wrongAnswer}
Correct answer: {correctAnswer}

Respond with ONLY valid JSON (no markdown):
{"encouragement": "your encouraging message here", "hint": "optional gentle hint"}`

export async function generateMathProblem(): Promise<MathProblem | null> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY

  if (!apiKey) {
    console.error('Claude API key not configured')
    return null
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: MATH_PROBLEM_PROMPT,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error('Math problem API error:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.content[0]?.text || ''

    // Parse JSON response
    const parsed = JSON.parse(text.trim())
    return {
      question: parsed.question,
      speakText: parsed.speakText,
      answer: parsed.answer,
      difficulty: 'easy',
    }
  } catch (error) {
    console.error('Failed to generate math problem:', error)
    return null
  }
}

export async function getWrongAnswerFeedback(
  problem: string,
  wrongAnswer: number,
  correctAnswer: number
): Promise<WrongAnswerResponse> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY

  if (!apiKey) {
    return {
      encouragement: "That's not quite right, but you're doing great! Try again!",
    }
  }

  try {
    const prompt = WRONG_ANSWER_PROMPT
      .replace('{problem}', problem)
      .replace('{wrongAnswer}', wrongAnswer.toString())
      .replace('{correctAnswer}', correctAnswer.toString())

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      return {
        encouragement: "Almost! Give it another try, you've got this!",
      }
    }

    const data = await response.json()
    const text = data.content[0]?.text || ''

    const parsed = JSON.parse(text.trim())
    return {
      encouragement: parsed.encouragement,
      hint: parsed.hint,
    }
  } catch (error) {
    console.error('Failed to get feedback:', error)
    return {
      encouragement: "That's okay! Math takes practice. Want to try again?",
    }
  }
}

// Fallback: Generate a simple problem locally if API fails
export function generateLocalMathProblem(): MathProblem {
  const isAddition = Math.random() > 0.4 // 60% addition, 40% subtraction
  let a: number, b: number, answer: number, question: string, speakText: string

  if (isAddition) {
    a = Math.floor(Math.random() * 8) + 1 // 1-8
    b = Math.floor(Math.random() * 8) + 1 // 1-8
    answer = a + b
    question = `${a} + ${b} = ?`
    speakText = `What is ${numberToWord(a)} plus ${numberToWord(b)}?`
  } else {
    a = Math.floor(Math.random() * 8) + 3 // 3-10
    b = Math.floor(Math.random() * (a - 1)) + 1 // 1 to (a-1)
    answer = a - b
    question = `${a} - ${b} = ?`
    speakText = `What is ${numberToWord(a)} minus ${numberToWord(b)}?`
  }

  return { question, speakText, answer, difficulty: 'easy' }
}

function numberToWord(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
                 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen']
  return words[n] || n.toString()
}
