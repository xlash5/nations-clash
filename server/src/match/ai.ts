import type { GameState, Position } from '../../../shared/types.js'
import { TICK_S } from '../../../shared/types.js'
import { getAbsoluteFormationPositions, PITCH_HALF_LENGTH, PITCH_HALF_WIDTH } from '../data/formations.js'
import type { Match } from './Match.js'
import { BALL_RADIUS } from './physics.js'
import type { AIState } from './Player.js'
import { Player } from './Player.js'

const AI_BASE_SPEED = 7
const CHASE_RADIUS = 20
const GK_DIVE_DURATION = 0.6
const GK_DIVE_SPEED = 12
const GK_MAX_X = 3.66
const RETREAT_BIAS = 0.4
const ARRIVAL_THRESHOLD = 0.8

function dist(a: Position, b: Position): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function normalize(v: Position): Position {
  const len = Math.sqrt(v.x * v.x + v.z * v.z)
  if (len < 0.001) return { x: 0, y: 0, z: 0 }
  return { x: v.x / len, y: 0, z: v.z / len }
}

function teamHasPossession(team: Player[], players: Player[]): boolean {
  for (const p of players) {
    if (p.hasBall) return team.includes(p)
  }
  return false
}

function ballCarrier(players: Player[]): Player | null {
  for (const p of players) {
    if (p.hasBall) return p
  }
  return null
}

function moveToward(player: Player, target: Position, delta: number): void {
  const dx = target.x - player.position.x
  const dz = target.z - player.position.z
  const d = Math.sqrt(dx * dx + dz * dz)

  if (d < ARRIVAL_THRESHOLD) {
    player.velocity.x = 0
    player.velocity.z = 0
    return
  }

  const nx = dx / d
  const nz = dz / d

  player.velocity.x = nx * AI_BASE_SPEED
  player.velocity.z = nz * AI_BASE_SPEED
  player.rotation = Math.atan2(nx, nz)

  player.position.x += player.velocity.x * delta
  player.position.z += player.velocity.z * delta
}

function clampToPitch(player: Player): void {
  player.position.x = clamp(player.position.x, -PITCH_HALF_WIDTH, PITCH_HALF_WIDTH)
  player.position.z = clamp(player.position.z, -PITCH_HALF_LENGTH, PITCH_HALF_LENGTH)
}

function updateGKPosition(
  player: Player,
  ball: { position: Position; velocity: Position },
  ownGoalZ: number,
  delta: number,
): void {
  if (player.gkDiveTimer > 0) {
    player.gkDiveTimer -= delta
    player.position.x += player.gkDiveDirection! * GK_DIVE_SPEED * delta
    player.position.x = clamp(player.position.x, -GK_MAX_X * 1.5, GK_MAX_X * 1.5)
    player.position.z = ownGoalZ
    return
  }

  player.gkDiveDirection = null

  const ballToGoalDist = Math.abs(ball.position.z - ownGoalZ)
  const t = clamp(ballToGoalDist / 30, 0, 1)
  const rawTargetX = lerp(0, ball.position.x, 1 - t)
  const targetX = clamp(rawTargetX, -GK_MAX_X, GK_MAX_X)

  const speed = AI_BASE_SPEED * 1.2
  const dx = targetX - player.position.x
  if (Math.abs(dx) > 0.3) {
    player.velocity.x = Math.sign(dx) * speed
    player.position.x += player.velocity.x * delta
  } else {
    player.velocity.x = 0
    player.position.x = targetX
  }

  player.position.z = ownGoalZ
  player.velocity.z = 0
  player.position.y = 0

  if (ball.velocity.z !== 0 || ball.velocity.x !== 0) {
    const ballSpeed = Math.sqrt(
      ball.velocity.x ** 2 + ball.velocity.z ** 2,
    )
    const isComingToward =
      (ownGoalZ < 0 && ball.velocity.z < 0) ||
      (ownGoalZ > 0 && ball.velocity.z > 0)
    const headingToGoal =
      Math.abs(ball.position.x) < GK_MAX_X + 2 &&
      Math.abs(ball.position.z - ownGoalZ) < 6

    if (ballSpeed > 15 && isComingToward && headingToGoal) {
      const shotDirX = ball.velocity.x
      const diveX = Math.sign(shotDirX) * GK_MAX_X
      player.gkDiveDirection = Math.sign(shotDirX)
      player.gkDiveTimer = GK_DIVE_DURATION
      player.velocity.x = player.gkDiveDirection * GK_DIVE_SPEED
      player.position.x += player.velocity.x * delta * 2
      player.position.x = clamp(player.position.x, -GK_MAX_X * 1.5, GK_MAX_X * 1.5)
    }
  }
}

function determineTargetPosition(
  state: AIState,
  homePos: Position,
  ballPos: Position,
  ownGoalZ: number,
): Position {
  switch (state) {
    case 'CHASE':
      return { x: ballPos.x, y: 0, z: ballPos.z }

    case 'RETREAT': {
      const retreatZ = lerp(homePos.z, ownGoalZ, RETREAT_BIAS)
      return { x: homePos.x, y: 0, z: retreatZ }
    }

    case 'HOLD':
    default:
      return { ...homePos }
  }
}

export function updateAI(match: Match, _state: GameState): void {
  const allPlayers = [...match.teamA.players, ...match.teamB.players]

  for (const team of [match.teamA, match.teamB]) {
    const ownGoalZ = team.id === 'home' ? -PITCH_HALF_LENGTH : PITCH_HALF_LENGTH
    const side: -1 | 1 = team.id === 'home' ? -1 : 1

    const formationPositions = getAbsoluteFormationPositions(
      team.formationName,
      side,
    )

    const hasPossession = teamHasPossession(team.players, allPlayers)
    const carrier = ballCarrier(allPlayers)

    for (let i = 0; i < team.players.length; i++) {
      const player = team.players[i]
      if (player.isHumanControlled) continue

      const homePos = formationPositions[i] ?? { x: 0, y: 0, z: 0 }
      player.homePosition = { ...homePos }

      if (player.isGk) {
        updateGKPosition(player, match.ball, ownGoalZ, TICK_S)
        continue
      }

      const distToBall = dist(player.position, match.ball.position)

      let newState: AIState
      if (distToBall < CHASE_RADIUS) {
        newState = 'CHASE'
      } else if (!hasPossession) {
        newState = 'RETREAT'
      } else {
        newState = 'HOLD'
      }
      player.aiState = newState

      const target = determineTargetPosition(
        player.aiState,
        player.homePosition,
        match.ball.position,
        ownGoalZ,
      )

      moveToward(player, target, TICK_S)
      clampToPitch(player)
    }
  }
}
