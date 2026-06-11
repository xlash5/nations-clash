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
    io: { on: mockOn },
  }),
}))

describe('SocketClient', () => {
  const callbacks = {
    onRoomCreated: vi.fn(),
    onRoomJoined: vi.fn(),
    onRoomError: vi.fn(),
    onPlayerLeft: vi.fn(),
    onMatchStart: vi.fn(),
    onMatchTeamSelect: vi.fn(),
    onTeamSelected: vi.fn(),
    onBothTeamsSelected: vi.fn(),
    onGameState: vi.fn(),
    onGameGoal: vi.fn(),
    onGameEvent: vi.fn(),
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
    expect(mockOn).toHaveBeenCalledWith('match:teamSelect', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('team:selected', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('bothTeamsSelected', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('match:start', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('game:state', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('game:goal', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('game:event', expect.any(Function))
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

  it('calls onGameGoal when game:goal fires', () => {
    new SocketClient('http://localhost:3001', callbacks)
    const payload = { scorer: 'home-3', team: 'home' as const, isOwnGoal: false, replayData: { snapshots: [] } }
    mockOnHandlers['game:goal'](payload)
    expect(callbacks.onGameGoal).toHaveBeenCalledWith(payload)
  })

  it('calls onGameEvent when game:event fires', () => {
    new SocketClient('http://localhost:3001', callbacks)
    const payload = { type: 'foul', position: { x: 0, y: 0, z: 0 } }
    mockOnHandlers['game:event'](payload)
    expect(callbacks.onGameEvent).toHaveBeenCalledWith(payload)
  })

  it('emits match:selectTeam on selectTeam()', () => {
    const client = new SocketClient('http://localhost:3001', callbacks)
    client.selectTeam('england')
    expect(mockEmit).toHaveBeenCalledWith('match:selectTeam', { teamId: 'england' })
  })

  it('calls onMatchTeamSelect when match:teamSelect fires', () => {
    new SocketClient('http://localhost:3001', callbacks)
    const payload = { teams: [{ id: 'england', name: 'England', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', homeColor: '#FFFFFF', awayColor: '#C8102E', formation: '4-3-3', players: [] }] }
    mockOnHandlers['match:teamSelect'](payload)
    expect(callbacks.onMatchTeamSelect).toHaveBeenCalledWith(payload)
  })

  it('calls onTeamSelected when team:selected fires', () => {
    new SocketClient('http://localhost:3001', callbacks)
    const payload = { playerId: 'p1', teamId: 'england', teamName: 'England' }
    mockOnHandlers['team:selected'](payload)
    expect(callbacks.onTeamSelected).toHaveBeenCalledWith(payload)
  })

  it('calls onBothTeamsSelected when bothTeamsSelected fires', () => {
    new SocketClient('http://localhost:3001', callbacks)
    const payload = {
      home: { playerId: 'p1', teamId: 'england', side: 'home' as const, teamData: { id: 'england', name: 'England', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', homeColor: '#FFFFFF', awayColor: '#C8102E', formation: '4-3-3', players: [] } },
      away: { playerId: 'p2', teamId: 'brazil', side: 'away' as const, teamData: { id: 'brazil', name: 'Brazil', flagEmoji: '🇧🇷', homeColor: '#FFDF00', awayColor: '#003DA5', formation: '4-3-3', players: [] } },
    }
    mockOnHandlers['bothTeamsSelected'](payload)
    expect(callbacks.onBothTeamsSelected).toHaveBeenCalledWith(payload)
  })

  it('tracks latency via pong event', () => {
    const client = new SocketClient('http://localhost:3001', callbacks)
    mockOnHandlers['pong'](42)
    expect(client.getLatency()).toBe(42)
  })

  it('setCallbacks updates active callbacks', () => {
    const client =     new SocketClient('http://localhost:3001', callbacks)
    const newCallbacks = {
      onRoomCreated: vi.fn(),
      onRoomJoined: vi.fn(),
      onRoomError: vi.fn(),
      onPlayerLeft: vi.fn(),
      onMatchStart: vi.fn(),
      onMatchTeamSelect: vi.fn(),
      onTeamSelected: vi.fn(),
      onBothTeamsSelected: vi.fn(),
      onGameState: vi.fn(),
      onGameGoal: vi.fn(),
      onGameEvent: vi.fn(),
    }
    client.setCallbacks(newCallbacks)
    mockOnHandlers['room:created']({ roomCode: 'XYZ999' })
    expect(newCallbacks.onRoomCreated).toHaveBeenCalledWith({ roomCode: 'XYZ999' })
  })
})
