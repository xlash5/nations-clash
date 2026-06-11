import { SocketClient, type RoomJoinedPayload, type MatchStartPayload } from './network/SocketClient'
import { MainMenu } from './ui/MainMenu'
import { Lobby } from './ui/Lobby'
import { HUD } from './game/HUD'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

const appRoot = document.createElement('div')
appRoot.id = 'app-root'
document.body.appendChild(appRoot)

let currentScreen: { unmount: () => void } | null = null

const KEY_UP = 1
const KEY_DOWN = 2
const KEY_LEFT = 4
const KEY_RIGHT = 8
const KEY_SPRINT = 16
const KEY_SHOOT = 32
const KEY_PASS = 64
const KEY_TACKLE = 128
const KEY_SLIDE_TACKLE = 256
const KEY_SWITCH_PLAYER = 512

const keysPressed: Record<string, boolean> = {}
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

function buildKeyBitmask(): number {
  let keys = 0
  if (keysPressed['ArrowUp'] || keysPressed['KeyW']) keys |= KEY_UP
  if (keysPressed['ArrowDown'] || keysPressed['KeyS']) keys |= KEY_DOWN
  if (keysPressed['ArrowLeft'] || keysPressed['KeyA']) keys |= KEY_LEFT
  if (keysPressed['ArrowRight'] || keysPressed['KeyD']) keys |= KEY_RIGHT
  if (keysPressed['ShiftLeft'] || keysPressed['ShiftRight']) keys |= KEY_SPRINT
  if (keysPressed['KeyJ']) keys |= KEY_SHOOT
  if (keysPressed['KeyK']) keys |= KEY_PASS
  if (keysPressed['KeyL']) keys |= KEY_TACKLE
  if (keysPressed['KeyU']) keys |= KEY_SLIDE_TACKLE
  if (keysPressed['KeyI']) keys |= KEY_SWITCH_PLAYER
  return keys
}

function startGameInputLoop(hud: HUD): ReturnType<typeof setInterval> {
  const sendIntervalId = setInterval(() => {
    const bitmask = buildKeyBitmask()
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

document.addEventListener('keydown', (e) => {
  keysPressed[e.code] = true
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(e.key)) {
    e.preventDefault()
  }
})

document.addEventListener('keyup', (e) => {
  keysPressed[e.code] = false
})

showMenu()
