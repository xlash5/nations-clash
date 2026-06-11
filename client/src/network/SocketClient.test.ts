import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SocketClient } from './SocketClient'

let mockOnHandlers: Record<string, (...args: any[]) => void> = {}
const mockOn = vi.fn((event: string, handler: (...args: any[]) => void) => {
  mockOnHandlers[event] = handler
})
const mockEmit = vi.fn()
const mockDisconnect = vi.fn()

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: mockOn,
    emit: mockEmit,
    disconnect: mockDisconnect,
  }),
}))

describe('SocketClient', () => {
  const callbacks = {
    onRoomCreated: vi.fn(),
    onRoomJoined: vi.fn(),
    onRoomError: vi.fn(),
    onPlayerLeft: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnHandlers = {}
  })

  it('registers event handlers on construction', () => {
    new SocketClient('http://localhost:3001', callbacks)
    expect(mockOn).toHaveBeenCalledWith('room:created', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('room:joined', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('room:error', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('player:left', expect.any(Function))
  })

  it('calls onRoomCreated when room:created fires', () => {
    new SocketClient('http://localhost:3001', callbacks)
    mockOnHandlers['room:created']({ roomCode: 'ABC123' })
    expect(callbacks.onRoomCreated).toHaveBeenCalledWith({ roomCode: 'ABC123' })
  })

  it('calls onRoomJoined when room:joined fires', () => {
    new SocketClient('http://localhost:3001', callbacks)
    const payload = { code: 'ABC123', players: [{ id: 'p1', ready: false }] }
    mockOnHandlers['room:joined'](payload)
    expect(callbacks.onRoomJoined).toHaveBeenCalledWith(payload)
  })

  it('calls onRoomError when room:error fires', () => {
    new SocketClient('http://localhost:3001', callbacks)
    mockOnHandlers['room:error']({ message: 'Room not found' })
    expect(callbacks.onRoomError).toHaveBeenCalledWith({ message: 'Room not found' })
  })

  it('calls onPlayerLeft when player:left fires', () => {
    new SocketClient('http://localhost:3001', callbacks)
    mockOnHandlers['player:left']({ playerId: 'p1' })
    expect(callbacks.onPlayerLeft).toHaveBeenCalledWith({ playerId: 'p1' })
  })

  it('emits room:create on createRoom()', () => {
    const client = new SocketClient('http://localhost:3001', callbacks)
    client.createRoom()
    expect(mockEmit).toHaveBeenCalledWith('room:create')
  })

  it('emits room:join with roomCode on joinRoom()', () => {
    const client = new SocketClient('http://localhost:3001', callbacks)
    client.joinRoom('ABC123')
    expect(mockEmit).toHaveBeenCalledWith('room:join', { roomCode: 'ABC123' })
  })

  it('emits player:ready on toggleReady()', () => {
    const client = new SocketClient('http://localhost:3001', callbacks)
    client.toggleReady()
    expect(mockEmit).toHaveBeenCalledWith('player:ready')
  })

  it('disconnects on disconnect()', () => {
    const client = new SocketClient('http://localhost:3001', callbacks)
    client.disconnect()
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('setCallbacks updates active callbacks', () => {
    const client = new SocketClient('http://localhost:3001', callbacks)
    const newCallbacks = {
      onRoomCreated: vi.fn(),
      onRoomJoined: vi.fn(),
      onRoomError: vi.fn(),
      onPlayerLeft: vi.fn(),
    }
    client.setCallbacks(newCallbacks)
    mockOnHandlers['room:created']({ roomCode: 'XYZ999' })
    expect(newCallbacks.onRoomCreated).toHaveBeenCalledWith({ roomCode: 'XYZ999' })
  })
})
