import { io, Socket } from 'socket.io-client'

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

export interface SocketClientCallbacks {
  onRoomCreated: (payload: RoomPayload) => void
  onRoomJoined: (payload: RoomJoinedPayload) => void
  onRoomError: (payload: RoomErrorPayload) => void
  onPlayerLeft: (payload: PlayerLeftPayload) => void
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

  disconnect(): void {
    this.socket.disconnect()
  }
}
