import { describe, it, expect } from 'vitest'
import { Player } from './Player.js'
import type { PlayerInput } from '../../../shared/types.js'

function input(overrides: Partial<PlayerInput> = {}): PlayerInput {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    shoot: false,
    pass: false,
    tackle: false,
    slideTackle: false,
    switchPlayer: false,
    ...overrides,
  }
}

describe('Player', () => {
  describe('movement — no input', () => {
    it('velocity is zero when no movement keys pressed', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input(), -1, 1 / 60)
      expect(player.velocity.x).toBe(0)
      expect(player.velocity.y).toBe(0)
      expect(player.velocity.z).toBe(0)
    })
  })

  describe('movement — camera side -1 (Team A)', () => {
    it('up moves toward positive z (opponent goal)', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true }), -1, 1 / 60)
      expect(player.velocity.z).toBeGreaterThan(0)
      expect(player.velocity.x).toBe(0)
    })

    it('down moves toward negative z (own goal)', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ down: true }), -1, 1 / 60)
      expect(player.velocity.z).toBeLessThan(0)
      expect(player.velocity.x).toBe(0)
    })

    it('left moves toward negative x', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ left: true }), -1, 1 / 60)
      expect(player.velocity.x).toBeLessThan(0)
      expect(player.velocity.z).toBe(0)
    })

    it('right moves toward positive x', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ right: true }), -1, 1 / 60)
      expect(player.velocity.x).toBeGreaterThan(0)
      expect(player.velocity.z).toBe(0)
    })
  })

  describe('movement — camera side 1 (Team B, flipped)', () => {
    it('up moves toward negative z (opponent goal)', () => {
      const player = new Player('p1', 'away')
      player.applyInput(input({ up: true }), 1, 1 / 60)
      expect(player.velocity.z).toBeLessThan(0)
      expect(player.velocity.x).toBe(0)
    })

    it('down moves toward positive z (own goal)', () => {
      const player = new Player('p1', 'away')
      player.applyInput(input({ down: true }), 1, 1 / 60)
      expect(player.velocity.z).toBeGreaterThan(0)
      expect(player.velocity.x).toBe(0)
    })

    it('left moves toward positive x', () => {
      const player = new Player('p1', 'away')
      player.applyInput(input({ left: true }), 1, 1 / 60)
      expect(player.velocity.x).toBeGreaterThan(0)
      expect(player.velocity.z).toBe(0)
    })

    it('right moves toward negative x', () => {
      const player = new Player('p1', 'away')
      player.applyInput(input({ right: true }), 1, 1 / 60)
      expect(player.velocity.x).toBeLessThan(0)
      expect(player.velocity.z).toBe(0)
    })
  })

  describe('speed', () => {
    it('base speed is 8 m/s', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true }), -1, 1 / 60)
      const speed = Math.sqrt(
        player.velocity.x ** 2 + player.velocity.z ** 2,
      )
      expect(speed).toBeCloseTo(8, 5)
    })

    it('sprint multiplies speed by 1.5', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true, sprint: true }), -1, 1 / 60)
      const speed = Math.sqrt(
        player.velocity.x ** 2 + player.velocity.z ** 2,
      )
      expect(speed).toBeCloseTo(12, 5)
    })

    it('stamina below 10 disallows sprint speed', () => {
      const player = new Player('p1', 'home')
      player.stamina = 5
      player.applyInput(input({ up: true, sprint: true }), -1, 1 / 60)
      const speed = Math.sqrt(
        player.velocity.x ** 2 + player.velocity.z ** 2,
      )
      expect(speed).toBeCloseTo(8, 5)
    })
  })

  describe('stamina', () => {
    it('sprinting for 1 second drains stamina by ~15 units', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true, sprint: true }), -1, 1.0)
      expect(player.stamina).toBeCloseTo(85, 0)
    })

    it('sprinting for 0.5 second drains stamina by ~7.5 units', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true, sprint: true }), -1, 0.5)
      expect(player.stamina).toBeCloseTo(92.5, 0)
    })

    it('not sprinting for 1 second regenerates ~5 stamina', () => {
      const player = new Player('p1', 'home')
      player.stamina = 50
      player.applyInput(input({ up: true }), -1, 1.0)
      expect(player.stamina).toBeCloseTo(55, 0)
    })

    it('stamina does not exceed maximum of 100', () => {
      const player = new Player('p1', 'home')
      player.stamina = 99
      player.applyInput(input(), -1, 1.0)
      expect(player.stamina).toBeLessThanOrEqual(100)
    })

    it('stamina does not go below 0', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true, sprint: true }), -1, 10.0)
      expect(player.stamina).toBe(0)
    })
  })

  describe('canSprint', () => {
    it('returns true when stamina >= 10', () => {
      const player = new Player('p1', 'home')
      player.stamina = 10
      expect(player.canSprint()).toBe(true)
    })

    it('returns false when stamina < 10', () => {
      const player = new Player('p1', 'home')
      player.stamina = 9
      expect(player.canSprint()).toBe(false)
    })
  })

  describe('ball control', () => {
    it('returns 1.5 multiplier when sprinting with enough stamina', () => {
      const player = new Player('p1', 'home')
      player.isSprinting = true
      expect(player.getBallControlMultiplier()).toBe(1.5)
    })

    it('returns 1.0 multiplier when not sprinting', () => {
      const player = new Player('p1', 'home')
      player.isSprinting = false
      expect(player.getBallControlMultiplier()).toBe(1.0)
    })

    it('returns 1.0 multiplier when sprinting but stamina depleted', () => {
      const player = new Player('p1', 'home')
      player.isSprinting = true
      player.stamina = 5
      expect(player.getBallControlMultiplier()).toBe(1.0)
    })
  })

  describe('diagonal movement', () => {
    it('normalises diagonal velocity to base speed', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true, right: true }), -1, 1 / 60)
      const speed = Math.sqrt(
        player.velocity.x ** 2 + player.velocity.z ** 2,
      )
      expect(speed).toBeCloseTo(8, 5)
    })

    it('moves in both x and z on diagonal', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true, right: true }), -1, 1 / 60)
      expect(player.velocity.x).toBeGreaterThan(0)
      expect(player.velocity.z).toBeGreaterThan(0)
    })
  })

  describe('tick', () => {
    it('updates position by velocity * delta', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true }), -1, 1 / 60)
      player.tick(0.5)
      expect(player.position.z).toBeCloseTo(4, 5)
    })

    it('does not move when velocity is zero', () => {
      const player = new Player('p1', 'home')
      const startZ = player.position.z
      player.tick(1.0)
      expect(player.position.z).toBe(startZ)
    })
  })

  describe('rotation', () => {
    it('rotation is 0 when moving up (camera side -1)', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true }), -1, 1 / 60)
      expect(player.rotation).toBeCloseTo(0, 5)
    })

    it('rotation is PI when moving down (camera side -1)', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ down: true }), -1, 1 / 60)
      expect(player.rotation).toBeCloseTo(Math.PI, 5)
    })

    it('rotation faces correct direction on diagonal', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true, right: true }), -1, 1 / 60)
      expect(player.rotation).toBeCloseTo(Math.PI / 4, 5)
    })
  })

  describe('edge cases', () => {
    it('opposing directions cancel out', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true, down: true }), -1, 1 / 60)
      expect(player.velocity.x).toBe(0)
      expect(player.velocity.z).toBe(0)
    })

    it('all four directions cancel to zero', () => {
      const player = new Player('p1', 'home')
      player.applyInput(
        input({ up: true, down: true, left: true, right: true }),
        -1,
        1 / 60,
      )
      expect(player.velocity.x).toBe(0)
      expect(player.velocity.z).toBe(0)
    })
  })

  describe('sprint state', () => {
    it('isSprinting is set to true when sprint key held and stamina sufficient', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true, sprint: true }), -1, 1 / 60)
      expect(player.isSprinting).toBe(true)
    })

    it('isSprinting is false when stamina too low even if sprint key held', () => {
      const player = new Player('p1', 'home')
      player.stamina = 5
      player.applyInput(input({ up: true, sprint: true }), -1, 1 / 60)
      expect(player.isSprinting).toBe(false)
    })

    it('isSprinting is false when sprint key not held', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ up: true }), -1, 1 / 60)
      expect(player.isSprinting).toBe(false)
    })
  })

  describe('hasBall', () => {
    it('defaults to false', () => {
      const player = new Player('p1', 'home')
      expect(player.hasBall).toBe(false)
    })

    it('can be set to true', () => {
      const player = new Player('p1', 'home')
      player.hasBall = true
      expect(player.hasBall).toBe(true)
    })
  })

  describe('charge system — startCharge', () => {
    it('pressing shoot sets chargeType and resets chargePower', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ shoot: true }), -1, 0)
      expect(player.chargeType).toBe('shoot')
      expect(player.chargePower).toBe(0)
    })

    it('pressing pass sets chargeType to pass', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ pass: true }), -1, 0)
      expect(player.chargeType).toBe('pass')
    })

    it('does not start charge when no shoot/pass pressed', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input(), -1, 0)
      expect(player.chargeType).toBeNull()
      expect(player.chargePower).toBe(0)
    })
  })

  describe('charge system — updateCharge', () => {
    it('after 0.5s of holding shoot, chargePower ≈ 0.5', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ shoot: true }), -1, 0.5)
      expect(player.chargePower).toBeCloseTo(0.5, 2)
    })

    it('chargePower fills to 1.0 after 1s', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ shoot: true }), -1, 1.0)
      expect(player.chargePower).toBeCloseTo(1.0, 2)
    })

    it('chargePower does not exceed 1.0', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ shoot: true }), -1, 2.0)
      expect(player.chargePower).toBe(1.0)
    })
  })

  describe('charge system — releaseCharge', () => {
    it('releasing shoot queues a kick request and resets charge state', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ shoot: true }), -1, 0.5)
      player.applyInput(input(), -1, 0)
      const req = player.consumeKickRequest()
      expect(req).toEqual({ type: 'shoot', power: expect.closeTo(0.5, 2) })
      expect(player.chargeType).toBeNull()
      expect(player.chargePower).toBe(0)
    })

    it('releasing pass queues a pass kick request', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ pass: true }), -1, 0.3)
      player.applyInput(input(), -1, 0)
      const req = player.consumeKickRequest()
      expect(req).toEqual({ type: 'pass', power: expect.closeTo(0.3, 2) })
    })

    it('request is consumed once and null thereafter', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ shoot: true }), -1, 0.5)
      player.applyInput(input(), -1, 0)
      expect(player.consumeKickRequest()).not.toBeNull()
      expect(player.consumeKickRequest()).toBeNull()
    })

    it('no kick request when key never pressed', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input(), -1, 0.5)
      expect(player.consumeKickRequest()).toBeNull()
    })
  })

  describe('charge system — shoot vs pass overlap', () => {
    it('pressing pass while already charging shoot switches to pass', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ shoot: true }), -1, 0.3)
      expect(player.chargeType).toBe('shoot')
      player.applyInput(input({ pass: true }), -1, 0.1)
      expect(player.chargeType).toBe('pass')
    })
  })

  describe('charge system — power proportional to hold time', () => {
    it('brief tap gives low power', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ shoot: true }), -1, 0.1)
      player.applyInput(input(), -1, 0)
      const req = player.consumeKickRequest()
      expect(req!.power).toBeCloseTo(0.1, 2)
    })

    it('long hold gives near max power', () => {
      const player = new Player('p1', 'home')
      player.applyInput(input({ shoot: true }), -1, 0.95)
      player.applyInput(input(), -1, 0)
      const req = player.consumeKickRequest()
      expect(req!.power).toBeCloseTo(0.95, 2)
    })
  })
})
