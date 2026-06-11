import { Server } from 'socket.io'
import type { MatchConfig, GameState, GameStateSnapshot, PlayerInput, Position } from '../../../shared/types.js'
import { TICK_MS, TICK_S } from '../../../shared/types.js'
import { Team } from './Team.js'
import { Player } from './Player.js'
import { updatePhysics, kick } from './physics.js'
import { updateAI } from './ai.js'
import { getAbsoluteFormationPositions } from '../data/formations.js'
import { updateCollisions } from './collision.js'
import { checkGoal, type GoalResult } from './goalDetection.js'
import { standingTackle, slideTackle, shouldFoul } from './tackling.js'
import { SLIDE_DURATION } from './Player.js'

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
  private replayBuffer: GameStateSnapshot[]
  private readonly MAX_REPLAY_SNAPSHOTS = 300
  private prevSwitchPlayer: Map<string, boolean>

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
    this.replayBuffer = []
    this.prevSwitchPlayer = new Map()

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
    this.processTackleRequests()

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

    const homeFormation = getAbsoluteFormationPositions(this.teamA.formationName, -1)
    const awayFormation = getAbsoluteFormationPositions(this.teamB.formationName, 1)

    for (let i = 0; i < this.teamA.players.length; i++) {
      const pos = homeFormation[i] ?? { x: 0, y: 0, z: 0 }
      this.teamA.players[i].position = { ...pos }
      this.teamA.players[i].velocity = { x: 0, y: 0, z: 0 }
      this.teamA.players[i].hasBall = false
      this.teamA.players[i].homePosition = { ...pos }
    }

    for (let i = 0; i < this.teamB.players.length; i++) {
      const pos = awayFormation[i] ?? { x: 0, y: 0, z: 0 }
      this.teamB.players[i].position = { ...pos }
      this.teamB.players[i].velocity = { x: 0, y: 0, z: 0 }
      this.teamB.players[i].hasBall = false
      this.teamB.players[i].homePosition = { ...pos }
    }

    this.goalCooldown = false
    this.lastTouch = null
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
      replayData: this.getReplayData(),
    })
  }

  private emitEvent(type: string, data?: Record<string, unknown>): void {
    this.io.to(this.roomCode).emit('game:event', { type, ...data })
  }

  private broadcast(): void {
    const state = this.getState()
    this.pushSnapshot(state)
    this.io.to(this.roomCode).emit('game:state', state)
  }

  private applyPlayerInputs(): void {
    for (const team of [this.teamA, this.teamB]) {
      const input = this.inputs.get(team.humanPlayerId)
      if (!input) continue
      const player = team.players[team.humanControlledIndex]
      if (!player) continue
      const cameraSide: -1 | 1 = this.phase === 'secondHalf' ? 1 : team.id === 'home' ? -1 : 1
      player.applyInput(input, cameraSide, TICK_S)

      const prev = this.prevSwitchPlayer.get(team.humanPlayerId) ?? false
      if (input.switchPlayer && !prev) {
        this.switchPlayer(team)
      }
      this.prevSwitchPlayer.set(team.humanPlayerId, input.switchPlayer)
    }
  }

  private processKickRequests(): void {
    for (const team of [this.teamA, this.teamB]) {
      const player = team.players[team.humanControlledIndex]
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

  private processTackleRequests(): void {
    const allPlayers = [...this.teamA.players, ...this.teamB.players]

    for (const team of [this.teamA, this.teamB]) {
      const player = team.players[team.humanControlledIndex]
      if (!player) continue
      const tackleRequest = player.consumeTackleRequest()
      if (!tackleRequest) continue

      if (tackleRequest.type === 'slide' && !player.isSliding) {
        player.isSliding = true
        player.slideTimer = SLIDE_DURATION
        const dirLen = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2)
        if (dirLen > 0.01) {
          player.slideDirection = {
            x: player.velocity.x / dirLen,
            y: 0,
            z: player.velocity.z / dirLen,
          }
        } else {
          player.slideDirection = {
            x: Math.sin(player.rotation),
            y: 0,
            z: Math.cos(player.rotation),
          }
        }
      }

      player.tackleCooldownTimer = 0.5

      const tackledOpponent = allPlayers.find((p) => p.team !== player.team && p.hasBall)
      if (!tackledOpponent) {
        if (shouldFoul(tackleRequest.type)) {
          this.io.to(this.roomCode).emit('game:event', { type: 'foul' })
        }
        continue
      }

      const tacklerPos = player.position
      const opponentPos = tackledOpponent.position
      const result = tackleRequest.type === 'standing'
        ? standingTackle(tacklerPos, opponentPos, tackledOpponent.hasBall)
        : slideTackle(tacklerPos, opponentPos, tackledOpponent.hasBall)

      if (result.success) {
        tackledOpponent.hasBall = false
        if (result.ballPopDirection) {
          this.ball.velocity = { ...result.ballPopDirection }
        }
      } else if (result.foul) {
        this.io.to(this.roomCode).emit('game:event', { type: 'foul' })
      }
    }
  }

  private pushSnapshot(state: GameState): void {
    this.replayBuffer.push(state)
    if (this.replayBuffer.length > this.MAX_REPLAY_SNAPSHOTS) {
      this.replayBuffer.shift()
    }
  }

  getReplayData(): { snapshots: GameStateSnapshot[] } {
    return { snapshots: [...this.replayBuffer] }
  }

  private getNearestOutfieldPlayer(team: Team): Player | null {
    const outfield = team.players.filter((p) => !p.isGk)
    if (outfield.length === 0) return null

    const bx = this.ball.position.x
    const bz = this.ball.position.z

    let nearest: Player | null = null
    let nearestDist = Infinity

    for (const p of outfield) {
      const dx = p.position.x - bx
      const dz = p.position.z - bz
      const dist = dx * dx + dz * dz
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = p
      }
    }

    return nearest
  }

  private switchPlayer(team: Team): void {
    const currentIdx = team.humanControlledIndex
    const current = team.players[currentIdx]
    if (!current) return

    const outfield = team.players
      .map((p, i) => ({ player: p, index: i }))
      .filter(({ player }) => !player.isGk)

    if (outfield.length <= 1) return

    const bx = this.ball.position.x
    const bz = this.ball.position.z

    outfield.sort((a, b) => {
      const daX = a.player.position.x - bx
      const daZ = a.player.position.z - bz
      const dbX = b.player.position.x - bx
      const dbZ = b.player.position.z - bz
      return daX * daX + daZ * daZ - (dbX * dbX + dbZ * dbZ)
    })

    let targetIdx: number
    if (outfield[0].index === currentIdx && outfield.length > 1) {
      targetIdx = outfield[1].index
    } else {
      targetIdx = outfield[0].index
    }

    current.isHumanControlled = false
    team.players[targetIdx].isHumanControlled = true
    team.humanControlledIndex = targetIdx
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
