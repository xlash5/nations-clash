import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Server } from 'socket.io'
import { Match } from './match/Match.js'
import { TICK_S } from '../../shared/types.js'
import type { MatchConfig } from '../../shared/types.js'
import { __resetRoomsForTest, createRoom, joinRoom, removePlayer, getRoom, serializeRoom } from './rooms.js'

function createMockIo(): Server {
  const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as unknown as Server
  return io
}

function defaultConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    mode: 'time',
    duration: 120,
    goalsToWin: 5,
    ...overrides,
  }
}

function advanceThroughPreMatch(match: Match): void {
  while ((match as any).phase === 'preMatch') {
    ;(match as any).tick()
  }
}

describe('rematch flow', () => {
  let io: Server

  beforeEach(() => {
    io = createMockIo()
    __resetRoomsForTest()
  })

  it('Match can be stopped and restarted', () => {
    const match = new Match(io, 'ROOM01', defaultConfig(), 'p1', 'p2')
    match.start()
    expect(match.isRunning()).toBe(true)
    match.stop()
    expect(match.isRunning()).toBe(false)
    match.start()
    expect(match.isRunning()).toBe(true)
    match.stop()
  })

  it('Match fulltime stops the game loop for time mode', () => {
    const match = new Match(io, 'ROOM01', defaultConfig(), 'p1', 'p2')
    advanceThroughPreMatch(match)
    match.clock = TICK_S
    ;(match as any).tick()
    ;(match as any).phase = 'secondHalf'
    match.clock = TICK_S
    ;(match as any).tick()
    match.ball.position = { x: 100, y: 0, z: 0 }
    ;(match as any).tick()
    expect(match.phase).toBe('fulltime')
  })

  it('Match fulltime stops the game loop for goals mode', () => {
    const match = new Match(io, 'ROOM01', defaultConfig({ mode: 'goals', goalsToWin: 3 }), 'p1', 'p2')
    advanceThroughPreMatch(match)
    match.score.teamA = 3
    ;(match as any).tick()
    expect(match.phase).toBe('fulltime')
    expect(match.isRunning()).toBe(false)
  })

  it('new Match can be created after old one stops (rematch scenario)', () => {
    const match1 = new Match(io, 'ROOM01', defaultConfig(), 'p1', 'p2')
    match1.start()
    match1.stop()

    const match2 = new Match(io, 'ROOM01', defaultConfig(), 'p1', 'p2')
    match2.start()
    expect(match2.isRunning()).toBe(true)
    match2.stop()
  })

  it('new Match carries same config as original', () => {
    const config = defaultConfig({ mode: 'goals', goalsToWin: 5 })
    const match1 = new Match(io, 'ROOM01', config, 'p1', 'p2')
    match1.start()
    match1.stop()

    const match2 = new Match(io, 'ROOM01', config, 'p1', 'p2')
    expect(match2.config).toEqual(config)
    match2.start()
    match2.stop()
  })
})

describe('match:leave flow', () => {
  beforeEach(() => {
    __resetRoomsForTest()
  })

  it('removePlayer removes a player from the room', () => {
    const code = createRoom()
    joinRoom(code, 'p1')
    joinRoom(code, 'p2')
    expect(getRoom(code)!.players.size).toBe(2)

    const { wasLastPlayer } = removePlayer(code, 'p1')
    expect(wasLastPlayer).toBe(false)
    expect(getRoom(code)!.players.size).toBe(1)
  })

  it('removePlayer destroys room when last player leaves', () => {
    const code = createRoom()
    joinRoom(code, 'p1')
    const { wasLastPlayer } = removePlayer(code, 'p1')
    expect(wasLastPlayer).toBe(true)
    expect(getRoom(code)).toBeUndefined()
  })

  it('leave notifies opponent', () => {
    const code = createRoom()
    joinRoom(code, 'p1')
    joinRoom(code, 'p2')

    const { room, wasLastPlayer } = removePlayer(code, 'p1')
    expect(wasLastPlayer).toBe(false)
    expect(room).toBeDefined()
    expect(room!.players.has('p1')).toBe(false)
    expect(room!.players.has('p2')).toBe(true)
  })
})
