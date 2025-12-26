# DuckWorld: Product Requirements Document

**Version:** 1.0  
**Date:** December 2025

---

## 1. Vision

DuckWorld is an in-browser game where children control a baby duck and can reshape the entire game world using natural language—spoken or typed. Say "turn the grass into lava" or "make my duck wear a hat" and watch it happen.

**Long-term vision:** A 3D learning game where children can have two-way audio conversations to build anything they imagine, with integrated educational content (math, languages, coding).

---

## 2. MVP Scope

A functional 2D game built in 2-3 hours where:
1. A baby duck moves around a simple world (grass, trees, lake)
2. The duck has an idle animation (bobbing/breathing) so it always feels alive
3. Players can speak or type natural language commands to modify anything
4. The game responds with voice
5. All changes are tracked and undoable

---

## 3. Target User

**Primary:** Children ages 4-10 (specifically Wesley's niece)

**Key considerations:**
- May not read fluently → voice interaction is primary
- Imaginative, will ask for unexpected things
- Needs immediate feedback to stay engaged
- Enjoys seeing cause and effect

---

## 4. Core Features

### 4.1 Game World
- **View:** Top-down 2D, 800x600 pixels
- **Initial terrain:** Green grass
- **Initial entities:** Blue lake (impassable), several trees (impassable)
- **Visual style:** Simple, colorful shapes—friendly and clear

### 4.2 Player Character
- **Default:** Yellow baby duck made of simple shapes
- **Idle animation:** Gentle bobbing + subtle breathing/pulsing
- **Movement:** Arrow keys or WASD, smooth movement
- **Collision:** Cannot walk through solid entities (trees, lake)
- **Transformable:** LLM can change color, size, shape (dinosaur, bunny, etc.)

### 4.3 HUD
- **Health:** 5 hearts (100 HP)
- **Points:** Score counter
- **Voice indicator:** Shows when listening or speaking

### 4.4 LLM Integration

**The core magic.** Players speak or type natural language, and the game transforms.

**Input methods:**
1. Text chat box
2. Voice (click microphone to speak)

**Capability examples:**
- Queries: "What is my health?", "Where is the lake?"
- Simple changes: "Make the grass purple", "Make the duck bigger"
- Creative additions: "Add a bouncing red ball", "Make it nighttime"
- Player changes: "Turn me into a dinosaur", "Let me fly"

**Output:**
- Game executes changes
- Game speaks response via TTS
- Changes are logged and undoable ("Undo that!")

### 4.5 Technical Approach: Sandboxed Code Execution

The LLM returns JavaScript code that runs in a sandboxed environment with a controlled API. This provides:
- **Maximum flexibility:** Can do almost anything
- **Safety:** Cannot access browser APIs, network, etc.
- **Undo support:** All changes are automatically tracked
- **Debuggability:** Can log and inspect what the LLM generated

**Key architectural decision:** We implement custom code execution FIRST (not predefined commands) to ensure the system is flexible enough for the vision.

### 4.6 Persistence
- localStorage for current session (MVP)
- No server required

---

## 5. Sandbox API

The LLM-generated code has access to a `game` object with these capabilities:

**Entity Management:**
- Create, read, update, delete any game entity
- Entities have: position, shape, color, size, name, solid flag
- Shapes: circle, rectangle, ellipse, star, polygon, custom

**Player Control:**
- Get/set position
- Get/set appearance (color, size, shape like duck/dinosaur)
- Modify health and points
- Enable special abilities (flying)

**World:**
- Change terrain color
- Change sky color

**Behaviors:**
- Add ongoing animations: bounce, spin, pulse, float
- Remove behaviors

**Communication:**
- `game.say(message)` - Speak to the player (TTS + chat display)

**Utilities:**
- Random number generation
- Distance calculation

---

## 6. User Interface Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [❤️❤️❤️❤️❤️]                                    [⭐ 0 points]  │
│                                                                 │
│                                                                 │
│                        GAME CANVAS                              │
│                         800x600                                 │
│                                                                 │
│                      🌳      🌳                                  │
│                           🦆                                    │
│                    🌳            💧💧💧                          │
│                         🌳    💧💧💧💧💧                         │
│                              💧💧💧💧💧                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│  🦆 Talk to DuckWorld!   │
├──────────────────────────┤
│                          │
│  🦆 Hi! Try saying       │
│  "make the grass purple" │
│                          │
│          Make it blue!   │
│                          │
│  🦆 Woosh! The grass     │
│  is now blue!            │
│                          │
├──────────────────────────┤
│  [Type here...    ] [🎤] │
└──────────────────────────┘
```

---

## 7. Success Criteria

### MVP Success
- [ ] Niece can play for 10+ minutes without adult help
- [ ] Voice commands work >80% of the time
- [ ] At least 5 different types of changes work
- [ ] Undo works reliably
- [ ] Duck always appears "alive" (idle animation)

### Future Success
- [ ] Niece asks to play again
- [ ] Learns something while playing
- [ ] Creates something unexpected and delightful

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM generates broken code | Sandbox catches errors, auto-rollback, friendly error message |
| Voice recognition fails | Text input always available as backup |
| LLM says inappropriate things | System prompt emphasizes child-friendly language |
| Game gets slow with many entities | Limit entity count, optimize rendering |
| Child asks for impossible things | LLM explains kindly, suggests alternatives |

---

## 9. Future Roadmap (Post-MVP)

**Phase 2:** NPCs with conversations, inventory system, quests

**Phase 3:** Learning panel (math challenges, spelling, coding puzzles)

**Phase 4:** 3D upgrade (Three.js/Babylon.js, same sandbox API)

**Phase 5:** Persistent worlds, multiplayer

---

## 10. Key Design Principles

1. **Voice-first:** Everything should work by speaking
2. **Immediate feedback:** Every command should produce visible/audible response
3. **Forgiving:** Errors should be friendly, recovery should be easy (undo)
4. **Magical:** The game should feel like it can do anything
5. **Safe:** Sandbox prevents harmful code execution
6. **Alive:** The duck should never feel static—constant subtle animation