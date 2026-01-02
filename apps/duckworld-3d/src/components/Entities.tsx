import { useGameStore } from '../store/gameStore'
import { Entity3D } from './Entity3D'

export function Entities() {
  const entities = useGameStore((state) => state.entities)

  return (
    <>
      {entities.map((entity) => (
        <Entity3D key={entity.id} entity={entity} />
      ))}
    </>
  )
}
