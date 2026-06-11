import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FormationSelect } from './FormationSelect'

describe('FormationSelect', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
  })

  it('renders all 5 formation options', () => {
    const onSelectFormation = vi.fn()
    const fs = new FormationSelect({ onSelectFormation })
    fs.mount(parent)

    const formationNames = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2']
    for (const name of formationNames) {
      const cardId = `formation-card-${name.replace(/\//g, '-')}`
      const card = parent.querySelector(`#${cardId}`)
      expect(card).not.toBeNull()
      expect(card!.textContent).toContain(name)
    }
  })

  it('dispatches onSelectFormation when card is clicked', () => {
    const onSelectFormation = vi.fn()
    const fs = new FormationSelect({ onSelectFormation })
    fs.mount(parent)

    const card = parent.querySelector('#formation-card-4-3-3') as HTMLDivElement
    card.click()
    expect(onSelectFormation).toHaveBeenCalledWith('4-3-3')
  })

  it('does not dispatch onSelectFormation on second click of same formation', () => {
    const onSelectFormation = vi.fn()
    const fs = new FormationSelect({ onSelectFormation })
    fs.mount(parent)

    const card = parent.querySelector('#formation-card-4-3-3') as HTMLDivElement
    card.click()
    card.click()
    expect(onSelectFormation).toHaveBeenCalledTimes(1)
  })

  it('does not dispatch onSelectFormation when locked', () => {
    const onSelectFormation = vi.fn()
    const fs = new FormationSelect({ onSelectFormation })
    fs.mount(parent)
    fs.lockSelection()

    const card = parent.querySelector('#formation-card-4-3-3') as HTMLDivElement
    card.click()
    expect(onSelectFormation).not.toHaveBeenCalled()
  })

  it('setOpponentSelection updates opponent card style', () => {
    const onSelectFormation = vi.fn()
    const fs = new FormationSelect({ onSelectFormation })
    fs.mount(parent)

    fs.setOpponentSelection('player-2', '4-3-3')
    const card = parent.querySelector('#formation-card-4-3-3') as HTMLDivElement
    expect(card.style.borderColor).toBe('#ffcc00')
  })

  it('renders a canvas mini-pitch for each formation', () => {
    const onSelectFormation = vi.fn()
    const fs = new FormationSelect({ onSelectFormation })
    fs.mount(parent)

    const canvases = parent.querySelectorAll('canvas')
    expect(canvases.length).toBe(5)
  })

  it('unmount removes container from parent', () => {
    const onSelectFormation = vi.fn()
    const fs = new FormationSelect({ onSelectFormation })
    fs.mount(parent)
    expect(parent.children.length).toBe(1)

    fs.unmount()
    expect(parent.children.length).toBe(0)
  })
})
