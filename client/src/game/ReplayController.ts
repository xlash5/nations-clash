import type { GameStateSnapshot } from '../../../shared/types.js'

const REPLAY_TICK_S = 1 / 15

export class ReplayController {
  private snapshots: GameStateSnapshot[]
  private index: number
  private tickAccumulator: number
  private isReplaying: boolean
  private onState: ((state: GameStateSnapshot) => void) | null
  private onComplete: (() => void) | null
  private onSkip: (() => void) | null
  private overlayEl: HTMLDivElement | null

  constructor() {
    this.snapshots = []
    this.index = 0
    this.tickAccumulator = 0
    this.isReplaying = false
    this.onState = null
    this.onComplete = null
    this.onSkip = null
    this.overlayEl = null
  }

  start(
    snapshots: GameStateSnapshot[],
    callbacks: {
      onState: (state: GameStateSnapshot) => void
      onComplete: () => void
      onSkip: () => void
    },
  ): void {
    this.snapshots = snapshots
    this.index = 0
    this.tickAccumulator = 0
    this.isReplaying = true
    this.onState = callbacks.onState
    this.onComplete = callbacks.onComplete
    this.onSkip = callbacks.onSkip
    this.showOverlay()
  }

  update(delta: number): void {
    if (!this.isReplaying || this.snapshots.length === 0) return

    this.tickAccumulator += delta

    while (this.tickAccumulator >= REPLAY_TICK_S) {
      this.tickAccumulator -= REPLAY_TICK_S

      if (this.index < this.snapshots.length) {
        this.onState?.(this.snapshots[this.index])
        this.index++
      } else {
        this.finish()
        return
      }
    }
  }

  skip(): void {
    if (!this.isReplaying) return
    this.finish()
    this.onSkip?.()
  }

  private finish(): void {
    this.isReplaying = false
    this.hideOverlay()
    this.onComplete?.()
  }

  private showOverlay(): void {
    const el = document.createElement('div')
    el.id = 'replay-skip-overlay'
    el.textContent = 'Press SPACE to skip'
    Object.assign(el.style, {
      position: 'absolute',
      bottom: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '18px',
      fontWeight: 'bold',
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
      pointerEvents: 'none',
      zIndex: '100',
    })
    document.body.appendChild(el)
    this.overlayEl = el
  }

  private hideOverlay(): void {
    if (this.overlayEl) {
      this.overlayEl.remove()
      this.overlayEl = null
    }
  }

  isActive(): boolean {
    return this.isReplaying
  }

  cleanup(): void {
    this.isReplaying = false
    this.hideOverlay()
  }
}
