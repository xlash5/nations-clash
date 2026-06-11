export interface Position {
  x: number
  y: number
  z: number
}

export interface PlayerState {
  id: string
  team: 'home' | 'away'
  position: Position
  velocity: Position
  rotation: number
  stamina: number
  isHumanControlled: boolean
  isGk: boolean
}

export interface BallState {
  position: Position
  velocity: Position
  spin: Position
}

export interface GameState {
  players: PlayerState[]
  ball: BallState
  score: { teamA: number; teamB: number }
  clock: number
  phase: 'firstHalf' | 'halftime' | 'secondHalf' | 'fulltime'
}

export interface MatchConfig {
  mode: 'time' | 'goals'
  duration: number  // seconds for time mode
  goalsToWin: number  // for goals mode
}

export interface PlayerInput {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  sprint: boolean
  shoot: boolean
  pass: boolean
  tackle: boolean
  slideTackle: boolean
  switchPlayer: boolean
}

export const TICK_MS = 1000 / 60
export const TICK_S = TICK_MS / 1000
