export const KEY_UP = 1
export const KEY_DOWN = 2
export const KEY_LEFT = 4
export const KEY_RIGHT = 8
export const KEY_SPRINT = 16
export const KEY_SHOOT = 32
export const KEY_PASS = 64
export const KEY_TACKLE = 128
export const KEY_SLIDE_TACKLE = 256
export const KEY_SWITCH_PLAYER = 512

export class Input {
  private keysPressed: Record<string, boolean> = {}

  attach(): void {
    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('keyup', this.onKeyUp)
  }

  detach(): void {
    document.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('keyup', this.onKeyUp)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keysPressed[e.code] = true
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(e.key)) {
      e.preventDefault()
    }
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysPressed[e.code] = false
  }

  getBitmask(): number {
    let keys = 0
    if (this.keysPressed['ArrowUp'] || this.keysPressed['KeyW']) keys |= KEY_UP
    if (this.keysPressed['ArrowDown'] || this.keysPressed['KeyS']) keys |= KEY_DOWN
    if (this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA']) keys |= KEY_LEFT
    if (this.keysPressed['ArrowRight'] || this.keysPressed['KeyD']) keys |= KEY_RIGHT
    if (this.keysPressed['ShiftLeft'] || this.keysPressed['ShiftRight']) keys |= KEY_SPRINT
    if (this.keysPressed['KeyJ']) keys |= KEY_SHOOT
    if (this.keysPressed['KeyK']) keys |= KEY_PASS
    if (this.keysPressed['KeyL']) keys |= KEY_TACKLE
    if (this.keysPressed['KeyU']) keys |= KEY_SLIDE_TACKLE
    if (this.keysPressed['KeyI']) keys |= KEY_SWITCH_PLAYER
    return keys
  }

  isKeyDown(code: string): boolean {
    return !!this.keysPressed[code]
  }
}
