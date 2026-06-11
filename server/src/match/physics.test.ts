import { describe, it, expect } from 'vitest'
import {
  applyGravity,
  applyAirResistance,
  applyRollingFriction,
  applySpin,
  bounce,
  clampToGround,
  isOnGround,
  updatePosition,
  kick,
  tickPhysics,
  GRAVITY,
  BALL_RADIUS,
  AIR_RESISTANCE,
  ROLLING_FRICTION_DECEL,
  RESTITUTION,
  MAGNUS_FACTOR,
  type BallPhysics,
} from './physics.js'

function makeBall(overrides: Partial<BallPhysics> = {}): BallPhysics {
  return {
    position: { x: 0, y: BALL_RADIUS, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    spin: { x: 0, y: 0, z: 0 },
    ...overrides,
  }
}

const DT = 1 / 60

describe('applyGravity', () => {
  it('reduces y-velocity by gravity * dt', () => {
    const ball = makeBall({ velocity: { x: 0, y: 5, z: 0 } })
    const result = applyGravity(ball, DT)
    expect(result.velocity.y).toBeCloseTo(5 - GRAVITY * DT, 10)
  })

  it('does not affect x or z velocity', () => {
    const ball = makeBall({ velocity: { x: 3, y: 0, z: 4 } })
    const result = applyGravity(ball, DT)
    expect(result.velocity.x).toBe(3)
    expect(result.velocity.z).toBe(4)
  })

  it('does not affect position', () => {
    const ball = makeBall({ position: { x: 1, y: 10, z: 2 } })
    const result = applyGravity(ball, DT)
    expect(result.position).toEqual({ x: 1, y: 10, z: 2 })
  })
})

describe('applyAirResistance', () => {
  it('reduces all velocity components by drag factor', () => {
    const ball = makeBall({ velocity: { x: 10, y: 5, z: 8 } })
    const result = applyAirResistance(ball, DT)
    const factor = 1 - AIR_RESISTANCE * DT
    expect(result.velocity.x).toBeCloseTo(10 * factor, 10)
    expect(result.velocity.y).toBeCloseTo(5 * factor, 10)
    expect(result.velocity.z).toBeCloseTo(8 * factor, 10)
  })

  it('does not affect position or spin', () => {
    const ball = makeBall({
      position: { x: 1, y: 2, z: 3 },
      spin: { x: 0.1, y: 0.2, z: 0.3 },
    })
    const result = applyAirResistance(ball, DT)
    expect(result.position).toEqual({ x: 1, y: 2, z: 3 })
    expect(result.spin).toEqual({ x: 0.1, y: 0.2, z: 0.3 })
  })

  it('does not affect a stationary ball', () => {
    const ball = makeBall({ velocity: { x: 0, y: 0, z: 0 } })
    const result = applyAirResistance(ball, DT)
    expect(result.velocity).toEqual({ x: 0, y: 0, z: 0 })
  })
})

describe('applyRollingFriction', () => {
  it('reduces horizontal speed by decel * dt', () => {
    const ball = makeBall({ velocity: { x: 10, y: 0, z: 0 } })
    const result = applyRollingFriction(ball, DT)
    const expectedSpeed = Math.max(0, 10 - ROLLING_FRICTION_DECEL * DT)
    expect(result.velocity.x).toBeCloseTo(expectedSpeed, 10)
    expect(result.velocity.z).toBe(0)
  })

  it('reduces both horizontal components proportionally', () => {
    const ball = makeBall({ velocity: { x: 3, y: 0, z: 4 } })
    const result = applyRollingFriction(ball, DT)
    const originalSpeed = 5
    const newSpeed = Math.max(0, originalSpeed - ROLLING_FRICTION_DECEL * DT)
    const scale = newSpeed / originalSpeed
    expect(result.velocity.x).toBeCloseTo(3 * scale, 10)
    expect(result.velocity.z).toBeCloseTo(4 * scale, 10)
  })

  it('clamps to zero when decel exceeds speed', () => {
    const ball = makeBall({ velocity: { x: 0.01, y: 0, z: 0 } })
    const result = applyRollingFriction(ball, DT)
    expect(result.velocity.x).toBe(0)
  })

  it('does not affect y-velocity', () => {
    const ball = makeBall({ velocity: { x: 5, y: 3, z: 0 } })
    const result = applyRollingFriction(ball, DT)
    expect(result.velocity.y).toBe(3)
  })
})

describe('applySpin', () => {
  it('applies Magnus force perpendicular to spin and velocity', () => {
    const ball = makeBall({
      velocity: { x: 10, y: 0, z: 0 },
      spin: { x: 0, y: 1, z: 0 },
    })
    const result = applySpin(ball, DT)
    const expectedZ = -10 * 1 * MAGNUS_FACTOR * DT
    expect(result.velocity.x).toBeCloseTo(10, 10)
    expect(result.velocity.z).toBeCloseTo(expectedZ, 10)
  })

  it('does nothing when velocity is zero', () => {
    const ball = makeBall({
      velocity: { x: 0, y: 0, z: 0 },
      spin: { x: 1, y: 0, z: 0 },
    })
    const result = applySpin(ball, DT)
    expect(result.velocity).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('does nothing when spin is zero', () => {
    const ball = makeBall({ velocity: { x: 10, y: 0, z: 0 } })
    const result = applySpin(ball, DT)
    expect(result.velocity).toEqual({ x: 10, y: 0, z: 0 })
  })
})

describe('bounce', () => {
  it('reflects y-velocity with restitution', () => {
    const ball = makeBall({
      position: { x: 0, y: BALL_RADIUS, z: 0 },
      velocity: { x: 5, y: -10, z: 0 },
    })
    const result = bounce(ball, BALL_RADIUS)
    expect(result.velocity.y).toBeCloseTo(10 * RESTITUTION, 10)
    expect(result.velocity.x).toBe(5)
    expect(result.velocity.z).toBe(0)
  })

  it('clamps position y to ground level', () => {
    const ball = makeBall({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: -5, z: 0 },
    })
    const result = bounce(ball, BALL_RADIUS)
    expect(result.position.y).toBe(BALL_RADIUS)
  })
})

describe('clampToGround', () => {
  it('does not modify ball above ground', () => {
    const ball = makeBall({ position: { x: 0, y: 5, z: 0 } })
    const result = clampToGround(ball)
    expect(result.position.y).toBe(5)
  })

  it('clamps ball below ground to BALL_RADIUS', () => {
    const ball = makeBall({ position: { x: 0, y: -1, z: 0 } })
    const result = clampToGround(ball)
    expect(result.position.y).toBe(BALL_RADIUS)
  })

  it('does not change other position components', () => {
    const ball = makeBall({ position: { x: 10, y: -5, z: 20 } })
    const result = clampToGround(ball)
    expect(result.position.x).toBe(10)
    expect(result.position.z).toBe(20)
  })
})

describe('isOnGround', () => {
  it('returns true when ball.y equals BALL_RADIUS', () => {
    expect(isOnGround(makeBall({ position: { x: 0, y: BALL_RADIUS, z: 0 } }))).toBe(true)
  })

  it('returns true when ball.y is below BALL_RADIUS', () => {
    expect(isOnGround(makeBall({ position: { x: 0, y: BALL_RADIUS - 1, z: 0 } }))).toBe(true)
  })

  it('returns false when ball.y is above BALL_RADIUS', () => {
    expect(isOnGround(makeBall({ position: { x: 0, y: BALL_RADIUS + 1, z: 0 } }))).toBe(false)
  })
})

describe('updatePosition', () => {
  it('moves ball by velocity * dt', () => {
    const ball = makeBall({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 10, y: 5, z: 2 },
    })
    const result = updatePosition(ball, DT)
    expect(result.position.x).toBeCloseTo(10 * DT, 10)
    expect(result.position.y).toBeCloseTo(5 * DT, 10)
    expect(result.position.z).toBeCloseTo(2 * DT, 10)
  })

  it('does not change velocity or spin', () => {
    const ball = makeBall({
      velocity: { x: 3, y: 0, z: 4 },
      spin: { x: 0.1, y: 0, z: 0 },
    })
    const result = updatePosition(ball, DT)
    expect(result.velocity).toEqual({ x: 3, y: 0, z: 4 })
    expect(result.spin).toEqual({ x: 0.1, y: 0, z: 0 })
  })
})

describe('kick', () => {
  it('applies impulse in direction scaled by power', () => {
    const ball = makeBall()
    const direction = { x: 1, y: 0, z: 0 }
    const result = kick(ball, direction, 0.5)
    expect(result.velocity.x).toBeCloseTo(0.5 * 30, 10)
    expect(result.velocity.y).toBe(0)
    expect(result.velocity.z).toBe(0)
  })

  it('applies spin perpendicular to kick direction', () => {
    const ball = makeBall()
    const result = kick(ball, { x: 0, y: 0, z: 1 }, 1)
    expect(result.spin.x).toBeGreaterThan(0)
    expect(result.spin.z).toBeCloseTo(0, 10)
  })
})

describe('tickPhysics', () => {
  it('applies gravity to an airborne ball', () => {
    const ball = makeBall({
      position: { x: 0, y: 10, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    })
    const result = tickPhysics(ball, DT)
    expect(result.velocity.y).toBeLessThan(0)
  })

  it('keeps a stationary ball on the ground', () => {
    const ball = makeBall()
    const result = tickPhysics(ball, DT)
    expect(result.position.y).toBe(BALL_RADIUS)
    expect(result.velocity.x).toBe(0)
    expect(result.velocity.z).toBe(0)
  })

  it('applies air resistance when ball is airborne', () => {
    const ball = makeBall({
      position: { x: 0, y: 10, z: 0 },
      velocity: { x: 20, y: 5, z: 0 },
    })
    const result = tickPhysics(ball, DT)
    const drag = 1 - AIR_RESISTANCE * DT
    expect(result.velocity.x).toBeLessThan(20)
    expect(result.velocity.x).toBeCloseTo(20 * drag, 1)
  })

  it('applies rolling friction when ball is on ground', () => {
    const ball = makeBall({
      position: { x: 0, y: BALL_RADIUS, z: 0 },
      velocity: { x: 15, y: 0, z: 0 },
    })
    const result = tickPhysics(ball, DT)
    const expected = Math.max(0, 15 - ROLLING_FRICTION_DECEL * DT)
    expect(result.velocity.x).toBeCloseTo(expected, 10)
  })

  it('bounces when landing on ground from air', () => {
    const ball = makeBall({
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: -5, z: 0 },
    })
    const result = tickPhysics(ball, DT * 60)
    expect(result.position.y).toBeGreaterThanOrEqual(BALL_RADIUS)
  })

  it('does not go below ground level', () => {
    const ball = makeBall({
      position: { x: 0, y: BALL_RADIUS + 10, z: 0 },
      velocity: { x: 0, y: -100, z: 0 },
    })
    let current = ball
    for (let i = 0; i < 200; i++) {
      current = tickPhysics(current, DT)
      expect(current.position.y).toBeGreaterThanOrEqual(BALL_RADIUS - 0.001)
    }
  })

  it('eventually stops a rolling ball due to friction', () => {
    const ball = makeBall({
      position: { x: 0, y: BALL_RADIUS, z: 0 },
      velocity: { x: 10, y: 0, z: 0 },
    })
    let current = ball
    for (let i = 0; i < 300; i++) {
      current = tickPhysics(current, DT)
    }
    expect(Math.abs(current.velocity.x)).toBeLessThan(0.01)
    expect(Math.abs(current.velocity.z)).toBeLessThan(0.01)
  })

  it('does not spin a ball with no spin', () => {
    const ball = makeBall({
      position: { x: 0, y: 10, z: 0 },
      velocity: { x: 20, y: 0, z: 0 },
    })
    const result = tickPhysics(ball, DT)
    expect(result.velocity.z).toBe(0)
  })

  it('curves trajectory when spin is applied', () => {
    const ball = makeBall({
      position: { x: 0, y: 50, z: 0 },
      velocity: { x: 10, y: 0, z: 0 },
      spin: { x: 0, y: 1, z: 0 },
    })
    let current = ball
    for (let i = 0; i < 180; i++) {
      current = tickPhysics(current, DT)
    }
    expect(Math.abs(current.position.z)).toBeGreaterThan(0.05)
  })
})
