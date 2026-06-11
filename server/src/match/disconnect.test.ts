import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Server } from 'socket.io'
import { Match } from './Match.js'
import { DISCONNECT_TIMEOUT, TICK_S } from '../../../shared/types.js'
import type { MatchConfig } from '../../../shared/types.js'

function createMockIo(): Server {
  const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as unknown as Server
  return io
}

function defaultConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return { mode: 'time', duration: 120, goalsToWin: 5, ...overrides }
}

function advanceThroughPreMatch(match: Match): void {
  while ((match as any).phase === 'preMatch') {
    ;(match as any).tick()
  }
}

describe('disconnect handling', () => {
  let io: Server
  let match: Match

  beforeEach(() => {
    io = createMockIo()
    match = new Match(io, 'ROOM01', defaultConfig(), 'host-id', 'guest-id')
    advanceThroughPreMatch(match)
  })

  it('onPlayerDisconnect marks player as disconnected', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    expect((match as any).disconnectedPlayers.has('host-id')).toBe(true)
  })

  it('onPlayerDisconnect pauses the match', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    expect((match as any).paused).toBe(true)
  })

  it('onPlayerDisconnect starts a disconnect timer', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    const timer = (match as any).disconnectTimers.get('host-id')
    expect(timer).toBeCloseTo(DISCONNECT_TIMEOUT, 5)
  })

  it('onPlayerDisconnect emits player_disconnected event to opponent', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    expect(io.to('ROOM01').emit).toHaveBeenCalledWith('game:event', {
      type: 'player_disconnected',
      playerId: 'host-id',
      timeoutMs: DISCONNECT_TIMEOUT * 1000,
    })
  })

  it('paused tick does not advance the game clock', () => {
    const clockBefore = match.clock
    ;(match as any).onPlayerDisconnect('host-id')
    ;(match as any).tick()
    expect(match.clock).toBe(clockBefore)
  })

  it('paused tick decrements the disconnect timer', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    const before = (match as any).disconnectTimers.get('host-id')
    ;(match as any).tick()
    const after = (match as any).disconnectTimers.get('host-id')
    expect(after).toBeCloseTo(before - TICK_S, 5)
  })

  it('onPlayerReconnect clears the disconnected state', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    ;(match as any).onPlayerReconnect('host-id')
    expect((match as any).disconnectedPlayers.has('host-id')).toBe(false)
    expect((match as any).paused).toBe(false)
  })

  it('onPlayerReconnect cancels the disconnect timer', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    ;(match as any).onPlayerReconnect('host-id')
    expect((match as any).disconnectTimers.has('host-id')).toBe(false)
  })

  it('onPlayerReconnect emits player_reconnected event', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    ;(match as any).onPlayerReconnect('host-id')
    expect(io.to('ROOM01').emit).toHaveBeenCalledWith('game:event', {
      type: 'player_reconnected',
      playerId: 'host-id',
    })
  })

  it('onPlayerReconnect with unknown playerId does nothing', () => {
    ;(match as any).onPlayerReconnect('unknown-id')
    expect((match as any).disconnectedPlayers.size).toBe(0)
    expect((match as any).paused).toBe(false)
  })

  it('timer expiring emits fulltime with opponent as winner', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    const ticks = Math.ceil(DISCONNECT_TIMEOUT / TICK_S)
    for (let i = 0; i < ticks; i++) {
      ;(match as any).tick()
    }

    expect(match.phase).toBe('fulltime')
    const fulltimeCalls = (io.to('ROOM01').emit as any).mock.calls.filter(
      (call: any[]) => call[0] === 'game:event' && call[1]?.type === 'fulltime',
    )
    expect(fulltimeCalls.length).toBeGreaterThanOrEqual(1)
    const call = fulltimeCalls[fulltimeCalls.length - 1]
    expect(call[1].winner).toBe('away')
  })

  it('timer expiring stops the match', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    const ticks = Math.ceil(DISCONNECT_TIMEOUT / TICK_S)
    for (let i = 0; i < ticks; i++) {
      ;(match as any).tick()
    }
    expect(match.isRunning()).toBe(false)
  })

  it('disconnect during fulltime phase does nothing', () => {
    match.phase = 'fulltime'
    ;(match as any).onPlayerDisconnect('host-id')
    expect((match as any).disconnectedPlayers.size).toBe(0)
    expect((match as any).paused).toBe(false)
  })

  it('disconnect during preMatch pauses match', () => {
    const preMatchMatch = new Match(io, 'ROOM02', defaultConfig(), 'host-id', 'guest-id')
    ;(preMatchMatch as any).onPlayerDisconnect('host-id')
    expect((preMatchMatch as any).paused).toBe(true)
  })

  it('updatePlayerId transfers disconnect state to new ID', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    ;(match as any).updatePlayerId('host-id', 'new-host-id')
    expect((match as any).disconnectedPlayers.has('new-host-id')).toBe(true)
    expect((match as any).disconnectedPlayers.has('host-id')).toBe(false)
    expect((match as any).disconnectTimers.has('new-host-id')).toBe(true)
    expect((match as any).disconnectTimers.has('host-id')).toBe(false)
  })

  it('updatePlayerId transfers inputs to new ID', () => {
    match.handleInput('old-id', {
      up: true, down: false, left: false, right: false,
      sprint: false, shoot: false, pass: false,
      tackle: false, slideTackle: false, switchPlayer: false,
    })
    ;(match as any).updatePlayerId('old-id', 'new-id')
    expect((match as any).inputs.has('new-id')).toBe(true)
    expect((match as any).inputs.has('old-id')).toBe(false)
  })

  it('disconnecting the guest player sets host as winner', () => {
    ;(match as any).onPlayerDisconnect('guest-id')
    const ticks = Math.ceil(DISCONNECT_TIMEOUT / TICK_S)
    for (let i = 0; i < ticks; i++) {
      ;(match as any).tick()
    }

    const fulltimeCalls = (io.to('ROOM01').emit as any).mock.calls.filter(
      (call: any[]) => call[0] === 'game:event' && call[1]?.type === 'fulltime',
    )
    const call = fulltimeCalls[fulltimeCalls.length - 1]
    expect(call[1].winner).toBe('home')
  })

  it('reconnecting before timer expiry prevents fulltime', () => {
    ;(match as any).onPlayerDisconnect('host-id')
    const halfTicks = Math.ceil(DISCONNECT_TIMEOUT / TICK_S / 2)
    for (let i = 0; i < halfTicks; i++) {
      ;(match as any).tick()
    }
    ;(match as any).onPlayerReconnect('host-id')

    const remainingTicks = Math.ceil(DISCONNECT_TIMEOUT / TICK_S)
    for (let i = 0; i < remainingTicks; i++) {
      ;(match as any).tick()
    }

    expect(match.phase).not.toBe('fulltime')
  })
})
