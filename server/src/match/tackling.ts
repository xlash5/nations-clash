import type { Position } from '../../../shared/types.js'

export const TACKLE_STANDING_RANGE = 1.5
export const TACKLE_SLIDE_RANGE = 3.0
export const FOUL_CHANCE_STANDING = 0.2
export const FOUL_CHANCE_SLIDE = 0.4
export const BALL_POP_FORCE = 5

export interface TackleResult {
  success: boolean
  foul: boolean
  ballPopDirection: Position | null
}

export function standingTackle(
  tacklerPos: Position,
  opponentPos: Position,
  opponentHasBall: boolean,
): TackleResult {
  const dx = opponentPos.x - tacklerPos.x
  const dz = opponentPos.z - tacklerPos.z
  const dist = Math.sqrt(dx * dx + dz * dz)

  if (dist <= TACKLE_STANDING_RANGE && opponentHasBall) {
    const dir = normalize(dx, dz)
    return {
      success: true,
      foul: false,
      ballPopDirection: { x: dir.x * BALL_POP_FORCE, y: 0.5, z: dir.z * BALL_POP_FORCE },
    }
  }

  const foul = Math.random() < FOUL_CHANCE_STANDING
  return { success: false, foul, ballPopDirection: null }
}

export function slideTackle(
  tacklerPos: Position,
  opponentPos: Position,
  opponentHasBall: boolean,
): TackleResult {
  const dx = opponentPos.x - tacklerPos.x
  const dz = opponentPos.z - tacklerPos.z
  const dist = Math.sqrt(dx * dx + dz * dz)

  if (dist <= TACKLE_SLIDE_RANGE && opponentHasBall) {
    const dir = normalize(dx, dz)
    return {
      success: true,
      foul: false,
      ballPopDirection: { x: dir.x * BALL_POP_FORCE, y: 1.0, z: dir.z * BALL_POP_FORCE },
    }
  }

  const foul = Math.random() < FOUL_CHANCE_SLIDE
  return { success: false, foul, ballPopDirection: null }
}

export function shouldFoul(tackleType: 'standing' | 'slide'): boolean {
  const chance = tackleType === 'standing' ? FOUL_CHANCE_STANDING : FOUL_CHANCE_SLIDE
  return Math.random() < chance
}

function normalize(dx: number, dz: number): { x: number; z: number } {
  const len = Math.sqrt(dx * dx + dz * dz)
  if (len < 0.001) return { x: 0, z: 1 }
  return { x: dx / len, z: dz / len }
}
