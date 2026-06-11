import type { PlayerState } from '../../../shared/types.js'

const PITCH_W = 105
const PITCH_H = 68
const MINIMAP_W = 150
const MINIMAP_H = 100
const MINIMAP_PAD = 8
const MINIMAP_PITCH_W = MINIMAP_W - MINIMAP_PAD * 2
const MINIMAP_PITCH_H = MINIMAP_H - MINIMAP_PAD * 2
const DOT_RADIUS = 3

export class HUD {
  private container: HTMLDivElement
  private scoreEl: HTMLDivElement
  private clockEl: HTMLDivElement
  private powerBarContainer: HTMLDivElement
  private powerBarFill: HTMLDivElement
  private activePlayerEl: HTMLDivElement
  private staminaFill: HTMLDivElement
  private pingEl: HTMLDivElement
  private miniMapCanvas: HTMLCanvasElement
  private miniMapCtx: CanvasRenderingContext2D | null
  private miniMapVisible: boolean

  constructor() {
    this.miniMapVisible = true

    this.container = document.createElement('div')
    this.container.id = 'hud-container'
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '100',
      fontFamily: 'monospace',
    })

    this.scoreEl = document.createElement('div')
    this.scoreEl.id = 'hud-score'
    Object.assign(this.scoreEl.style, {
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'white',
      fontSize: '28px',
      fontWeight: 'bold',
      textShadow: '2px 2px 6px rgba(0,0,0,0.9)',
      letterSpacing: '4px',
    })
    this.scoreEl.textContent = '0 \u2014 0'
    this.container.appendChild(this.scoreEl)

    this.clockEl = document.createElement('div')
    this.clockEl.id = 'hud-clock'
    Object.assign(this.clockEl.style, {
      position: 'absolute',
      top: '52px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'rgba(255,255,255,0.8)',
      fontSize: '14px',
      fontWeight: 'bold',
      textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
      letterSpacing: '2px',
    })
    this.clockEl.textContent = '0:00'
    this.container.appendChild(this.clockEl)

    this.activePlayerEl = document.createElement('div')
    this.activePlayerEl.id = 'hud-active-player'
    Object.assign(this.activePlayerEl.style, {
      position: 'absolute',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
      padding: '4px 10px',
      borderRadius: '4px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      border: '2px solid transparent',
      transition: 'border-color 0.15s',
    })
    this.activePlayerEl.textContent = '\u25B6 ...'
    this.container.appendChild(this.activePlayerEl)

    const staminaContainer = document.createElement('div')
    staminaContainer.id = 'hud-stamina'
    Object.assign(staminaContainer.style, {
      position: 'absolute',
      top: '108px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100px',
      height: '6px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '3px',
      overflow: 'hidden',
    })

    this.staminaFill = document.createElement('div')
    this.staminaFill.id = 'hud-stamina-fill'
    Object.assign(this.staminaFill.style, {
      width: '100%',
      height: '100%',
      backgroundColor: '#00ff88',
      transition: 'width 100ms linear',
    })
    staminaContainer.appendChild(this.staminaFill)
    this.container.appendChild(staminaContainer)

    this.powerBarContainer = document.createElement('div')
    this.powerBarContainer.id = 'hud'
    Object.assign(this.powerBarContainer.style, {
      position: 'absolute',
      bottom: '30px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
    })

    const label = document.createElement('span')
    label.textContent = 'POWER'
    Object.assign(label.style, {
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    })
    this.powerBarContainer.appendChild(label)

    const powerBarOuter = document.createElement('div')
    Object.assign(powerBarOuter.style, {
      width: '150px',
      height: '12px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      border: '2px solid white',
      borderRadius: '4px',
      overflow: 'hidden',
    })

    this.powerBarFill = document.createElement('div')
    this.powerBarFill.id = 'hud-power-fill'
    Object.assign(this.powerBarFill.style, {
      width: '0%',
      height: '100%',
      backgroundColor: '#00ff88',
      transition: 'width 50ms linear',
    })

    powerBarOuter.appendChild(this.powerBarFill)
    this.powerBarContainer.appendChild(powerBarOuter)
    this.container.appendChild(this.powerBarContainer)

    this.pingEl = document.createElement('div')
    this.pingEl.id = 'hud-ping'
    Object.assign(this.pingEl.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      color: '#00ff88',
      fontSize: '12px',
      fontWeight: 'bold',
      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    })
    this.pingEl.textContent = '0ms'
    this.container.appendChild(this.pingEl)

    this.miniMapCanvas = document.createElement('canvas')
    this.miniMapCanvas.id = 'hud-minimap'
    this.miniMapCanvas.width = MINIMAP_W
    this.miniMapCanvas.height = MINIMAP_H
    Object.assign(this.miniMapCanvas.style, {
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      borderRadius: '6px',
      border: '2px solid rgba(255,255,255,0.3)',
      display: 'block',
    })
    this.miniMapCtx = this.miniMapCanvas.getContext('2d')
    this.container.appendChild(this.miniMapCanvas)

    document.addEventListener('keydown', this.onKeyDown)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'KeyM') {
      this.toggleMiniMap()
    }
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.container)
  }

  unmount(): void {
    this.container.remove()
    document.removeEventListener('keydown', this.onKeyDown)
  }

  show(): void {
    this.container.style.display = 'block'
  }

  hide(): void {
    this.container.style.display = 'none'
  }

  showPowerBar(visible: boolean): void {
    this.powerBarContainer.style.display = visible ? 'flex' : 'none'
  }

  setPowerBar(fraction: number): void {
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

  setPower(fraction: number): void {
    this.setPowerBar(fraction)
  }

  updateScore(teamA: number, teamB: number): void {
    this.scoreEl.textContent = `${teamA} \u2014 ${teamB}`
  }

  updateClock(totalSeconds: number): void {
    const s = Math.max(0, Math.round(totalSeconds))
    const mins = Math.floor(s / 60)
    const secs = s % 60
    this.clockEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`
  }

  setActivePlayer(playerId: string, teamColor: string): void {
    this.activePlayerEl.textContent = `\u25B6 ${playerId}`
    this.activePlayerEl.style.borderColor = teamColor
  }

  setStamina(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction))
    this.staminaFill.style.width = `${clamped * 100}%`

    if (clamped > 0.5) {
      this.staminaFill.style.backgroundColor = '#00ff88'
    } else if (clamped > 0.25) {
      this.staminaFill.style.backgroundColor = '#ffcc00'
    } else {
      this.staminaFill.style.backgroundColor = '#ff3333'
    }
  }

  setPing(ms: number): void {
    const display = Math.max(0, Math.round(ms))
    this.pingEl.textContent = `${display}ms`

    if (display < 50) {
      this.pingEl.style.color = '#00ff88'
    } else if (display < 100) {
      this.pingEl.style.color = '#ffcc00'
    } else {
      this.pingEl.style.color = '#ff3333'
    }
  }

  toggleMiniMap(): void {
    this.miniMapVisible = !this.miniMapVisible
    this.miniMapCanvas.style.display = this.miniMapVisible ? 'block' : 'none'
  }

  updateMiniMap(players: PlayerState[]): void {
    const ctx = this.miniMapCtx
    if (!ctx) return

    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H)

    this.drawMiniPitch(ctx)

    for (const player of players) {
      const px = MINIMAP_PAD + (player.position.x / PITCH_W + 0.5) * MINIMAP_PITCH_W
      const py = MINIMAP_PAD + (player.position.z / PITCH_H + 0.5) * MINIMAP_PITCH_H

      ctx.beginPath()
      ctx.arc(px, py, DOT_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = player.team === 'home' ? '#e63946' : '#457b9d'
      ctx.fill()

      if (player.isHumanControlled) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      if (player.isGk) {
        ctx.fillStyle = '#ffcc00'
        ctx.beginPath()
        ctx.arc(px, py, DOT_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const ballX = MINIMAP_PAD + (0 / PITCH_W + 0.5) * MINIMAP_PITCH_W
    const ballY = MINIMAP_PAD + (0 / PITCH_H + 0.5) * MINIMAP_PITCH_H
    ctx.beginPath()
    ctx.arc(ballX, ballY, 2, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }

  private drawMiniPitch(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1a4a1a'
    ctx.fillRect(MINIMAP_PAD, MINIMAP_PAD, MINIMAP_PITCH_W, MINIMAP_PITCH_H)

    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 0.5
    ctx.strokeRect(MINIMAP_PAD, MINIMAP_PAD, MINIMAP_PITCH_W, MINIMAP_PITCH_H)

    const cx = MINIMAP_W / 2
    const cy = MINIMAP_H / 2

    ctx.beginPath()
    ctx.moveTo(cx, MINIMAP_PAD)
    ctx.lineTo(cx, MINIMAP_H - MINIMAP_PAD)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, 8, 0, Math.PI * 2)
    ctx.stroke()
  }
}
