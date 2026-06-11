import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Server } from 'socket.io'
import { Match, type MatchPhase } from './Match.js'
import type { MatchConfig } from '../../../shared/types.js'
import { TICK_S } from '../../../shared/types.js'

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

describe('Match', () => {
  let io: Server
  let match: Match

  beforeEach(() => {
    io = createMockIo()
    match = new Match(io, 'ROOM01', defaultConfig(), 'host-id', 'guest-id')
  })

  it('constructor sets initial state', () => {
    const state = match.getState()
    expect(state.clock).toBe(120)
    expect(state.score).toEqual({ teamA: 0, teamB: 0 })
    expect(state.phase).toBe('firstHalf')
  })

  it('constructor creates 11 players per team', () => {
    expect(match.teamA.players).toHaveLength(11)
    expect(match.teamB.players).toHaveLength(11)
  })

  it('constructor marks first outfield player as human controlled', () => {
    expect(match.teamA.players[1].isHumanControlled).toBe(true)
    expect(match.teamB.players[1].isHumanControlled).toBe(true)
  })

  it('constructor marks goalkeeper as GK', () => {
    expect(match.teamA.players[0].isGk).toBe(true)
    expect(match.teamB.players[0].isGk).toBe(true)
  })

  it('tick advances clock by 1/60 second in time mode', () => {
    const initialClock = match.clock
    ;(match as any).tick()
    expect(match.clock).toBeCloseTo(initialClock - TICK_S, 5)
  })

  it('tick broadcasts game:state after each tick', () => {
    ;(match as any).tick()
    expect(io.to).toHaveBeenCalledWith('ROOM01')
    expect(io.to('ROOM01').emit).toHaveBeenCalledWith('game:state', expect.any(Object))
  })

  it('getState returns correct snapshot shape', () => {
    const state = match.getState()
    expect(state).toHaveProperty('players')
    expect(state).toHaveProperty('ball')
    expect(state).toHaveProperty('score')
    expect(state).toHaveProperty('clock')
    expect(state).toHaveProperty('phase')
    expect(Array.isArray(state.players)).toBe(true)
    expect(state.players).toHaveLength(22)
    expect(state.ball).toHaveProperty('position')
    expect(state.ball).toHaveProperty('velocity')
  })

  it('getState returns player snapshots with required fields', () => {
    const state = match.getState()
    const player = state.players[0]
    expect(player).toHaveProperty('id')
    expect(player).toHaveProperty('team')
    expect(player).toHaveProperty('position')
    expect(player).toHaveProperty('velocity')
    expect(player).toHaveProperty('rotation')
    expect(player).toHaveProperty('stamina')
    expect(player).toHaveProperty('isHumanControlled')
    expect(player).toHaveProperty('isGk')
  })

  it('tick does NOT advance clock when phase is fulltime', () => {
    match.phase = 'fulltime'
    const clockBefore = match.clock
    ;(match as any).tick()
    expect(match.clock).toBe(clockBefore)
  })

  it('tick does NOT advance clock when phase is halftime', () => {
    match.phase = 'halftime'
    const clockBefore = match.clock
    ;(match as any).tick()
    expect(match.clock).toBe(clockBefore)
  })

  it('match ends when clock reaches 0 in time mode', () => {
    match.clock = TICK_S
    ;(match as any).tick()
    expect(match.clock).toBe(0)
    expect(match.phase).toBe('fulltime')
  })

  it('match ends when clock passes 0 in time mode', () => {
    match.clock = TICK_S / 2
    ;(match as any).tick()
    expect(match.clock).toBe(0)
    expect(match.phase).toBe('fulltime')
  })

  it('match ends when a team reaches goalsToWin in goals mode', () => {
    const goalsConfig = defaultConfig({ mode: 'goals', goalsToWin: 3 })
    const goalsMatch = new Match(io, 'ROOM01', goalsConfig, 'host-id', 'guest-id')
    goalsMatch.score.teamA = 3
    ;(goalsMatch as any).tick()
    expect(goalsMatch.phase).toBe('fulltime')
  })

  it('match does NOT end before goalsToWin in goals mode', () => {
    const goalsConfig = defaultConfig({ mode: 'goals', goalsToWin: 5 })
    const goalsMatch = new Match(io, 'ROOM01', goalsConfig, 'host-id', 'guest-id')
    goalsMatch.score.teamB = 3
    ;(goalsMatch as any).tick()
    expect(goalsMatch.phase).toBe('firstHalf')
  })

  it('start() begins the game loop', () => {
    vi.useFakeTimers()
    match.start()
    expect(match.isRunning()).toBe(true)
    match.stop()
    vi.useRealTimers()
  })

  it('stop() halts the game loop', () => {
    vi.useFakeTimers()
    match.start()
    match.stop()
    expect(match.isRunning()).toBe(false)
    vi.useRealTimers()
  })

  it('start() is idempotent', () => {
    vi.useFakeTimers()
    match.start()
    match.start()
    expect(match.isRunning()).toBe(true)
    match.stop()
    vi.useRealTimers()
  })

  it('handleInput stores input for processing', () => {
    const input = { up: true, down: false, left: false, right: false, sprint: false, shoot: false, pass: false, tackle: false, slideTackle: false, switchPlayer: false }
    match.handleInput('host-id', input)
    ;(match as any).tick()
    expect(io.to('ROOM01').emit).toHaveBeenCalled()
  })

  it('ball starts at center', () => {
    expect(match.ball.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(match.ball.velocity).toEqual({ x: 0, y: 0, z: 0 })
  })
})
