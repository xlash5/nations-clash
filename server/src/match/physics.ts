import type { Position } from '../../../shared/types.js'
import { TICK_S } from '../../../shared/types.js'
import type { Match } from './Match.js'

export interface BallPhysics {
  position: Position
  velocity: Position
  spin: Position
}

export const GRAVITY = 9.81
export const BALL_RADIUS = 0.22
export const AIR_RESISTANCE = 0.05
export const ROLLING_FRICTION_DECEL = 5.0
export const RESTITUTION = 0.5
export const MAGNUS_FACTOR = 0.003

export function applyGravity(ball: BallPhysics, dt: number): BallPhysics {
  return {
    ...ball,
    velocity: {
      ...ball.velocity,
      y: ball.velocity.y - GRAVITY * dt,
    },
  }
}

export function applyAirResistance(ball: BallPhysics, dt: number): BallPhysics {
  const drag = 1 - AIR_RESISTANCE * dt
  return {
    ...ball,
    velocity: {
      x: ball.velocity.x * drag,
      y: ball.velocity.y * drag,
      z: ball.velocity.z * drag,
    },
  }
}

export function applyRollingFriction(ball: BallPhysics, dt: number): BallPhysics {
  const hSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.z ** 2)
  if (hSpeed === 0) return ball

  const newHSpeed = Math.max(0, hSpeed - ROLLING_FRICTION_DECEL * dt)
  const scale = newHSpeed / hSpeed
  return {
    ...ball,
    velocity: {
      ...ball.velocity,
      x: ball.velocity.x * scale,
      z: ball.velocity.z * scale,
    },
  }
}

export function applySpin(ball: BallPhysics, dt: number): BallPhysics {
  const crossX = ball.spin.y * ball.velocity.z - ball.spin.z * ball.velocity.y
  const crossY = ball.spin.z * ball.velocity.x - ball.spin.x * ball.velocity.z
  const crossZ = ball.spin.x * ball.velocity.y - ball.spin.y * ball.velocity.x
  return {
    ...ball,
    velocity: {
      x: ball.velocity.x + crossX * MAGNUS_FACTOR * dt,
      y: ball.velocity.y + crossY * MAGNUS_FACTOR * dt,
      z: ball.velocity.z + crossZ * MAGNUS_FACTOR * dt,
    },
  }
}

export function bounce(ball: BallPhysics, groundY: number): BallPhysics {
  return {
    ...ball,
    position: { ...ball.position, y: groundY },
    velocity: { ...ball.velocity, y: -ball.velocity.y * RESTITUTION },
  }
}

export function clampToGround(ball: BallPhysics): BallPhysics {
  if (ball.position.y >= BALL_RADIUS) return ball
  return {
    ...ball,
    position: { ...ball.position, y: BALL_RADIUS },
  }
}

export function isOnGround(ball: BallPhysics): boolean {
  return ball.position.y <= BALL_RADIUS
}

export function updatePosition(ball: BallPhysics, dt: number): BallPhysics {
  return {
    ...ball,
    position: {
      x: ball.position.x + ball.velocity.x * dt,
      y: ball.position.y + ball.velocity.y * dt,
      z: ball.position.z + ball.velocity.z * dt,
    },
  }
}

export function kick(ball: BallPhysics, direction: Position, power: number): BallPhysics {
  const speed = power * 30
  return {
    ...ball,
    velocity: {
      x: direction.x * speed,
      y: direction.y * speed,
      z: direction.z * speed,
    },
    spin: {
      x: direction.z * speed * 0.01,
      y: 0,
      z: -direction.x * speed * 0.01,
    },
  }
}

export function tickPhysics(ball: BallPhysics, dt: number): BallPhysics {
  let next: BallPhysics = {
    position: { ...ball.position },
    velocity: { ...ball.velocity },
    spin: { ...ball.spin },
  }

  next = applyGravity(next, dt)

  if (isOnGround(next)) {
    next = clampToGround(next)
    next = applyRollingFriction(next, dt)
  } else {
    next = applyAirResistance(next, dt)
    next = applySpin(next, dt)
  }

  next = updatePosition(next, dt)

  if (next.position.y < BALL_RADIUS) {
    if (ball.position.y > BALL_RADIUS) {
      next = bounce(next, BALL_RADIUS)
    } else {
      next = clampToGround(next)
      if (next.velocity.y < 0) {
        next.velocity.y = 0
      }
    }
  }

  return next
}

export function updatePhysics(match: Match, _state: unknown): void {
  const ballPhysics: BallPhysics = {
    position: { ...match.ball.position },
    velocity: { ...match.ball.velocity },
    spin: { ...((match.ball as BallPhysics).spin ?? { x: 0, y: 0, z: 0 }) },
  }

  const updated = tickPhysics(ballPhysics, TICK_S)

  match.ball.position = updated.position
  match.ball.velocity = updated.velocity
  ;(match.ball as BallPhysics).spin = updated.spin
}
