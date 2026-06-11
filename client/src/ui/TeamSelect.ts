import { audio } from '../game/Audio'
import type { TeamData } from '../../../shared/types.js'

export interface TeamSelectCallbacks {
  onSelectTeam: (teamId: string) => void
}

export class TeamSelect {
  private container: HTMLDivElement
  private cards: Map<string, HTMLDivElement> = new Map()
  private selectedId: string | null = null
  private opponentSelectedId: string | null = null
  private locked = false
  private onSelectTeam: (teamId: string) => void

  constructor(teams: TeamData[], callbacks: TeamSelectCallbacks) {
    this.onSelectTeam = callbacks.onSelectTeam

    this.container = document.createElement('div')
    this.container.id = 'team-select'

    const wrapper = document.createElement('div')
    wrapper.id = 'team-select-inner'
    Object.assign(wrapper.style, {
      padding: '20px',
      maxWidth: '900px',
      margin: '0 auto',
    })

    const title = document.createElement('h2')
    title.textContent = 'Select Your Team'
    Object.assign(title.style, {
      color: 'white',
      fontFamily: 'monospace',
      textAlign: 'center',
      marginBottom: '20px',
    })
    wrapper.appendChild(title)

    const grid = document.createElement('div')
    grid.id = 'team-grid'
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '12px',
    })

    for (const team of teams) {
      const card = this.createCard(team)
      this.cards.set(team.id, card)
      grid.appendChild(card)
    }

    wrapper.appendChild(grid)
    this.container.appendChild(wrapper)
  }

  private createCard(team: TeamData): HTMLDivElement {
    const card = document.createElement('div')
    card.id = `team-card-${team.id}`
    card.dataset.teamId = team.id
    Object.assign(card.style, {
      backgroundColor: 'rgba(255,255,255,0.08)',
      border: '2px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      padding: '12px',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'border-color 0.15s, background-color 0.15s, opacity 0.15s',
      fontFamily: 'monospace',
      userSelect: 'none',
    })
    card.addEventListener('mouseenter', () => {
      if (!this.locked && this.selectedId !== team.id && this.opponentSelectedId !== team.id) {
        card.style.borderColor = 'rgba(255,255,255,0.4)'
      }
    })
    card.addEventListener('mouseleave', () => {
      if (!this.locked && this.selectedId !== team.id && this.opponentSelectedId !== team.id) {
        card.style.borderColor = 'rgba(255,255,255,0.15)'
      }
    })
    card.addEventListener('click', () => {
      if (this.locked || this.selectedId === team.id) return
      audio.play('menu-click')
      this.selectedId = team.id
      this.updateCardStyles()
      this.onSelectTeam(team.id)
    })

    const flag = document.createElement('div')
    flag.textContent = team.flagEmoji
    flag.style.fontSize = '32px'
    flag.style.marginBottom = '4px'

    const name = document.createElement('div')
    name.textContent = team.name
    Object.assign(name.style, {
      color: 'white',
      fontSize: '13px',
      fontWeight: 'bold',
      marginBottom: '8px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    })

    const colorRow = document.createElement('div')
    Object.assign(colorRow.style, {
      display: 'flex',
      justifyContent: 'center',
      gap: '6px',
    })

    const homeSwatch = document.createElement('div')
    Object.assign(homeSwatch.style, {
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: team.homeColor,
      border: '1px solid rgba(255,255,255,0.3)',
    })
    homeSwatch.title = 'Home kit'

    const awaySwatch = document.createElement('div')
    Object.assign(awaySwatch.style, {
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: team.awayColor,
      border: '1px solid rgba(255,255,255,0.3)',
    })
    awaySwatch.title = 'Away kit'

    colorRow.appendChild(homeSwatch)
    colorRow.appendChild(awaySwatch)

    card.appendChild(flag)
    card.appendChild(name)
    card.appendChild(colorRow)

    return card
  }

  private updateCardStyles(): void {
    for (const [id, card] of this.cards) {
      if (id === this.selectedId) {
        card.style.borderColor = '#00ff88'
        card.style.backgroundColor = 'rgba(0,255,136,0.15)'
        card.style.opacity = '1'
      } else if (id === this.opponentSelectedId) {
        card.style.borderColor = '#ffcc00'
        card.style.backgroundColor = 'rgba(255,204,0,0.1)'
        card.style.opacity = '0.7'
      } else {
        card.style.borderColor = 'rgba(255,255,255,0.15)'
        card.style.backgroundColor = 'rgba(255,255,255,0.08)'
        card.style.opacity = this.selectedId !== null ? '0.5' : '1'
      }
    }
  }

  setOpponentSelection(playerId: string, teamId: string): void {
    this.opponentSelectedId = teamId
    this.updateCardStyles()
  }

  lockSelection(): void {
    this.locked = true
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.container)
  }

  unmount(): void {
    this.container.remove()
  }
}
