import { describe, it, expect, beforeEach } from 'vitest'
import {
  FORMATIONS,
  getAbsoluteFormationPositions,
  getFormationNames,
  PITCH_HALF_LENGTH,
  PITCH_HALF_WIDTH,
  type FormationName,
} from '../data/formations.js'
import { updateAI } from './ai.js'
import { Player } from './Player.js'
import { Team } from './Team.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeMatch(overrides?: Record<string, any>): any {
  return {
    teamA: new Team('home', 'host-id'),
    teamB: new Team('away', 'guest-id'),
    ball: { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, spin: { x: 0, y: 0, z: 0 } },
    ...overrides,
  }
}

function advanceMatch(match: ReturnType<typeof makeMatch>, ticks: number): void {
  for (let i = 0; i < ticks; i++) {
    const state = {
      players: [...match.teamA.players, ...match.teamB.players].map((p: Player) => ({
        id: p.id,
        team: p.team,
        position: { ...p.position },
        velocity: { ...p.velocity },
        rotation: p.rotation,
        stamina: p.stamina,
        isHumanControlled: p.isHumanControlled,
        isGk: p.isGk,
        hasBall: p.hasBall,
      })),
      ball: { ...match.ball.position, velocity: { ...match.ball.velocity }, spin: { ...match.ball.spin } },
      score: { teamA: 0, teamB: 0 },
      clock: 120,
      phase: 'firstHalf' as const,
    }
    updateAI(match, state)
  }
}

// ----- Formation Tests -----

describe('formations', () => {
  describe('all 5 formations have exactly 11 positions', () => {
    for (const name of getFormationNames()) {
      it(`${name} has exactly 11 slots`, () => {
        expect(FORMATIONS[name]).toHaveLength(11)
      })
    }
  })

  describe('all formations have correct roles', () => {
    for (const name of getFormationNames()) {
      it(`${name} has GK as first slot`, () => {
        expect(FORMATIONS[name][0].role).toBe('GK')
      })
    }
  })

  describe('getAbsoluteFormationPositions returns 11 positions', () => {
    for (const name of getFormationNames()) {
      it(`${name} (home side)`, () => {
        const positions = getAbsoluteFormationPositions(name, -1)
        expect(positions).toHaveLength(11)
      })
      it(`${name} (away side)`, () => {
        const positions = getAbsoluteFormationPositions(name, 1)
        expect(positions).toHaveLength(11)
      })
    }
  })

  it('home GK position is near own goal line at negative Z', () => {
    const positions = getAbsoluteFormationPositions('4-4-2', -1)
    const gk = positions[0]
    expect(gk.z).toBeCloseTo(-PITCH_HALF_LENGTH * 0.95, 1)
    expect(Math.abs(gk.x)).toBeLessThan(1)
  })

  it('away GK position is near own goal line at positive Z', () => {
    const positions = getAbsoluteFormationPositions('4-4-2', 1)
    const gk = positions[0]
    expect(gk.z).toBeCloseTo(PITCH_HALF_LENGTH * 0.95, 1)
  })

  it('home team defenders are in own half (negative Z)', () => {
    const positions = getAbsoluteFormationPositions('4-4-2', -1)
    for (let i = 1; i <= 4; i++) {
      expect(positions[i].z).toBeLessThan(0)
    }
  })

  it('home team forwards are in opponent half (positive Z)', () => {
    const positions = getAbsoluteFormationPositions('4-4-2', -1)
    for (let i = 9; i <= 10; i++) {
      expect(positions[i].z).toBeGreaterThan(0)
    }
  })

  it('positions stay within pitch boundaries', () => {
    for (const name of getFormationNames()) {
      for (const side of [-1, 1] as const) {
        const positions = getAbsoluteFormationPositions(name, side)
        for (const pos of positions) {
          expect(Math.abs(pos.x)).toBeLessThanOrEqual(PITCH_HALF_WIDTH + 1)
          expect(Math.abs(pos.z)).toBeLessThanOrEqual(PITCH_HALF_LENGTH + 1)
        }
      }
    }
  })

  it('unknown formation falls back to 4-4-2', () => {
    const positions = getAbsoluteFormationPositions('invalid' as FormationName, -1)
    expect(positions).toHaveLength(11)
    const gk = positions[0]
    expect(gk.z).toBeCloseTo(-PITCH_HALF_LENGTH * 0.95, 1)
  })
})

// ----- AI State Transition Tests -----

describe('AI state transitions', () => {
  let match: ReturnType<typeof makeMatch>

  beforeEach(() => {
    match = makeMatch()
  })

  it('AI players start in HOLD state', () => {
    for (let i = 2; i < 11; i++) {
      expect(match.teamA.players[i].aiState).toBe('HOLD')
    }
  })

  it('human-controlled player is not affected by AI', () => {
    const humanPos = { ...match.teamA.players[1].position }
    advanceMatch(match, 5)
    expect(match.teamA.players[1].position).toEqual(humanPos)
  })

  it('AI player transitions to CHASE when ball is within chase radius', () => {
    const player = match.teamA.players[2]
    player.position = { x: 0, y: 0, z: 10 }
    match.ball.position = { x: 0, y: 0, z: 12 }

    advanceMatch(match, 2)

    expect(player.aiState).toBe('CHASE')
  })

  it('AI player transitions to RETREAT when opponent has possession', () => {
    match.teamB.players[5].hasBall = true
    const player = match.teamA.players[2]
    player.position = { x: 0, y: 0, z: 30 }

    advanceMatch(match, 2)

    expect(player.aiState).toBe('RETREAT')
  })

  it('AI player stays in HOLD when team has possession and ball is far', () => {
    match.teamA.players[5].hasBall = true
    const player = match.teamA.players[2]
    player.position = { x: 0, y: 0, z: -30 }
    match.ball.position = { x: 0, y: 0, z: 30 }

    advanceMatch(match, 2)

    expect(player.aiState).toBe('HOLD')
  })

  it('AI player transitions from CHASE to RETREAT when possession changes', () => {
    const player = match.teamA.players[2]
    player.position = { x: 0, y: 0, z: 10 }
    match.ball.position = { x: 0, y: 0, z: 12 }

    advanceMatch(match, 2)
    expect(player.aiState).toBe('CHASE')

    match.teamB.players[5].hasBall = true
    match.teamA.players[5].hasBall = false
    match.ball.position = { x: 0, y: 0, z: -40 }

    advanceMatch(match, 2)
    expect(player.aiState).toBe('RETREAT')
  })

  it('AI player in CHASE state moves toward ball', () => {
    const player = match.teamA.players[2]
    player.position = { x: 0, y: 0, z: 0 }
    match.ball.position = { x: 10, y: 0, z: 10 }
    const initialDistToBall = Math.sqrt(200)

    advanceMatch(match, 30)

    const distToBall = Math.sqrt(
      (player.position.x - 10) ** 2 + (player.position.z - 10) ** 2,
    )
    expect(distToBall).toBeLessThan(initialDistToBall)
  })

  it('AI player in HOLD state stays near home position', () => {
    match.teamA.players[5].hasBall = true
    const player = match.teamA.players[2]

    const homeBefore = { ...player.homePosition }
    advanceMatch(match, 10)

    const distFromHome = Math.sqrt(
      (player.position.x - homeBefore.x) ** 2 +
      (player.position.z - homeBefore.z) ** 2,
    )
    expect(distFromHome).toBeLessThan(5)
  })

  it('AI player in RETREAT state moves toward own goal', () => {
    match.teamB.players[5].hasBall = true
    const player = match.teamA.players[2]
    player.position = { x: 0, y: 0, z: 20 }
    player.homePosition = { x: 0, y: 0, z: -20 }

    advanceMatch(match, 10)

    expect(player.position.z).toBeLessThan(20)
  })
})

// ----- GK AI Tests -----

describe('GK AI', () => {
  let match: ReturnType<typeof makeMatch>

  beforeEach(() => {
    match = makeMatch()
  })

  it('home GK stays on own goal line (negative Z)', () => {
    const gk = match.teamA.players[0]
    gk.position = { x: 0, y: 0, z: 0 }

    advanceMatch(match, 5)

    expect(gk.position.z).toBeCloseTo(-PITCH_HALF_LENGTH, 0)
  })

  it('away GK stays on own goal line (positive Z)', () => {
    const gk = match.teamB.players[0]
    gk.position = { x: 0, y: 0, z: 0 }

    advanceMatch(match, 5)

    expect(gk.position.z).toBeCloseTo(PITCH_HALF_LENGTH, 0)
  })

  it('GK positions between ball and goal center on x-axis', () => {
    const gk = match.teamA.players[0]
    gk.position = { x: 0, y: 0, z: 0 }
    match.ball.position = { x: 3, y: 0, z: -30 }

    advanceMatch(match, 10)

    expect(gk.position.x).toBeGreaterThan(0)
    expect(Math.abs(gk.position.x)).toBeLessThan(3.8)
  })

  it('GK x-position is clamped to goal width', () => {
    const gk = match.teamA.players[0]
    gk.position = { x: 0, y: 0, z: 0 }
    match.ball.position = { x: 20, y: 0, z: -30 }

    advanceMatch(match, 10)

    expect(Math.abs(gk.position.x)).toBeLessThanOrEqual(4)
  })

  it('GK dives when fast shot is heading toward goal', () => {
    const gk = match.teamA.players[0]
    gk.position = { x: 0, y: 0, z: -PITCH_HALF_LENGTH }
    match.ball.position = { x: 2, y: 1, z: -PITCH_HALF_LENGTH + 5 }
    match.ball.velocity = { x: 10, y: 0, z: -25 }

    advanceMatch(match, 3)

    expect(gk.gkDiveDirection).not.toBeNull()
  })

  it('GK does not dive for slow ball', () => {
    const gk = match.teamA.players[0]
    gk.position = { x: 0, y: 0, z: -PITCH_HALF_LENGTH }
    match.ball.position = { x: 2, y: 1, z: -PITCH_HALF_LENGTH + 5 }
    match.ball.velocity = { x: 1, y: 0, z: -5 }

    advanceMatch(match, 3)

    expect(gk.gkDiveDirection).toBeNull()
  })

  it('GK does not dive when ball is far from goal', () => {
    const gk = match.teamA.players[0]
    gk.position = { x: 0, y: 0, z: -PITCH_HALF_LENGTH }
    match.ball.position = { x: 2, y: 1, z: 0 }
    match.ball.velocity = { x: 10, y: 0, z: -25 }

    advanceMatch(match, 3)

    expect(gk.gkDiveDirection).toBeNull()
  })
})

// ----- Integration Tests -----

describe('AI integration', () => {
  it('AI players are moved during updates', () => {
    const match = makeMatch()
    match.teamA.players[5].hasBall = true
    const player = match.teamA.players[2]
    player.position = { x: 0, y: 0, z: 0 }
    match.ball.position = { x: 20, y: 0, z: 20 }

    advanceMatch(match, 30)

    const distFromStart = Math.sqrt(
      player.position.x ** 2 + player.position.z ** 2,
    )
    expect(distFromStart).toBeGreaterThan(1)
  })

  it('ball possession determines team AI state', () => {
    const match = makeMatch()
    match.teamA.players[5].hasBall = true
    match.teamA.players[2].position = { x: 0, y: 0, z: 30 }
    match.ball.position = { x: 0, y: 0, z: 30 }

    advanceMatch(match, 2)

    expect(match.teamA.players[2].aiState).toBe('CHASE')
    expect(match.teamB.players[2].aiState).toBe('RETREAT')
  })

  it('AI player velocity is capped at AI_BASE_SPEED', () => {
    const match = makeMatch()
    const player = match.teamA.players[2]
    player.position = { x: 0, y: 0, z: 0 }
    match.ball.position = { x: 100, y: 0, z: 100 }

    advanceMatch(match, 3)

    const speed = Math.sqrt(
      player.velocity.x ** 2 + player.velocity.z ** 2,
    )
    expect(speed).toBeLessThanOrEqual(8)
  })

  it('players are clamped to pitch boundaries', () => {
    const match = makeMatch()
    const player = match.teamA.players[2]
    player.position = { x: 0, y: 0, z: 0 }
    match.ball.position = { x: 100, y: 0, z: 100 }

    advanceMatch(match, 60)

    expect(Math.abs(player.position.x)).toBeLessThanOrEqual(PITCH_HALF_WIDTH + 1)
    expect(Math.abs(player.position.z)).toBeLessThanOrEqual(PITCH_HALF_LENGTH + 1)
  })
})
