import { Server } from 'socket.io'
import type { MatchConfig, GameState, PlayerInput, Position } from '../../../shared/types.js'
import { TICK_MS, TICK_S } from '../../../shared/types.js'
import { Team } from './Team.js'
import { updatePhysics, kick } from './physics.js'
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
  ball: { position: Position; velocity: Position; spin: Position }

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
      spin: { x: 0, y: 0, z: 0 },
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

    this.applyPlayerInputs()
    this.processKickRequests()

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

  private applyPlayerInputs(): void {
    for (const team of [this.teamA, this.teamB]) {
      const input = this.inputs.get(team.humanPlayerId)
      if (!input) continue
      const player = team.players[1]
      if (!player) continue
      const cameraSide: -1 | 1 = team.id === 'home' ? -1 : 1
      player.applyInput(input, cameraSide, TICK_S)
    }
  }

  private processKickRequests(): void {
    for (const team of [this.teamA, this.teamB]) {
      const player = team.players[1]
      if (!player) continue
      const kickRequest = player.consumeKickRequest()
      if (!kickRequest) continue

      const facingDir = {
        x: Math.sin(player.rotation),
        y: 0,
        z: Math.cos(player.rotation),
      }

      if (kickRequest.type === 'shoot') {
        this.ball = kick(this.ball, facingDir, kickRequest.power)
      } else if (kickRequest.type === 'pass') {
        const teammates = team.players.filter((p) => p.id !== player.id)
        let nearest: typeof player | null = null
        let nearestDist = Infinity
        for (const tm of teammates) {
          const dx = tm.position.x - player.position.x
          const dz = tm.position.z - player.position.z
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist < nearestDist) {
            nearestDist = dist
            nearest = tm
          }
        }
        let kickDir = facingDir
        if (nearest && nearestDist > 0) {
          const dx = nearest.position.x - player.position.x
          const dz = nearest.position.z - player.position.z
          const toTm = { x: dx / nearestDist, z: dz / nearestDist }
          const dot = facingDir.x * toTm.x + facingDir.z * toTm.z
          const angle = Math.acos(Math.max(-1, Math.min(1, dot)))
          if (angle <= Math.PI / 6) {
            kickDir = { x: toTm.x, y: 0, z: toTm.z }
          }
        }
        this.ball = kick(this.ball, kickDir, kickRequest.power)
      }
    }
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
        spin: { ...this.ball.spin },
      },
      score: { ...this.score },
      clock: this.clock,
      phase: this.phase,
    }
  }
}
