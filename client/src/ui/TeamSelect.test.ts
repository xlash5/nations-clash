import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TeamSelect } from './TeamSelect'
import type { TeamData } from '../../../shared/types.js'

const mockTeams: TeamData[] = [
  { id: 'england', name: 'England', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', homeColor: '#FFFFFF', awayColor: '#C8102E', formation: '4-3-3', players: [] },
  { id: 'brazil', name: 'Brazil', flagEmoji: '🇧🇷', homeColor: '#FFDF00', awayColor: '#003DA5', formation: '4-3-3', players: [] },
  { id: 'germany', name: 'Germany', flagEmoji: '🇩🇪', homeColor: '#FFFFFF', awayColor: '#000000', formation: '4-2-3-1', players: [] },
]

describe('TeamSelect', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
  })

  it('renders all teams as cards', () => {
    const onSelectTeam = vi.fn()
    const ts = new TeamSelect(mockTeams, { onSelectTeam })
    ts.mount(parent)

    for (const team of mockTeams) {
      const card = parent.querySelector(`#team-card-${team.id}`)
      expect(card).not.toBeNull()
      expect(card!.textContent).toContain(team.name)
    }
  })

  it('shows flag emoji for each team', () => {
    const onSelectTeam = vi.fn()
    const ts = new TeamSelect(mockTeams, { onSelectTeam })
    ts.mount(parent)

    for (const team of mockTeams) {
      const card = parent.querySelector(`#team-card-${team.id}`)
      expect(card!.textContent).toContain(team.flagEmoji)
    }
  })

  it('dispatches onSelectTeam when card is clicked', () => {
    const onSelectTeam = vi.fn()
    const ts = new TeamSelect(mockTeams, { onSelectTeam })
    ts.mount(parent)

    const card = parent.querySelector('#team-card-england') as HTMLDivElement
    card.click()
    expect(onSelectTeam).toHaveBeenCalledWith('england')
  })

  it('does not dispatch onSelectTeam on second click of same team', () => {
    const onSelectTeam = vi.fn()
    const ts = new TeamSelect(mockTeams, { onSelectTeam })
    ts.mount(parent)

    const card = parent.querySelector('#team-card-england') as HTMLDivElement
    card.click()
    card.click()
    expect(onSelectTeam).toHaveBeenCalledTimes(1)
  })

  it('does not dispatch onSelectTeam when locked', () => {
    const onSelectTeam = vi.fn()
    const ts = new TeamSelect(mockTeams, { onSelectTeam })
    ts.mount(parent)
    ts.lockSelection()

    const card = parent.querySelector('#team-card-england') as HTMLDivElement
    card.click()
    expect(onSelectTeam).not.toHaveBeenCalled()
  })

  it('setOpponentSelection updates opponent card style', () => {
    const onSelectTeam = vi.fn()
    const ts = new TeamSelect(mockTeams, { onSelectTeam })
    ts.mount(parent)

    ts.setOpponentSelection('player-2', 'brazil')
    const card = parent.querySelector('#team-card-brazil') as HTMLDivElement
    expect(card.style.borderColor).toBe('#ffcc00')
  })

  it('unmount removes container from parent', () => {
    const onSelectTeam = vi.fn()
    const ts = new TeamSelect(mockTeams, { onSelectTeam })
    ts.mount(parent)
    expect(parent.children.length).toBe(1)

    ts.unmount()
    expect(parent.children.length).toBe(0)
  })
})
