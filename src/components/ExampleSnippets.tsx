import { useCodeEditorStore } from '../store/codeEditorStore'

const EXAMPLES = [
  {
    label: 'Change Sky',
    code: `game.setSkyColor("purple")
game.say("The sky is purple!")`,
  },
  {
    label: 'Add Ball',
    code: `game.createEntity({
  name: "Ball",
  x: 500,
  y: 400,
  width: 40,
  height: 40,
  shape: "circle",
  color: "red"
})
game.say("A red ball appears!")`,
  },
  {
    label: 'Make Bouncy',
    code: `game.makeBouncy("Ball")
game.say("Boing boing!")`,
  },
  {
    label: 'Move Duck',
    code: `game.teleportPlayer(1000, 700)
game.say("Teleported!")`,
  },
  {
    label: 'Night Mode',
    code: `game.setSkyColor("#1a1a2e")
game.setTerrainColor("#2d4a3e")
game.say("It's night time!")`,
  },
]

export function ExampleSnippets() {
  const { setCode, setExecutionResult } = useCodeEditorStore()

  const handleClick = (code: string) => {
    setCode(code)
    setExecutionResult('idle')
  }

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-gray-400 text-sm">Try:</span>
      {EXAMPLES.map((example, i) => (
        <button
          key={i}
          onClick={() => handleClick(example.code)}
          className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 hover:text-white transition-colors"
        >
          {example.label}
        </button>
      ))}
    </div>
  )
}
