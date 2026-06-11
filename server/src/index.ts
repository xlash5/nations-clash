import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { extname, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Server } from 'socket.io'
import { createRoom, joinRoom, toggleReady, removePlayer, getRoom, serializeRoom, areBothReady, selectTeam, areBothTeamsSelected, assignHomeAway, getTeamSelection, setPlayerSession, markPlayerDisconnected, updatePlayerId } from './rooms.js'
import { Match } from './match/Match.js'
import { TEAMS } from './data/teams.js'
import type { MatchConfig, TeamData } from '../../shared/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const publicPath = join(__dirname, '..', 'public')

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
}

const httpServer = createServer((req, res) => {
  let url = req.url ?? '/'
  if (url === '/') url = '/index.html'

  const filePath = join(publicPath, url)

  if (!existsSync(filePath)) {
    res.statusCode = 404
    res.end('Not found')
    return
  }

  const ext = extname(filePath)
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

  res.writeHead(200, { 'Content-Type': contentType })
  res.end(readFileSync(filePath))
})

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

const PORT = process.env.PORT ?? 3001

const activeMatches = new Map<string, Match>()
const rematchRequests = new Map<string, Set<string>>()

interface MatchSession {
  config: MatchConfig
  homeTeam: TeamData
  awayTeam: TeamData
  homePlayerId: string
  awayPlayerId: string
}
const matchSessions = new Map<string, MatchSession>()

io.on('connection', (socket) => {
  let currentRoomCode: string | null = null

  socket.on('room:create', () => {
    const code = createRoom()
    joinRoom(code, socket.id)
    currentRoomCode = code
    setPlayerSession(socket.id, code)
    socket.join(code)
    socket.emit('room:created', { roomCode: code })
  })

  socket.on('room:join', ({ roomCode }: { roomCode: string }) => {
    try {
      const room = joinRoom(roomCode, socket.id)
      currentRoomCode = roomCode
      setPlayerSession(socket.id, roomCode)
      socket.join(roomCode)
      socket.emit('room:joined', serializeRoom(room))
      socket.to(roomCode).emit('room:joined', serializeRoom(room))
    } catch (err) {
      socket.emit('room:error', { message: (err as Error).message })
    }
  })

  socket.on('room:reconnect', ({ roomCode }: { roomCode: string }) => {
    const room = getRoom(roomCode)
    if (!room) {
      socket.emit('room:error', { message: 'Room not found' })
      return
    }

    const playerIds = Array.from(room.players.keys())
    const disconnectedPlayerId = playerIds.find((pid) => room.players.get(pid)?.disconnected)

    if (!disconnectedPlayerId) {
      socket.emit('room:error', { message: 'No disconnected player in this room' })
      return
    }

    const oldId = disconnectedPlayerId
    updatePlayerId(roomCode, oldId, socket.id)
    setPlayerSession(socket.id, roomCode)
    socket.join(roomCode)
    currentRoomCode = roomCode

    const match = activeMatches.get(roomCode)
    if (match) {
      match.updatePlayerId(oldId, socket.id)
      match.onPlayerReconnect(socket.id)
    }

    socket.emit('room:joined', serializeRoom(room))
    socket.to(roomCode).emit('room:joined', serializeRoom(room))
  })

  socket.on('player:ready', () => {
    if (!currentRoomCode) return
    try {
      const room = toggleReady(currentRoomCode, socket.id)
      io.to(currentRoomCode).emit('room:joined', serializeRoom(room))

      if (areBothReady(currentRoomCode)) {
        io.to(currentRoomCode).emit('match:teamSelect', { teams: TEAMS })
      }
    } catch {
      // player not in a valid state
    }
  })

  socket.on('match:selectTeam', ({ teamId }: { teamId: string }) => {
    if (!currentRoomCode) return
    try {
      selectTeam(currentRoomCode, socket.id, teamId)
      const selection = getTeamSelection(currentRoomCode, socket.id)
      io.to(currentRoomCode).emit('team:selected', { playerId: socket.id, teamId, teamName: TEAMS.find((t) => t.id === teamId)?.name })

      if (areBothTeamsSelected(currentRoomCode)) {
        const [home, away] = assignHomeAway(currentRoomCode)
        const homeTeam = TEAMS.find((t) => t.id === home.teamId)!
        const awayTeam = TEAMS.find((t) => t.id === away.teamId)!

        io.to(currentRoomCode).emit('bothTeamsSelected', {
          home: { ...home, teamData: homeTeam },
          away: { ...away, teamData: awayTeam },
        })

        const config: MatchConfig = { mode: 'time', duration: 120, goalsToWin: 5 }
        const session: MatchSession = { config, homeTeam, awayTeam, homePlayerId: home.playerId, awayPlayerId: away.playerId }
        matchSessions.set(currentRoomCode, session)

        const match = new Match(io, currentRoomCode, config, home.playerId, away.playerId, homeTeam.name, awayTeam.name)
        activeMatches.set(currentRoomCode, match)
        match.start()
        io.to(currentRoomCode).emit('match:start', { config, homeTeam, awayTeam, homePlayerId: home.playerId, awayPlayerId: away.playerId })
      }
    } catch {
      // invalid selection
    }
  })

  socket.on('match:rematchRequest', () => {
    if (!currentRoomCode) return
    const room = getRoom(currentRoomCode)
    if (!room) return

    if (!rematchRequests.has(currentRoomCode)) {
      rematchRequests.set(currentRoomCode, new Set())
    }
    rematchRequests.get(currentRoomCode)!.add(socket.id)

    const requested = Array.from(rematchRequests.get(currentRoomCode)!)
    io.to(currentRoomCode).emit('match:rematchStatus', { playerIds: requested })

    if (requested.length === 2) {
      rematchRequests.delete(currentRoomCode)

      const oldMatch = activeMatches.get(currentRoomCode)
      if (oldMatch) {
        oldMatch.stop()
        activeMatches.delete(currentRoomCode)
      }

      const session = matchSessions.get(currentRoomCode)
      if (!session) return

      const newMatch = new Match(io, currentRoomCode, session.config, session.homePlayerId, session.awayPlayerId, session.homeTeam.name, session.awayTeam.name)
      activeMatches.set(currentRoomCode, newMatch)

      io.to(currentRoomCode).emit('match:rematchAccepted')
      newMatch.start()
      io.to(currentRoomCode).emit('match:start', {
        config: session.config,
        homeTeam: session.homeTeam,
        awayTeam: session.awayTeam,
        homePlayerId: session.homePlayerId,
        awayPlayerId: session.awayPlayerId,
      })
    }
  })

  socket.on('match:leave', () => {
    if (!currentRoomCode) return

    const match = activeMatches.get(currentRoomCode)
    if (match) {
      match.stop()
      activeMatches.delete(currentRoomCode)
    }

    const { room, wasLastPlayer } = removePlayer(currentRoomCode, socket.id)
    if (!wasLastPlayer && room) {
      socket.to(currentRoomCode).emit('player:left', { playerId: socket.id })
      io.to(currentRoomCode).emit('room:joined', serializeRoom(room))
    }

    rematchRequests.delete(currentRoomCode)
  })

  socket.on('game:input', (data: { keys: number; chargeType: string | null; chargeTimestamp: number }) => {
    if (!currentRoomCode) return
    const match = activeMatches.get(currentRoomCode)
    if (!match) return
    match.handleInput(socket.id, {
      up: (data.keys & 1) !== 0,
      down: (data.keys & 2) !== 0,
      left: (data.keys & 4) !== 0,
      right: (data.keys & 8) !== 0,
      sprint: (data.keys & 16) !== 0,
      shoot: (data.keys & 32) !== 0,
      pass: (data.keys & 64) !== 0,
      tackle: (data.keys & 128) !== 0,
      slideTackle: (data.keys & 256) !== 0,
      switchPlayer: (data.keys & 512) !== 0,
    })
  })

  socket.on('disconnect', () => {
    if (!currentRoomCode) return

    const match = activeMatches.get(currentRoomCode)

    if (match && match.phase !== 'fulltime') {
      match.onPlayerDisconnect(socket.id)
      markPlayerDisconnected(currentRoomCode, socket.id)
    } else {
      if (match) {
        match.stop()
        activeMatches.delete(currentRoomCode)
      }

      const { room, wasLastPlayer } = removePlayer(currentRoomCode, socket.id)
      if (!wasLastPlayer && room) {
        socket.to(currentRoomCode).emit('player:left', { playerId: socket.id })
        io.to(currentRoomCode).emit('room:joined', serializeRoom(room))
      }

      rematchRequests.delete(currentRoomCode)
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`listening on port ${PORT}`)
})
