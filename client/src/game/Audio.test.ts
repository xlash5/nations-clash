import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioManager, audio } from './Audio'

function mockAudioElement() {
  return {
    play: vi.fn().mockResolvedValue(undefined),
    cloneNode: vi.fn().mockReturnThis(),
    load: vi.fn(),
    pause: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    preload: '',
    volume: 1,
    playbackRate: 1,
  } as unknown as HTMLAudioElement
}

describe('AudioManager', () => {
  let manager: AudioManager

  beforeEach(() => {
    vi.spyOn(globalThis, 'Audio').mockImplementation(() => mockAudioElement() as any)
    manager = new AudioManager()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('preload creates Audio elements for all sounds', () => {
    manager.preload()
    expect(Audio).toHaveBeenCalledTimes(6)
    expect(Audio).toHaveBeenCalledWith('/audio/kick.wav')
    expect(Audio).toHaveBeenCalledWith('/audio/goal.wav')
    expect(Audio).toHaveBeenCalledWith('/audio/whistle-short.wav')
    expect(Audio).toHaveBeenCalledWith('/audio/whistle-long.wav')
    expect(Audio).toHaveBeenCalledWith('/audio/menu-click.wav')
    expect(Audio).toHaveBeenCalledWith('/audio/countdown-beep.wav')
  })

  it('play("kick") calls play() on a cloned audio element', () => {
    manager.preload()
    const cloneSpy = vi.fn(() => {
      const el = mockAudioElement()
      el.play = vi.fn().mockResolvedValue(undefined)
      return el as any
    })
    const originalAudio = Audio as any
    originalAudio.mockImplementation(() => {
      const el = mockAudioElement()
      el.cloneNode = cloneSpy
      return el as any
    })

    manager = new AudioManager()
    manager.preload()
    manager.play('kick')

    expect(cloneSpy).toHaveBeenCalled()
  })

  it('play("kick", 0.5) sets playbackRate proportionally', () => {
    manager.preload()
    let clonedPlaybackRate = 1
    const mockClone = vi.fn(() => {
      const el = mockAudioElement()
      Object.defineProperty(el, 'playbackRate', {
        set(v) { clonedPlaybackRate = v },
        get() { return clonedPlaybackRate },
      })
      el.play = vi.fn().mockResolvedValue(undefined)
      return el as any
    })

    const originalAudio = Audio as any
    originalAudio.mockImplementation(() => {
      const el = mockAudioElement()
      el.cloneNode = mockClone
      return el as any
    })

    manager = new AudioManager()
    manager.preload()
    manager.play('kick', 0.8)

    expect(clonedPlaybackRate).toBe(0.8)
  })

  it('play("kick", 0.3) clamps playbackRate to minimum 0.5', () => {
    manager.preload()
    let clonedPlaybackRate = 1
    const mockClone = vi.fn(() => {
      const el = mockAudioElement()
      Object.defineProperty(el, 'playbackRate', {
        set(v) { clonedPlaybackRate = v },
        get() { return clonedPlaybackRate },
      })
      el.play = vi.fn().mockResolvedValue(undefined)
      return el as any
    })

    const originalAudio = Audio as any
    originalAudio.mockImplementation(() => {
      const el = mockAudioElement()
      el.cloneNode = mockClone
      return el as any
    })

    manager = new AudioManager()
    manager.preload()
    manager.play('kick', 0.3)

    expect(clonedPlaybackRate).toBe(0.5)
  })

  it('play("kick", 3) clamps playbackRate to maximum 2', () => {
    manager.preload()
    let clonedPlaybackRate = 1
    const mockClone = vi.fn(() => {
      const el = mockAudioElement()
      Object.defineProperty(el, 'playbackRate', {
        set(v) { clonedPlaybackRate = v },
        get() { return clonedPlaybackRate },
      })
      el.play = vi.fn().mockResolvedValue(undefined)
      return el as any
    })

    const originalAudio = Audio as any
    originalAudio.mockImplementation(() => {
      const el = mockAudioElement()
      el.cloneNode = mockClone
      return el as any
    })

    manager = new AudioManager()
    manager.preload()
    manager.play('kick', 3)

    expect(clonedPlaybackRate).toBe(2)
  })

  it('setVolume(0.5) affects subsequent plays', () => {
    manager.preload()
    let clonedVolume = 1
    const mockClone = vi.fn(() => {
      const el = mockAudioElement()
      Object.defineProperty(el, 'volume', {
        set(v) { clonedVolume = v },
        get() { return clonedVolume },
      })
      el.play = vi.fn().mockResolvedValue(undefined)
      return el as any
    })

    const originalAudio = Audio as any
    originalAudio.mockImplementation(() => {
      const el = mockAudioElement()
      el.cloneNode = mockClone
      return el as any
    })

    manager = new AudioManager()
    manager.preload()
    manager.setVolume(0.5)
    manager.play('goal')

    expect(clonedVolume).toBe(0.5)
  })

  it('setVolume clamps to 0–1', () => {
    manager.setVolume(-0.1)
    expect(manager.getVolume()).toBe(0)

    manager.setVolume(1.5)
    expect(manager.getVolume()).toBe(1)
  })

  it('constructor reads volume from settings', () => {
    const vol = manager.getVolume()
    expect(vol).toBeGreaterThanOrEqual(0)
    expect(vol).toBeLessThanOrEqual(1)
  })

  it('preload sets preload=auto on all elements', () => {
    const elements: HTMLAudioElement[] = []
    const originalAudio = Audio as any
    originalAudio.mockImplementation(() => {
      const el = mockAudioElement()
      elements.push(el as any)
      return el as any
    })

    manager = new AudioManager()
    manager.preload()

    for (const el of elements) {
      expect(el.preload).toBe('auto')
    }
  })

  it('play() does not throw when audio play() fails', () => {
    manager.preload()
    const mockClone = vi.fn(() => {
      const el = mockAudioElement()
      el.play = vi.fn().mockRejectedValue(new Error('playback denied'))
      return el as any
    })

    const originalAudio = Audio as any
    originalAudio.mockImplementation(() => {
      const el = mockAudioElement()
      el.cloneNode = mockClone
      return el as any
    })

    manager = new AudioManager()
    manager.preload()

    expect(() => manager.play('kick')).not.toThrow()
  })

  it('singleton audio instance is an AudioManager', () => {
    expect(audio).toBeInstanceOf(AudioManager)
  })
})
