export interface MainMenuCallbacks {
  onCreateRoom: () => void
  onJoinRoom: (roomCode: string) => void
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
    createBtn.addEventListener('click', () => callbacks.onCreateRoom())
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
        callbacks.onJoinRoom(code)
      }
    })
    joinRow.appendChild(this.input)
    joinRow.appendChild(joinBtn)
    this.container.appendChild(joinRow)

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
