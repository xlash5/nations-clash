import { io, Socket } from 'socket.io-client'
import type { GameState, GoalEventPayload, TeamData, FormationName } from '../../../shared/types.js'

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
  homeFormation?: string
  awayFormation?: string
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

export interface FormationSelectPayload {
  formations: FormationName[]
}

export interface FormationSelectedPayload {
  playerId: string
  formation: string
}

export interface GameEventPayload {
  type: string
  [key: string]: unknown
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
  onMatchFormationSelect: (payload: FormationSelectPayload) => void
  onFormationSelected: (payload: FormationSelectedPayload) => void
  onGameState: (state: GameState) => void
  onGameGoal: (payload: GoalEventPayload) => void
  onGameEvent: (payload: GameEventPayload) => void
}

export class SocketClient {
  private socket: Socket
  private callbacks: SocketClientCallbacks

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
    this.socket.on('match:formationSelect', (payload) => this.callbacks.onMatchFormationSelect(payload))
    this.socket.on('formation:selected', (payload) => this.callbacks.onFormationSelected(payload))
    this.socket.on('match:start', (payload) => this.callbacks.onMatchStart(payload))
    this.socket.on('game:state', (payload) => this.callbacks.onGameState(payload))
    this.socket.on('game:goal', (payload) => this.callbacks.onGameGoal(payload))
    this.socket.on('game:event', (payload) => this.callbacks.onGameEvent(payload))
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

  selectFormation(formation: string): void {
    this.socket.emit('match:selectFormation', { formation })
  }

  sendInput(keys: number, chargeType: string | null, chargeTimestamp: number): void {
    this.socket.emit('game:input', { keys, chargeType, chargeTimestamp })
  }

  disconnect(): void {
    this.socket.disconnect()
  }
}
