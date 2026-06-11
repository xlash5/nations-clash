import { audio } from '../game/Audio'

export interface MainMenuCallbacks {
  onCreateRoom: () => void
  onJoinRoom: (roomCode: string) => void
  onHowToPlay?: () => void
  onSettings?: () => void
}

export class MainMenu {
  private container: HTMLDivElement
  private input: HTMLInputElement
  private errorEl: HTMLDivElement

  constructor(callbacks: MainMenuCallbacks) {
    this.container = document.createElement('div')
    this.container.id = 'main-menu'

    const title = document.createElement('h1')
    title.textContent = "Nations' Clash"
    this.container.appendChild(title)

    const createBtn = document.createElement('button')
    createBtn.textContent = 'Create Room'
    createBtn.addEventListener('click', () => {
      audio.play('menu-click')
      callbacks.onCreateRoom()
    })
    this.container.appendChild(createBtn)

    const joinRow = document.createElement('div')
    this.input = document.createElement('input')
    this.input.placeholder = 'Enter room code'
    this.input.maxLength = 6
    this.input.style.textTransform = 'uppercase'
    const joinBtn = document.createElement('button')
    joinBtn.textContent = 'Join Room'
    joinBtn.addEventListener('click', () => {
      const code = this.input.value.trim().toUpperCase()
      if (code.length === 6) {
        audio.play('menu-click')
        callbacks.onJoinRoom(code)
      }
    })
    joinRow.appendChild(this.input)
    joinRow.appendChild(joinBtn)
    this.container.appendChild(joinRow)

    const howToPlayBtn = document.createElement('button')
    howToPlayBtn.id = 'how-to-play-btn'
    howToPlayBtn.textContent = 'How to Play'
    Object.assign(howToPlayBtn.style, {
      marginTop: '12px',
      padding: '10px 24px',
      fontSize: '14px',
      fontFamily: 'monospace',
      backgroundColor: '#2a4a6a',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    })
    howToPlayBtn.addEventListener('click', () => {
      audio.play('menu-click')
      callbacks.onHowToPlay?.()
    })
    this.container.appendChild(howToPlayBtn)

    const settingsBtn = document.createElement('button')
    settingsBtn.id = 'settings-btn'
    settingsBtn.textContent = 'Settings'
    Object.assign(settingsBtn.style, {
      marginTop: '8px',
      padding: '10px 24px',
      fontSize: '14px',
      fontFamily: 'monospace',
      backgroundColor: '#2a4a6a',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    })
    settingsBtn.addEventListener('click', () => {
      audio.play('menu-click')
      callbacks.onSettings?.()
    })
    this.container.appendChild(settingsBtn)
    this.errorEl = document.createElement('div')
    this.errorEl.id = 'room-error'
    this.errorEl.style.color = 'red'
    this.container.appendChild(this.errorEl)
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.container)
  }

  unmount(): void {
    this.container.remove()
  }

  showError(message: string): void {
    this.errorEl.textContent = message
  }
}
