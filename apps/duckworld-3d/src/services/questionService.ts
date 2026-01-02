import { useProgressStore } from '../store/progressStore'

// ============================================================================
// EXTENSIBLE QUESTION SYSTEM
// To add a new question type:
// 1. Add the type to QuestionType union
// 2. Create a generator function: generateLocal[Type]Question(level)
// 3. Register it in QUESTION_GENERATORS
// 4. Optionally add LLM support in generateQuestionFromLLM
// ============================================================================

// Extensible question types - add new types here
export type QuestionType = 'math' | 'spelling' | 'pronunciation'

export interface Question {
  type: QuestionType
  question: string
  answer: string | number
  hint?: string
  spokenPrompt?: string  // What to say via TTS
  treeId?: string        // Associated tree (set when assigned to a tree)
}

// Generator function signature for creating questions
type QuestionGenerator = (level: LevelNumber) => Question

// Level configuration - easy to modify per level
export const LEVEL_CONFIG = {
  1: { treesRequired: 3, difficulty: 'easy', maxNumber: 10 },
  2: { treesRequired: 5, difficulty: 'medium', maxNumber: 20 },
  3: { treesRequired: 7, difficulty: 'hard', maxNumber: 50 },
} as const

export type LevelNumber = keyof typeof LEVEL_CONFIG

// Store for pre-generated questions per level
const questionCache: Map<number, Question[]> = new Map()

// Check if API key is available
function hasApiKey(): boolean {
  return Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY)
}

// Generate a single question using LLM
async function generateQuestionFromLLM(
  level: LevelNumber,
  type: QuestionType,
  userHistory: string
): Promise<Question | null> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return null

  // Level 1: Simple addition only (sum <= 10). Level 2: Addition (can exceed 10) + subtraction (numbers <= 10). Level 3: Same + multiplication.
  const operations = level === 1 ? 'ONLY addition where the sum is 10 or less (like 3+4=7, 2+5=7, 1+8=9)' :
                     level === 2 ? 'addition (numbers 1-10, sums can exceed 10) OR subtraction where BOTH numbers are 10 or less (like 10-3, 8-5, 7-2) with positive results' :
                     'addition (numbers 1-10), subtraction (numbers 1-10), OR simple multiplication (2x, 5x, or 10x) where the answer is 40 or less (like 2×8=16, 5×6=30, 10×4=40)'

  // Generate random numbers appropriate for the level
  let num1: number, num2: number
  if (level === 1) {
    // Level 1: ensure sum <= 10
    num1 = Math.floor(Math.random() * 8) + 1  // 1-8
    num2 = Math.floor(Math.random() * (10 - num1)) + 1  // ensure sum <= 10
  } else {
    // Level 2 and 3: numbers 1-10 for addition and subtraction
    num1 = Math.floor(Math.random() * 10) + 1  // 1-10
    num2 = Math.floor(Math.random() * 10) + 1  // 1-10
  }

  const systemPrompt = `Generate a math question for a children's game.
Level ${level}. Operations: ${operations}.

USE THESE SPECIFIC NUMBERS: ${num1} and ${num2}
Create a question using these exact numbers (you may swap their order if needed for subtraction).

Player context: ${userHistory}

Respond with ONLY valid JSON:
{"question": "X + Y = ?", "answer": Z, "hint": "helpful hint", "spokenPrompt": "What is X plus Y?"}`

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
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Generate a question.' }],
      }),
    })

    if (!response.ok) {
      console.warn('LLM API error, falling back to local generation')
      return null
    }

    const data = await response.json()
    let text = data.content[0].text

    // Strip markdown code blocks if present (```json ... ```)
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    // Parse JSON response
    const parsed = JSON.parse(text)

    // Validate multiplication questions for level 3 - must use 2, 5, or 10
    if (level === 3 && parsed.question.includes('×')) {
      const match = parsed.question.match(/(\d+)\s*×\s*(\d+)/)
      if (match) {
        const a = parseInt(match[1])
        const b = parseInt(match[2])
        const validMultipliers = [2, 5, 10]
        // Check if either number is a valid multiplier
        if (!validMultipliers.includes(a) && !validMultipliers.includes(b)) {
          console.warn('LLM generated invalid multiplication, falling back to local')
          return null
        }
        // Check if result is <= 40
        if (a * b > 40) {
          console.warn('LLM generated multiplication > 40, falling back to local')
          return null
        }
      }
    }

    return {
      type,
      question: parsed.question,
      answer: parsed.answer,
      hint: parsed.hint,
      spokenPrompt: parsed.spokenPrompt,
    }
  } catch (error) {
    console.warn('Failed to generate question from LLM:', error)
    return null
  }
}

// Local fallback generators
function generateLocalMathQuestion(level: LevelNumber): Question {
  let a: number, b: number, answer: number, question: string, op: '+' | '-' | '*'

  if (level === 1) {
    // Level 1: Addition only, sum <= 10
    op = '+'
    a = Math.floor(Math.random() * 9) + 1  // 1-9
    b = Math.floor(Math.random() * (10 - a)) + 1  // Ensure sum <= 10
    answer = a + b
    question = `${a} + ${b} = ?`
  } else if (level === 2) {
    // Level 2: Addition (can exceed 10) and subtraction (numbers <= 10)
    op = Math.random() < 0.5 ? '+' : '-'
    if (op === '+') {
      a = Math.floor(Math.random() * 10) + 1  // 1-10
      b = Math.floor(Math.random() * 10) + 1  // 1-10
      answer = a + b  // Can sum up to 20
      question = `${a} + ${b} = ?`
    } else {
      // Subtraction: both numbers <= 10, result is positive
      a = Math.floor(Math.random() * 9) + 2   // 2-10 (need room for b)
      b = Math.floor(Math.random() * (a - 1)) + 1  // 1 to (a-1), ensures positive result
      answer = a - b
      question = `${a} - ${b} = ?`
    }
  } else {
    // Level 3: Same add/sub as level 2, plus simple multiplication (2x, 5x, 10x with max result 40)
    const opChoice = Math.random()
    if (opChoice < 0.33) {
      // Addition: same as level 2 (numbers 1-10)
      op = '+'
      a = Math.floor(Math.random() * 10) + 1  // 1-10
      b = Math.floor(Math.random() * 10) + 1  // 1-10
      answer = a + b
      question = `${a} + ${b} = ?`
    } else if (opChoice < 0.66) {
      // Subtraction: same as level 2 (numbers <= 10)
      op = '-'
      a = Math.floor(Math.random() * 9) + 2   // 2-10
      b = Math.floor(Math.random() * (a - 1)) + 1  // 1 to (a-1)
      answer = a - b
      question = `${a} - ${b} = ?`
    } else {
      op = '*'
      // Simple times tables: 2x, 5x, or 10x with result <= 40
      const multiplier = [2, 5, 10][Math.floor(Math.random() * 3)]
      const maxB = Math.floor(40 / multiplier)  // 2->20, 5->8, 10->4
      b = Math.floor(Math.random() * maxB) + 1
      a = multiplier
      answer = a * b
      question = `${a} × ${b} = ?`
    }
  }

  const opWord = op === '+' ? 'plus' : op === '-' ? 'minus' : op === '*' ? 'times' : 'divided by'

  return {
    type: 'math',
    question,
    answer,
    hint: level === 1 ? 'Try counting on your fingers!' : undefined,
    spokenPrompt: `What is ${a} ${opWord} ${b}?`,
  }
}

// ============================================================================
// SPELLING QUESTION GENERATOR
// Word lists organized by difficulty level
// ============================================================================
const SPELLING_WORDS = {
  1: ['cat', 'dog', 'sun', 'hat', 'run', 'big', 'red', 'mom', 'dad', 'cup'],
  2: ['tree', 'book', 'play', 'jump', 'fish', 'bird', 'star', 'moon', 'cake', 'duck'],
  3: ['friend', 'school', 'happy', 'water', 'animal', 'purple', 'orange', 'garden', 'family', 'music'],
} as const

function generateLocalSpellingQuestion(level: LevelNumber): Question {
  const words = SPELLING_WORDS[level]
  const word = words[Math.floor(Math.random() * words.length)]

  return {
    type: 'spelling',
    question: `Spell: ${word.toUpperCase()}`,
    answer: word.toLowerCase(),
    hint: level === 1 ? 'Sound it out!' : undefined,
    spokenPrompt: `Spell the word ${word}`,
  }
}

// ============================================================================
// PRONUNCIATION QUESTION GENERATOR
// Words to practice saying clearly
// ============================================================================
const PRONUNCIATION_WORDS = {
  1: ['hello', 'thank you', 'please', 'goodbye', 'yes', 'no', 'help', 'sorry'],
  2: ['wonderful', 'excellent', 'beautiful', 'fantastic', 'incredible', 'amazing'],
  3: ['encyclopedia', 'hippopotamus', 'congratulations', 'extraordinary', 'magnificent'],
} as const

function generateLocalPronunciationQuestion(level: LevelNumber): Question {
  const words = PRONUNCIATION_WORDS[level]
  const word = words[Math.floor(Math.random() * words.length)]

  return {
    type: 'pronunciation',
    question: `Say: "${word.toUpperCase()}"`,
    answer: word.toLowerCase(),
    hint: 'Speak clearly into your microphone!',
    spokenPrompt: `Say the word ${word}`,
  }
}

// ============================================================================
// QUESTION GENERATOR REGISTRY
// Maps question types to their generator functions
// To add a new type, just add an entry here!
// ============================================================================
const QUESTION_GENERATORS: Record<QuestionType, QuestionGenerator> = {
  math: generateLocalMathQuestion,
  spelling: generateLocalSpellingQuestion,
  pronunciation: generateLocalPronunciationQuestion,
}

// Generate a single question (tries LLM first, falls back to local)
export async function generateQuestion(
  level: LevelNumber,
  type: QuestionType = 'math'
): Promise<Question> {
  // Try LLM first if available (currently only for math)
  if (hasApiKey() && type === 'math') {
    console.log('[QuestionService] Using LLM for question generation')
    const history = useProgressStore.getState().getSummaryForLLM()
    const llmQuestion = await generateQuestionFromLLM(level, type, history)
    if (llmQuestion) {
      console.log('[QuestionService] LLM generated:', llmQuestion.question)
      return llmQuestion
    }
    console.log('[QuestionService] LLM failed, falling back to local')
  } else {
    console.log('[QuestionService] Using local generation for:', type)
  }

  // Use the registry to get the appropriate generator
  const generator = QUESTION_GENERATORS[type] ?? QUESTION_GENERATORS.math
  const question = generator(level)
  console.log('[QuestionService] Local generated:', question.question)
  return question
}

// Pre-generate questions for a level (batch)
export async function pregenerateQuestionsForLevel(
  level: LevelNumber,
  count?: number
): Promise<Question[]> {
  const config = LEVEL_CONFIG[level]
  const questionCount = count ?? config.treesRequired

  const questions: Question[] = []

  // Try to generate from LLM
  if (hasApiKey()) {
    const history = useProgressStore.getState().getSummaryForLLM()

    // Generate questions in parallel (but limit concurrency)
    const promises = Array(questionCount)
      .fill(null)
      .map(() => generateQuestionFromLLM(level, 'math', history))

    const results = await Promise.all(promises)

    for (const result of results) {
      if (result) {
        questions.push(result)
      }
    }
  }

  // Fill remaining with local generation if needed
  while (questions.length < questionCount) {
    questions.push(generateLocalMathQuestion(level))
  }

  // Cache the questions
  questionCache.set(level, questions)

  return questions
}

// Get a question from the cache (or generate on-demand)
export async function getQuestionForTree(
  level: LevelNumber,
  treeId: string,
  type: QuestionType = 'math'
): Promise<Question> {
  // Check cache first
  const cached = questionCache.get(level)
  if (cached && cached.length > 0) {
    const question = cached.shift()!
    question.treeId = treeId
    questionCache.set(level, cached)
    return question
  }

  // Generate on-demand if cache is empty
  const question = await generateQuestion(level, type)
  question.treeId = treeId
  return question
}

// Clear the question cache (e.g., when starting a new game)
export function clearQuestionCache(): void {
  questionCache.clear()
}

// Check how many questions are cached for a level
export function getCachedQuestionCount(level: LevelNumber): number {
  return questionCache.get(level)?.length ?? 0
}

// ============================================================================
// UTILITY FUNCTIONS FOR EXTENSIBILITY
// ============================================================================

// Get list of all available question types
export function getAvailableQuestionTypes(): QuestionType[] {
  return Object.keys(QUESTION_GENERATORS) as QuestionType[]
}

// Check if a question type is implemented
export function isQuestionTypeAvailable(type: string): type is QuestionType {
  return type in QUESTION_GENERATORS
}
