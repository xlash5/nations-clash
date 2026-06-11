import { SocketClient, type RoomJoinedPayload, type MatchStartPayload } from './network/SocketClient'
import { MainMenu } from './ui/MainMenu'
import { Lobby } from './ui/Lobby'
import { HUD } from './game/HUD'
import { Input, KEY_SHOOT, KEY_PASS } from './game/Input'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

const appRoot = document.createElement('div')
appRoot.id = 'app-root'
document.body.appendChild(appRoot)

let currentScreen: { unmount: () => void } | null = null

const input = new Input()
let chargeStartTime = 0
let chargeType: string | null = null

const client = new SocketClient(SERVER_URL, {
  onRoomCreated: () => {
    // handled inline in MainMenu callback
  },
  onRoomJoined: () => {
    // handled inline in Lobby transition
  },
  onRoomError: () => {
    // handled inline in MainMenu
  },
  onPlayerLeft: () => {
    // handled via room:joined broadcast
  },
  onMatchStart: () => {},
  onGameState: () => {},
})

input.attach()

function startGameInputLoop(hud: HUD): ReturnType<typeof setInterval> {
  const sendIntervalId = setInterval(() => {
    const bitmask = input.getBitmask()
    const isCharging = !!(bitmask & KEY_SHOOT) || !!(bitmask & KEY_PASS)

    if (isCharging) {
      if (!chargeType) {
        chargeType = (bitmask & KEY_SHOOT) ? 'shoot' : 'pass'
        chargeStartTime = performance.now()
      }
      const elapsed = (performance.now() - chargeStartTime) / 1000
      const power = Math.min(1, elapsed)
      hud.show()
      hud.setPower(power)
    } else {
      if (chargeType) {
        chargeType = null
        chargeStartTime = 0
      }
      hud.hide()
    }

    client.sendInput(bitmask, chargeType, chargeStartTime)
  }, 1000 / 60)

  return sendIntervalId
}

function showGame(hud: HUD): ReturnType<typeof setInterval> {
  if (currentScreen) {
    currentScreen.unmount()
    currentScreen = null
  }

  appRoot.innerHTML = ''

  const gameContainer = document.createElement('div')
  gameContainer.id = 'game-container'
  Object.assign(gameContainer.style, {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#1a1a2e',
  })

  const info = document.createElement('div')
  info.textContent = 'Match started! Controls: WASD=move, J=shoot, K=pass, Shift=sprint'
  Object.assign(info.style, {
    color: 'white',
    fontFamily: 'monospace',
    padding: '20px',
    textAlign: 'center',
  })
  gameContainer.appendChild(info)

  appRoot.appendChild(gameContainer)
  hud.mount(gameContainer)

  const intervalId = startGameInputLoop(hud)
  return intervalId
}

function showMenu(): void {
  if (currentScreen) {
    currentScreen.unmount()
    currentScreen = null
  }

  const menu = new MainMenu({
    onCreateRoom: () => {
      client.setCallbacks({
        onRoomCreated: (payload) => showLobby(payload.roomCode),
        onRoomJoined: (payload) => showLobby(payload.code, payload.players),
        onRoomError: (payload) => menu.showError(payload.message),
        onPlayerLeft: () => {},
        onMatchStart: () => {},
        onGameState: () => {},
      })
      client.createRoom()
    },
    onJoinRoom: (code) => {
      client.setCallbacks({
        onRoomCreated: () => {},
        onRoomJoined: (payload) => showLobby(payload.code, payload.players),
        onRoomError: (payload) => menu.showError(payload.message),
        onPlayerLeft: () => {},
        onMatchStart: () => {},
        onGameState: () => {},
      })
      client.joinRoom(code)
    },
  })

  currentScreen = menu
  menu.mount(appRoot)
}

function showLobby(roomCode: string, players: { id: string; ready: boolean }[] = []): void {
  if (currentScreen) {
    currentScreen.unmount()
  }

  const lobby = new Lobby({
    onToggleReady: () => client.toggleReady(),
  })

  let gameIntervalId: ReturnType<typeof setInterval> | null = null

  client.setCallbacks({
    onRoomCreated: () => {},
    onRoomJoined: (payload: RoomJoinedPayload) => {
      lobby.setRoomCode(payload.code)
      lobby.updatePlayers(payload.players)
    },
    onRoomError: () => {},
    onPlayerLeft: () => {},
    onMatchStart: (_payload: MatchStartPayload) => {
      lobby.unmount()
      const hud = new HUD()
      gameIntervalId = showGame(hud)
    },
    onGameState: () => {},
  })

  lobby.setRoomCode(roomCode)
  lobby.updatePlayers(players)
  lobby.mount(appRoot)
  currentScreen = lobby
}

showMenu()
