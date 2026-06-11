import { describe, it, expect, beforeEach } from 'vitest'
import { createRoom, joinRoom, toggleReady, removePlayer, getRoom, selectTeam, areBothTeamsSelected, getTeamSelection, assignHomeAway, selectFormation, areBothFormationsSelected, getFormationSelection, __resetRoomsForTest } from './rooms.js'

describe('rooms', () => {
  beforeEach(() => {
    __resetRoomsForTest()
  })

  it('createRoom returns a unique 6-character code', () => {
    const code = createRoom()
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[A-Z0-9]+$/)
  })

  it('createRoom generates unique codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => createRoom()))
    expect(codes.size).toBe(50)
  })

  it('joinRoom with valid code succeeds', () => {
    const code = createRoom()
    const room = joinRoom(code, 'player-1')
    expect(room.players.has('player-1')).toBe(true)
  })

  it('joinRoom with invalid code throws', () => {
    expect(() => joinRoom('XXXXXX', 'player-1')).toThrow('Room not found')
  })

  it('two players can join the same room', () => {
    const code = createRoom()
    joinRoom(code, 'player-1')
    joinRoom(code, 'player-2')
    const room = getRoom(code)!
    expect(room.players.size).toBe(2)
  })

  it('third player cannot join a full room', () => {
    const code = createRoom()
    joinRoom(code, 'player-1')
    joinRoom(code, 'player-2')
    expect(() => joinRoom(code, 'player-3')).toThrow('Room is full')
  })

  it('toggleReady flips ready state', () => {
    const code = createRoom()
    joinRoom(code, 'player-1')
    const room1 = toggleReady(code, 'player-1')
    expect(room1.players.get('player-1')!.ready).toBe(true)
    const room2 = toggleReady(code, 'player-1')
    expect(room2.players.get('player-1')!.ready).toBe(false)
  })

  it('disconnecting player is removed', () => {
    const code = createRoom()
    joinRoom(code, 'player-1')
    joinRoom(code, 'player-2')
    const { room } = removePlayer(code, 'player-1')
    expect(room!.players.has('player-1')).toBe(false)
    expect(room!.players.has('player-2')).toBe(true)
  })

  it('room destroyed when empty after disconnect', () => {
    const code = createRoom()
    joinRoom(code, 'player-1')
    const { wasLastPlayer } = removePlayer(code, 'player-1')
    expect(wasLastPlayer).toBe(true)
    expect(getRoom(code)).toBeUndefined()
  })

  describe('team selection', () => {
    it('selectTeam stores team ID per player', () => {
      const code = createRoom()
      joinRoom(code, 'player-1')
      joinRoom(code, 'player-2')
      selectTeam(code, 'player-1', 'england')
      expect(getTeamSelection(code, 'player-1')!.teamId).toBe('england')
    })

    it('selectTeam throws for invalid room', () => {
      expect(() => selectTeam('XXXXXX', 'player-1', 'england')).toThrow('Room not found')
    })

    it('selectTeam throws for player not in room', () => {
      const code = createRoom()
      joinRoom(code, 'player-1')
      expect(() => selectTeam(code, 'player-3', 'england')).toThrow('Player not in room')
    })

    it('areBothTeamsSelected returns false when only one player selected', () => {
      const code = createRoom()
      joinRoom(code, 'player-1')
      joinRoom(code, 'player-2')
      selectTeam(code, 'player-1', 'england')
      expect(areBothTeamsSelected(code)).toBe(false)
    })

    it('areBothTeamsSelected returns true when both players selected', () => {
      const code = createRoom()
      joinRoom(code, 'player-1')
      joinRoom(code, 'player-2')
      selectTeam(code, 'player-1', 'england')
      selectTeam(code, 'player-2', 'brazil')
      expect(areBothTeamsSelected(code)).toBe(true)
    })

    it('areBothTeamsSelected returns false for non-existent room', () => {
      expect(areBothTeamsSelected('XXXXXX')).toBe(false)
    })

    it('assignHomeAway returns deterministic assignments', () => {
      const code = createRoom()
      joinRoom(code, 'player-1')
      joinRoom(code, 'player-2')
      selectTeam(code, 'player-1', 'england')
      selectTeam(code, 'player-2', 'brazil')
      const [home, away] = assignHomeAway(code)
      expect(home.side).toBe('home')
      expect(away.side).toBe('away')
      expect(home.playerId).toBeTruthy()
      expect(away.playerId).toBeTruthy()
      expect(home.teamId).toBeTruthy()
      expect(away.teamId).toBeTruthy()
    })

    it('assignHomeAway is consistent (same code → same result)', () => {
      const code = createRoom()
      joinRoom(code, 'player-1')
      joinRoom(code, 'player-2')
      selectTeam(code, 'player-1', 'england')
      selectTeam(code, 'player-2', 'brazil')
      const [r1] = assignHomeAway(code)
      const [r2] = assignHomeAway(code)
      expect(r1.playerId).toBe(r2.playerId)
      expect(r1.side).toBe(r2.side)
    })

    it('assignHomeAway throws for non-existent room', () => {
      expect(() => assignHomeAway('XXXXXX')).toThrow('Room not found')
    })

    it('getTeamSelection returns undefined for non-existent room', () => {
      expect(getTeamSelection('XXXXXX', 'p1')).toBeUndefined()
    })
  })

  describe('formation selection', () => {
    it('selectFormation stores formation per player', () => {
      const code = createRoom()
      joinRoom(code, 'player-1')
      joinRoom(code, 'player-2')
      selectFormation(code, 'player-1', '4-3-3')
      expect(getFormationSelection(code, 'player-1')!.formation).toBe('4-3-3')
    })

    it('selectFormation throws for invalid room', () => {
      expect(() => selectFormation('XXXXXX', 'player-1', '4-4-2')).toThrow('Room not found')
    })

    it('selectFormation throws for player not in room', () => {
      const code = createRoom()
      joinRoom(code, 'player-1')
      expect(() => selectFormation(code, 'player-3', '4-4-2')).toThrow('Player not in room')
    })

    it('areBothFormationsSelected returns false when only one player selected', () => {
      const code = createRoom()
      joinRoom(code, 'player-1')
      joinRoom(code, 'player-2')
      selectFormation(code, 'player-1', '4-3-3')
      expect(areBothFormationsSelected(code)).toBe(false)
    })

    it('areBothFormationsSelected returns true when both players selected', () => {
      const code = createRoom()
      joinRoom(code, 'player-1')
      joinRoom(code, 'player-2')
      selectFormation(code, 'player-1', '4-3-3')
      selectFormation(code, 'player-2', '4-4-2')
      expect(areBothFormationsSelected(code)).toBe(true)
    })

    it('areBothFormationsSelected returns false for non-existent room', () => {
      expect(areBothFormationsSelected('XXXXXX')).toBe(false)
    })

    it('getFormationSelection returns undefined for non-existent room', () => {
      expect(getFormationSelection('XXXXXX', 'p1')).toBeUndefined()
    })
  })
})
