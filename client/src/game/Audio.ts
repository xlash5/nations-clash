import { getSettings } from '../settings'

export type SoundName = 'kick' | 'goal' | 'whistle-short' | 'whistle-long' | 'menu-click' | 'countdown-beep'

const SOUND_FILES: Record<SoundName, string> = {
  'kick': '/audio/kick.wav',
  'goal': '/audio/goal.wav',
  'whistle-short': '/audio/whistle-short.wav',
  'whistle-long': '/audio/whistle-long.wav',
  'menu-click': '/audio/menu-click.wav',
  'countdown-beep': '/audio/countdown-beep.wav',
}

export class AudioManager {
  private sounds: Map<SoundName, HTMLAudioElement> = new Map()
  private _volume: number

  constructor() {
    this._volume = getSettings().volume / 100
  }

  preload(): void {
    for (const [name, src] of Object.entries(SOUND_FILES)) {
      const audio = new Audio(src)
      audio.preload = 'auto'
      this.sounds.set(name as SoundName, audio)
    }
  }

  play(name: SoundName, pitch?: number): void {
    const audio = this.sounds.get(name)
    if (!audio) return

    const clone = audio.cloneNode() as HTMLAudioElement
    clone.volume = this._volume
    if (pitch !== undefined) {
      clone.playbackRate = Math.max(0.5, Math.min(2, pitch))
    }
    clone.play().catch(() => {})
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume))
  }

  getVolume(): number {
    return this._volume
  }
}

export const audio = new AudioManager()
