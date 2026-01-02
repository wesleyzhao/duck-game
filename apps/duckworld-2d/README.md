# DuckWorld

A 2D browser game built for my niece: a playful math world where a child can learn basic arithmetic and "vibecode" by changing the game with natural language or small bits of code. The goal is to make a starting point for a game that a child can update and change however they want.

## What It Is

DuckWorld is a React + PixiJS game where you control a baby duck, answer math questions, and interact with a world that can be modified through:

- **Natural language** (text or voice)
- **A built-in code panel** with a small, sandboxed API

## Features

- 2D world rendered with PixiJS
- Math problem trees (progressive difficulty across levels)
- Lives, timer, and level completion states
- Enemy turtles with behaviors (bounce, speed control)
- Voice input + text-to-speech output
- Sandbox API so code can safely change the game

## Architecture (High-Level)

The design centers on a **Sandbox API**. LLM-generated code only has access to a restricted `game` object so it can’t touch the browser or network.

**Data flow:**
1. Player speaks/types a request
2. `llmService` sends the request + current game state to Claude
3. Claude responds with JavaScript that only uses the Sandbox API
4. The sandbox executor runs the code with restricted globals
5. The API updates Zustand stores (state)
6. Pixi renderer re-renders the world from state
7. Changes are recorded for undo/redo

## Tech Stack

- React 18 + TypeScript + Vite
- PixiJS 8
- Zustand (state)
- Tailwind CSS
- Web Speech API (voice input)
- Claude API (LLM)
- ElevenLabs (voice output)

## Project Structure

- `src/game/` — PixiJS renderer and game loop
- `src/store/` — Zustand stores (game state, levels, history)
- `src/sandbox/` — Sandbox API + safe executor
- `src/services/` — LLM + speech services
- `src/components/` — UI (HUD, ChatPanel, Code IDE)

## How To Modify The Game (Kid-Friendly)

The built-in code panel runs JavaScript inside a safe sandbox. You can call
`game` methods to change the world without touching the rest of the app.

Example ideas:

```js
// Make the sky pink and slow the turtles
game.setSkyColor('#f8b4d9')
game.slowEnemies(0.3)
game.say('Welcome to the pink sky level!')

// Create a bouncy trampoline
const trampoline = game.createEntity({
  name: 'Trampoline',
  x: 400,
  y: 420,
  width: 140,
  height: 24,
  shape: 'rectangle',
  color: '#34d399',
  solid: true,
})
game.makeBouncy(trampoline.name)
```

If something goes wrong, you can undo changes because sandbox actions are
tracked in history.

## Sandbox API Reference (Quick)

The full API lives in `src/sandbox/types.ts`. Here are the most common calls:

| Area | Methods |
| --- | --- |
| Entities | `createEntity`, `updateEntity`, `deleteEntity`, `findByName`, `getAllEntities` |
| Player | `getPlayer`, `movePlayer`, `teleportPlayer`, `modifyHealth`, `modifyPoints` |
| World | `getWorldInfo`, `setTerrainColor`, `setSkyColor` |
| Behaviors | `makeBouncy`, `makeFloat`, `addBehavior`, `updateBehavior`, `removeBehavior` |
| Enemies | `slowEnemies`, `speedUpEnemies`, `setSpeed` |
| Shapes | `defineShape` |
| Utility | `random`, `distance`, `say`, `log` |

## Local Development

```bash
npm install
npm run dev
```

Build & preview:

```bash
npm run build
npm run preview
```

## Environment Variables

Create a local `.env` file (never commit it):

```bash
cp .env.example .env
```

Then add your keys:

```
VITE_CLAUDE_API_KEY=your_key_here
VITE_ELEVENLABS_API_KEY=your_key_here
```

### Important Security Note

Because this is a Vite app, any `VITE_*` variable is bundled into the frontend. That means **API keys are exposed to anyone who loads the app**. This is fine for local development but **not safe for public deployment**. If you want to ship this publicly, move LLM/voice calls to a backend and keep keys server-side.

## Security Checks

This repo includes a lightweight secret scan hook to prevent accidental key commits.

Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

Manual scans:

```bash
./scripts/secret-scan.sh --staged   # run from repo root
./scripts/secret-scan.sh --history  # run from repo root
```

## Why This Exists

This started as a fun project for my niece: a safe game that encourages curiosity and lets kids modify the world by “vibecoding” — experimenting with ideas and seeing immediate results.

## Docs

- `CLAUDE.md` — project overview + architecture notes
- `duckworld-prd.md` — product vision
- `duckworld-implementation-guide.md` — build phases

## License

MIT License. See `../../LICENSE`.
