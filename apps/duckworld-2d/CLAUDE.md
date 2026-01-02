# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DuckWorld is a 2D browser game where children control a baby duck and modify the game world using natural language (voice or text). The game uses an LLM to interpret commands and execute them via a sandboxed JavaScript API.

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Rendering:** PixiJS 8
- **State Management:** Zustand
- **Voice I/O:** Web Speech API
- **LLM:** Claude API (Sonnet)
- **Styling:** Tailwind CSS

## Common Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
```

## Architecture

### Key Abstraction: Sandbox API
The sandbox API (`src/sandbox/`) is the core architectural pattern. LLM-generated code runs in a restricted environment with access only to a `game` object. This provides:
- Safety (no access to browser APIs, network, etc.)
- Automatic change tracking for undo/redo
- Debuggability

### Data Flow
1. User speaks/types natural language command
2. `llmService` sends command + game state to Claude
3. Claude returns JavaScript code using the sandbox API
4. `executor` runs code in sandboxed environment
5. `SandboxAPI` methods modify game state via Zustand store
6. `GameRenderer` subscribes to state and renders via PixiJS
7. Changes are recorded in `historyStore` for undo support

### Key Files
- `src/sandbox/SandboxAPI.ts` - Implements game modification API with change tracking
- `src/sandbox/executor.ts` - Safe code execution with restricted globals
- `src/game/GameRenderer.ts` - PixiJS rendering and animation loop
- `src/store/gameStore.ts` - Main game state (player, entities, world)
- `src/store/historyStore.ts` - Undo/redo history
- `src/services/llmService.ts` - Claude API integration with system prompt

### Entity System
Entities have: position, shape, color, size, name, solid flag. Behaviors (bounce, spin, pulse, float) are processed in the game loop.

## Development Rules

**Work incrementally.** Each change should be small, testable, and working before moving on. Never write large amounts of code at once.

**Test after every step.** Before moving to the next step:
1. Run `npm run dev` and verify the change works in browser
2. Check the console for errors
3. Manually test the specific feature added

**Implementation phases** are documented in `duckworld-implementation-guide.md`. Each step includes a specific test to verify it works.

## Tech Stack Notes

**Zustand** is a lightweight state management library (~1KB). Basic usage:
```typescript
// Define store
const useGameStore = create<GameState>((set) => ({
  points: 0,
  addPoints: (n) => set((state) => ({ points: state.points + n })),
}))

// Use in component
const points = useGameStore((state) => state.points)
```

## Environment Variables

```
VITE_CLAUDE_API_KEY=your_api_key_here
```

## Implementation Progress

Following `duckworld-implementation-guide.md`. Current status:

### Phase 1: Project Setup & Basic Rendering ✅
- [x] Step 1.1: Initialize Vite React TypeScript project
- [x] Step 1.2: Configure Tailwind CSS
- [x] Step 1.3: Create environment file
- [x] Step 1.4: Define core types (`src/types/game.ts`)
- [x] Step 1.5: Create game state store (`src/store/gameStore.ts`)
- [x] Step 1.6: Create basic PixiJS renderer (`src/game/GameRenderer.ts`)
- [x] Step 1.7: Render entities (trees and lake)
- [x] Step 1.8: Render player (duck)
- [x] Step 1.9: Add duck idle animation
- [x] Step 1.10: Add keyboard movement
- [x] Step 1.11: Add collision detection
- [x] Step 1.12: Create HUD component

### Phase 2: Sandbox Executor ✅
- [x] Step 2.1: Define Sandbox API interface (`src/sandbox/types.ts`)
- [x] Step 2.2: Implement SandboxAPI class (`src/sandbox/SandboxAPI.ts`)
- [x] Step 2.3: Create safe executor (`src/sandbox/executor.ts`)
- [x] Step 2.4: Create history store (`src/store/historyStore.ts`)
- [x] Step 2.5: Add behavior processing (bounce, float in GameRenderer)
- [x] Step 2.6: Create temporary test UI (`src/components/ChatPanel.tsx`)

### Phase 3: LLM Integration ✅
- [x] Step 3.1: Create LLM system prompt (`src/services/llmService.ts`)
- [x] Step 3.2: Create LLM API call function
- [x] Step 3.3: Create integration pipeline (ChatPanel uses LLM)
- [x] Step 3.4: Improve chat UI (loading states, better messages)
- [x] Step 3.5: Add error handling
### Phase 4: Voice Input ✅
- [x] Step 4.1: Create speech recognition service (`src/services/speechRecognition.ts`)
- [x] Step 4.2: Create VoiceButton component (`src/components/VoiceButton.tsx`)
- [x] Step 4.3: Integrate voice with ChatPanel
- [x] Step 4.4: Handle edge cases (permissions, silence, no speech)

### Phase 5: Voice Output ✅
- [x] Text-to-speech for game responses (`src/services/voiceService.ts`)

### Phase 6: Game Mechanics ✅
- [x] Math problem trees with question badges
- [x] Level system (3 levels with increasing difficulty)
- [x] Timer display
- [x] Lives system (5 lives, invincibility after hit)
- [x] Enemy turtles with bounce behavior
- [x] Game over and level complete overlays
- [x] Sound effects (correct answer, wrong answer, hurt)

### Phase 7: Code IDE Panel ✅
- [x] CodeMirror editor with JavaScript syntax highlighting
- [x] Voice input for code generation
- [x] Example snippets buttons
- [x] API Reference help tooltip
- [x] Keyboard shortcut (Cmd/Ctrl+Enter to run)
- [x] Sandbox API for turtle speed control (slowEnemies, speedUpEnemies)

### Current Architecture Notes
- Terrain/sky colors: Controlled by gameStore.world, synced from levelStore on level changes
- Tree colors: Use entity.color if set (sandbox override), otherwise levelStore.getTreeColor()
- Turtles: Use bounce behavior with speed property, controllable via game.slowEnemies()
