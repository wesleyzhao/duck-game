import { useState } from 'react'

const API_METHODS = [
  { name: 'game.createEntity({...})', desc: 'Create a new object' },
  { name: 'game.deleteEntity(id)', desc: 'Remove an object' },
  { name: 'game.findByName(name)', desc: 'Find an object by name' },
  { name: 'game.setSkyColor(color)', desc: 'Change sky color' },
  { name: 'game.setTerrainColor(color)', desc: 'Change ground color' },
  { name: 'game.teleportPlayer(x, y)', desc: 'Move the duck' },
  { name: 'game.setPlayerAppearance({...})', desc: 'Change duck look' },
  { name: 'game.say(message)', desc: 'Show a message' },
  { name: 'game.makeBouncy(name)', desc: 'Make object bounce' },
  { name: 'game.makeFloat(name)', desc: 'Make object float' },
  { name: 'game.defineShape(name, parts)', desc: 'Create custom shape' },
]

export function APIReference() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-500 font-medium transition-colors"
      >
        ? Help
      </button>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 w-80 bg-gray-800 border border-gray-600 rounded-xl p-4 shadow-xl z-50">
            <h3 className="text-white font-bold mb-3 text-sm">Available Commands</h3>
            <ul className="space-y-2 text-xs max-h-64 overflow-y-auto">
              {API_METHODS.map((method, i) => (
                <li key={i} className="text-gray-300">
                  <code className="text-green-400 text-xs">{method.name}</code>
                  <span className="text-gray-500 ml-2">- {method.desc}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-2 border-t border-gray-700">
              <p className="text-gray-400 text-xs">
                Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300">Cmd+Enter</kbd> to run code
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
