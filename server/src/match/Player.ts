import type { Position } from '../../../shared/types.js'

export class Player {
  id: string
  team: 'home' | 'away'
  position: Position
  velocity: Position
  rotation: number
  stamina: number
  isHumanControlled: boolean
  isGk: boolean

  constructor(id: string, team: 'home' | 'away', isGk: boolean = false) {
    this.id = id
    this.team = team
    this.position = { x: 0, y: 0, z: 0 }
    this.velocity = { x: 0, y: 0, z: 0 }
    this.rotation = 0
    this.stamina = 100
    this.isHumanControlled = false
    this.isGk = isGk
  }
}
