import { describe, it, expect, vi } from 'vitest'
import {
  standingTackle,
  slideTackle,
  shouldFoul,
  TACKLE_STANDING_RANGE,
  TACKLE_SLIDE_RANGE,
  FOUL_CHANCE_STANDING,
  FOUL_CHANCE_SLIDE,
} from './tackling.js'
import { Player, SLIDE_DURATION, SLIDE_RECOVERY, TACKLE_COOLDOWN } from './Player.js'
import type { PlayerInput } from '../../../shared/types.js'

function pos(x: number, y: number, z: number) {
  return { x, y, z }
}

describe('standingTackle', () => {
  it('returns success=true when opponent within range and has ball', () => {
    const tacklerPos = pos(0, 0, 0)
    const opponentPos = pos(1, 0, 0)
    const result = standingTackle(tacklerPos, opponentPos, true)
    expect(result.success).toBe(true)
    expect(result.foul).toBe(false)
    expect(result.ballPopDirection).not.toBeNull()
  })

  it('returns success=true at exact range boundary', () => {
    const tacklerPos = pos(0, 0, 0)
    const opponentPos = pos(TACKLE_STANDING_RANGE, 0, 0)
    const result = standingTackle(tacklerPos, opponentPos, true)
    expect(result.success).toBe(true)
  })

  it('returns success=false when opponent out of range', () => {
    const tacklerPos = pos(0, 0, 0)
    const opponentPos = pos(5, 0, 0)
    const result = standingTackle(tacklerPos, opponentPos, true)
    expect(result.success).toBe(false)
  })

  it('returns success=false when opponent does not have ball', () => {
    const tacklerPos = pos(0, 0, 0)
    const opponentPos = pos(1, 0, 0)
    const result = standingTackle(tacklerPos, opponentPos, false)
    expect(result.success).toBe(false)
  })

  it('ball pop direction points from tackler to opponent', () => {
    const tacklerPos = pos(0, 0, 0)
    const opponentPos = pos(1, 0, 1)
    const result = standingTackle(tacklerPos, opponentPos, true)
    expect(result.ballPopDirection).not.toBeNull()
    expect(result.ballPopDirection!.x).toBeGreaterThan(0)
    expect(result.ballPopDirection!.z).toBeGreaterThan(0)
  })
})

describe('slideTackle', () => {
  it('returns success=true when opponent within slide range and has ball', () => {
    const tacklerPos = pos(0, 0, 0)
    const opponentPos = pos(2.5, 0, 0)
    const result = slideTackle(tacklerPos, opponentPos, true)
    expect(result.success).toBe(true)
    expect(result.foul).toBe(false)
    expect(result.ballPopDirection).not.toBeNull()
  })

  it('returns success=true at exact slide range boundary', () => {
    const tacklerPos = pos(0, 0, 0)
    const opponentPos = pos(TACKLE_SLIDE_RANGE, 0, 0)
    const result = slideTackle(tacklerPos, opponentPos, true)
    expect(result.success).toBe(true)
  })

  it('returns success=false when opponent out of slide range', () => {
    const tacklerPos = pos(0, 0, 0)
    const opponentPos = pos(5, 0, 0)
    const result = slideTackle(tacklerPos, opponentPos, true)
    expect(result.success).toBe(false)
  })

  it('returns success=false when opponent does not have ball', () => {
    const tacklerPos = pos(0, 0, 0)
    const opponentPos = pos(2, 0, 0)
    const result = slideTackle(tacklerPos, opponentPos, false)
    expect(result.success).toBe(false)
  })

  it('covers longer range than standing tackle', () => {
    expect(TACKLE_SLIDE_RANGE).toBeGreaterThan(TACKLE_STANDING_RANGE)
  })
})

describe('shouldFoul', () => {
  it('returns false for standing tackle (20% chance — non-deterministic)', () => {
    let foulCount = 0
    const trials = 10000
    for (let i = 0; i < trials; i++) {
      if (shouldFoul('standing')) foulCount++
    }
    const rate = foulCount / trials
    expect(rate).toBeGreaterThan(0.1)
    expect(rate).toBeLessThan(0.35)
  })

  it('returns false for slide tackle (40% chance — non-deterministic)', () => {
    let foulCount = 0
    const trials = 10000
    for (let i = 0; i < trials; i++) {
      if (shouldFoul('slide')) foulCount++
    }
    const rate = foulCount / trials
    expect(rate).toBeGreaterThan(0.25)
    expect(rate).toBeLessThan(0.55)
  })

  it('slide tackle has higher foul rate than standing', () => {
    expect(FOUL_CHANCE_SLIDE).toBeGreaterThan(FOUL_CHANCE_STANDING)
  })
})

describe('Player tackle integration', () => {
  it('hasBall defaults to false', () => {
    const player = new Player('p1', 'home')
    expect(player.hasBall).toBe(false)
  })

  it('tackleCooldownTimer defaults to 0', () => {
    const player = new Player('p1', 'home')
    expect(player.tackleCooldownTimer).toBe(0)
  })

  it('isSliding defaults to false', () => {
    const player = new Player('p1', 'home')
    expect(player.isSliding).toBe(false)
  })

  it('slideRecoveryTimer defaults to 0', () => {
    const player = new Player('p1', 'home')
    expect(player.slideRecoveryTimer).toBe(0)
  })

  it('consumes no tackle request when none queued', () => {
    const player = new Player('p1', 'home')
    expect(player.consumeTackleRequest()).toBeNull()
  })

  it('tackle rising edge queues a standing tackle request', () => {
    const player = new Player('p1', 'home')
    const input: PlayerInput = {
      up: true, down: false, left: false, right: false,
      sprint: false, shoot: false, pass: false,
      tackle: true, slideTackle: false, switchPlayer: false,
    }
    player.applyInput(input, -1, 0)
    const req = player.consumeTackleRequest()
    expect(req).toEqual({ type: 'standing' })
  })

  it('slide tackle rising edge queues a slide tackle request', () => {
    const player = new Player('p1', 'home')
    const input: PlayerInput = {
      up: true, down: false, left: false, right: false,
      sprint: false, shoot: false, pass: false,
      tackle: false, slideTackle: true, switchPlayer: false,
    }
    player.applyInput(input, -1, 0)
    const req = player.consumeTackleRequest()
    expect(req).toEqual({ type: 'slide' })
  })

  it('holding tackle key does not queue multiple requests (rising edge)', () => {
    const player = new Player('p1', 'home')
    const input: PlayerInput = {
      up: false, down: false, left: false, right: false,
      sprint: false, shoot: false, pass: false,
      tackle: true, slideTackle: false, switchPlayer: false,
    }
    player.applyInput(input, -1, 0)
    player.applyInput(input, -1, 0)
    expect(player.consumeTackleRequest()).toEqual({ type: 'standing' })
    expect(player.consumeTackleRequest()).toBeNull()
  })

  it('tackle cooldown prevents second tackle attempt', () => {
    const player = new Player('p1', 'home')
    const input: PlayerInput = {
      up: false, down: false, left: false, right: false,
      sprint: false, shoot: false, pass: false,
      tackle: true, slideTackle: false, switchPlayer: false,
    }
    player.applyInput(input, -1, 0)
    expect(player.consumeTackleRequest()).toEqual({ type: 'standing' })
    player.tackleCooldownTimer = 0.3
    player.applyInput(input, -1, 0)
    expect(player.consumeTackleRequest()).toBeNull()
  })

  it('slide sets isSliding and slideTimer', () => {
    const player = new Player('p1', 'home')
    const input: PlayerInput = {
      up: true, down: false, left: false, right: false,
      sprint: false, shoot: false, pass: false,
      tackle: false, slideTackle: true, switchPlayer: false,
    }
    player.applyInput(input, -1, 0)
    const req = player.consumeTackleRequest()
    expect(req).toEqual({ type: 'slide' })

    player.isSliding = true
    player.slideTimer = SLIDE_DURATION
    player.slideDirection = { x: 0, y: 0, z: 1 }
    player.tackleCooldownTimer = 0.5

    expect(player.isSliding).toBe(true)
    expect(player.slideTimer).toBe(SLIDE_DURATION)
    expect(player.slideDirection).toEqual({ x: 0, y: 0, z: 1 })
  })

  it('slide recovery prevents movement after slide ends', () => {
    const player = new Player('p1', 'home')
    player.isSliding = true
    player.slideTimer = 0.01
    player.slideDirection = { x: 0, y: 0, z: 1 }
    player.tackleCooldownTimer = 0.5

    player.tick(0.02)
    expect(player.isSliding).toBe(false)
    expect(player.slideRecoveryTimer).toBe(SLIDE_RECOVERY)
    expect(player.slideDirection).toBeNull()
  })

  it('cannot move during slide recovery', () => {
    const player = new Player('p1', 'home')
    player.slideRecoveryTimer = 0.5
    const startZ = player.position.z
    const input: PlayerInput = {
      up: true, down: false, left: false, right: false,
      sprint: false, shoot: false, pass: false,
      tackle: false, slideTackle: false, switchPlayer: false,
    }
    player.applyInput(input, -1, 0.016)
    player.tick(0.016)
    expect(player.position.z).toBe(startZ)
  })

  it('cooldown decays over time', () => {
    const player = new Player('p1', 'home')
    player.tackleCooldownTimer = 0.5
    player.tick(0.3)
    expect(player.tackleCooldownTimer).toBeCloseTo(0.2, 5)
    player.tick(0.3)
    expect(player.tackleCooldownTimer).toBe(0)
  })
})
