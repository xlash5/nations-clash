import { describe, it, expect } from 'vitest'
import { checkGoal } from './goalDetection.js'
import { PITCH_HALF_LENGTH, GOAL_WIDTH, GOAL_HEIGHT } from './collision.js'

function pos(x: number, y: number, z: number) {
  return { x, y, z }
}

describe('checkGoal', () => {
  it('detects a goal when ball crosses goal line within width and height', () => {
    const ballPos = pos(0, 0.2, PITCH_HALF_LENGTH + 0.5)
    const lastTouch = { playerId: 'home-3', team: 'home' as const }
    const result = checkGoal(ballPos, lastTouch)
    expect(result).not.toBeNull()
    expect(result!.team).toBe('home')
    expect(result!.scorer).toBe('home-3')
    expect(result!.isOwnGoal).toBe(false)
  })

  it('detects a goal on the other side', () => {
    const ballPos = pos(0, 0.2, -PITCH_HALF_LENGTH - 0.5)
    const lastTouch = { playerId: 'away-4', team: 'away' as const }
    const result = checkGoal(ballPos, lastTouch)
    expect(result).not.toBeNull()
    expect(result!.team).toBe('away')
    expect(result!.scorer).toBe('away-4')
    expect(result!.isOwnGoal).toBe(false)
  })

  it('returns null when ball is above crossbar', () => {
    const ballPos = pos(0, GOAL_HEIGHT + 0.5, PITCH_HALF_LENGTH + 0.5)
    const result = checkGoal(ballPos, { playerId: 'home-3', team: 'home' })
    expect(result).toBeNull()
  })

  it('returns null when ball is wide of goal', () => {
    const ballPos = pos(GOAL_WIDTH / 2 + 0.5, 0.2, PITCH_HALF_LENGTH + 0.5)
    const result = checkGoal(ballPos, { playerId: 'home-3', team: 'home' })
    expect(result).toBeNull()
  })

  it('returns null when ball has not crossed the goal line', () => {
    const ballPos = pos(0, 0.2, PITCH_HALF_LENGTH - 0.1)
    const result = checkGoal(ballPos, { playerId: 'home-3', team: 'home' })
    expect(result).toBeNull()
  })

  it('returns null when ball is on the pitch centre', () => {
    const ballPos = pos(0, 0.2, 0)
    const result = checkGoal(ballPos, { playerId: 'home-3', team: 'home' })
    expect(result).toBeNull()
  })

  it('detects own goal when defending team touched last', () => {
    const ballPos = pos(-1, 0.2, PITCH_HALF_LENGTH + 0.5)
    const lastTouch = { playerId: 'away-5', team: 'away' as const }
    const result = checkGoal(ballPos, lastTouch)
    expect(result).not.toBeNull()
    expect(result!.team).toBe('home')
    expect(result!.scorer).toBeNull()
    expect(result!.isOwnGoal).toBe(true)
  })

  it('detects own goal on the other side', () => {
    const ballPos = pos(1, 0.2, -PITCH_HALF_LENGTH - 0.5)
    const lastTouch = { playerId: 'home-2', team: 'home' as const }
    const result = checkGoal(ballPos, lastTouch)
    expect(result).not.toBeNull()
    expect(result!.team).toBe('away')
    expect(result!.scorer).toBeNull()
    expect(result!.isOwnGoal).toBe(true)
  })

  it('handles no last touch (ball never touched by anyone)', () => {
    const ballPos = pos(0, 0.2, PITCH_HALF_LENGTH + 0.5)
    const result = checkGoal(ballPos, null)
    expect(result).not.toBeNull()
    expect(result!.scorer).toBeNull()
    expect(result!.isOwnGoal).toBe(false)
  })

  it('detects goal for home side with positive Z (home goal is at +z)', () => {
    const ballPos = pos(0, 0.2, PITCH_HALF_LENGTH + 0.5)
    const result = checkGoal(ballPos, { playerId: 'home-3', team: 'home' })
    expect(result!.team).toBe('home')
  })

  it('detects goal for away side with negative Z (away goal is at -z)', () => {
    const ballPos = pos(0, 0.2, -PITCH_HALF_LENGTH - 0.5)
    const result = checkGoal(ballPos, { playerId: 'away-3', team: 'away' })
    expect(result!.team).toBe('away')
  })

  it('returns null for ball before the goal line', () => {
    const ballPos = pos(0, 0.2, PITCH_HALF_LENGTH - 0.1)
    const result = checkGoal(ballPos, { playerId: 'home-3', team: 'home' })
    expect(result).toBeNull()
  })
})
