# Implementation Plan: Levels & LLM Questions

## Overview

Add a 3-level progression system with LLM-generated questions, visual theming per level, and extensible question types.

---

## Part 1: LLM-Powered Question System

### New Files
- `src/services/questionService.ts` - LLM question generation + fallback
- `src/store/progressStore.ts` - Track user performance history

### Question Generation Flow
```
Tree collision detected
       ↓
Check progressStore for user history
       ↓
Call questionService.generateQuestion(level, questionType, userHistory)
       ↓
LLM generates appropriate question OR fallback to local generation
       ↓
Display in modal
```

### ProgressStore Schema
```typescript
interface QuestionAttempt {
  questionType: 'math' | 'spelling' | 'pronunciation'
  question: string
  correctAnswer: string
  userAnswer: string
  correct: boolean
  attempts: number
  timestamp: number
  level: number
}

interface ProgressState {
  history: QuestionAttempt[]       // Last N attempts (e.g., 50)
  totalCorrect: number
  totalIncorrect: number
  streakCount: number              // Current correct streak

  // Actions
  recordAttempt: (attempt: QuestionAttempt) => void
  getRecentHistory: (count: number) => QuestionAttempt[]
  getSummaryForLLM: () => string   // Formatted summary for LLM context
}
```

### QuestionService API
```typescript
interface Question {
  type: 'math' | 'spelling' | 'pronunciation'
  question: string
  answer: string | number
  hint?: string
  spokenPrompt?: string           // What to say via TTS
}

// Main function - tries LLM first, falls back to local
async function generateQuestion(
  level: number,
  type: QuestionType,
  userHistory: string
): Promise<Question>

// Fallback generators (current math logic + new types)
function generateLocalMathQuestion(level: number): Question
function generateLocalSpellingQuestion(level: number): Question
```

### LLM Prompt Strategy
- Include user's recent performance summary (correct/incorrect, weak areas)
- Include current level (1-3) for difficulty scaling
- Ask for JSON response with question, answer, hint, spoken prompt
- Difficulty scales: Level 1 = easy, Level 2 = medium, Level 3 = harder

---

## Part 2: Level System (3 Levels)

### New State in gameStore
```typescript
// Configuration - easy to modify per level
const LEVEL_CONFIG = {
  1: { treesRequired: 3, grassColor: '#4ade80', treeColor: '#228B22' },
  2: { treesRequired: 5, grassColor: '#86efac', treeColor: '#2d5a27' },
  3: { treesRequired: 7, grassColor: '#a7f3d0', treeColor: '#1a472a' },
}

interface GameStore {
  // ... existing
  currentLevel: 1 | 2 | 3

  // Actions
  advanceLevel: () => void
  resetLevel: () => void
  getTreesRequiredForCurrentLevel: () => number
}
```

### Level Progression
- Each level has N math trees (e.g., 5)
- Solve all trees → trigger level-up celebration → advance to next level
- Between levels: call LLM to prepare questions for next level based on performance

### Visual Themes Per Level

| Level | Grass Color | Tree Foliage | Sky Tint | Duck Size | Duck Accessory |
|-------|-------------|--------------|----------|-----------|----------------|
| 1     | #4ade80 (current green) | #228B22 (forest green) | lightblue | 1.0 | None |
| 2     | #86efac (lighter green) | #2d5a27 (darker green) | #87CEEB | 1.15 | Beret (red) |
| 3     | #a7f3d0 (mint green) | #1a472a (deep forest) | #B0E0E6 | 1.3 | Cape (purple) |

### Duck Accessories (in Duck.tsx)
```tsx
// Beret - flat disc on head
{level >= 2 && (
  <mesh position={[0, 0.55, 0.35]} rotation={[0.3, 0, 0]}>
    <cylinderGeometry args={[0.2, 0.22, 0.08, 16]} />
    <meshStandardMaterial color="#CC0000" />
  </mesh>
)}

// Cape - flows behind
{level >= 3 && (
  <mesh position={[0, 0.1, -0.4]} rotation={[0.2, 0, 0]}>
    <planeGeometry args={[0.6, 0.8]} />
    <meshStandardMaterial color="#6B21A8" side={DoubleSide} />
  </mesh>
)}
```

### Level Transition Flow
```
Solve last tree of level
       ↓
Show "Level Complete!" celebration
       ↓
Call LLM to generate next level's questions (async)
       ↓
Update world colors, duck size/accessories
       ↓
Reset trees for new level (or new tree positions)
       ↓
Continue playing
```

---

## Part 3: Extensible Question Types

### Entity Extension
```typescript
// In types/entities.ts
export type QuestionType = 'math' | 'spelling' | 'pronunciation'

export interface Entity {
  // ... existing
  isMathTree?: boolean           // Keep for backwards compat
  questionType?: QuestionType    // New: explicit question type
}
```

### Question Type Behaviors

**Math (existing)**
- Display: "5 + 3 = ?"
- Input: Number field
- Validation: Exact match

**Spelling (new)**
- Display: "Spell the word: [image or spoken word]"
- TTS: Speaks the word
- Input: Text field
- Validation: Case-insensitive match

**Pronunciation (new - future)**
- Display: "Say this word: ELEPHANT"
- Uses speech recognition (already have `speechRecognition.ts`)
- Validation: Fuzzy match on transcribed text

### Tree Visual Differentiation
Different glow/particle effects based on question type:
- Math trees: Blue glow
- Spelling trees: Green glow
- Pronunciation trees: Orange glow

---

## Implementation Order (Incremental Steps)

### Phase 1: Progress Tracking (Foundation)
1. Create `progressStore.ts` with history tracking
2. Update `MathModal.tsx` to record attempts to progressStore
3. Test & commit

### Phase 2: Question Service with LLM
4. Create `questionService.ts` with extensible Question interface + LLM + fallback
5. Add pre-generation for level questions (batch), with flexibility for on-demand
6. Update `MathCollisionDetector.tsx` to use questionService
7. Update `MathModal.tsx` to handle Question interface
8. Test with/without API key & commit

### Phase 3: Level State & Tree Randomization
9. Add level state to `gameStore.ts` (currentLevel, treesPerLevel)
10. Add tree randomization function for level transitions
11. Add level-up logic (check solved trees, advance level)
12. Test level progression & commit

### Phase 4: Visual Theming
13. Update `Ground.tsx` to use level-based colors
14. Update `Tree.tsx` to accept foliage color prop
15. Update `Duck.tsx` with level-based size + accessories (beret, cape)
16. Test visuals & commit

### Phase 5: Level Transitions
17. Create level-up celebration effect
18. Add LLM call between levels to pre-generate next batch of questions
19. Test full flow & commit

### Phase 6: Question Type Prep (Structure Only)
20. Add `questionType` to Entity interface (math | spelling | pronunciation)
21. Prepare QuestionModal to be extensible for different input types (defer UI)
22. Test & commit

---

## Decisions Made

1. **Trees per level**: 5 question trees to advance, but many total trees for scenery
2. **Level reset**: Randomize tree positions each level
3. **Spelling/Pronunciation**: Defer implementation, but prepare extensible code structure
4. **LLM batching**: Pre-generate questions per level (but code flexible for on-demand)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/progressStore.ts` | NEW - user performance history |
| `src/services/questionService.ts` | NEW - LLM question generation |
| `src/store/gameStore.ts` | Add level state, level-up actions |
| `src/store/mathStore.ts` | Rename to questionStore, expand for types |
| `src/types/entities.ts` | Add QuestionType |
| `src/components/Duck.tsx` | Add beret, cape based on level |
| `src/components/Tree.tsx` | Accept foliage color prop |
| `src/components/Ground.tsx` | Level-based terrain color |
| `src/components/MathModal.tsx` | Generalize for question types |
| `src/components/MathCollisionDetector.tsx` | Use questionService |
