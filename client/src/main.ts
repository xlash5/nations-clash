import { SocketClient, type RoomJoinedPayload, type MatchStartPayload, type TeamSelectPayload, type TeamSelectedPayload, type BothTeamsSelectedPayload } from './network/SocketClient'
import { MainMenu } from './ui/MainMenu'
import { Lobby } from './ui/Lobby'
import { TeamSelect } from './ui/TeamSelect'
import { HUD } from './game/HUD'
import { ReplayController } from './game/ReplayController'
import { Input, KEY_SHOOT, KEY_PASS } from './game/Input'
import type { GameState, GoalEventPayload } from '../../shared/types.js'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

const appRoot = document.createElement('div')
appRoot.id = 'app-root'
document.body.appendChild(appRoot)

let currentScreen: { unmount: () => void } | null = null

const input = new Input()
let chargeStartTime = 0
let chargeType: string | null = null

  const client = new SocketClient(SERVER_URL, {
    onRoomCreated: () => {},
    onRoomJoined: () => {},
    onRoomError: () => {},
    onPlayerLeft: () => {},
    onMatchStart: () => {},
    onMatchTeamSelect: () => {},
    onTeamSelected: () => {},
    onBothTeamsSelected: () => {},
    onGameState: () => {},
    onGameGoal: () => {},
    onGameEvent: () => {},
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
      hud.showPowerBar(true)
      hud.setPowerBar(power)
    } else {
      if (chargeType) {
        chargeType = null
        chargeStartTime = 0
      }
      hud.showPowerBar(false)
    }

    client.sendInput(bitmask, chargeType, chargeStartTime)
  }, 1000 / 60)

  return sendIntervalId
}

function createGoalFlash(): HTMLDivElement {
  const el = document.createElement('div')
  el.id = 'goal-flash'
  el.textContent = 'GOAL!'
  Object.assign(el.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '72px',
    fontWeight: 'bold',
    textShadow: '4px 4px 8px rgba(0,0,0,0.9)',
    pointerEvents: 'none',
    zIndex: '200',
    display: 'none',
    opacity: '0',
    transition: 'opacity 0.15s ease-in',
  })
  return el
}

function createFreeKickOverlay(): HTMLDivElement {
  const el = document.createElement('div')
  el.id = 'free-kick-overlay'
  el.textContent = 'FREE KICK'
  Object.assign(el.style, {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ffdd44',
    fontFamily: 'monospace',
    fontSize: '48px',
    fontWeight: 'bold',
    textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
    pointerEvents: 'none',
    zIndex: '200',
    display: 'none',
    opacity: '0',
    transition: 'opacity 0.2s ease-in',
  })
  return el
}

function showFreeKickOverlay(container: HTMLElement): void {
  const existing = container.querySelector('#free-kick-overlay') as HTMLDivElement
  const overlay = existing ?? createFreeKickOverlay()
  if (!existing) container.appendChild(overlay)

  overlay.style.display = 'block'
  overlay.style.opacity = '1'

  clearTimeout((overlay as any)._fadeTimer)
  ;(overlay as any)._fadeTimer = setTimeout(() => {
    overlay.style.opacity = '0'
    setTimeout(() => {
      overlay.style.display = 'none'
    }, 300)
  }, 2000)
}

function showGoalFlash(container: HTMLElement, callback: () => void): void {
  const existing = container.querySelector('#goal-flash') as HTMLDivElement
  const flash = existing ?? createGoalFlash()
  if (!existing) container.appendChild(flash)

  flash.style.display = 'block'
  flash.style.opacity = '1'

  setTimeout(() => {
    flash.style.opacity = '0'
    setTimeout(() => {
      flash.style.display = 'none'
      callback()
    }, 300)
  }, 1500)
}

function showGame(hud: HUD): { intervalId: ReturnType<typeof setInterval>; replayController: ReplayController } {
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
  info.textContent = 'Match started! WASD=move, Shift=sprint, J=shoot, K=pass, I=switch player'
  Object.assign(info.style, {
    color: 'white',
    fontFamily: 'monospace',
    padding: '20px',
    textAlign: 'center',
  })
  gameContainer.appendChild(info)

  appRoot.appendChild(gameContainer)
  hud.mount(gameContainer)

  const replayController = new ReplayController()

  const teamColors: Record<string, string> = { home: '#e63946', away: '#457b9d' }

  client.setCallbacks({
    onRoomCreated: () => {},
    onRoomJoined: () => {},
    onRoomError: () => {},
    onPlayerLeft: () => {},
    onMatchStart: () => {},
    onMatchTeamSelect: () => {},
    onTeamSelected: () => {},
    onBothTeamsSelected: () => {},
    onGameState: (state: GameState) => {
      const controlled = state.players.find((p) => p.isHumanControlled)
      if (controlled) {
        hud.setActivePlayer(controlled.id, teamColors[controlled.team] ?? '#ffffff')
        hud.setStamina(controlled.stamina / 100)
      }
      hud.updateScore(state.score.teamA, state.score.teamB)
      hud.updateClock(state.clock)
      hud.updateMiniMap(state.players)
      hud.setPing(client.getLatency())
    },
    onGameGoal: (payload: GoalEventPayload) => {
      showGoalFlash(gameContainer, () => {
        replayController.start(payload.replayData.snapshots, {
          onState: () => {},
          onComplete: () => {},
          onSkip: () => {},
        })
      })
    },
    onGameEvent: (payload) => {
      if (payload.type === 'foul') {
        showFreeKickOverlay(gameContainer)
      }
    },
  })

  const intervalId = startGameInputLoop(hud)
  return { intervalId, replayController }
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
        onMatchTeamSelect: () => {},
        onTeamSelected: () => {},
        onBothTeamsSelected: () => {},
        onGameState: () => {},
        onGameGoal: () => {},
        onGameEvent: () => {},
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
        onMatchTeamSelect: () => {},
        onTeamSelected: () => {},
        onBothTeamsSelected: () => {},
        onGameState: () => {},
        onGameGoal: () => {},
        onGameEvent: () => {},
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
  let replayController: ReplayController | null = null
  let replayKeyHandler: ((e: KeyboardEvent) => void) | null = null

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
      const game = showGame(hud)
      gameIntervalId = game.intervalId
      replayController = game.replayController

      replayKeyHandler = (e: KeyboardEvent) => {
        if (e.code === 'Space' && replayController?.isActive()) {
          e.preventDefault()
          replayController.skip()
        }
      }
      document.addEventListener('keydown', replayKeyHandler)
    },
    onMatchTeamSelect: (payload: TeamSelectPayload) => {
      lobby.unmount()
      showTeamSelect(payload.teams)
    },
    onTeamSelected: () => {},
    onBothTeamsSelected: () => {},
    onGameState: () => {},
    onGameGoal: () => {},
    onGameEvent: () => {},
  })

  lobby.setRoomCode(roomCode)
  lobby.updatePlayers(players)
  lobby.mount(appRoot)
  currentScreen = lobby
}

function showTeamSelect(teams: TeamSelectPayload['teams']): void {
  if (currentScreen) {
    currentScreen.unmount()
  }

  appRoot.innerHTML = ''

  const ts = new TeamSelect(teams, {
    onSelectTeam: (teamId: string) => {
      client.selectTeam(teamId)
    },
  })

  let gameIntervalId: ReturnType<typeof setInterval> | null = null
  let replayController: ReplayController | null = null
  let replayKeyHandler: ((e: KeyboardEvent) => void) | null = null

  client.setCallbacks({
    onRoomCreated: () => {},
    onRoomJoined: () => {},
    onRoomError: () => {},
    onPlayerLeft: () => {},
    onMatchStart: (_payload: MatchStartPayload) => {
      ts.unmount()
      const hud = new HUD()
      const game = showGame(hud)
      gameIntervalId = game.intervalId
      replayController = game.replayController

      replayKeyHandler = (e: KeyboardEvent) => {
        if (e.code === 'Space' && replayController?.isActive()) {
          e.preventDefault()
          replayController.skip()
        }
      }
      document.addEventListener('keydown', replayKeyHandler)
    },
    onMatchTeamSelect: () => {},
    onTeamSelected: (payload: TeamSelectedPayload) => {
      ts.setOpponentSelection(payload.playerId, payload.teamId)
    },
    onBothTeamsSelected: () => {},
    onGameState: () => {},
    onGameGoal: () => {},
    onGameEvent: () => {},
  })

  ts.mount(appRoot)
  currentScreen = ts
}

showMenu()
