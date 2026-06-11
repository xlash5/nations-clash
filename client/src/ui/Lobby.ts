import { audio } from '../game/Audio'

export interface LobbyCallbacks {
  onToggleReady: () => void
}

export class Lobby {
  private container: HTMLDivElement
  private roomCodeEl: HTMLSpanElement
  private playerListEl: HTMLUListElement
  private readyBtn: HTMLButtonElement

  constructor(callbacks: LobbyCallbacks) {
    this.container = document.createElement('div')
    this.container.id = 'lobby'

    const header = document.createElement('h2')
    header.textContent = 'Lobby'
    this.container.appendChild(header)

    const codeRow = document.createElement('p')
    codeRow.textContent = 'Room Code: '
    this.roomCodeEl = document.createElement('span')
    this.roomCodeEl.id = 'room-code'
    codeRow.appendChild(this.roomCodeEl)
    this.container.appendChild(codeRow)

    this.playerListEl = document.createElement('ul')
    this.playerListEl.id = 'player-list'
    this.container.appendChild(this.playerListEl)

    this.readyBtn = document.createElement('button')
    this.readyBtn.textContent = 'Ready'
    this.readyBtn.addEventListener('click', () => {
      audio.play('menu-click')
      callbacks.onToggleReady()
    })
    this.container.appendChild(this.readyBtn)
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.container)
  }

  unmount(): void {
    this.container.remove()
  }

  setRoomCode(code: string): void {
    this.roomCodeEl.textContent = code
  }

  updatePlayers(players: { id: string; ready: boolean }[]): void {
    this.playerListEl.innerHTML = ''
    for (const p of players) {
      const li = document.createElement('li')
      li.textContent = `${p.id.slice(0, 8)}... ${p.ready ? '✓ Ready' : '⏳ Waiting'}`
      this.playerListEl.appendChild(li)
    }
  }
}
