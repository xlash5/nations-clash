import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HowToPlay } from './HowToPlay'

describe('HowToPlay', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
  })

  it('renders the controls table', () => {
    const onBack = vi.fn()
    const htp = new HowToPlay({ onBack })
    htp.mount(parent)

    const table = parent.querySelector('#how-to-play-table')
    expect(table).not.toBeNull()
  })

  it('renders all 9 control rows', () => {
    const onBack = vi.fn()
    const htp = new HowToPlay({ onBack })
    htp.mount(parent)

    const table = parent.querySelector('#how-to-play-table') as HTMLTableElement
    expect(table.rows.length).toBe(9)
  })

  it('renders Move row with correct keys', () => {
    const onBack = vi.fn()
    const htp = new HowToPlay({ onBack })
    htp.mount(parent)

    const table = parent.querySelector('#how-to-play-table') as HTMLTableElement
    expect(table.rows[0].cells[0].textContent).toBe('Move')
    expect(table.rows[0].cells[1].textContent).toBe('Arrow Keys / WASD')
  })

  it('renders Shoot row with J key', () => {
    const onBack = vi.fn()
    const htp = new HowToPlay({ onBack })
    htp.mount(parent)

    const table = parent.querySelector('#how-to-play-table') as HTMLTableElement
    expect(table.rows[2].cells[0].textContent).toBe('Shoot')
    expect(table.rows[2].cells[1].textContent).toBe('J')
  })

  it('renders Switch Player row with I key', () => {
    const onBack = vi.fn()
    const htp = new HowToPlay({ onBack })
    htp.mount(parent)

    const table = parent.querySelector('#how-to-play-table') as HTMLTableElement
    expect(table.rows[6].cells[0].textContent).toBe('Switch Player')
    expect(table.rows[6].cells[1].textContent).toBe('I')
  })

  it('renders Back button', () => {
    const onBack = vi.fn()
    const htp = new HowToPlay({ onBack })
    htp.mount(parent)

    const btn = parent.querySelector('#how-to-play-back-btn') as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('Back')
  })

  it('dispatches onBack when Back button clicked', () => {
    const onBack = vi.fn()
    const htp = new HowToPlay({ onBack })
    htp.mount(parent)

    const btn = parent.querySelector('#how-to-play-back-btn') as HTMLButtonElement
    btn.click()
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders title', () => {
    const onBack = vi.fn()
    const htp = new HowToPlay({ onBack })
    htp.mount(parent)

    expect(parent.textContent).toContain('How to Play')
  })

  it('renders game mechanics explanations', () => {
    const onBack = vi.fn()
    const htp = new HowToPlay({ onBack })
    htp.mount(parent)

    expect(parent.textContent).toContain('Charge-Based Kicking')
    expect(parent.textContent).toContain('Player Switching')
    expect(parent.textContent).toContain('Stamina System')
  })

  it('unmount removes container from parent', () => {
    const onBack = vi.fn()
    const htp = new HowToPlay({ onBack })
    htp.mount(parent)
    expect(parent.children.length).toBe(1)

    htp.unmount()
    expect(parent.children.length).toBe(0)
  })
})
