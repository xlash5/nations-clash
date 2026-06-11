import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Input, KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_SPRINT, KEY_SHOOT, KEY_PASS, KEY_TACKLE, KEY_SLIDE_TACKLE, KEY_SWITCH_PLAYER } from './Input'

function createKeyboardEvent(code: string, key: string, type: 'keydown' | 'keyup'): KeyboardEvent {
  return new KeyboardEvent(type, { code, key, bubbles: true })
}

describe('Input', () => {
  let input: Input

  beforeEach(() => {
    input = new Input()
    input.attach()
  })

  it('getBitmask returns 0 when no keys pressed', () => {
    expect(input.getBitmask()).toBe(0)
  })

  it('pressing ArrowUp sets KEY_UP bit', () => {
    document.dispatchEvent(createKeyboardEvent('ArrowUp', 'ArrowUp', 'keydown'))
    expect(input.getBitmask() & KEY_UP).toBe(KEY_UP)
  })

  it('pressing KeyW sets KEY_UP bit', () => {
    document.dispatchEvent(createKeyboardEvent('KeyW', 'w', 'keydown'))
    expect(input.getBitmask() & KEY_UP).toBe(KEY_UP)
  })

  it('pressing ArrowDown sets KEY_DOWN bit', () => {
    document.dispatchEvent(createKeyboardEvent('ArrowDown', 'ArrowDown', 'keydown'))
    expect(input.getBitmask() & KEY_DOWN).toBe(KEY_DOWN)
  })

  it('pressing KeyS sets KEY_DOWN bit', () => {
    document.dispatchEvent(createKeyboardEvent('KeyS', 's', 'keydown'))
    expect(input.getBitmask() & KEY_DOWN).toBe(KEY_DOWN)
  })

  it('pressing ArrowLeft sets KEY_LEFT bit', () => {
    document.dispatchEvent(createKeyboardEvent('ArrowLeft', 'ArrowLeft', 'keydown'))
    expect(input.getBitmask() & KEY_LEFT).toBe(KEY_LEFT)
  })

  it('pressing KeyA sets KEY_LEFT bit', () => {
    document.dispatchEvent(createKeyboardEvent('KeyA', 'a', 'keydown'))
    expect(input.getBitmask() & KEY_LEFT).toBe(KEY_LEFT)
  })

  it('pressing ArrowRight sets KEY_RIGHT bit', () => {
    document.dispatchEvent(createKeyboardEvent('ArrowRight', 'ArrowRight', 'keydown'))
    expect(input.getBitmask() & KEY_RIGHT).toBe(KEY_RIGHT)
  })

  it('pressing KeyD sets KEY_RIGHT bit', () => {
    document.dispatchEvent(createKeyboardEvent('KeyD', 'd', 'keydown'))
    expect(input.getBitmask() & KEY_RIGHT).toBe(KEY_RIGHT)
  })

  it('pressing ShiftLeft sets KEY_SPRINT bit', () => {
    document.dispatchEvent(createKeyboardEvent('ShiftLeft', 'Shift', 'keydown'))
    expect(input.getBitmask() & KEY_SPRINT).toBe(KEY_SPRINT)
  })

  it('pressing ShiftRight sets KEY_SPRINT bit', () => {
    document.dispatchEvent(createKeyboardEvent('ShiftRight', 'Shift', 'keydown'))
    expect(input.getBitmask() & KEY_SPRINT).toBe(KEY_SPRINT)
  })

  it('pressing KeyJ sets KEY_SHOOT bit', () => {
    document.dispatchEvent(createKeyboardEvent('KeyJ', 'j', 'keydown'))
    expect(input.getBitmask() & KEY_SHOOT).toBe(KEY_SHOOT)
  })

  it('pressing KeyK sets KEY_PASS bit', () => {
    document.dispatchEvent(createKeyboardEvent('KeyK', 'k', 'keydown'))
    expect(input.getBitmask() & KEY_PASS).toBe(KEY_PASS)
  })

  it('pressing KeyL sets KEY_TACKLE bit', () => {
    document.dispatchEvent(createKeyboardEvent('KeyL', 'l', 'keydown'))
    expect(input.getBitmask() & KEY_TACKLE).toBe(KEY_TACKLE)
  })

  it('pressing KeyU sets KEY_SLIDE_TACKLE bit', () => {
    document.dispatchEvent(createKeyboardEvent('KeyU', 'u', 'keydown'))
    expect(input.getBitmask() & KEY_SLIDE_TACKLE).toBe(KEY_SLIDE_TACKLE)
  })

  it('pressing KeyI sets KEY_SWITCH_PLAYER bit', () => {
    document.dispatchEvent(createKeyboardEvent('KeyI', 'i', 'keydown'))
    expect(input.getBitmask() & KEY_SWITCH_PLAYER).toBe(KEY_SWITCH_PLAYER)
  })

  it('pressing ArrowUp + ShiftLeft sets both KEY_UP and KEY_SPRINT bits', () => {
    document.dispatchEvent(createKeyboardEvent('ArrowUp', 'ArrowUp', 'keydown'))
    document.dispatchEvent(createKeyboardEvent('ShiftLeft', 'Shift', 'keydown'))
    const mask = input.getBitmask()
    expect(mask & KEY_UP).toBe(KEY_UP)
    expect(mask & KEY_SPRINT).toBe(KEY_SPRINT)
  })

  it('releasing a key clears its bit', () => {
    document.dispatchEvent(createKeyboardEvent('ArrowUp', 'ArrowUp', 'keydown'))
    expect(input.getBitmask() & KEY_UP).toBe(KEY_UP)
    document.dispatchEvent(createKeyboardEvent('ArrowUp', 'ArrowUp', 'keyup'))
    expect(input.getBitmask() & KEY_UP).toBe(0)
  })

  it('detach removes event listeners', () => {
    input.detach()
    document.dispatchEvent(createKeyboardEvent('ArrowUp', 'ArrowUp', 'keydown'))
    expect(input.getBitmask()).toBe(0)
  })

  it('prevents default for Arrow keys and Shift', () => {
    const event = createKeyboardEvent('ArrowUp', 'ArrowUp', 'keydown')
    const spy = vi.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)
    expect(spy).toHaveBeenCalled()
  })

  it('does not prevent default for other keys', () => {
    const event = createKeyboardEvent('KeyJ', 'j', 'keydown')
    const spy = vi.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)
    expect(spy).not.toHaveBeenCalled()
  })
})
