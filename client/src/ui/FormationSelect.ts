import type { FormationName } from '../../../shared/types.js'

export interface FormationSelectCallbacks {
  onSelectFormation: (formation: string) => void
}

const FORMATION_SLOTS: Record<string, { x: number; z: number }[]> = {
  '4-4-2': [
    { x: 0, z: -0.95 }, { x: -0.7, z: -0.55 }, { x: -0.2, z: -0.7 }, { x: 0.2, z: -0.7 }, { x: 0.7, z: -0.55 },
    { x: -0.7, z: 0.0 }, { x: -0.2, z: 0.05 }, { x: 0.2, z: 0.05 }, { x: 0.7, z: 0.0 },
    { x: -0.3, z: 0.65 }, { x: 0.3, z: 0.65 },
  ],
  '4-3-3': [
    { x: 0, z: -0.95 }, { x: -0.7, z: -0.5 }, { x: -0.2, z: -0.65 }, { x: 0.2, z: -0.65 }, { x: 0.7, z: -0.5 },
    { x: -0.3, z: 0.0 }, { x: 0, z: 0.1 }, { x: 0.3, z: 0.0 },
    { x: -0.7, z: 0.55 }, { x: 0, z: 0.7 }, { x: 0.7, z: 0.55 },
  ],
  '3-5-2': [
    { x: 0, z: -0.95 }, { x: -0.35, z: -0.55 }, { x: 0, z: -0.7 }, { x: 0.35, z: -0.55 },
    { x: -0.85, z: 0.0 }, { x: -0.2, z: 0.1 }, { x: 0, z: 0.15 }, { x: 0.2, z: 0.1 }, { x: 0.85, z: 0.0 },
    { x: -0.3, z: 0.6 }, { x: 0.3, z: 0.6 },
  ],
  '4-2-3-1': [
    { x: 0, z: -0.95 }, { x: -0.7, z: -0.5 }, { x: -0.2, z: -0.65 }, { x: 0.2, z: -0.65 }, { x: 0.7, z: -0.5 },
    { x: -0.2, z: -0.15 }, { x: 0.2, z: -0.15 },
    { x: -0.7, z: 0.35 }, { x: 0, z: 0.35 }, { x: 0.7, z: 0.35 },
    { x: 0, z: 0.7 },
  ],
  '5-3-2': [
    { x: 0, z: -0.95 }, { x: -0.8, z: -0.4 }, { x: -0.3, z: -0.6 }, { x: 0, z: -0.7 }, { x: 0.3, z: -0.6 }, { x: 0.8, z: -0.4 },
    { x: -0.25, z: 0.05 }, { x: 0, z: 0.1 }, { x: 0.25, z: 0.05 },
    { x: -0.3, z: 0.6 }, { x: 0.3, z: 0.6 },
  ],
}

const FORMATION_NAMES: FormationName[] = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2']

const CANVAS_W = 100
const CANVAS_H = 140
const PAD = 12
const PITCH_W = CANVAS_W - PAD * 2
const PITCH_H = CANVAS_H - PAD * 2
const CENTER_X = CANVAS_W / 2
const CENTER_Y = CANVAS_H / 2
const DOT_RADIUS = 3

function drawMiniPitch(canvas: HTMLCanvasElement, formationName: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const slots = FORMATION_SLOTS[formationName]
  if (!slots) return

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.fillStyle = '#2d5a27'
  ctx.fillRect(PAD, PAD, PITCH_W, PITCH_H)

  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = 0.5
  ctx.strokeRect(PAD, PAD, PITCH_W, PITCH_H)

  ctx.beginPath()
  ctx.moveTo(CENTER_X, PAD)
  ctx.lineTo(CENTER_X, CANVAS_H - PAD)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, 8, 0, Math.PI * 2)
  ctx.stroke()

  for (const slot of slots) {
    const px = CENTER_X + slot.x * (PITCH_W / 2) * 0.85
    const py = CENTER_Y + slot.z * (PITCH_H / 2) * 0.85
    ctx.beginPath()
    ctx.arc(px, py, DOT_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = slot.z < -0.7 ? '#ffcc00' : '#ffffff'
    ctx.fill()
  }
}

export class FormationSelect {
  private container: HTMLDivElement
  private cards: Map<string, HTMLDivElement> = new Map()
  private selectedFormation: string | null = null
  private opponentSelectedFormation: string | null = null
  private locked = false
  private onSelectFormation: (formation: string) => void

  constructor(callbacks: FormationSelectCallbacks) {
    this.onSelectFormation = callbacks.onSelectFormation

    this.container = document.createElement('div')
    this.container.id = 'formation-select'

    const wrapper = document.createElement('div')
    wrapper.id = 'formation-select-inner'
    Object.assign(wrapper.style, {
      padding: '20px',
      maxWidth: '700px',
      margin: '0 auto',
    })

    const title = document.createElement('h2')
    title.textContent = 'Select Formation'
    Object.assign(title.style, {
      color: 'white',
      fontFamily: 'monospace',
      textAlign: 'center',
      marginBottom: '8px',
    })
    wrapper.appendChild(title)

    const subtitle = document.createElement('p')
    subtitle.textContent = 'Choose your team\'s formation'
    Object.assign(subtitle.style, {
      color: 'rgba(255,255,255,0.6)',
      fontFamily: 'monospace',
      textAlign: 'center',
      fontSize: '13px',
      marginBottom: '20px',
    })
    wrapper.appendChild(subtitle)

    const grid = document.createElement('div')
    grid.id = 'formation-grid'
    Object.assign(grid.style, {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '16px',
    })

    for (const name of FORMATION_NAMES) {
      const card = this.createCard(name)
      this.cards.set(name, card)
      grid.appendChild(card)
    }

    wrapper.appendChild(grid)
    this.container.appendChild(wrapper)
  }

  private createCard(name: string): HTMLDivElement {
    const card = document.createElement('div')
    card.id = `formation-card-${name.replace(/\//g, '-')}`
    card.dataset.formation = name
    Object.assign(card.style, {
      backgroundColor: 'rgba(255,255,255,0.08)',
      border: '2px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      padding: '10px',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'border-color 0.15s, background-color 0.15s, opacity 0.15s',
      fontFamily: 'monospace',
      userSelect: 'none',
      width: '120px',
    })
    card.addEventListener('mouseenter', () => {
      if (!this.locked && this.selectedFormation !== name && this.opponentSelectedFormation !== name) {
        card.style.borderColor = 'rgba(255,255,255,0.4)'
      }
    })
    card.addEventListener('mouseleave', () => {
      if (!this.locked && this.selectedFormation !== name && this.opponentSelectedFormation !== name) {
        card.style.borderColor = 'rgba(255,255,255,0.15)'
      }
    })
    card.addEventListener('click', () => {
      if (this.locked || this.selectedFormation === name) return
      this.selectedFormation = name
      this.updateCardStyles()
      this.onSelectFormation(name)
    })

    const nameLabel = document.createElement('div')
    nameLabel.textContent = name
    Object.assign(nameLabel.style, {
      color: 'white',
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '8px',
    })
    card.appendChild(nameLabel)

    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    Object.assign(canvas.style, {
      display: 'block',
      margin: '0 auto',
      borderRadius: '4px',
    })
    drawMiniPitch(canvas, name)
    card.appendChild(canvas)

    return card
  }

  private updateCardStyles(): void {
    for (const [name, card] of this.cards) {
      if (name === this.selectedFormation) {
        card.style.borderColor = '#00ff88'
        card.style.backgroundColor = 'rgba(0,255,136,0.15)'
        card.style.opacity = '1'
      } else if (name === this.opponentSelectedFormation) {
        card.style.borderColor = '#ffcc00'
        card.style.backgroundColor = 'rgba(255,204,0,0.1)'
        card.style.opacity = '0.7'
      } else {
        card.style.borderColor = 'rgba(255,255,255,0.15)'
        card.style.backgroundColor = 'rgba(255,255,255,0.08)'
        card.style.opacity = this.selectedFormation !== null ? '0.5' : '1'
      }
    }
  }

  setOpponentSelection(playerId: string, formation: string): void {
    this.opponentSelectedFormation = formation
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
