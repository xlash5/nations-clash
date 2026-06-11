export interface PostMatchCallbacks {
  onRematch: () => void
  onLeave: () => void
}

export interface GoalInfo {
  playerId: string | null
  team: 'home' | 'away'
  time: number
  isOwnGoal: boolean
}

export class PostMatch {
  private container: HTMLDivElement
  private statusEl: HTMLDivElement
  private rematchBtn: HTMLButtonElement
  private leaveBtn: HTMLButtonElement
  private _hasRequestedRematch = false

  constructor(
    private score: { teamA: number; teamB: number },
    private goals: GoalInfo[],
    private homeTeamName: string,
    private awayTeamName: string,
    callbacks: PostMatchCallbacks,
  ) {
    this.container = document.createElement('div')
    this.container.id = 'post-match'
    Object.assign(this.container.style, {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(10, 10, 30, 0.95)',
      color: 'white',
      fontFamily: 'monospace',
      zIndex: '300',
    })

    const title = document.createElement('h1')
    title.textContent = 'Full Time'
    Object.assign(title.style, {
      fontSize: '36px',
      marginBottom: '20px',
      textTransform: 'uppercase',
      letterSpacing: '4px',
    })
    this.container.appendChild(title)

    const scoreEl = document.createElement('div')
    scoreEl.id = 'post-match-score'
    scoreEl.textContent = `${homeTeamName} ${score.teamA} — ${score.teamB} ${awayTeamName}`
    Object.assign(scoreEl.style, {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '24px',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    })
    this.container.appendChild(scoreEl)

    if (goals.length > 0) {
      const goalsTitle = document.createElement('h3')
      goalsTitle.textContent = 'Goal Scorers'
      Object.assign(goalsTitle.style, {
        fontSize: '18px',
        marginBottom: '8px',
        color: '#aaa',
      })
      this.container.appendChild(goalsTitle)

      const goalsList = document.createElement('ul')
      goalsList.id = 'post-match-goals'
      Object.assign(goalsList.style, {
        listStyle: 'none',
        padding: '0',
        marginBottom: '32px',
        textAlign: 'center',
      })

      for (const g of goals) {
        const li = document.createElement('li')
        const teamName = g.team === 'home' ? homeTeamName : awayTeamName
        const timeDisplay = typeof g.time === 'number' ? `${Math.floor(g.time)}'` : ''
        const ownGoalSuffix = g.isOwnGoal ? ' (o.g.)' : ''
        const scorerName = g.playerId ? `${g.playerId.slice(0, 6)}` : 'Unknown'
        li.textContent = `${scorerName}${ownGoalSuffix} — ${teamName} ${timeDisplay}`
        Object.assign(li.style, {
          padding: '4px 0',
          fontSize: '14px',
          color: '#ccc',
        })
        goalsList.appendChild(li)
      }

      this.container.appendChild(goalsList)
    }

    this.statusEl = document.createElement('div')
    this.statusEl.id = 'post-match-status'
    Object.assign(this.statusEl.style, {
      fontSize: '16px',
      marginBottom: '16px',
      minHeight: '20px',
      color: '#ffdd44',
    })
    this.container.appendChild(this.statusEl)

    const btnRow = document.createElement('div')
    Object.assign(btnRow.style, {
      display: 'flex',
      gap: '16px',
    })

    this.rematchBtn = document.createElement('button')
    this.rematchBtn.id = 'post-match-rematch-btn'
    this.rematchBtn.textContent = 'Rematch'
    Object.assign(this.rematchBtn.style, {
      padding: '12px 28px',
      fontSize: '18px',
      fontFamily: 'monospace',
      backgroundColor: '#00aa44',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    })
    this.rematchBtn.addEventListener('click', () => {
      if (this._hasRequestedRematch) return
      this._hasRequestedRematch = true
      this.rematchBtn.disabled = true
      this.rematchBtn.style.opacity = '0.5'
      this.setStatus('Waiting for opponent...')
      callbacks.onRematch()
    })
    btnRow.appendChild(this.rematchBtn)

    this.leaveBtn = document.createElement('button')
    this.leaveBtn.id = 'post-match-leave-btn'
    this.leaveBtn.textContent = 'Leave'
    Object.assign(this.leaveBtn.style, {
      padding: '12px 28px',
      fontSize: '18px',
      fontFamily: 'monospace',
      backgroundColor: '#cc3333',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    })
    this.leaveBtn.addEventListener('click', () => {
      callbacks.onLeave()
    })
    btnRow.appendChild(this.leaveBtn)

    this.container.appendChild(btnRow)
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.container)
  }

  unmount(): void {
    this.container.remove()
  }

  setStatus(text: string): void {
    this.statusEl.textContent = text
  }

  setOpponentRematchRequested(): void {
    if (!this._hasRequestedRematch) {
      this.setStatus('Opponent wants a rematch!')
    } else {
      this.setStatus('Rematch accepted!')
    }
  }

  showOpponentLeft(): void {
    this.setStatus('Opponent left')
    this.rematchBtn.disabled = true
    this.rematchBtn.style.opacity = '0.3'
  }
}
