export type EntityShape = 'box' | 'sphere' | 'cylinder' | 'cone' | 'tree' | 'lake' | 'turtle'

export type BehaviorType = 'bounce' | 'float' | 'spin' | 'pulse'

export interface Behavior {
  type: BehaviorType
  speed?: number
  range?: number
}

export interface Entity {
  id: string
  name: string
  shape: EntityShape
  position: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
  color: string
  solid: boolean
  behaviors: Behavior[]
  isMathTree?: boolean
  isTurtle?: boolean
}
