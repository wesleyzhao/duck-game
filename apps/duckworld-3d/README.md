# DuckWorld-3D

DuckWorld-3D is a small 3D browser game built with React Three Fiber. You control a duck, interact with the world, solve math challenges, and use natural language commands to create or modify entities.

## Features
- WASD/arrow-key movement with physics collisions
- Interactive math trees with a quiz modal
- LLM-driven command panel for world edits
- Entities (trees, lakes, primitives) with simple behaviors
- Text-to-speech feedback (ElevenLabs optional, browser fallback)

## Tech Stack
- React + Vite + TypeScript
- React Three Fiber + Drei
- Rapier physics
- Zustand state management

## Getting Started
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and add keys if you want LLM commands or ElevenLabs TTS
3. Start the dev server: `npm run dev`

## Environment Variables
- `VITE_ANTHROPIC_API_KEY` (required for natural language commands and LLM question generation)
- `VITE_ELEVENLABS_API_KEY` (optional; enables ElevenLabs TTS, with browser speech as fallback)

## Security Notes
- `.env` is ignored and should never be committed.
- `VITE_*` variables are embedded in the client bundle, so these keys are exposed to anyone running the app. For production or public deployments, proxy requests through a backend and keep keys server-side.
- If you ever accidentally committed a real key, rotate it with the provider and rewrite git history to remove it.

## Scripts
- `npm run dev` - Start the Vite dev server
- `npm run build` - TypeScript check + production build
- `npm run lint` - ESLint
- `npm run preview` - Preview production build
