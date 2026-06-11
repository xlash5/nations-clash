import { describe, it, expect } from 'vitest'
import {
  checkPlayerBallCollision,
  resolvePlayerBallCollision,
  checkBallGoalCollision,
  checkGoalScored,
  resolvePlayerPlayerCollision,
  findNearestPlayer,
  PLAYER_RADIUS,
  GOAL_WIDTH,
  GOAL_HEIGHT,
  PITCH_HALF_LENGTH,
  DRIBBLE_OFFSET,
} from './collision.js'
import { BALL_RADIUS } from './physics.js'

function pos(x: number, y: number, z: number) {
  return { x, y, z }
}

function vel(x: number, y: number, z: number) {
  return { x, y, z }
}

describe('checkPlayerBallCollision', () => {
  it('returns collided=true when ball overlaps player', () => {
    const playerPos = pos(0, 0, 0)
    const ballPos = pos(PLAYER_RADIUS, 0, 0)
    const result = checkPlayerBallCollision(playerPos, ballPos)
    expect(result.collided).toBe(true)
    expect(result.penetration).toBeGreaterThan(0)
    expect(result.normal.x).toBeGreaterThan(0)
  })

  it('returns collided=false when ball is far from player', () => {
    const playerPos = pos(0, 0, 0)
    const ballPos = pos(10, 0, 0)
    const result = checkPlayerBallCollision(playerPos, ballPos)
    expect(result.collided).toBe(false)
  })

  it('returns collided=false when ball just touching player (no overlap)', () => {
    const playerPos = pos(0, 0, 0)
    const dist = PLAYER_RADIUS + BALL_RADIUS
    const ballPos = pos(dist, 0, 0)
    const result = checkPlayerBallCollision(playerPos, ballPos)
    expect(result.collided).toBe(false)
  })

  it('returns collision normal pointing from player to ball', () => {
    const playerPos = pos(0, 0, 0)
    const ballPos = pos(PLAYER_RADIUS, 0, PLAYER_RADIUS)
    const result = checkPlayerBallCollision(playerPos, ballPos)
    expect(result.collided).toBe(true)
    expect(result.normal.x).toBeGreaterThan(0)
    expect(result.normal.z).toBeGreaterThan(0)
  })

  it('handles ball directly above player', () => {
    const playerPos = pos(0, 0, 0)
    const ballPos = pos(0, PLAYER_RADIUS, 0)
    const result = checkPlayerBallCollision(playerPos, ballPos)
    expect(result.collided).toBe(true)
    expect(result.normal.y).toBeGreaterThan(0)
  })
})

describe('resolvePlayerBallCollision', () => {
  it('attaches ball near player feet when player has ball (dribble)', () => {
    const ball = { position: pos(5, 1, 5), velocity: vel(10, 0, 0) }
    const collision = { normal: pos(1, 0, 0), penetration: 0.1 }
    const playerPos = pos(0, 0, 0)
    const result = resolvePlayerBallCollision(ball, collision, true, playerPos)
    expect(result.position.x).toBe(0)
    expect(result.position.z).toBe(DRIBBLE_OFFSET)
    expect(result.position.y).toBe(BALL_RADIUS)
    expect(result.velocity.x).toBe(0)
    expect(result.velocity.z).toBe(0)
  })

  it('deflects ball away from player when player does not have ball', () => {
    const ball = { position: pos(0.6, 0, 0), velocity: vel(-5, 0, 0) }
    const playerPos = pos(0, 0, 0)
    const collision = checkPlayerBallCollision(playerPos, ball.position)
    const result = resolvePlayerBallCollision(ball, collision, false, playerPos)
    expect(result.velocity.x).toBeGreaterThan(0)
  })

  it('does not change velocity if ball is moving away from player', () => {
    const ball = { position: pos(0.6, 0, 0), velocity: vel(5, 0, 0) }
    const playerPos = pos(0, 0, 0)
    const collision = checkPlayerBallCollision(playerPos, ball.position)
    const result = resolvePlayerBallCollision(ball, collision, false, playerPos)
    expect(result.velocity.x).toBe(5)
  })
})

describe('checkBallGoalCollision', () => {
  it('detects collision with left post', () => {
    const postX = -GOAL_WIDTH / 2
    const ballPos = pos(postX, 1, PITCH_HALF_LENGTH + 0.5)
    const result = checkBallGoalCollision(ballPos)
    expect(result.collided).toBe(true)
  })

  it('detects collision with right post', () => {
    const postX = GOAL_WIDTH / 2
    const ballPos = pos(postX, 1, PITCH_HALF_LENGTH + 0.5)
    const result = checkBallGoalCollision(ballPos)
    expect(result.collided).toBe(true)
  })

  it('detects collision with crossbar', () => {
    const ballPos = pos(0, GOAL_HEIGHT, PITCH_HALF_LENGTH + 0.5)
    const result = checkBallGoalCollision(ballPos)
    expect(result.collided).toBe(true)
  })

  it('returns false for ball at centre of pitch', () => {
    const ballPos = pos(0, BALL_RADIUS, 0)
    const result = checkBallGoalCollision(ballPos)
    expect(result.collided).toBe(false)
  })

  it('returns false for ball far from both goals', () => {
    const ballPos = pos(0, 1, 0)
    const result = checkBallGoalCollision(ballPos)
    expect(result.collided).toBe(false)
  })
})

describe('checkGoalScored', () => {
  it('returns true when ball crosses goal line within width and height', () => {
    const ballPos = pos(0, BALL_RADIUS, PITCH_HALF_LENGTH + 1)
    expect(checkGoalScored(ballPos)).toBe(true)
  })

  it('returns true when ball crosses goal line on other side', () => {
    const ballPos = pos(0, BALL_RADIUS, -PITCH_HALF_LENGTH - 1)
    expect(checkGoalScored(ballPos)).toBe(true)
  })

  it('returns false when ball is on the pitch', () => {
    const ballPos = pos(0, BALL_RADIUS, 0)
    expect(checkGoalScored(ballPos)).toBe(false)
  })

  it('returns false when ball is wide of goal', () => {
    const ballPos = pos(GOAL_WIDTH, BALL_RADIUS, PITCH_HALF_LENGTH + 1)
    expect(checkGoalScored(ballPos)).toBe(false)
  })

  it('returns false when ball is above crossbar', () => {
    const ballPos = pos(0, GOAL_HEIGHT + 1, PITCH_HALF_LENGTH + 1)
    expect(checkGoalScored(ballPos)).toBe(false)
  })

  it('returns false when ball has not crossed the goal line', () => {
    const ballPos = pos(0, BALL_RADIUS, PITCH_HALF_LENGTH - 0.1)
    expect(checkGoalScored(ballPos)).toBe(false)
  })
})

describe('resolvePlayerPlayerCollision', () => {
  it('pushes overlapping players apart', () => {
    const p1Pos = pos(0, 0, 0)
    const p2Pos = pos(PLAYER_RADIUS * 0.5, 0, 0)
    const result = resolvePlayerPlayerCollision(p1Pos, p2Pos)
    expect(result.p1Pos.x).toBeLessThan(0)
    expect(result.p2Pos.x).toBeGreaterThan(p2Pos.x)
  })

  it('does not move non-overlapping players', () => {
    const p1Pos = pos(0, 0, 0)
    const p2Pos = pos(PLAYER_RADIUS * 3, 0, 0)
    const result = resolvePlayerPlayerCollision(p1Pos, p2Pos)
    expect(result.p1Pos.x).toBe(0)
    expect(result.p2Pos.x).toBe(PLAYER_RADIUS * 3)
  })

  it('separates players along Z axis', () => {
    const p1Pos = pos(0, 0, 0)
    const p2Pos = pos(0, 0, PLAYER_RADIUS * 0.5)
    const result = resolvePlayerPlayerCollision(p1Pos, p2Pos)
    expect(result.p1Pos.z).toBeLessThan(0)
    expect(result.p2Pos.z).toBeGreaterThan(p2Pos.z)
  })

  it('does not change Y position', () => {
    const p1Pos = pos(0, 2, 0)
    const p2Pos = pos(PLAYER_RADIUS * 0.5, 2, 0)
    const result = resolvePlayerPlayerCollision(p1Pos, p2Pos)
    expect(result.p1Pos.y).toBe(2)
    expect(result.p2Pos.y).toBe(2)
  })
})

describe('findNearestPlayer', () => {
  it('returns the closest player to the ball', () => {
    const players = [
      { position: pos(10, 0, 0), hasBall: false },
      { position: pos(2, 0, 0), hasBall: false },
      { position: pos(5, 0, 0), hasBall: false },
    ]
    const ballPos = pos(0, 0, 0)
    const result = findNearestPlayer(players, ballPos)
    expect(result).not.toBeNull()
    expect(result!.player.position.x).toBe(2)
  })

  it('returns null for empty players array', () => {
    const result = findNearestPlayer([], pos(0, 0, 0))
    expect(result).toBeNull()
  })
})
