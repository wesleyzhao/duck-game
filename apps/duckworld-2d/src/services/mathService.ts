// Math problem service - generates problems via LLM

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface MathProblem {
  question: string      // Display text: "3 + 2 = ?"
  speakText: string     // Text to speak: "What is three plus two?"
  answer: number        // Correct answer
  difficulty: Difficulty
}

// Difficulty settings per level
const DIFFICULTY_CONFIG: Record<Difficulty, { minNum: number; maxNum: number; maxAnswer: number }> = {
  easy: { minNum: 1, maxNum: 7, maxAnswer: 12 },    // Level 1: numbers 1-7
  medium: { minNum: 2, maxNum: 12, maxAnswer: 18 }, // Level 2: numbers 2-12
  hard: { minNum: 3, maxNum: 18, maxAnswer: 25 },   // Level 3: numbers 3-18
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

// Generate a math problem using LLM with context about student progress
export async function generateMathProblemWithContext(
  difficulty: Difficulty,
  historyContext: string
): Promise<MathProblem> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY
  const config = DIFFICULTY_CONFIG[difficulty]

  // If no API key, fall back to local generation
  if (!apiKey) {
    console.log('No API key, using local math generation')
    return generateLocalMathProblem(difficulty)
  }

  const prompt = `You are a friendly math teacher for a 6-year-old child named Emerson playing a fun duck game. Generate ONE math problem.

DIFFICULTY: ${difficulty.toUpperCase()}
- Numbers should be between ${config.minNum} and ${config.maxNum}
- The answer should be between 0 and ${config.maxAnswer}
- Use addition or subtraction only

STUDENT PROGRESS:
${historyContext}

Based on the student's progress, generate an appropriate problem. If they're struggling, make it slightly easier. If they're doing well, you can make it a bit more challenging (within the difficulty bounds).

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{"question": "3 + 2 = ?", "speakText": "What is three plus two?", "answer": 5}`

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
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error('Math problem API error:', response.status)
      return generateLocalMathProblem(difficulty)
    }

    const data = await response.json()
    const text = data.content[0]?.text || ''

    // Parse JSON response
    const parsed = JSON.parse(text.trim())
    return {
      question: parsed.question,
      speakText: parsed.speakText,
      answer: parsed.answer,
      difficulty,
    }
  } catch (error) {
    console.error('Failed to generate math problem with context:', error)
    return generateLocalMathProblem(difficulty)
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
export function generateLocalMathProblem(difficulty: Difficulty = 'easy'): MathProblem {
  const config = DIFFICULTY_CONFIG[difficulty]
  const isAddition = Math.random() > 0.4 // 60% addition, 40% subtraction
  let a: number, b: number, answer: number, question: string, speakText: string

  if (isAddition) {
    // For addition, ensure answer doesn't exceed maxAnswer
    a = Math.floor(Math.random() * (config.maxNum - config.minNum + 1)) + config.minNum
    const maxB = Math.min(config.maxNum, config.maxAnswer - a)
    b = Math.floor(Math.random() * (maxB - config.minNum + 1)) + config.minNum
    answer = a + b
    question = `${a} + ${b} = ?`
    speakText = `What is ${numberToWord(a)} plus ${numberToWord(b)}?`
  } else {
    // For subtraction, ensure a > b and answer is positive
    a = Math.floor(Math.random() * (config.maxNum - config.minNum - 1)) + config.minNum + 2 // At least minNum+2
    b = Math.floor(Math.random() * (a - config.minNum)) + config.minNum // 1 to (a-1)
    answer = a - b
    question = `${a} - ${b} = ?`
    speakText = `What is ${numberToWord(a)} minus ${numberToWord(b)}?`
  }

  return { question, speakText, answer, difficulty }
}

function numberToWord(n: number): string {
  const words = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
    'nineteen', 'twenty'
  ]
  return words[n] || n.toString()
}
