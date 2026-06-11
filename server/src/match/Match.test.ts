import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Server } from 'socket.io'
import { Match, type MatchPhase } from './Match.js'
import type { GameState, MatchConfig } from '../../../shared/types.js'
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

function advanceThroughPreMatch(match: Match, io: Server): void {
  while ((match as any).phase === 'preMatch') {
    ;(match as any).tick()
  }
}

describe('Match', () => {
  let io: Server
  let match: Match

  beforeEach(() => {
    io = createMockIo()
    match = new Match(io, 'ROOM01', defaultConfig(), 'host-id', 'guest-id')
  })

  it('constructor sets initial state to preMatch', () => {
    const state = match.getState()
    expect(state.phase).toBe('preMatch')
    expect(state.score).toEqual({ teamA: 0, teamB: 0 })
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

  it('ball starts at center', () => {
    expect(match.ball.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(match.ball.velocity).toEqual({ x: 0, y: 0, z: 0 })
    expect(match.ball.spin).toEqual({ x: 0, y: 0, z: 0 })
  })

  describe('preMatch countdown', () => {
    it('transitions to firstHalf after countdown reaches zero', () => {
      advanceThroughPreMatch(match, io)
      expect(match.getState().phase).toBe('firstHalf')
    })

    it('sets clock to duration when transitioning to firstHalf (time mode)', () => {
      advanceThroughPreMatch(match, io)
      expect(match.clock).toBe(120)
    })

    it('emits countdown events at 3, 2, 1', () => {
      while ((match as any).phase === 'preMatch') {
        ;(match as any).tick()
      }
      const allCalls = (io.to('ROOM01').emit as any).mock.calls
      const countdownCalls = allCalls.filter(
        (call: any[]) => call[0] === 'game:event' && call[1]?.type === 'countdown',
      )
      expect(countdownCalls.length).toBe(3)
      expect(countdownCalls[0][1].value).toBe(3)
      expect(countdownCalls[1][1].value).toBe(2)
      expect(countdownCalls[2][1].value).toBe(1)
    })

    it('emits kickoff event when first half starts', () => {
      advanceThroughPreMatch(match, io)
      expect(io.to('ROOM01').emit).toHaveBeenCalledWith('game:event', {
        type: 'kickoff',
      })
    })
  })

  describe('firstHalf', () => {
    beforeEach(() => {
      advanceThroughPreMatch(match, io)
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
      expect(state.ball).toHaveProperty('spin')
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

    it('handleInput stores input for processing', () => {
      const input = { up: true, down: false, left: false, right: false, sprint: false, shoot: false, pass: false, tackle: false, slideTackle: false, switchPlayer: false }
      match.handleInput('host-id', input)
      ;(match as any).tick()
      expect(io.to('ROOM01').emit).toHaveBeenCalled()
    })

    it('transitions to halftime when clock reaches 0', () => {
      match.clock = TICK_S
      ;(match as any).tick()
      expect(match.phase).toBe('halftime')
    })

    it('emits halftime event on transition', () => {
      match.clock = TICK_S
      ;(match as any).tick()
      expect(io.to('ROOM01').emit).toHaveBeenCalledWith('game:event', {
        type: 'halftime',
      })
    })

    it('transitions to fulltime if goalsToWin reached in goals mode', () => {
      const goalsMatch = new Match(io, 'ROOM01', defaultConfig({ mode: 'goals', goalsToWin: 3 }), 'host-id', 'guest-id')
      advanceThroughPreMatch(goalsMatch, io)
      goalsMatch.score.teamA = 3
      ;(goalsMatch as any).tick()
      expect(goalsMatch.phase).toBe('fulltime')
    })

    it('does NOT end before goalsToWin in goals mode', () => {
      const goalsMatch = new Match(io, 'ROOM01', defaultConfig({ mode: 'goals', goalsToWin: 5 }), 'host-id', 'guest-id')
      advanceThroughPreMatch(goalsMatch, io)
      goalsMatch.score.teamB = 3
      ;(goalsMatch as any).tick()
      expect(goalsMatch.phase).toBe('firstHalf')
    })
  })

  describe('halftime', () => {
    beforeEach(() => {
      advanceThroughPreMatch(match, io)
      match.clock = TICK_S
      ;(match as any).tick()
    })

    it('pauses the game clock', () => {
      const clockBefore = match.clock
      ;(match as any).tick()
      expect(match.clock).toBe(clockBefore)
    })

    it('transitions to secondHalf after 15 seconds', () => {
      for (let i = 0; i < 15 * 60; i++) {
        ;(match as any).tick()
      }
      expect(match.phase).toBe('secondHalf')
    })

    it('sets clock back to duration for second half', () => {
      for (let i = 0; i < 15 * 60; i++) {
        ;(match as any).tick()
      }
      expect(match.clock).toBe(120)
    })
  })

  describe('secondHalf', () => {
    beforeEach(() => {
      advanceThroughPreMatch(match, io)
      match.clock = TICK_S
      ;(match as any).tick()
      for (let i = 0; i < 15 * 60; i++) {
        ;(match as any).tick()
      }
    })

    it('transitions to fulltime when clock reaches 0', () => {
      match.clock = TICK_S
      ;(match as any).tick()
      expect(match.phase).toBe('fulltime')
    })

    it('emits fulltime event on transition', () => {
      match.clock = TICK_S
      ;(match as any).tick()
      expect(io.to('ROOM01').emit).toHaveBeenCalledWith('game:event', {
        type: 'fulltime',
      })
    })
  })

  describe('fulltime', () => {
    beforeEach(() => {
      advanceThroughPreMatch(match, io)
      match.clock = TICK_S
      ;(match as any).tick()
      for (let i = 0; i < 15 * 60; i++) {
        ;(match as any).tick()
      }
      match.clock = TICK_S
      ;(match as any).tick()
    })

    it('does not advance clock', () => {
      const clockBefore = match.clock
      ;(match as any).tick()
      expect(match.clock).toBe(clockBefore)
    })
  })

  describe('goal integration with state machine', () => {
    beforeEach(() => {
      advanceThroughPreMatch(match, io)
    })

    it('goal pause prevents gameplay then resets for kickoff', () => {
      const goal = { team: 'home' as const, scorer: 'home-3', isOwnGoal: false, side: 'positive' as const }
      ;(match as any).awardGoal(goal)
      expect((match as any).goalPauseTimer).toBe(3.0)

      for (let i = 0; i < 3 * 60; i++) {
        ;(match as any).tick()
      }
      expect((match as any).goalPauseTimer).toBeLessThanOrEqual(TICK_S)
    })

    it('awardGoal sets goal pause timer', () => {
      const goal = { team: 'home' as const, scorer: 'home-3', isOwnGoal: false, side: 'positive' as const }
      ;(match as any).awardGoal(goal)
      expect((match as any).goalPauseTimer).toBe(3.0)
    })

    it('scheduleKickoff is called after goal pause ends', () => {
      const goal = { team: 'home' as const, scorer: 'home-3', isOwnGoal: false, side: 'positive' as const }
      ;(match as any).awardGoal(goal)
      for (let i = 0; i < 3 * 60; i++) {
        ;(match as any).tick()
      }
      expect(match.ball.position).toEqual({ x: 0, y: 0, z: 0 })
    })
  })

  describe('replay buffer', () => {
    beforeEach(() => {
      advanceThroughPreMatch(match, io)
    })

    it('pushSnapshot appends to buffer', () => {
      const before = (match as any).getReplayData().snapshots.length
      const state = match.getState()
      ;(match as any).pushSnapshot(state)
      const after = (match as any).getReplayData().snapshots.length
      expect(after).toBe(before + 1)
    })

    it('buffer caps at 300 snapshots', () => {
      ;(match as any).replayBuffer = []
      const state = match.getState()
      for (let i = 0; i < 310; i++) {
        ;(match as any).pushSnapshot(state)
      }
      const data = (match as any).getReplayData()
      expect(data.snapshots).toHaveLength(300)
    })

    it('oldest entries are evicted when buffer exceeds 300', () => {
      ;(match as any).replayBuffer = []
      for (let i = 0; i < 310; i++) {
        const s = match.getState()
        s.clock = i
        ;(match as any).pushSnapshot(s)
      }
      const data = (match as any).getReplayData()
      expect(data.snapshots[0].clock).toBe(10)
      expect(data.snapshots[data.snapshots.length - 1].clock).toBe(309)
    })

    it('getReplayData returns copy of buffer', () => {
      ;(match as any).replayBuffer = []
      const state = match.getState()
      ;(match as any).pushSnapshot(state)
      const data1 = (match as any).getReplayData()
      const data2 = (match as any).getReplayData()
      expect(data1.snapshots).toHaveLength(1)
      expect(data2.snapshots).toHaveLength(1)
      data1.snapshots.push(state)
      expect(data2.snapshots).toHaveLength(1)
    })

    it('tick pushes snapshot via broadcast', () => {
      ;(match as any).tick()
      const data = (match as any).getReplayData()
      expect(data.snapshots.length).toBeGreaterThanOrEqual(1)
    })

    it('includes replayData in game:goal event', () => {
      for (let i = 0; i < 100; i++) {
        ;(match as any).tick()
      }
      const goal = { team: 'home' as const, scorer: 'home-3', isOwnGoal: false, side: 'positive' as const }
      ;(match as any).awardGoal(goal)
      const emitCalls = (io.to('ROOM01').emit as any).mock.calls
      const goalCall = emitCalls.find((call: any[]) => call[0] === 'game:goal')
      expect(goalCall).toBeDefined()
      expect(goalCall[1].replayData.snapshots.length).toBeGreaterThan(0)
    })
  })

  describe('start() / stop()', () => {
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
  })
})
