export interface Position {
  x: number
  y: number
  z: number
}

export interface PlayerState {
  id: string
  teamId: string
  position: Position
  rotation: number
  isActive: boolean
  isGk: boolean
}

export interface BallState {
  position: Position
  velocity: Position
}

export interface MatchState {
  players: PlayerState[]
  ball: BallState
  score: [number, number]
  clock: number
  phase: 'kickoff' | 'firstHalf' | 'halftime' | 'secondHalf' | 'fulltime'
}
