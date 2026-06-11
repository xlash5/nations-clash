import { Server } from 'socket.io'
import type { MatchConfig, GameState, PlayerInput, Position } from '../../../shared/types.js'
import { TICK_MS, TICK_S } from '../../../shared/types.js'
import { Team } from './Team.js'
import { updatePhysics, kick } from './physics.js'
import { updateAI } from './ai.js'
import { updateCollisions } from './collision.js'
import { checkGoal, type GoalResult } from './goalDetection.js'

export type MatchPhase = 'preMatch' | 'firstHalf' | 'halftime' | 'secondHalf' | 'fulltime'

export interface GoalLog {
  playerId: string | null
  team: 'home' | 'away'
  time: number
  isOwnGoal: boolean
}

export class Match {
  config: MatchConfig
  clock: number
  score: { teamA: number; teamB: number }
  phase: MatchPhase
  teamA: Team
  teamB: Team
  ball: { position: Position; velocity: Position; spin: Position }
  goals: GoalLog[]

  private io: Server
  private roomCode: string
  private inputs: Map<string, PlayerInput>
  private intervalId: ReturnType<typeof setInterval> | null
  private lastTouch: { playerId: string; team: 'home' | 'away' } | null
  private goalCooldown: boolean
  private preMatchCountdown: number
  private lastEmittedCountdown: number
  private halftimeTimer: number
  private goalPauseTimer: number
  private kickoffSide: 'home' | 'away'

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
    this.clock = 0
    this.score = { teamA: 0, teamB: 0 }
    this.phase = 'preMatch'
    this.intervalId = null
    this.inputs = new Map()
    this.lastTouch = null
    this.goalCooldown = false
    this.goals = []
    this.preMatchCountdown = 3
    this.lastEmittedCountdown = 4
    this.halftimeTimer = 0
    this.goalPauseTimer = 0
    this.kickoffSide = 'home'

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
    switch (this.phase) {
      case 'preMatch':
        this.tickPreMatch()
        break
      case 'firstHalf':
      case 'secondHalf':
        this.tickPlayingHalf()
        break
      case 'halftime':
        this.tickHalftime()
        break
      case 'fulltime':
        this.broadcast()
        break
    }
  }

  private tickPreMatch(): void {
    const currentSecond = Math.ceil(this.preMatchCountdown)
    if (currentSecond < this.lastEmittedCountdown && currentSecond >= 1) {
      this.emitEvent('countdown', { value: currentSecond })
      this.lastEmittedCountdown = currentSecond
    }
    this.preMatchCountdown -= TICK_S

    if (this.preMatchCountdown <= 1e-10) {
      this.phase = 'firstHalf'
      this.clock = this.config.mode === 'time' ? this.config.duration : 0
      this.emitEvent('kickoff')
      this.setupKickoff()
    }

    this.broadcast()
  }

  private tickPlayingHalf(): void {
    if (this.goalPauseTimer > 0) {
      this.goalPauseTimer -= TICK_S
      if (this.goalPauseTimer <= 1e-10) {
        this.setupKickoff()
      }
      this.broadcast()
      return
    }

    this.applyPlayerInputs()
    this.processKickRequests()

    const state = this.getState()

    updatePhysics(this, state)
    updateAI(this, state)
    updateCollisions(this, state)

    this.updateLastTouchFromCollisions()

    if (!this.goalCooldown) {
      const goal = checkGoal(this.ball.position, this.lastTouch)
      if (goal) {
        this.awardGoal(goal)
      }
    }

    if (this.config.mode === 'time') {
      this.clock = Math.max(0, this.clock - TICK_S)
    } else {
      this.clock += TICK_S
    }

    this.checkPhaseTransition()

    this.broadcast()
  }

  private tickHalftime(): void {
    this.halftimeTimer -= TICK_S
    if (this.halftimeTimer <= 1e-10) {
      this.phase = 'secondHalf'
      this.clock = this.config.mode === 'time' ? this.config.duration : 0
      this.emitEvent('secondHalf')
      this.setupKickoff()
    }
    this.broadcast()
  }

  private checkPhaseTransition(): void {
    if (this.config.mode === 'time') {
      if (this.clock <= 0) {
        if (this.phase === 'firstHalf') {
          this.phase = 'halftime'
          this.halftimeTimer = 15
          this.emitEvent('halftime')
        } else if (this.phase === 'secondHalf') {
          this.phase = 'fulltime'
          this.emitEvent('fulltime')
        }
      }
    } else if (this.config.mode === 'goals') {
      if (this.score.teamA >= this.config.goalsToWin || this.score.teamB >= this.config.goalsToWin) {
        this.phase = 'fulltime'
        this.emitEvent('fulltime')
      }
    }
  }

  private setupKickoff(): void {
    this.kickoffSide = this.lastTouch
      ? (this.lastTouch.team === 'home' ? 'away' : 'home')
      : 'home'

    this.ball = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      spin: { x: 0, y: 0, z: 0 },
    }

    const homeFormation = this.getFormationPositions(-1)
    const awayFormation = this.getFormationPositions(1)

    for (let i = 0; i < this.teamA.players.length; i++) {
      const pos = homeFormation[i] ?? { x: 0, y: 0, z: 0 }
      this.teamA.players[i].position = { ...pos }
      this.teamA.players[i].velocity = { x: 0, y: 0, z: 0 }
      this.teamA.players[i].hasBall = false
    }

    for (let i = 0; i < this.teamB.players.length; i++) {
      const pos = awayFormation[i] ?? { x: 0, y: 0, z: 0 }
      this.teamB.players[i].position = { ...pos }
      this.teamB.players[i].velocity = { x: 0, y: 0, z: 0 }
      this.teamB.players[i].hasBall = false
    }

    this.goalCooldown = false
    this.lastTouch = null
  }

  private getFormationPositions(side: -1 | 1): Position[] {
    const positions: Position[] = []
    const pitchHalf = 52.5
    const pitchWidth = 34

    positions.push({ x: 0, y: 0, z: side * pitchHalf * 0.95 })

    const formation: [number, number][] = [
      [-10, 30], [0, 30], [10, 30],
      [-20, 10], [-7, 10], [7, 10], [20, 10],
      [-15, -10], [0, -20], [15, -10],
    ]

    const halfLen = pitchHalf * 0.8

    for (const [relX, relZ] of formation) {
      positions.push({
        x: relX * (pitchWidth / 34),
        y: 0,
        z: side * (relZ / 30 * halfLen),
      })
    }

    return positions
  }

  private updateLastTouchFromCollisions(): void {
    const allPlayers = [...this.teamA.players, ...this.teamB.players]
    for (const player of allPlayers) {
      if (player.hasBall) {
        this.lastTouch = { playerId: player.id, team: player.team }
        return
      }
    }
  }

  private awardGoal(goal: GoalResult): void {
    const isTeamA = goal.team === 'home'

    if (isTeamA) {
      this.score.teamA++
    } else {
      this.score.teamB++
    }

    this.goals.push({
      playerId: goal.scorer,
      team: goal.team,
      time: this.config.mode === 'time' ? this.config.duration - this.clock : this.clock,
      isOwnGoal: goal.isOwnGoal,
    })

    this.goalCooldown = true
    this.lastTouch = null

    this.goalPauseTimer = 3.0

    this.ball = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      spin: { x: 0, y: 0, z: 0 },
    }

    this.io.to(this.roomCode).emit('game:goal', {
      scorer: goal.scorer,
      team: goal.team,
      isOwnGoal: goal.isOwnGoal,
      replayData: {},
    })
  }

  private emitEvent(type: string, data?: Record<string, unknown>): void {
    this.io.to(this.roomCode).emit('game:event', { type, ...data })
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
      const cameraSide: -1 | 1 = this.phase === 'secondHalf' ? 1 : team.id === 'home' ? -1 : 1
      player.applyInput(input, cameraSide, TICK_S)
    }
  }

  private processKickRequests(): void {
    for (const team of [this.teamA, this.teamB]) {
      const player = team.players[1]
      if (!player) continue
      const kickRequest = player.consumeKickRequest()
      if (!kickRequest) continue

      this.lastTouch = { playerId: player.id, team: player.team }
      this.goalCooldown = false

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
        hasBall: p.hasBall,
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
