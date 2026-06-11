import type { Position, GameState } from '../../../shared/types.js'
import { BALL_RADIUS } from './physics.js'
import type { Match } from './Match.js'

export const PITCH_HALF_LENGTH = 52.5
export const PLAYER_RADIUS = 0.5
export const GOAL_POST_RADIUS = 0.08
export const GOAL_WIDTH = 7.32
export const GOAL_HEIGHT = 2.44
export const GOAL_DEPTH = 2
export const DRIBBLE_OFFSET = 0.6
export const GOAL_RESTITUTION = 0.7

export function checkPlayerBallCollision(
  playerPos: Position,
  ballPos: Position,
): { collided: boolean; normal: Position; penetration: number } {
  const dx = ballPos.x - playerPos.x
  const dy = ballPos.y - playerPos.y
  const dz = ballPos.z - playerPos.z
  const distSq = dx * dx + dy * dy + dz * dz
  const minDist = PLAYER_RADIUS + BALL_RADIUS
  const minDistSq = minDist * minDist

  if (distSq >= minDistSq || distSq === 0) {
    return { collided: false, normal: { x: 0, y: 0, z: 0 }, penetration: 0 }
  }

  const dist = Math.sqrt(distSq)
  const penetration = minDist - dist

  return {
    collided: true,
    normal: { x: dx / dist, y: dy / dist, z: dz / dist },
    penetration,
  }
}

export function resolvePlayerBallCollision(
  ball: { position: Position; velocity: Position },
  collision: { normal: Position; penetration: number },
  playerHasBall: boolean,
  playerPos: Position,
): { position: Position; velocity: Position } {
  if (playerHasBall) {
    return {
      position: {
        x: playerPos.x,
        y: BALL_RADIUS,
        z: playerPos.z + DRIBBLE_OFFSET,
      },
      velocity: { x: 0, y: 0, z: 0 },
    }
  }

  const velDotN =
    ball.velocity.x * collision.normal.x +
    ball.velocity.y * collision.normal.y +
    ball.velocity.z * collision.normal.z

  if (velDotN >= 0) {
    return {
      position: { ...ball.position },
      velocity: { ...ball.velocity },
    }
  }

  const restitution = 0.7
  const impulse = (1 + restitution) * velDotN

  return {
    position: {
      x: ball.position.x + collision.normal.x * collision.penetration,
      y: Math.max(BALL_RADIUS, ball.position.y + collision.normal.y * collision.penetration),
      z: ball.position.z + collision.normal.z * collision.penetration,
    },
    velocity: {
      x: ball.velocity.x - impulse * collision.normal.x,
      y: ball.velocity.y - impulse * collision.normal.y,
      z: ball.velocity.z - impulse * collision.normal.z,
    },
  }
}

function checkSphereCylinder(
  spherePos: Position,
  sphereR: number,
  cylinderAxisPt: Position,
  cylinderR: number,
  cylinderAxis: 'y' | 'x',
  cylinderHalfLen: number,
): { collided: boolean; normal: Position; penetration: number } {
  let dx: number, dy: number, dz: number
  let cx: number, cy: number, cz: number

  if (cylinderAxis === 'y') {
    dx = spherePos.x - cylinderAxisPt.x
    dy = spherePos.y - cylinderAxisPt.y
    dz = spherePos.z - cylinderAxisPt.z
    cy = Math.max(-cylinderHalfLen, Math.min(cylinderHalfLen, dy))
    cx = dx
    cz = dz
  } else {
    dx = spherePos.x - cylinderAxisPt.x
    dy = spherePos.y - cylinderAxisPt.y
    dz = spherePos.z - cylinderAxisPt.z
    cx = Math.max(-cylinderHalfLen, Math.min(cylinderHalfLen, dx))
    cy = dy
    cz = dz
  }

  const distXz = Math.sqrt(cx * cx + cz * cz)

  if (distXz < 0.0001) {
    const endDist = cylinderAxis === 'y'
      ? Math.abs(dy) - cylinderHalfLen
      : Math.abs(dx) - cylinderHalfLen
    if (endDist < sphereR) {
      const axisDir = cylinderAxis === 'y' ? dy : dx
      return {
        collided: true,
        normal: {
          x: cylinderAxis === 'x' ? (axisDir > 0 ? 1 : -1) : 0,
          y: cylinderAxis === 'y' ? (axisDir > 0 ? 1 : -1) : 0,
          z: 0,
        },
        penetration: sphereR - endDist,
      }
    }
    return { collided: false, normal: { x: 0, y: 0, z: 0 }, penetration: 0 }
  }

  const closestX = cylinderAxisPt.x + (cx / distXz) * cylinderR
  const closestY = cylinderAxis === 'y'
    ? cylinderAxisPt.y + cy
    : cylinderAxisPt.y + (cy / distXz) * cylinderR
  const closestZ = cylinderAxisPt.z + (cz / distXz) * cylinderR

  const deltaX = spherePos.x - closestX
  const deltaY = spherePos.y - closestY
  const deltaZ = spherePos.z - closestZ
  const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ)

  if (dist >= sphereR || dist < 0.0001) {
    return { collided: false, normal: { x: 0, y: 0, z: 0 }, penetration: 0 }
  }

  return {
    collided: true,
    normal: { x: deltaX / dist, y: deltaY / dist, z: deltaZ / dist },
    penetration: sphereR - dist,
  }
}

export function checkBallGoalCollision(
  ballPos: Position,
): { collided: boolean; normal: Position; penetration: number } {
  const goalZ = PITCH_HALF_LENGTH + 0.5

  for (const side of [-1, 1]) {
    const gz = side * goalZ

    const leftPost = checkSphereCylinder(
      ballPos, BALL_RADIUS,
      { x: -GOAL_WIDTH / 2, y: 0, z: gz }, GOAL_POST_RADIUS, 'y', GOAL_HEIGHT / 2,
    )
    if (leftPost.collided) return leftPost

    const rightPost = checkSphereCylinder(
      ballPos, BALL_RADIUS,
      { x: GOAL_WIDTH / 2, y: 0, z: gz }, GOAL_POST_RADIUS, 'y', GOAL_HEIGHT / 2,
    )
    if (rightPost.collided) return rightPost

    const crossbar = checkSphereCylinder(
      ballPos, BALL_RADIUS,
      { x: 0, y: GOAL_HEIGHT, z: gz }, GOAL_POST_RADIUS, 'x', GOAL_WIDTH / 2,
    )
    if (crossbar.collided) return crossbar
  }

  return { collided: false, normal: { x: 0, y: 0, z: 0 }, penetration: 0 }
}

export function checkGoalScored(
  ballPos: Position,
): boolean {
  const goalLineZ = PITCH_HALF_LENGTH
  const halfGoalWidth = GOAL_WIDTH / 2

  if (Math.abs(ballPos.z) < goalLineZ) return false
  if (Math.abs(ballPos.x) > halfGoalWidth) return false
  if (ballPos.y > GOAL_HEIGHT) return false

  return true
}

export function resolvePlayerPlayerCollision(
  p1Pos: Position,
  p2Pos: Position,
): { p1Pos: Position; p2Pos: Position } {
  const dx = p2Pos.x - p1Pos.x
  const dz = p2Pos.z - p1Pos.z
  const distSq = dx * dx + dz * dz
  const minDist = PLAYER_RADIUS * 2
  const minDistSq = minDist * minDist

  if (distSq >= minDistSq || distSq === 0) {
    return {
      p1Pos: { ...p1Pos },
      p2Pos: { ...p2Pos },
    }
  }

  const dist = Math.sqrt(distSq)
  const overlap = minDist - dist
  const nx = dx / dist
  const nz = dz / dist

  return {
    p1Pos: {
      ...p1Pos,
      x: p1Pos.x - nx * overlap / 2,
      z: p1Pos.z - nz * overlap / 2,
    },
    p2Pos: {
      ...p2Pos,
      x: p2Pos.x + nx * overlap / 2,
      z: p2Pos.z + nz * overlap / 2,
    },
  }
}

export function findNearestPlayer(
  players: Array<{ position: Position; hasBall: boolean }>,
  ballPos: Position,
): { player: { position: Position; hasBall: boolean }; distance: number } | null {
  let nearest: { position: Position; hasBall: boolean } | null = null
  let nearestDist = Infinity

  for (const player of players) {
    const dx = ballPos.x - player.position.x
    const dy = ballPos.y - player.position.y
    const dz = ballPos.z - player.position.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist < nearestDist) {
      nearestDist = dist
      nearest = player
    }
  }

  if (!nearest) return null

  return { player: nearest, distance: nearestDist }
}

export function updateCollisions(match: Match, _state: GameState): void {
  const ball = {
    position: { ...match.ball.position },
    velocity: { ...match.ball.velocity },
  }

  const allPlayers = [...match.teamA.players, ...match.teamB.players]

  const nearest = findNearestPlayer(allPlayers, ball.position)
  for (const p of allPlayers) {
    p.hasBall = false
  }
  if (nearest && nearest.distance < PLAYER_RADIUS + BALL_RADIUS + 1) {
    nearest.player.hasBall = true
  }

  for (const player of allPlayers) {
    const collision = checkPlayerBallCollision(player.position, ball.position)
    if (collision.collided) {
      const resolved = resolvePlayerBallCollision(ball, collision, player.hasBall, player.position)
      ball.position = resolved.position
      ball.velocity = resolved.velocity
    }
  }

  const goalCollision = checkBallGoalCollision(ball.position)
  if (goalCollision.collided) {
    const velDotN =
      ball.velocity.x * goalCollision.normal.x +
      ball.velocity.y * goalCollision.normal.y +
      ball.velocity.z * goalCollision.normal.z
    if (velDotN < 0) {
      const impulse = (1 + GOAL_RESTITUTION) * velDotN
      ball.velocity = {
        x: ball.velocity.x - impulse * goalCollision.normal.x,
        y: ball.velocity.y - impulse * goalCollision.normal.y,
        z: ball.velocity.z - impulse * goalCollision.normal.z,
      }
    }
    ball.position = {
      x: ball.position.x + goalCollision.normal.x * goalCollision.penetration,
      y: Math.max(BALL_RADIUS, ball.position.y + goalCollision.normal.y * goalCollision.penetration),
      z: ball.position.z + goalCollision.normal.z * goalCollision.penetration,
    }
  }

  for (let i = 0; i < allPlayers.length; i++) {
    for (let j = i + 1; j < allPlayers.length; j++) {
      const resolved = resolvePlayerPlayerCollision(allPlayers[i].position, allPlayers[j].position)
      allPlayers[i].position = resolved.p1Pos
      allPlayers[j].position = resolved.p2Pos
    }
  }

  if (checkGoalScored(ball.position)) {
    if (ball.position.z > 0) {
      match.score.teamA++
    } else {
      match.score.teamB++
    }
    match.ball = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      spin: { x: 0, y: 0, z: 0 },
    }
    return
  }

  match.ball.position = ball.position
  match.ball.velocity = ball.velocity
}
