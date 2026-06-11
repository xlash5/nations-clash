import { Server } from 'socket.io'
import type { MatchConfig, GameState, PlayerInput } from '../../../shared/types.js'
import { TICK_MS, TICK_S } from '../../../shared/types.js'
import { Team } from './Team.js'
import { updatePhysics } from './physics.js'
import { updateAI } from './ai.js'
import { updateCollisions } from './collision.js'
import { checkGoal } from './goalDetection.js'

export type MatchPhase = 'firstHalf' | 'halftime' | 'secondHalf' | 'fulltime'

export class Match {
  config: MatchConfig
  clock: number
  score: { teamA: number; teamB: number }
  phase: MatchPhase
  teamA: Team
  teamB: Team
  ball: { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } }

  private io: Server
  private roomCode: string
  private inputs: Map<string, PlayerInput>
  private intervalId: ReturnType<typeof setInterval> | null

  constructor(
    io: Server,
    roomCode: string,
    config: MatchConfig,
    hostPlayerId: string,
    guestPlayerId: string,
  ) {
    this.io = io
    this.roomCode = roomCode
    this.config = config
    this.clock = config.mode === 'time' ? config.duration : 0
    this.score = { teamA: 0, teamB: 0 }
    this.phase = 'firstHalf'
    this.intervalId = null
    this.inputs = new Map()

    this.teamA = new Team('home', hostPlayerId)
    this.teamB = new Team('away', guestPlayerId)

    this.ball = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    }
  }

  handleInput(playerId: string, input: PlayerInput): void {
    this.inputs.set(playerId, input)
  }

  start(): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null
  }

  private tick(): void {
    if (this.phase === 'fulltime' || this.phase === 'halftime') return

    const state = this.getState()

    updatePhysics(this, state)
    updateAI(this, state)
    updateCollisions(this, state)
    checkGoal(this, state)

    if (this.config.mode === 'time') {
      this.clock = Math.max(0, this.clock - TICK_S)
    } else {
      this.clock += TICK_S
    }

    if (this.config.mode === 'time' && this.clock <= 0) {
      this.phase = 'fulltime'
    } else if (this.config.mode === 'goals') {
      if (this.score.teamA >= this.config.goalsToWin || this.score.teamB >= this.config.goalsToWin) {
        this.phase = 'fulltime'
      }
    }

    this.broadcast()
  }

  private broadcast(): void {
    this.io.to(this.roomCode).emit('game:state', this.getState())
  }

  getState(): GameState {
    const allPlayers = [...this.teamA.players, ...this.teamB.players]

    return {
      players: allPlayers.map((p) => ({
        id: p.id,
        team: p.team,
        position: { ...p.position },
        velocity: { ...p.velocity },
        rotation: p.rotation,
        stamina: p.stamina,
        isHumanControlled: p.isHumanControlled,
        isGk: p.isGk,
      })),
      ball: {
        position: { ...this.ball.position },
        velocity: { ...this.ball.velocity },
      },
      score: { ...this.score },
      clock: this.clock,
      phase: this.phase,
    }
  }
}
