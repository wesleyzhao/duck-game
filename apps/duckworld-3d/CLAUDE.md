# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture Overview

DuckWorld-3D is a React Three Fiber (R3F) 3D game where players control a duck character that can interact with objects, solve math problems, and manipulate the world via natural language commands.

### Core Technologies
- **React Three Fiber** (`@react-three/fiber`) - React renderer for Three.js
- **Rapier Physics** (`@react-three/rapier`) - Physics engine for collisions
- **Zustand** - State management
- **Tailwind CSS v4** - Styling
- **Anthropic Claude API** - Natural language to game commands

### State Management (Zustand Stores)

**`src/store/gameStore.ts`** - Primary game state:
- Player position, rotation, health, points, appearance
- World settings (sky color, terrain color)
- Entity management (trees, lake, user-created objects)
- Tree collision detection with boundary enforcement

**`src/store/mathStore.ts`** - Math challenge system:
- Tracks current problem, solved trees, celebration state
- Manages question display and answer checking

**`src/store/progressStore.ts`** - Player progress tracking:
- Records question attempts for adaptive difficulty
- Provides history summary for LLM question generation

**`src/store/historyStore.ts`** - Undo/redo history

### LLM-Driven Command System

The game accepts natural language commands (text or voice) that are converted to executable game code:

1. **CommandPanel** (`src/components/CommandPanel.tsx`) - UI for text/voice input
2. **llmService** (`src/services/llmService.ts`) - Sends prompts to Claude API with a system prompt containing the game API
3. **executor** (`src/sandbox/executor.ts`) - Executes LLM-generated code in sandbox
4. **SandboxAPI** (`src/sandbox/SandboxAPI.ts`) - Safe game API exposed as `game.*` to LLM code

The SandboxAPI provides: entity CRUD, player control, world manipulation, behaviors (bounce/float/spin/pulse), text-to-speech, and undo/redo.

### Entity System

Entities (`src/types/entities.ts`) have:
- Shapes: `box`, `sphere`, `cylinder`, `cone`, `tree`, `lake`
- Behaviors: `bounce`, `float`, `spin`, `pulse`
- Properties: position, size, color, solid flag

Entities are rendered by `Entities.tsx` which delegates to `Entity3D.tsx` for primitives or specialized components (`Tree.tsx`, `Lake.tsx`).

### Key Components

- **Duck.tsx** - Player character with animation (bobbing, celebration bounce)
- **PlayerController.tsx** - WASD/arrow key movement
- **FollowCamera.tsx** - Camera follows duck with smoothing
- **MathCollisionDetector.tsx** + **MathModal.tsx** - Math tree interactions
- **CelebrationEffect.tsx** - Confetti/cake on correct answers
- **MapBoundary.tsx** - Fence at world edges

### Question System (`src/services/questionService.ts`)

The game has an extensible question system with three levels of difficulty.

**Current question types:**
- `math` - Addition, subtraction, multiplication (fully implemented with LLM support)
- `spelling` - Spell words by difficulty level (word lists ready, input not connected)
- `pronunciation` - Say words clearly (word lists ready, speech recognition not connected)

**To add a new question type:**
1. Add the type to `QuestionType` union
2. Create a generator function: `generateLocal[Type]Question(level: LevelNumber)`
3. Register it in `QUESTION_GENERATORS` object
4. Optionally add LLM support in `generateQuestionFromLLM`

**Level configuration** in `LEVEL_CONFIG`:
- Level 1: 3 trees, easy difficulty
- Level 2: 5 trees, medium difficulty
- Level 3: 7 trees, hard difficulty

### Environment Variables

Create `.env` with:
```
VITE_ANTHROPIC_API_KEY=your_key_here
```

Required for the LLM command system and LLM-generated questions.
