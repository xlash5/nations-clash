export class HUD {
  private container: HTMLDivElement
  private powerBarContainer: HTMLDivElement
  private powerBarFill: HTMLDivElement
  private activePlayerEl: HTMLDivElement

  constructor() {
    this.container = document.createElement('div')
    this.container.id = 'hud'
    Object.assign(this.container.style, {
      position: 'absolute',
      bottom: '30px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      pointerEvents: 'none',
      zIndex: '100',
    })

    const label = document.createElement('span')
    label.textContent = 'POWER'
    Object.assign(label.style, {
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '12px',
      fontWeight: 'bold',
      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    })
    this.container.appendChild(label)

    this.powerBarContainer = document.createElement('div')
    Object.assign(this.powerBarContainer.style, {
      width: '150px',
      height: '12px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      border: '2px solid white',
      borderRadius: '4px',
      overflow: 'hidden',
    })

    this.powerBarFill = document.createElement('div')
    Object.assign(this.powerBarFill.style, {
      width: '0%',
      height: '100%',
      backgroundColor: '#00ff88',
      transition: 'width 50ms linear',
    })

    this.powerBarContainer.appendChild(this.powerBarFill)
    this.container.appendChild(this.powerBarContainer)

    this.activePlayerEl = document.createElement('div')
    this.activePlayerEl.id = 'hud-active-player'
    Object.assign(this.activePlayerEl.style, {
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '14px',
      fontWeight: 'bold',
      textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
      pointerEvents: 'none',
      zIndex: '100',
      display: 'block',
      padding: '6px 14px',
      borderRadius: '4px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      border: '2px solid transparent',
      transition: 'border-color 0.15s',
    })
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.container)
    parent.appendChild(this.activePlayerEl)
  }

  unmount(): void {
    this.container.remove()
    this.activePlayerEl.remove()
  }

  show(): void {
    this.container.style.display = 'flex'
  }

  hide(): void {
    this.container.style.display = 'none'
  }

  setPower(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction))
    this.powerBarFill.style.width = `${clamped * 100}%`

    if (clamped < 0.33) {
      this.powerBarFill.style.backgroundColor = '#00ff88'
    } else if (clamped < 0.66) {
      this.powerBarFill.style.backgroundColor = '#ffcc00'
    } else {
      this.powerBarFill.style.backgroundColor = '#ff3333'
    }
  }

  setActivePlayer(playerId: string, teamColor: string): void {
    this.activePlayerEl.textContent = `▶ ${playerId}`
    this.activePlayerEl.style.borderColor = teamColor
  }
}
