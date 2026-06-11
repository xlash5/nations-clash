import { io, Socket } from 'socket.io-client'
import type { GameState, GoalEventPayload, TeamData } from '../../../shared/types.js'

export interface RoomPayload {
  roomCode: string
}

export interface RoomJoinedPayload {
  code: string
  players: { id: string; ready: boolean }[]
}

export interface RoomErrorPayload {
  message: string
}

export interface PlayerLeftPayload {
  playerId: string
}

export interface MatchStartPayload {
  config: { mode: string; duration: number; goalsToWin: number }
  homeTeam?: TeamData
  awayTeam?: TeamData
  homePlayerId?: string
  awayPlayerId?: string
}

export interface TeamSelectPayload {
  teams: TeamData[]
}

export interface TeamSelectedPayload {
  playerId: string
  teamId: string
  teamName?: string
}

export interface BothTeamsSelectedPayload {
  home: { playerId: string; teamId: string; side: 'home'; teamData: TeamData }
  away: { playerId: string; teamId: string; side: 'away'; teamData: TeamData }
}

export interface RematchStatusPayload {
  playerIds: string[]
}

export interface GameEventPayload {
  type: string
  [key: string]: unknown
}

export interface FulltimePayload {
  type: 'fulltime'
  score: { teamA: number; teamB: number }
  goals: { playerId: string | null; team: 'home' | 'away'; time: number; isOwnGoal: boolean }[]
  homeTeamName: string
  awayTeamName: string
}

export interface SocketClientCallbacks {
  onRoomCreated: (payload: RoomPayload) => void
  onRoomJoined: (payload: RoomJoinedPayload) => void
  onRoomError: (payload: RoomErrorPayload) => void
  onPlayerLeft: (payload: PlayerLeftPayload) => void
  onMatchStart: (payload: MatchStartPayload) => void
  onMatchTeamSelect: (payload: TeamSelectPayload) => void
  onTeamSelected: (payload: TeamSelectedPayload) => void
  onBothTeamsSelected: (payload: BothTeamsSelectedPayload) => void
  onGameState: (state: GameState) => void
  onGameGoal: (payload: GoalEventPayload) => void
  onGameEvent: (payload: GameEventPayload) => void
  onRematchStatus: (payload: RematchStatusPayload) => void
  onRematchAccepted: () => void
}

export class SocketClient {
  private socket: Socket
  private callbacks: SocketClientCallbacks
  private _latency: number = 0

  constructor(serverUrl: string, callbacks: SocketClientCallbacks) {
    this.callbacks = callbacks
    this.socket = io(serverUrl)

    this.socket.on('room:created', (payload) => this.callbacks.onRoomCreated(payload))
    this.socket.on('room:joined', (payload) => this.callbacks.onRoomJoined(payload))
    this.socket.on('room:error', (payload) => this.callbacks.onRoomError(payload))
    this.socket.on('player:left', (payload) => this.callbacks.onPlayerLeft(payload))
    this.socket.on('match:teamSelect', (payload) => this.callbacks.onMatchTeamSelect(payload))
    this.socket.on('team:selected', (payload) => this.callbacks.onTeamSelected(payload))
    this.socket.on('bothTeamsSelected', (payload) => this.callbacks.onBothTeamsSelected(payload))
    this.socket.on('match:start', (payload) => this.callbacks.onMatchStart(payload))
    this.socket.on('game:state', (payload) => this.callbacks.onGameState(payload))
    this.socket.on('game:goal', (payload) => this.callbacks.onGameGoal(payload))
    this.socket.on('game:event', (payload) => this.callbacks.onGameEvent(payload))
    this.socket.on('match:rematchStatus', (payload) => this.callbacks.onRematchStatus(payload))
    this.socket.on('match:rematchAccepted', () => this.callbacks.onRematchAccepted())

    this.socket.on('pong', (latency: number) => {
      this._latency = latency
    })
  }

  getSocketId(): string | undefined {
    return this.socket.id
  }

  getLatency(): number {
    return this._latency
  }

  setCallbacks(callbacks: SocketClientCallbacks): void {
    this.callbacks = callbacks
  }

  createRoom(): void {
    this.socket.emit('room:create')
  }

  joinRoom(roomCode: string): void {
    this.socket.emit('room:join', { roomCode })
  }

  toggleReady(): void {
    this.socket.emit('player:ready')
  }

  selectTeam(teamId: string): void {
    this.socket.emit('match:selectTeam', { teamId })
  }

  requestRematch(): void {
    this.socket.emit('match:rematchRequest')
  }

  leaveMatch(): void {
    this.socket.emit('match:leave')
  }

  sendInput(keys: number, chargeType: string | null, chargeTimestamp: number): void {
    this.socket.emit('game:input', { keys, chargeType, chargeTimestamp })
  }

  disconnect(): void {
    this.socket.disconnect()
  }
}
