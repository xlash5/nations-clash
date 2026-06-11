import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PostMatch } from './PostMatch'

describe('PostMatch', () => {
  let parent: HTMLDivElement

  const score = { teamA: 3, teamB: 2 }
  const goals = [
    { playerId: 'home-3', team: 'home' as const, time: 23, isOwnGoal: false },
    { playerId: 'home-5', team: 'home' as const, time: 45, isOwnGoal: false },
    { playerId: 'away-9', team: 'away' as const, time: 67, isOwnGoal: false },
    { playerId: 'away-11', team: 'away' as const, time: 89, isOwnGoal: false },
    { playerId: 'home-7', team: 'home' as const, time: 90, isOwnGoal: true, name: 'home-7' },
  ]

  const homeTeamName = 'Brazil'
  const awayTeamName = 'Argentina'

  beforeEach(() => {
    parent = document.createElement('div')
  })

  it('renders final score', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const scoreEl = parent.querySelector('#post-match-score')
    expect(scoreEl).not.toBeNull()
    expect(scoreEl!.textContent).toContain('3')
    expect(scoreEl!.textContent).toContain('2')
  })

  it('renders team names in score', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const scoreEl = parent.querySelector('#post-match-score')
    expect(scoreEl!.textContent).toContain('Brazil')
    expect(scoreEl!.textContent).toContain('Argentina')
  })

  it('renders goal scorers list', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const goalsList = parent.querySelector('#post-match-goals')
    expect(goalsList).not.toBeNull()
    expect(goalsList!.children.length).toBe(5)
  })

  it('renders rematch button', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const btn = parent.querySelector('#post-match-rematch-btn') as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('Rematch')
  })

  it('renders leave button', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const btn = parent.querySelector('#post-match-leave-btn') as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('Leave')
  })

  it('dispatches onRematch when rematch button clicked', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const btn = parent.querySelector('#post-match-rematch-btn') as HTMLButtonElement
    btn.click()
    expect(onRematch).toHaveBeenCalledTimes(1)
  })

  it('dispatches onLeave when leave button clicked', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const btn = parent.querySelector('#post-match-leave-btn') as HTMLButtonElement
    btn.click()
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('shows "Waiting for opponent" after rematch clicked', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const btn = parent.querySelector('#post-match-rematch-btn') as HTMLButtonElement
    btn.click()

    const statusEl = parent.querySelector('#post-match-status')
    expect(statusEl!.textContent).toBe('Waiting for opponent...')
  })

  it('disables rematch button after clicking', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const btn = parent.querySelector('#post-match-rematch-btn') as HTMLButtonElement
    btn.click()
    expect(btn.disabled).toBe(true)
  })

  it('setOpponentRematchRequested shows correct status', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    pm.setOpponentRematchRequested()

    const statusEl = parent.querySelector('#post-match-status')
    expect(statusEl!.textContent).toBe('Opponent wants a rematch!')
  })

  it('setOpponentRematchRequested shows "Rematch accepted!" after local clicked', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const btn = parent.querySelector('#post-match-rematch-btn') as HTMLButtonElement
    btn.click()
    pm.setOpponentRematchRequested()

    const statusEl = parent.querySelector('#post-match-status')
    expect(statusEl!.textContent).toBe('Rematch accepted!')
  })

  it('showOpponentLeft updates status', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    pm.showOpponentLeft()

    const statusEl = parent.querySelector('#post-match-status')
    expect(statusEl!.textContent).toBe('Opponent left')
  })

  it('showOpponentLeft disables rematch button', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    pm.showOpponentLeft()

    const btn = parent.querySelector('#post-match-rematch-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('unmount removes container from parent', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, goals, homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)
    expect(parent.children.length).toBe(1)

    pm.unmount()
    expect(parent.children.length).toBe(0)
  })

  it('renders without goals', () => {
    const onRematch = vi.fn()
    const onLeave = vi.fn()
    const pm = new PostMatch(score, [], homeTeamName, awayTeamName, { onRematch, onLeave })
    pm.mount(parent)

    const goalsList = parent.querySelector('#post-match-goals')
    expect(goalsList).toBeNull()
  })
})
