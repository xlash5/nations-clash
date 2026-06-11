import { describe, it, expect, beforeEach } from 'vitest'
import { createRoom, joinRoom, toggleReady, removePlayer, getRoom, __resetRoomsForTest } from './rooms.js'

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
})
