import { createServer } from 'http'
import { Server } from 'socket.io'
import { createRoom, joinRoom, toggleReady, removePlayer, getRoom, serializeRoom, areBothReady, selectTeam, areBothTeamsSelected, assignHomeAway, getTeamSelection, selectFormation, areBothFormationsSelected, getFormationSelection } from './rooms.js'
import { Match } from './match/Match.js'
import { TEAMS } from './data/teams.js'
import { getFormationNames } from './data/formations.js'
import type { MatchConfig, TeamData, FormationName } from '../../shared/types.js'

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

const PORT = process.env.PORT ?? 3001

const activeMatches = new Map<string, Match>()

io.on('connection', (socket) => {
  let currentRoomCode: string | null = null

  socket.on('room:create', () => {
    const code = createRoom()
    joinRoom(code, socket.id)
    currentRoomCode = code
    socket.join(code)
    socket.emit('room:created', { roomCode: code })
  })

  socket.on('room:join', ({ roomCode }: { roomCode: string }) => {
    try {
      const room = joinRoom(roomCode, socket.id)
      currentRoomCode = roomCode
      socket.join(roomCode)
      socket.emit('room:joined', serializeRoom(room))
      socket.to(roomCode).emit('room:joined', serializeRoom(room))
    } catch (err) {
      socket.emit('room:error', { message: (err as Error).message })
    }
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

        const formationNames: FormationName[] = getFormationNames()
        io.to(currentRoomCode).emit('match:formationSelect', { formations: formationNames })
      }
    } catch {
      // invalid selection
    }
  })

  socket.on('match:selectFormation', ({ formation }: { formation: string }) => {
    if (!currentRoomCode) return
    try {
      selectFormation(currentRoomCode, socket.id, formation)
      io.to(currentRoomCode).emit('formation:selected', { playerId: socket.id, formation })

      if (areBothFormationsSelected(currentRoomCode)) {
        const [home, away] = assignHomeAway(currentRoomCode)
        const homeTeam = TEAMS.find((t) => t.id === home.teamId)!
        const awayTeam = TEAMS.find((t) => t.id === away.teamId)!
        const homeFormation = getFormationSelection(currentRoomCode, home.playerId)!.formation!
        const awayFormation = getFormationSelection(currentRoomCode, away.playerId)!.formation!

        const config: MatchConfig = { mode: 'time', duration: 120, goalsToWin: 5 }
        const match = new Match(io, currentRoomCode, config, home.playerId, away.playerId, homeFormation as FormationName, awayFormation as FormationName)
        activeMatches.set(currentRoomCode, match)
        match.start()
        io.to(currentRoomCode).emit('match:start', { config, homeTeam, awayTeam, homePlayerId: home.playerId, awayPlayerId: away.playerId, homeFormation, awayFormation })
      }
    } catch {
      // invalid selection
    }
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
    if (currentRoomCode) {
      const { room, wasLastPlayer } = removePlayer(currentRoomCode, socket.id)
      if (!wasLastPlayer && room) {
        socket.to(currentRoomCode).emit('player:left', { playerId: socket.id })
        io.to(currentRoomCode).emit('room:joined', serializeRoom(room))
      }
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`listening on port ${PORT}`)
})
