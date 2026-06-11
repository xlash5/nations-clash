import type { Position, PlayerInput } from '../../../shared/types.js'

const BASE_SPEED = 8
const SPRINT_MULTIPLIER = 1.5
const STAMINA_DRAIN_PER_SECOND = 15
const STAMINA_REGEN_PER_SECOND = 5
const MIN_STAMINA_FOR_SPRINT = 10
const MAX_STAMINA = 100
const CHARGE_RATE = 1.0

export class Player {
  readonly id: string
  team: 'home' | 'away'
  position: Position
  velocity: Position
  rotation: number
  stamina: number
  isHumanControlled: boolean
  isGk: boolean
  isSprinting: boolean
  hasBall: boolean
  chargeType: 'shoot' | 'pass' | null
  chargePower: number

  private prevShoot: boolean
  private prevPass: boolean
  private _kickRequest: { type: 'shoot' | 'pass'; power: number } | null

  constructor(id: string, team: 'home' | 'away', isGk = false) {
    this.id = id
    this.team = team
    this.position = { x: 0, y: 0, z: 0 }
    this.velocity = { x: 0, y: 0, z: 0 }
    this.rotation = 0
    this.stamina = MAX_STAMINA
    this.isHumanControlled = false
    this.isGk = isGk
    this.isSprinting = false
    this.hasBall = false
    this.chargeType = null
    this.chargePower = 0
    this.prevShoot = false
    this.prevPass = false
    this._kickRequest = null
  }

  applyInput(input: PlayerInput, cameraSide: -1 | 1, delta: number): void {
    this.isSprinting = input.sprint && this.stamina >= MIN_STAMINA_FOR_SPRINT

    this.updateStamina(delta)
    this.handleCharge(input, delta)

    if (!input.up && !input.down && !input.left && !input.right) {
      this.velocity.x = 0
      this.velocity.z = 0
      return
    }

    const speed = this.getCurrentSpeed()
    const dir = this.resolveDirection(input, cameraSide)

    this.velocity.x = dir.x * speed
    this.velocity.z = dir.z * speed
    this.rotation = Math.atan2(dir.x, dir.z)
  }

  consumeKickRequest(): { type: 'shoot' | 'pass'; power: number } | null {
    const req = this._kickRequest
    this._kickRequest = null
    return req
  }

  private handleCharge(input: PlayerInput, delta: number): void {
    const shootDown = input.shoot && !this.prevShoot
    const shootUp = !input.shoot && this.prevShoot
    const passDown = input.pass && !this.prevPass
    const passUp = !input.pass && this.prevPass

    this.prevShoot = input.shoot
    this.prevPass = input.pass

    if (shootDown) {
      this.chargeType = 'shoot'
      this.chargePower = 0
    } else if (passDown) {
      this.chargeType = 'pass'
      this.chargePower = 0
    }

    if (this.chargeType) {
      this.chargePower = Math.min(1, this.chargePower + CHARGE_RATE * delta)
    }

    if (shootUp && this.chargeType === 'shoot') {
      this._kickRequest = { type: 'shoot', power: this.chargePower }
      this.chargeType = null
      this.chargePower = 0
    } else if (passUp && this.chargeType === 'pass') {
      this._kickRequest = { type: 'pass', power: this.chargePower }
      this.chargeType = null
      this.chargePower = 0
    }
  }

  tick(delta: number): void {
    this.position.x += this.velocity.x * delta
    this.position.z += this.velocity.z * delta
  }

  getCurrentSpeed(): number {
    if (this.isSprinting && this.stamina >= MIN_STAMINA_FOR_SPRINT) {
      return BASE_SPEED * SPRINT_MULTIPLIER
    }
    return BASE_SPEED
  }

  canSprint(): boolean {
    return this.stamina >= MIN_STAMINA_FOR_SPRINT
  }

  getBallControlMultiplier(): number {
    return this.isSprinting && this.canSprint() ? 1.5 : 1.0
  }

  private updateStamina(delta: number): void {
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN_PER_SECOND * delta)
    } else {
      this.stamina = Math.min(MAX_STAMINA, this.stamina + STAMINA_REGEN_PER_SECOND * delta)
    }
  }

  private resolveDirection(input: PlayerInput, cameraSide: -1 | 1): { x: number; z: number } {
    let dx = 0
    let dz = 0

    if (input.up) dz += -cameraSide
    if (input.down) dz += cameraSide
    if (input.left) dx += cameraSide
    if (input.right) dx += -cameraSide

    const len = Math.sqrt(dx * dx + dz * dz)
    if (len > 0) {
      dx /= len
      dz /= len
    }

    return { x: dx, z: dz }
  }
}
