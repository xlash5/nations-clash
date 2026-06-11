import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Server } from 'socket.io'
import { Match, type MatchPhase } from './Match.js'
import type { GameState, MatchConfig, PlayerInput } from '../../../shared/types.js'
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

    it('enters extended play when clock reaches 0 (goal in flight rule)', () => {
      match.clock = TICK_S
      ;(match as any).tick()
      expect((match as any).extendedPlay).toBe(true)
      expect(match.clock).toBe(0)
    })

    it('extended play ends on ball out of bounds, transitioning to fulltime', () => {
      match.clock = TICK_S
      ;(match as any).tick()
      expect((match as any).extendedPlay).toBe(true)

      match.ball.position = { x: 100, y: 0, z: 0 }
      ;(match as any).tick()
      expect(match.phase).toBe('fulltime')
    })

    it('emits fulltime event after extended play ends', () => {
      match.clock = TICK_S
      ;(match as any).tick()
      match.ball.position = { x: 100, y: 0, z: 0 }
      ;(match as any).tick()

      const allCalls = (io.to('ROOM01').emit as any).mock.calls
      const fulltimeCall = allCalls.find(
        (call: any[]) => call[0] === 'game:event' && call[1]?.type === 'fulltime',
      )
      expect(fulltimeCall).toBeDefined()
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
      match.ball.position = { x: 100, y: 0, z: 0 }
      ;(match as any).tick()
      expect(match.phase).toBe('fulltime')
    })

    it('does not advance clock', () => {
      const clockBefore = match.clock
      ;(match as any).tick()
      expect(match.clock).toBe(clockBefore)
    })

    it('emits fulltime with score and goals data', () => {
      const emitCalls = (io.to('ROOM01').emit as any).mock.calls
      const fulltimeCall = emitCalls.find(
        (call: any[]) => call[0] === 'game:event' && call[1]?.type === 'fulltime',
      )
      expect(fulltimeCall).toBeDefined()
      expect(fulltimeCall[1].score).toEqual({ teamA: 0, teamB: 0 })
      expect(fulltimeCall[1].goals).toEqual([])
      expect(fulltimeCall[1].homeTeamName).toBe('Home')
      expect(fulltimeCall[1].awayTeamName).toBe('Away')
    })

    it('stops the game loop after fulltime', () => {
      expect(match.isRunning()).toBe(false)
    })
  })

  describe('fulltime with custom team names', () => {
    it('emits team names in fulltime event', () => {
      const namedMatch = new Match(io, 'ROOM02', defaultConfig({ mode: 'goals', goalsToWin: 1 }), 'host-id', 'guest-id', 'Brazil', 'Argentina')
      advanceThroughPreMatch(namedMatch, io)
      namedMatch.score.teamA = 1
      ;(namedMatch as any).tick()

      const emitCalls = (io.to('ROOM02').emit as any).mock.calls
      const fulltimeCall = emitCalls.find(
        (call: any[]) => call[0] === 'game:event' && call[1]?.type === 'fulltime',
      )
      expect(fulltimeCall).toBeDefined()
      expect(fulltimeCall[1].homeTeamName).toBe('Brazil')
      expect(fulltimeCall[1].awayTeamName).toBe('Argentina')
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

  describe('player switching', () => {
    beforeEach(() => {
      advanceThroughPreMatch(match, io)
    })

    function moveAllOutfieldFar(team: typeof match.teamA): void {
      for (let i = 1; i < team.players.length; i++) {
        team.players[i].position = { x: 9999, y: 0, z: 9999 }
      }
    }

    it('getNearestOutfieldPlayer returns nearest non-GK to the ball', () => {
      const team = match.teamA
      moveAllOutfieldFar(team)
      team.players[2].position = { x: 5, y: 0, z: 5 }
      match.ball.position = { x: 6, y: 0, z: 6 }

      const nearest = (match as any).getNearestOutfieldPlayer(team)
      expect(nearest).toBe(team.players[2])
    })

    it('getNearestOutfieldPlayer never returns the GK', () => {
      const team = match.teamA
      team.players[0].position = { x: 0, y: 0, z: 0 }
      team.players[1].position = { x: 50, y: 0, z: 50 }
      match.ball.position = { x: 0, y: 0, z: 0 }

      const nearest = (match as any).getNearestOutfieldPlayer(team)
      expect(nearest).not.toBe(team.players[0])
      expect(nearest!.isGk).toBe(false)
    })

    it('getNearestOutfieldPlayer returns null when only GK remains', () => {
      const team = match.teamA
      team.players = team.players.filter((p: any) => p.isGk)

      const nearest = (match as any).getNearestOutfieldPlayer(team)
      expect(nearest).toBeNull()
    })

    it('switchPlayer changes humanControlledIndex to nearest outfield player', () => {
      const team = match.teamA
      expect(team.humanControlledIndex).toBe(1)

      moveAllOutfieldFar(team)
      team.players[2].position = { x: 5, y: 0, z: 5 }
      match.ball.position = { x: 6, y: 0, z: 6 }

      ;(match as any).switchPlayer(team)
      expect(team.humanControlledIndex).toBe(2)
    })

    it('switchPlayer switches to second-nearest when current is already nearest', () => {
      const team = match.teamA
      expect(team.humanControlledIndex).toBe(1)

      moveAllOutfieldFar(team)
      team.players[1].position = { x: 5, y: 0, z: 5 }
      team.players[2].position = { x: 10, y: 0, z: 10 }
      match.ball.position = { x: 6, y: 0, z: 6 }

      ;(match as any).switchPlayer(team)
      expect(team.humanControlledIndex).toBe(2)
    })

    it('switchPlayer never selects the goalkeeper', () => {
      const team = match.teamA
      moveAllOutfieldFar(team)
      team.players[0].position = { x: 1, y: 0, z: 1 }
      team.players[1].position = { x: 50, y: 0, z: 50 }
      match.ball.position = { x: 0, y: 0, z: 0 }

      ;(match as any).switchPlayer(team)
      expect(team.humanControlledIndex).not.toBe(0)
    })

    it('switchPlayer toggles isHumanControlled flags correctly', () => {
      const team = match.teamA
      expect(team.players[1].isHumanControlled).toBe(true)

      moveAllOutfieldFar(team)
      team.players[2].position = { x: 5, y: 0, z: 5 }
      match.ball.position = { x: 6, y: 0, z: 6 }

      ;(match as any).switchPlayer(team)
      expect(team.players[1].isHumanControlled).toBe(false)
      expect(team.players[2].isHumanControlled).toBe(true)
    })

    it('switchPlayer does nothing when only GK is left (no outfield players)', () => {
      const team = match.teamA
      const humanIdx = team.humanControlledIndex

      team.players = team.players.filter((p: any) => p.isGk)
      team.players[0].isHumanControlled = true
      team.humanControlledIndex = 0

      ;(match as any).switchPlayer(team)
      expect(team.humanControlledIndex).toBe(0)
      expect(team.players[0].isHumanControlled).toBe(true)
    })

    it('applyPlayerInputs triggers switch on rising edge of switchPlayer input', () => {
      const team = match.teamA
      moveAllOutfieldFar(team)
      team.players[2].position = { x: 5, y: 0, z: 5 }
      match.ball.position = { x: 6, y: 0, z: 6 }

      const input: PlayerInput = {
        up: false, down: false, left: false, right: false,
        sprint: false, shoot: false, pass: false,
        tackle: false, slideTackle: false, switchPlayer: true,
      }
      match.handleInput('host-id', input)
      ;(match as any).tick()

      expect(team.humanControlledIndex).toBe(2)
    })

    it('holding switchPlayer key does not switch repeatedly (rising edge only)', () => {
      const team = match.teamA
      moveAllOutfieldFar(team)
      team.players[2].position = { x: 5, y: 0, z: 5 }
      match.ball.position = { x: 6, y: 0, z: 6 }

      const input: PlayerInput = {
        up: false, down: false, left: false, right: false,
        sprint: false, shoot: false, pass: false,
        tackle: false, slideTackle: false, switchPlayer: true,
      }
      match.handleInput('host-id', input)
      ;(match as any).tick()
      expect(team.humanControlledIndex).toBe(2)

      ;(match as any).tick()
      expect(team.humanControlledIndex).toBe(2)
    })

    it('getState reflects isHumanControlled after switch', () => {
      const team = match.teamA
      moveAllOutfieldFar(team)
      team.players[2].position = { x: 5, y: 0, z: 5 }
      match.ball.position = { x: 6, y: 0, z: 6 }

      const input: PlayerInput = {
        up: false, down: false, left: false, right: false,
        sprint: false, shoot: false, pass: false,
        tackle: false, slideTackle: false, switchPlayer: true,
      }
      match.handleInput('host-id', input)
      ;(match as any).tick()

      const state = match.getState()
      const homeControlled = state.players.find((p) => p.team === 'home' && p.isHumanControlled)
      expect(homeControlled).toBeDefined()
      expect(homeControlled!.id).toBe('home-2')
    })
  })

  describe('free kicks', () => {
    const FREE_KICK_DIST = 9.15

    function positionAllPlayers(team: typeof match.teamA, x: number, z: number): void {
      for (const p of team.players) {
        p.position = { x, y: 0, z }
      }
    }

    beforeEach(() => {
      advanceThroughPreMatch(match, io)
    })

    it('startFreeKick transitions phase to freeKick', () => {
      ;(match as any).startFreeKick({ x: 10, y: 0, z: 20 }, 'home', 'away')
      expect(match.phase).toBe('freeKick')
    })

    it('startFreeKick places ball at foul position', () => {
      const foulPos = { x: 15, y: 0, z: -10 }
      ;(match as any).startFreeKick(foulPos, 'home', 'away')
      expect(match.ball.position).toEqual(foulPos)
      expect(match.ball.velocity).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('startFreeKick moves all opposing players at least 9.15m from ball', () => {
      positionAllPlayers(match.teamB, 5, 5)
      const foulPos = { x: 0, y: 0, z: 0 }
      ;(match as any).startFreeKick(foulPos, 'home', 'away')

      for (const player of match.teamB.players) {
        const dx = player.position.x - foulPos.x
        const dz = player.position.z - foulPos.z
        const dist = Math.sqrt(dx * dx + dz * dz)
        expect(dist).toBeGreaterThanOrEqual(FREE_KICK_DIST - 0.01)
      }
    })

    it('startFreeKick assigns nearest outfield player on fouled team as taker', () => {
      positionAllPlayers(match.teamA, 100, 100)
      match.teamA.players[3].position = { x: 5, y: 0, z: 5 }
      match.teamA.players[4].position = { x: 8, y: 0, z: 8 }

      const foulPos = { x: 6, y: 0, z: 6 }
      ;(match as any).startFreeKick(foulPos, 'home', 'away')

      expect(match.teamA.humanControlledIndex).toBe(3)
      expect(match.teamA.players[3].isHumanControlled).toBe(true)
    })

    it('tickFreeKick without kick stays in freeKick phase', () => {
      ;(match as any).startFreeKick({ x: 0, y: 0, z: 0 }, 'home', 'away')
      ;(match as any).tickFreeKick()
      expect(match.phase).toBe('freeKick')
    })

    it('executeFreeKick resumes play after shoot', () => {
      ;(match as any).startFreeKick({ x: 0, y: 0, z: 0 }, 'home', 'away')
      const player = match.teamA.players[match.teamA.humanControlledIndex]
      player.rotation = Math.PI / 4

      ;(match as any).executeFreeKick({ type: 'shoot', power: 0.5 })
      expect(match.phase).toBe('firstHalf')
      expect(match.ball.velocity.x).not.toBe(0)
      expect(match.ball.velocity.z).not.toBe(0)
    })

    it('executeFreeKick resumes play after pass', () => {
      ;(match as any).startFreeKick({ x: 0, y: 0, z: 0 }, 'home', 'away')
      ;(match as any).executeFreeKick({ type: 'pass', power: 0.3 })
      expect(match.phase).toBe('firstHalf')
    })

    it('free kick sets lastTouch to kicker', () => {
      ;(match as any).startFreeKick({ x: 0, y: 0, z: 0 }, 'home', 'away')
      ;(match as any).executeFreeKick({ type: 'shoot', power: 0.5 })
      expect((match as any).lastTouch).not.toBeNull()
      expect((match as any).lastTouch.team).toBe('home')
    })

    it('emits foul game:event with position and team data', () => {
      ;(match as any).startFreeKick({ x: 10, y: 0, z: -15 }, 'home', 'away')
      expect(io.to('ROOM01').emit).toHaveBeenCalledWith('game:event', {
        type: 'foul',
        position: { x: 10, y: 0, z: -15 },
        foulingTeam: 'away',
        fouledTeam: 'home',
      })
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      advanceThroughPreMatch(match, io)
    })

    describe('ball out of bounds', () => {
      it('resets ball to centre and emits ballOutOfBounds event when ball crosses touchline', () => {
        match.ball.position = { x: 100, y: 0.2, z: 0 }
        ;(match as any).tick()

        expect(match.ball.position).toEqual({ x: 0, y: 0, z: 0 })
        const emitCalls = (io.to('ROOM01').emit as any).mock.calls
        const outCall = emitCalls.find(
          (call: any[]) => call[0] === 'game:event' && call[1]?.type === 'ballOutOfBounds',
        )
        expect(outCall).toBeDefined()
      })

      it('resets ball to centre when ball crosses goal line wide of goal', () => {
        match.ball.position = { x: 10, y: 0.2, z: 100 }
        ;(match as any).tick()

        expect(match.ball.position).toEqual({ x: 0, y: 0, z: 0 })
      })

      it('does not trigger when ball is within pitch boundaries', () => {
        match.ball.position = { x: 20, y: 0.2, z: 20 }
        ;(match as any).tick()

        expect(match.ball.position.x).toBe(20)
      })
    })

    describe('extended play (goal in flight at full-time)', () => {
      it('does not immediately end match when clock reaches 0 in secondHalf', () => {
        ;(match as any).phase = 'secondHalf'
        match.clock = TICK_S
        ;(match as any).tick()

        expect((match as any).extendedPlay).toBe(true)
        expect(match.phase).toBe('secondHalf')
        expect(match.clock).toBe(0)
      })

      it('counts a goal scored during extended play and ends match', () => {
        ;(match as any).phase = 'secondHalf'
        match.clock = TICK_S
        ;(match as any).tick()
        expect((match as any).extendedPlay).toBe(true)

        const goalPos = { x: 1, y: 0.2, z: 53.5 }
        match.ball.position = goalPos
        ;(match as any).lastTouch = { playerId: 'home-3', team: 'home' }
        ;(match as any).tick()

        expect(match.score.teamA).toBe(1)
        expect(match.phase).toBe('fulltime')
        expect(match.isRunning()).toBe(false)
      })

      it('ends match when ball goes out of bounds during extended play', () => {
        ;(match as any).phase = 'secondHalf'
        match.clock = TICK_S
        ;(match as any).tick()
        expect((match as any).extendedPlay).toBe(true)

        match.ball.position = { x: 100, y: 0.2, z: 0 }
        ;(match as any).tick()

        expect(match.phase).toBe('fulltime')
        expect(match.isRunning()).toBe(false)
      })

      it('emits fulltime event when extended play ends on out-of-bounds', () => {
        ;(match as any).phase = 'secondHalf'
        match.clock = TICK_S
        ;(match as any).tick()

        match.ball.position = { x: 100, y: 0.2, z: 0 }
        ;(match as any).tick()

        const emitCalls = (io.to('ROOM01').emit as any).mock.calls
        const fulltimeCall = emitCalls.find(
          (call: any[]) => call[0] === 'game:event' && call[1]?.type === 'fulltime',
        )
        expect(fulltimeCall).toBeDefined()
        expect(fulltimeCall[1].score).toEqual({ teamA: 0, teamB: 0 })
      })

      it('does not affect firstHalf when clock reaches 0', () => {
        match.clock = TICK_S
        ;(match as any).tick()

        expect(match.phase).toBe('halftime')
        expect((match as any).extendedPlay).toBe(false)
      })
    })

    describe('no double-counted goals', () => {
      it('goalCooldown prevents immediate second goal detection', () => {
        ;(match as any).goalCooldown = true
        const goalPos = { x: 1, y: 0.2, z: 53.5 }
        match.ball.position = goalPos

        const goal = (match as any).checkGoal?.((match as any).ball.position, (match as any).lastTouch)
        const directCheck = typeof goal === 'undefined'

        const callCountBefore = (io.to('ROOM01').emit as any).mock.calls.length
        ;(match as any).tick()
        const callCountAfter = (io.to('ROOM01').emit as any).mock.calls.length

        expect(match.score.teamA).toBe(0)
      })

      it('goalCooldown is set after awardGoal', () => {
        const goal = { team: 'home' as const, scorer: 'home-3', isOwnGoal: false, side: 'positive' as const }
        ;(match as any).awardGoal(goal)
        expect((match as any).goalCooldown).toBe(true)
      })

      it('goalCooldown is cleared after kickoff', () => {
        const goal = { team: 'home' as const, scorer: 'home-3', isOwnGoal: false, side: 'positive' as const }
        ;(match as any).awardGoal(goal)
        expect((match as any).goalCooldown).toBe(true)

        for (let i = 0; i < 3 * 60; i++) {
          ;(match as any).tick()
        }

        expect((match as any).goalCooldown).toBe(false)
      })
    })

    describe('match start guard', () => {
      it('prevents preMatch transition when a player is disconnected', () => {
        const freshMatch = new Match(io, 'ROOM01', defaultConfig(), 'host-id', 'guest-id')
        ;(freshMatch as any).disconnectedPlayers.add('host-id')
        ;(freshMatch as any).tick()
        expect(freshMatch.phase).toBe('preMatch')
      })

      it('allows preMatch transition when no players are disconnected', () => {
        const freshMatch = new Match(io, 'ROOM01', defaultConfig(), 'host-id', 'guest-id')
        advanceThroughPreMatch(freshMatch, io)
        expect(freshMatch.phase).toBe('firstHalf')
      })

      it('pauses countdown when player disconnects mid-countdown', () => {
        const freshMatch = new Match(io, 'ROOM01', defaultConfig(), 'host-id', 'guest-id')
        const preMatchCountdown = (freshMatch as any).preMatchCountdown
        ;(freshMatch as any).disconnectedPlayers.add('host-id')
        ;(freshMatch as any).tick()
        expect((freshMatch as any).preMatchCountdown).toBe(preMatchCountdown)
      })
    })
  })
})
