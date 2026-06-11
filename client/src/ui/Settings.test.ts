import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Settings } from './Settings'

describe('Settings', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
    localStorage.clear()
  })

  it('renders container with settings id', () => {
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    expect(parent.querySelector('#settings')).not.toBeNull()
  })

  it('renders volume slider with default value 80', () => {
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    const slider = parent.querySelector('#settings-volume-slider') as HTMLInputElement
    expect(slider).not.toBeNull()
    expect(slider.value).toBe('80')
  })

  it('renders volume value display with default 80%', () => {
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    const value = parent.querySelector('#settings-volume-value') as HTMLSpanElement
    expect(value.textContent).toBe('80%')
  })

  it('renders fullscreen toggle', () => {
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    const toggle = parent.querySelector('#settings-fullscreen-toggle') as HTMLInputElement
    expect(toggle).not.toBeNull()
    expect(toggle.type).toBe('checkbox')
  })

  it('renders quality select with medium default', () => {
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    const select = parent.querySelector('#settings-quality-select') as HTMLSelectElement
    expect(select).not.toBeNull()
    expect(select.value).toBe('medium')
  })

  it('renders Back button', () => {
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    const btn = parent.querySelector('#settings-back-btn') as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('Back')
  })

  it('dispatches onBack when Back button clicked', () => {
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    const btn = parent.querySelector('#settings-back-btn') as HTMLButtonElement
    btn.click()
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('updates volume value display when slider changes', () => {
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    const slider = parent.querySelector('#settings-volume-slider') as HTMLInputElement
    const value = parent.querySelector('#settings-volume-value') as HTMLSpanElement
    slider.value = '50'
    slider.dispatchEvent(new Event('input'))
    expect(value.textContent).toBe('50%')
  })

  it('persists volume change to localStorage', () => {
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    const slider = parent.querySelector('#settings-volume-slider') as HTMLInputElement
    slider.value = '30'
    slider.dispatchEvent(new Event('input'))
    const stored = JSON.parse(localStorage.getItem('nations-clash-settings') ?? '{}')
    expect(stored.volume).toBe(30)
  })

  it('reads settings back from localStorage on render', () => {
    localStorage.setItem('nations-clash-settings', JSON.stringify({ volume: 25 }))
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    const slider = parent.querySelector('#settings-volume-slider') as HTMLInputElement
    expect(slider.value).toBe('25')
  })

  it('unmount removes container from parent', () => {
    const onBack = vi.fn()
    const s = new Settings({ onBack })
    s.mount(parent)
    expect(parent.children.length).toBe(1)
    s.unmount()
    expect(parent.children.length).toBe(0)
  })
})
