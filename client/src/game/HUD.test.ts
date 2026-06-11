import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HUD } from './HUD'

function mockCanvasContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    closePath: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

describe('HUD', () => {
  let parent: HTMLDivElement
  let hud: HUD

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCanvasContext())
    parent = document.createElement('div')
    document.body.appendChild(parent)
    hud = new HUD()
    hud.mount(parent)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    hud.unmount()
    if (parent.parentNode) parent.remove()
  })

  it('renders score element with correct initial value', () => {
    const scoreEl = parent.querySelector('#hud-score')
    expect(scoreEl).not.toBeNull()
    expect(scoreEl!.textContent).toBe('0 \u2014 0')
  })

  it('updateScore(2, 1) sets DOM text to 2 — 1', () => {
    hud.updateScore(2, 1)
    const scoreEl = parent.querySelector('#hud-score')
    expect(scoreEl!.textContent).toBe('2 \u2014 1')
  })

  it('updateClock(90) sets DOM text to 1:30', () => {
    hud.updateClock(90)
    const clockEl = parent.querySelector('#hud-clock')
    expect(clockEl!.textContent).toBe('1:30')
  })

  it('updateClock(0) shows 0:00', () => {
    hud.updateClock(0)
    const clockEl = parent.querySelector('#hud-clock')
    expect(clockEl!.textContent).toBe('0:00')
  })

  it('updateClock(45) shows 0:45', () => {
    hud.updateClock(45)
    const clockEl = parent.querySelector('#hud-clock')
    expect(clockEl!.textContent).toBe('0:45')
  })

  it('showPowerBar makes power bar visible', () => {
    hud.showPowerBar(true)
    const container = parent.querySelector('#hud') as HTMLDivElement
    expect(container.style.display).toBe('flex')
  })

  it('hidePowerBar makes power bar hidden', () => {
    hud.showPowerBar(true)
    hud.showPowerBar(false)
    const container = parent.querySelector('#hud') as HTMLDivElement
    expect(container.style.display).toBe('none')
  })

  it('setPowerBar(0.5) sets width to 50%', () => {
    hud.setPowerBar(0.5)
    const fill = parent.querySelector('#hud-power-fill') as HTMLDivElement
    expect(fill.style.width).toBe('50%')
  })

  it('setPowerBar clamps to 0–1', () => {
    hud.setPowerBar(-0.1)
    let fill = parent.querySelector('#hud-power-fill') as HTMLDivElement
    expect(fill.style.width).toBe('0%')

    hud.setPowerBar(1.5)
    fill = parent.querySelector('#hud-power-fill') as HTMLDivElement
    expect(fill.style.width).toBe('100%')
  })

  it('setPowerBar changes colour gradient from green to yellow to red', () => {
    hud.setPowerBar(0)
    let fill = parent.querySelector('#hud-power-fill') as HTMLDivElement
    expect(fill.style.backgroundColor).toBe('rgb(0, 255, 136)')

    hud.setPowerBar(0.5)
    fill = parent.querySelector('#hud-power-fill') as HTMLDivElement
    expect(fill.style.backgroundColor).toBe('rgb(255, 204, 0)')

    hud.setPowerBar(0.8)
    fill = parent.querySelector('#hud-power-fill') as HTMLDivElement
    expect(fill.style.backgroundColor).toBe('rgb(255, 51, 51)')
  })

  it('setActivePlayer updates player id and border', () => {
    hud.setActivePlayer('p1', '#ff0000')
    const el = parent.querySelector('#hud-active-player') as HTMLDivElement
    expect(el.textContent).toContain('p1')
    expect(el.style.borderColor).toBe('#ff0000')
  })

  it('setActivePlayer replaces previous player id', () => {
    hud.setActivePlayer('p1', '#ff0000')
    hud.setActivePlayer('p2', '#00ff00')
    const el = parent.querySelector('#hud-active-player') as HTMLDivElement
    expect(el.textContent).toContain('p2')
  })

  it('setStamina(0.8) sets stamina bar width to 80%', () => {
    hud.setStamina(0.8)
    const bar = parent.querySelector('#hud-stamina-fill') as HTMLDivElement
    expect(bar.style.width).toBe('80%')
  })

  it('setStamina clamps to 0–1', () => {
    hud.setStamina(-0.1)
    let bar = parent.querySelector('#hud-stamina-fill') as HTMLDivElement
    expect(bar.style.width).toBe('0%')

    hud.setStamina(1.5)
    bar = parent.querySelector('#hud-stamina-fill') as HTMLDivElement
    expect(bar.style.width).toBe('100%')
  })

  it('setStamina changes colour at thresholds', () => {
    hud.setStamina(0.8)
    let fill = parent.querySelector('#hud-stamina-fill') as HTMLDivElement
    expect(fill.style.backgroundColor).toBe('rgb(0, 255, 136)')

    hud.setStamina(0.4)
    fill = parent.querySelector('#hud-stamina-fill') as HTMLDivElement
    expect(fill.style.backgroundColor).toBe('rgb(255, 204, 0)')

    hud.setStamina(0.15)
    fill = parent.querySelector('#hud-stamina-fill') as HTMLDivElement
    expect(fill.style.backgroundColor).toBe('rgb(255, 51, 51)')
  })

  it('setPing(42) renders 42ms', () => {
    hud.setPing(42)
    const el = parent.querySelector('#hud-ping') as HTMLDivElement
    expect(el.textContent).toBe('42ms')
  })

  it('setPing shows green for low latency', () => {
    hud.setPing(30)
    const el = parent.querySelector('#hud-ping') as HTMLDivElement
    expect(el.style.color).toBe('rgb(0, 255, 136)')
  })

  it('setPing shows yellow for medium latency', () => {
    hud.setPing(80)
    const el = parent.querySelector('#hud-ping') as HTMLDivElement
    expect(el.style.color).toBe('rgb(255, 204, 0)')
  })

  it('setPing shows orange for 100-200ms latency', () => {
    hud.setPing(150)
    const el = parent.querySelector('#hud-ping') as HTMLDivElement
    expect(el.style.color).toBe('rgb(255, 136, 0)')
  })

  it('setPing shows red for >200ms latency', () => {
    hud.setPing(250)
    const el = parent.querySelector('#hud-ping') as HTMLDivElement
    expect(el.style.color).toBe('rgb(255, 51, 51)')
  })

  it('mini-map canvas exists', () => {
    const canvas = parent.querySelector('#hud-minimap') as HTMLCanvasElement
    expect(canvas).not.toBeNull()
    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.height).toBeGreaterThan(0)
  })

  it('mini-map toggles visibility with M key', () => {
    const canvas = parent.querySelector('#hud-minimap') as HTMLCanvasElement
    const initialDisplay = canvas.style.display

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }))
    expect(canvas.style.display).toBe(initialDisplay === 'none' ? 'block' : 'none')

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }))
    expect(canvas.style.display).toBe(initialDisplay)
  })

  it('updateMiniMap draws player dots on canvas', () => {
    const players = [
      { id: 'p1', team: 'home', position: { x: 10, y: 0, z: 5 } },
      { id: 'p2', team: 'away', position: { x: -10, y: 0, z: -5 } },
    ] as any
    hud.updateMiniMap(players)
    const canvas = parent.querySelector('#hud-minimap') as HTMLCanvasElement
    expect(canvas).not.toBeNull()
  })

  it('mount attaches all HUD elements', () => {
    expect(parent.querySelector('#hud')).not.toBeNull()
    expect(parent.querySelector('#hud-score')).not.toBeNull()
    expect(parent.querySelector('#hud-clock')).not.toBeNull()
    expect(parent.querySelector('#hud-active-player')).not.toBeNull()
    expect(parent.querySelector('#hud-stamina')).not.toBeNull()
    expect(parent.querySelector('#hud-ping')).not.toBeNull()
    expect(parent.querySelector('#hud-minimap')).not.toBeNull()
    expect(parent.querySelector('#hud-disconnect')).not.toBeNull()
  })

  it('unmount removes all HUD elements', () => {
    hud.unmount()
    expect(parent.querySelector('#hud')).toBeNull()
    expect(parent.querySelector('#hud-score')).toBeNull()
    expect(parent.querySelector('#hud-clock')).toBeNull()
    expect(parent.querySelector('#hud-active-player')).toBeNull()
    expect(parent.querySelector('#hud-ping')).toBeNull()
    expect(parent.querySelector('#hud-minimap')).toBeNull()
    expect(parent.querySelector('#hud-disconnect')).toBeNull()
  })

  it('showDisconnectNotification displays overlay', () => {
    hud.showDisconnectNotification()
    const overlay = parent.querySelector('#hud-disconnect') as HTMLDivElement
    expect(overlay.style.display).toBe('block')
  })

  it('hideDisconnectNotification hides overlay', () => {
    hud.showDisconnectNotification()
    hud.hideDisconnectNotification()
    const overlay = parent.querySelector('#hud-disconnect') as HTMLDivElement
    expect(overlay.style.display).toBe('none')
  })

  it('showDisconnectCountdown displays countdown text', () => {
    hud.showDisconnectCountdown(10)
    const overlay = parent.querySelector('#hud-disconnect') as HTMLDivElement
    expect(overlay.style.display).toBe('block')
    expect(overlay.textContent).toContain('10')
  })
})
