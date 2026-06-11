export interface HowToPlayCallbacks {
  onBack: () => void
}

export class HowToPlay {
  private container: HTMLDivElement

  constructor(callbacks: HowToPlayCallbacks) {
    this.container = document.createElement('div')
    this.container.id = 'how-to-play'
    Object.assign(this.container.style, {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: 'rgba(10, 10, 30, 0.95)',
      color: 'white',
      fontFamily: 'monospace',
      zIndex: '300',
      overflowY: 'auto',
    })

    const title = document.createElement('h1')
    title.textContent = 'How to Play'
    Object.assign(title.style, {
      fontSize: '36px',
      marginBottom: '24px',
      textTransform: 'uppercase',
      letterSpacing: '4px',
    })
    this.container.appendChild(title)

    const controlsTitle = document.createElement('h2')
    controlsTitle.textContent = 'Controls'
    Object.assign(controlsTitle.style, {
      fontSize: '20px',
      marginBottom: '12px',
      color: '#ffdd44',
    })
    this.container.appendChild(controlsTitle)

    const table = document.createElement('table')
    table.id = 'how-to-play-table'
    Object.assign(table.style, {
      borderCollapse: 'collapse',
      marginBottom: '28px',
      minWidth: '400px',
    })

    const controls: { action: string; key: string }[] = [
      { action: 'Move', key: 'Arrow Keys / WASD' },
      { action: 'Sprint', key: 'Hold Shift' },
      { action: 'Shoot', key: 'J' },
      { action: 'Pass', key: 'K' },
      { action: 'Standing Tackle', key: 'L' },
      { action: 'Slide Tackle', key: 'U' },
      { action: 'Switch Player', key: 'I' },
      { action: 'Skip Replay', key: 'Space' },
      { action: 'Pause', key: 'Escape' },
    ]

    for (const c of controls) {
      const row = document.createElement('tr')

      const actionCell = document.createElement('td')
      actionCell.textContent = c.action
      Object.assign(actionCell.style, {
        padding: '8px 24px 8px 12px',
        borderBottom: '1px solid #333',
        fontSize: '15px',
      })

      const keyCell = document.createElement('td')
      keyCell.textContent = c.key
      Object.assign(keyCell.style, {
        padding: '8px 12px',
        borderBottom: '1px solid #333',
        fontSize: '15px',
        color: '#aaa',
        textAlign: 'right',
      })

      row.appendChild(actionCell)
      row.appendChild(keyCell)
      table.appendChild(row)
    }

    this.container.appendChild(table)

    const mechanicsTitle = document.createElement('h2')
    mechanicsTitle.textContent = 'Game Mechanics'
    Object.assign(mechanicsTitle.style, {
      fontSize: '20px',
      marginBottom: '12px',
      color: '#ffdd44',
    })
    this.container.appendChild(mechanicsTitle)

    const mechanics: { label: string; desc: string }[] = [
      {
        label: 'Charge-Based Kicking',
        desc: 'Hold J (shoot) or K (pass) to charge power. The power bar fills from 0% to 100% over ~1 second. Release to kick — more charge means a faster, higher trajectory. Pass aims toward the nearest teammate within a 30° cone.',
      },
      {
        label: 'Player Switching',
        desc: 'Press I to switch control to the nearest outfield teammate to the ball. Pressing I again switches to the second-nearest. The goalkeeper is always AI-controlled.',
      },
      {
        label: 'Stamina System',
        desc: 'Sprinting (hold Shift) drains stamina. When stamina drops below 10%, sprint is disabled until it recovers. Stamina regenerates automatically while not sprinting.',
      },
    ]

    for (const m of mechanics) {
      const label = document.createElement('h3')
      label.textContent = m.label
      Object.assign(label.style, {
        fontSize: '16px',
        marginBottom: '6px',
        marginTop: '12px',
        color: '#eee',
      })
      this.container.appendChild(label)

      const desc = document.createElement('p')
      desc.textContent = m.desc
      Object.assign(desc.style, {
        fontSize: '13px',
        lineHeight: '1.5',
        color: '#aaa',
        maxWidth: '500px',
        margin: '0 0 4px 0',
      })
      this.container.appendChild(desc)
    }

    const backBtn = document.createElement('button')
    backBtn.id = 'how-to-play-back-btn'
    backBtn.textContent = 'Back'
    Object.assign(backBtn.style, {
      marginTop: '28px',
      padding: '12px 40px',
      fontSize: '18px',
      fontFamily: 'monospace',
      backgroundColor: '#457b9d',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    })
    backBtn.addEventListener('click', () => callbacks.onBack())
    this.container.appendChild(backBtn)
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.container)
  }

  unmount(): void {
    this.container.remove()
  }
}
