const STORAGE_KEY = 'nations-clash-settings'

export interface SettingsData {
  volume: number
  fullscreen: boolean
  quality: 'low' | 'medium' | 'high'
}

const defaults: SettingsData = {
  volume: 80,
  fullscreen: false,
  quality: 'medium',
}

let settings: SettingsData = { ...defaults }

function load(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SettingsData>
      return { ...defaults, ...parsed }
    }
  } catch {
  }
  return { ...defaults }
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
  }
}

settings = load()

export function getSettings(): SettingsData {
  return load()
}

export function setVolume(volume: number): void {
  settings.volume = Math.max(0, Math.min(100, volume))
  save()
}

export function setFullscreen(enabled: boolean): void {
  settings.fullscreen = enabled
  save()
}

export function setQuality(quality: 'low' | 'medium' | 'high'): void {
  settings.quality = quality
  save()
}
