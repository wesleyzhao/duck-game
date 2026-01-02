# DuckWorld: Implementation Guide for Claude Code

## Overview

This guide provides step-by-step instructions for building DuckWorld. Each step is small, testable, and builds on the previous one. **Do not write large amounts of code at once.** Complete each step, test it, then move to the next.

**Total Time Estimate:** 2-3 hours

---

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Rendering:** PixiJS 8
- **State Management:** Zustand
- **Voice Input:** Web Speech API
- **Voice Output:** Web Speech API (upgrade to ElevenLabs later)
- **LLM:** Claude API (Sonnet)
- **Styling:** Tailwind CSS

---

## Project Structure

```
duckworld/
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Main layout
│   ├── index.css                # Tailwind imports
│   │
│   ├── types/
│   │   └── game.ts              # All TypeScript interfaces
│   │
│   ├── store/
│   │   ├── gameStore.ts         # Main game state (Zustand)
│   │   └── historyStore.ts      # Undo/redo history
│   │
│   ├── game/
│   │   └── GameRenderer.ts      # PixiJS rendering + animation
│   │
│   ├── sandbox/
│   │   ├── types.ts             # Sandbox API interface
│   │   ├── SandboxAPI.ts        # API implementation with change tracking
│   │   └── executor.ts          # Safe code execution
│   │
│   ├── services/
│   │   ├── llmService.ts        # Claude API calls
│   │   ├── speechRecognition.ts # Web Speech API input
│   │   └── textToSpeech.ts      # Web Speech API output
│   │
│   └── components/
│       ├── GameCanvas.tsx       # Mounts PixiJS
│       ├── HUD.tsx              # Health + points display
│       ├── ChatPanel.tsx        # Text input/output + message history
│       └── VoiceButton.tsx      # Microphone button
```

---

## Phase 1: Project Setup & Basic Rendering

**Goal:** Duck appears on screen and moves with arrow keys

### Step 1.1: Initialize Project
- Create Vite React TypeScript project
- Install dependencies: pixi.js, zustand
- Install dev dependencies: tailwindcss, postcss, autoprefixer
- Initialize Tailwind config
- **Test:** `npm run dev` shows default Vite page

### Step 1.2: Configure Tailwind
- Update tailwind.config.js with content paths
- Update index.css with Tailwind directives
- **Test:** Add a Tailwind class to App.tsx, confirm it works

### Step 1.3: Create Environment File
- Create .env with VITE_CLAUDE_API_KEY placeholder
- Add .env to .gitignore
- **Test:** Can access `import.meta.env.VITE_CLAUDE_API_KEY` in code

### Step 1.4: Define Core Types
- Create src/types/game.ts
- Define: Position, EntityConfig, BehaviorConfig, PlayerState, PlayerAppearance, WorldState, GameState, Change, ChatMessage
- **Test:** TypeScript compiles without errors

### Step 1.5: Create Game State Store
- Create src/store/gameStore.ts using Zustand
- Define initial player state (position 400,300; yellow duck; 100 health; 0 points)
- Define initial world state (800x600; green terrain; blue sky)
- Define initial entities (1 lake, 5 trees with positions)
- Add actions: movePlayer, teleportPlayer, setPlayerAppearance, modifyHealth, modifyPoints
- Add actions: addEntity, updateEntity, removeEntity, getEntity, getAllEntities
- Add actions: setTerrainColor, setSkyColor
- Add actions: addBehavior, removeBehavior
- **Test:** Import store in App.tsx, log initial state to console

### Step 1.6: Create Basic PixiJS Renderer
- Create src/game/GameRenderer.ts as a class
- Constructor: create PixiJS Application, terrain Graphics, entity Container, player Container
- init(container) method: initialize app, append canvas, setup layers
- renderTerrain() method: draw colored rectangle for ground
- **Test:** Green rectangle appears on screen

### Step 1.7: Render Entities (Trees and Lake)
- Add renderEntities() method to GameRenderer
- Subscribe to gameStore entities
- Draw lake as blue ellipse
- Draw trees as brown rectangle (trunk) + green circle (foliage)
- **Test:** Lake and 5 trees appear on screen

### Step 1.8: Render Player (Duck)
- Add renderPlayer() method to GameRenderer
- Draw duck using Graphics: yellow ellipse body, yellow circle head, orange ellipse beak, black circle eye with white highlight
- Position duck at player.x, player.y from store
- **Test:** Yellow duck appears in center of screen

### Step 1.9: Add Duck Idle Animation
- Add gameLoop() method attached to PixiJS ticker
- Track time-based bobbing offset: `Math.sin(time * 2) * 2`
- Track breathing scale: `1 + Math.sin(time * 1.5) * 0.03`
- Apply to duck rendering
- **Test:** Duck gently bobs up and down continuously

### Step 1.10: Add Keyboard Movement
- Add setupKeyboardInput() method
- Track which keys are currently pressed (Set)
- On each tick, check keys and call movePlayer with dx/dy
- Implement movePlayer in store with boundary checking (keep duck on screen)
- **Test:** Arrow keys and WASD move the duck smoothly

### Step 1.11: Add Collision Detection
- Update movePlayer to check collision with solid entities
- Lake and trees should block movement
- **Test:** Duck cannot walk through trees or into lake

### Step 1.12: Create React Components
- Create GameCanvas.tsx: mounts PixiJS renderer into a div ref
- Create HUD.tsx: displays health as hearts, points as number
- Subscribe HUD to gameStore
- Update App.tsx: layout with GameCanvas + HUD overlay
- **Test:** Full game view with HUD showing 5 hearts and 0 points

**🎯 CHECKPOINT 1:** Duck moves, world renders, duck bobs when idle, collisions work, HUD displays

---

## Phase 2: Sandbox Executor

**Goal:** Code strings can safely modify the game with automatic change tracking

### Step 2.1: Define Sandbox API Interface
- Create src/sandbox/types.ts
- Define GameSandboxAPI interface with all methods the LLM can call
- Entity methods: createEntity, getEntity, updateEntity, deleteEntity, getAllEntities, findEntities
- Player methods: getPlayer, movePlayer, teleportPlayer, setPlayerAppearance, modifyHealth, modifyPoints
- World methods: getWorldInfo, setTerrainColor, setSkyColor
- Behavior methods: addBehavior, removeBehavior
- Communication: say(message), log(...args)
- Utilities: random(min, max), distance(x1, y1, x2, y2)
- Define SandboxExecutionResult interface
- **Test:** TypeScript compiles

### Step 2.2: Implement SandboxAPI Class
- Create src/sandbox/SandboxAPI.ts
- Implement each method from the interface
- Each method that modifies state should:
  1. Record the current state (for reverse)
  2. Apply the change via gameStore
  3. Push a Change object to internal changes array
- Implement getChanges() to return all changes
- Implement getMessages() to return all say() messages
- Implement rollback() to apply all reverses in reverse order
- **Test:** Manually call methods, verify changes array populates

### Step 2.3: Create Safe Executor
- Create src/sandbox/executor.ts
- executeSandboxedCode(code: string) function
- Create new SandboxAPI instance
- Define restricted globals object: { game: sandboxAPI, Math, console.log, parseInt, parseFloat, JSON, Array, Object, String, Number, Boolean, Date }
- Explicitly set dangerous globals to undefined: window, document, fetch, localStorage, eval, Function
- Use `new Function(...argNames, code)` to create function
- Execute in try/catch
- On success: return { success: true, message, changes, rollback }
- On error: call sandbox.rollback(), return { success: false, error }
- **Test:** Execute `game.setTerrainColor('purple')` - grass turns purple

### Step 2.4: Create History Store
- Create src/store/historyStore.ts using Zustand
- Store array of HistoryEntry: { id, timestamp, userInput, result }
- Track currentIndex for undo/redo position
- addEntry(userInput, result): add to history, update index
- undo(): call result.rollback() at current index, decrement index
- redo(): increment index, re-apply (simplified for MVP)
- canUndo(), canRedo() helpers
- **Test:** Add entries, call undo, verify state reverts

### Step 2.5: Add Behavior Processing
- Update GameRenderer.gameLoop to process behaviors
- For each behavior in gameStore.behaviors:
  - 'bounce': update entity position, reverse direction at bounds
  - 'spin': increment entity rotation
  - 'pulse': oscillate entity scale
  - 'float': oscillate entity y position
- **Test:** Create entity with bounce behavior via executor, watch it move

### Step 2.6: Create Temporary Test UI
- Create simple ChatPanel.tsx with text input
- On submit: pass input directly to executeSandboxedCode
- Display result message
- Add "undo" as special command
- **Test:** Type sandbox code directly, verify it works

**🎯 CHECKPOINT 2:** Can type `game.setTerrainColor('red')` and grass changes. Can type `undo` and it reverts.

---

## Phase 3: LLM Integration

**Goal:** Natural language → LLM → sandbox code → game changes

### Step 3.1: Create LLM System Prompt
- Create src/services/llmService.ts
- Define SYSTEM_PROMPT constant with:
  - Role: "You are the game engine for DuckWorld"
  - Complete API documentation (all methods, parameters, return types)
  - Rules: always call game.say(), be fun/magical, child-friendly language
  - 5-6 example interactions showing input → code
  - Instruction to output ONLY JavaScript code, no markdown
- **Test:** Prompt is well-formed string

### Step 3.2: Create LLM API Call Function
- Add callLLM(userMessage, gameState) function
- Get API key from environment
- Build context string with current game state (player position, health, points, entities)
- Call Claude API with system prompt + user message
- Parse response, strip any markdown code blocks
- Return { code } or { error }
- **Test:** Call with "make grass blue", log returned code

### Step 3.3: Create Integration Pipeline
- Update ChatPanel to use LLM instead of direct code execution
- processMessage(userMessage) function:
  1. Check for special commands (undo, help)
  2. Get current game state from store
  3. Call callLLM(userMessage, gameState)
  4. Execute returned code via executeSandboxedCode
  5. Add to history if successful
  6. Return message to display
- **Test:** Type "make the grass purple" - it works via LLM

### Step 3.4: Improve Chat UI
- Add message history display (array of {role, content})
- Show user messages on right (blue)
- Show game messages on left (amber/yellow)
- Auto-scroll to bottom on new messages
- Show loading indicator while processing
- **Test:** Have a conversation, see history

### Step 3.5: Add Error Handling
- Handle API key not configured
- Handle network errors
- Handle LLM returning invalid code
- Handle sandbox execution errors
- Show friendly error messages to user
- **Test:** Remove API key, verify friendly error. Send malformed request, verify recovery.

**🎯 CHECKPOINT 3:** Can have natural conversation. "Add a red ball" works. "What's my score?" works. "Make me a dinosaur" works.

---

## Phase 4: Voice Input

**Goal:** Speak commands instead of typing

### Step 4.1: Create Speech Recognition Service
- Create src/services/speechRecognition.ts
- Check for browser support (webkitSpeechRecognition or SpeechRecognition)
- Create wrapper class or functions:
  - startListening(onResult, onError)
  - stopListening()
  - isListening state
- Configure: continuous = false, interimResults = false, lang = 'en-US'
- **Test:** Call startListening, speak, log transcribed text

### Step 4.2: Create Voice Button Component
- Create src/components/VoiceButton.tsx
- Microphone icon button
- On click: toggle listening state
- While listening: show visual indicator (pulsing, different color)
- On result: pass transcribed text to parent callback
- On error: show error state briefly
- **Test:** Click button, speak, see transcript logged

### Step 4.3: Integrate Voice with Chat
- Add VoiceButton to ChatPanel
- On voice result: call same processMessage function as text input
- Optionally show "Listening..." in chat while active
- **Test:** Click mic, say "add a tree", tree appears

### Step 4.4: Handle Edge Cases
- Handle "no speech detected" gracefully
- Handle microphone permission denied
- Auto-stop after silence timeout
- **Test:** Don't speak after clicking mic - verify graceful handling

**🎯 CHECKPOINT 4:** Can speak commands. "Make it nighttime" via voice works.

---

## Phase 5: Voice Output

**Goal:** Game speaks responses aloud

### Step 5.1: Create Text-to-Speech Service
- Create src/services/textToSpeech.ts
- Check for browser support (speechSynthesis)
- speak(text) function using SpeechSynthesisUtterance
- Configure: rate, pitch, select a good voice
- Return promise that resolves when done speaking
- **Test:** Call speak("Hello!"), hear audio

### Step 5.2: Integrate TTS with Game Responses
- When game.say() message is received, also call TTS
- Option to mute/unmute
- Don't overlap speech (queue or cancel previous)
- **Test:** Type command, hear response spoken

### Step 5.3: Add Speaking Indicator
- Show visual indicator when game is speaking
- Could be animation on duck or chat panel
- **Test:** Visible feedback during speech

### Step 5.4: Add Mute Button
- Toggle button to disable TTS
- Store preference (can use localStorage)
- **Test:** Mute works, unmute works

**🎯 CHECKPOINT 5:** Full voice loop works. Speak command → game responds with voice.

---

## Phase 6: Polish & Additional Features

### Step 6.1: Add More Player Shapes
- Implement drawDinosaur() in renderer
- Implement drawBunny() or other shapes
- LLM can set player shape via setPlayerAppearance
- **Test:** "Turn me into a bunny" works

### Step 6.2: Add Visual Polish
- Nice fonts (Comic Sans or similar child-friendly)
- Gradient backgrounds
- Shadows and rounded corners
- Smooth transitions
- **Test:** Game looks polished and friendly

### Step 6.3: Add Help Command
- "help" or "what can I do?" shows capabilities
- Either via LLM or hardcoded response
- **Test:** Saying "help" gives useful response

### Step 6.4: Add Reset Command
- "reset" or "start over" resets game to initial state
- Clear history
- Confirm with user first
- **Test:** Reset works

### Step 6.5: Improve Duck Collision Shape
- Currently uses point collision
- Could use radius for smoother collision
- **Test:** Collision feels natural

### Step 6.6: Save/Load State (Optional)
- Save game state to localStorage
- Load on page refresh
- **Test:** Refresh page, state persists

---

## Testing Checklist

After completing all phases, verify:

### Core Game
- [ ] Duck renders with yellow body
- [ ] Duck bobs/breathes when idle
- [ ] Arrow keys move duck smoothly
- [ ] WASD also works
- [ ] Duck cannot walk through trees
- [ ] Duck cannot walk into lake
- [ ] HUD shows correct health (5 hearts)
- [ ] HUD shows correct points

### Sandbox
- [ ] `game.setTerrainColor('purple')` changes grass
- [ ] `game.modifyPoints(100)` updates HUD
- [ ] `game.createEntity({...})` adds new entity
- [ ] `game.addBehavior(id, {type:'bounce'})` makes entity move
- [ ] Undo reverts last change
- [ ] Multiple undos work in sequence

### LLM Integration
- [ ] "Make the grass blue" works
- [ ] "Add a red bouncing ball" works
- [ ] "What's my score?" responds correctly
- [ ] "Turn me into a dinosaur" changes player
- [ ] "Make it nighttime" changes sky and adds moon/stars
- [ ] "Give me 50 points" updates score
- [ ] "Undo" or "undo that" reverts last change

### Voice
- [ ] Mic button shows listening state
- [ ] Spoken commands are transcribed
- [ ] Transcribed commands execute correctly
- [ ] Game speaks responses aloud
- [ ] Mute button stops voice output

---

## Common Issues & Solutions

### PixiJS Not Rendering
- Ensure container div has explicit dimensions
- Check that app.canvas is appended to DOM
- Verify no errors in console

### Duck Not Moving
- Check that keyboard events are registered on window
- Verify movePlayer action updates state
- Check that renderer subscribes to state changes

### LLM Returns Bad Code
- Check system prompt has clear examples
- Ensure "ONLY output code, no markdown" instruction
- Strip ```javascript``` blocks from response

### Voice Not Working
- Check browser supports Web Speech API (Chrome best)
- Check microphone permissions granted
- Handle errors gracefully

### Undo Not Working
- Verify changes are being tracked in SandboxAPI
- Check rollback applies reverses in correct order
- Ensure history store is updated on each execution

---

## Future Enhancements (Post-MVP)

1. **Standard Commands:** Add predefined command types for common operations (optimization)
2. **More Entity Types:** Houses, flowers, animals, NPCs
3. **Inventory System:** Pick up and use items
4. **NPCs with Dialogue:** Characters that talk back
5. **Learning Panel:** Math problems, spelling, coding challenges
6. **3D Upgrade:** Swap PixiJS for Three.js
7. **Persistent Storage:** Backend for saving worlds
8. **Multiplayer:** Shared worlds

---

## Notes for Claude Code

1. **Work incrementally.** Complete each step before moving to the next.
2. **Test after each step.** Don't accumulate untested code.
3. **Keep files focused.** One responsibility per file.
4. **Use TypeScript strictly.** Define types before implementation.
5. **Console.log liberally** during development for debugging.
6. **The sandbox API is the key abstraction.** It's what makes LLM integration safe and undoable.