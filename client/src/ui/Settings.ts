import { getSettings, setVolume, setFullscreen, setQuality } from '../settings'

export interface SettingsCallbacks {
  onBack: () => void
}

export class Settings {
  private container: HTMLDivElement
  private volumeSlider: HTMLInputElement
  private volumeValue: HTMLSpanElement
  private fullscreenToggle: HTMLInputElement
  private qualitySelect: HTMLSelectElement

  constructor(callbacks: SettingsCallbacks) {
    const s = getSettings()

    this.container = document.createElement('div')
    this.container.id = 'settings'
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
    title.textContent = 'Settings'
    Object.assign(title.style, {
      fontSize: '36px',
      marginBottom: '32px',
      textTransform: 'uppercase',
      letterSpacing: '4px',
    })
    this.container.appendChild(title)

    const form = document.createElement('div')
    Object.assign(form.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      minWidth: '360px',
      maxWidth: '400px',
    })

    const volumeRow = document.createElement('div')
    Object.assign(volumeRow.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    })

    const volumeLabel = document.createElement('label')
    volumeLabel.textContent = 'Sound Volume'
    Object.assign(volumeLabel.style, {
      fontSize: '16px',
      color: '#ffdd44',
    })
    volumeRow.appendChild(volumeLabel)

    const volumeControl = document.createElement('div')
    Object.assign(volumeControl.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    })

    this.volumeSlider = document.createElement('input')
    this.volumeSlider.id = 'settings-volume-slider'
    this.volumeSlider.type = 'range'
    this.volumeSlider.min = '0'
    this.volumeSlider.max = '100'
    this.volumeSlider.value = String(s.volume)
    Object.assign(this.volumeSlider.style, {
      flex: '1',
      height: '6px',
      cursor: 'pointer',
      accentColor: '#457b9d',
    })
    volumeControl.appendChild(this.volumeSlider)

    this.volumeValue = document.createElement('span')
    this.volumeValue.id = 'settings-volume-value'
    this.volumeValue.textContent = `${s.volume}%`
    Object.assign(this.volumeValue.style, {
      fontSize: '14px',
      color: '#aaa',
      minWidth: '40px',
      textAlign: 'right',
    })
    volumeControl.appendChild(this.volumeValue)

    this.volumeSlider.addEventListener('input', () => {
      const val = parseInt(this.volumeSlider.value, 10)
      this.volumeValue.textContent = `${val}%`
      setVolume(val)
    })

    volumeRow.appendChild(volumeControl)
    form.appendChild(volumeRow)

    const fullscreenRow = document.createElement('div')
    Object.assign(fullscreenRow.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    })

    const fullscreenLabel = document.createElement('label')
    fullscreenLabel.textContent = 'Fullscreen'
    Object.assign(fullscreenLabel.style, {
      fontSize: '16px',
      color: '#ffdd44',
    })
    fullscreenRow.appendChild(fullscreenLabel)

    this.fullscreenToggle = document.createElement('input')
    this.fullscreenToggle.id = 'settings-fullscreen-toggle'
    this.fullscreenToggle.type = 'checkbox'
    this.fullscreenToggle.checked = s.fullscreen
    Object.assign(this.fullscreenToggle.style, {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      accentColor: '#457b9d',
    })
    this.fullscreenToggle.addEventListener('change', () => {
      setFullscreen(this.fullscreenToggle.checked)
      if (this.fullscreenToggle.checked) {
        document.documentElement.requestFullscreen?.()
      } else {
        document.exitFullscreen?.()
      }
    })
    fullscreenRow.appendChild(this.fullscreenToggle)
    form.appendChild(fullscreenRow)

    const qualityRow = document.createElement('div')
    Object.assign(qualityRow.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    })

    const qualityLabel = document.createElement('label')
    qualityLabel.textContent = 'Quality Preset'
    Object.assign(qualityLabel.style, {
      fontSize: '16px',
      color: '#ffdd44',
    })
    qualityRow.appendChild(qualityLabel)

    this.qualitySelect = document.createElement('select')
    this.qualitySelect.id = 'settings-quality-select'
    Object.assign(this.qualitySelect.style, {
      padding: '8px 12px',
      fontSize: '14px',
      fontFamily: 'monospace',
      backgroundColor: '#1a1a3e',
      color: 'white',
      border: '1px solid #457b9d',
      borderRadius: '4px',
      cursor: 'pointer',
      outline: 'none',
    })

    const options = ['low', 'medium', 'high']
    for (const opt of options) {
      const option = document.createElement('option')
      option.value = opt
      option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1)
      if (opt === s.quality) {
        option.selected = true
      }
      this.qualitySelect.appendChild(option)
    }

    this.qualitySelect.addEventListener('change', () => {
      setQuality(this.qualitySelect.value as 'low' | 'medium' | 'high')
    })
    qualityRow.appendChild(this.qualitySelect)
    form.appendChild(qualityRow)

    this.container.appendChild(form)

    const backBtn = document.createElement('button')
    backBtn.id = 'settings-back-btn'
    backBtn.textContent = 'Back'
    Object.assign(backBtn.style, {
      marginTop: '32px',
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
