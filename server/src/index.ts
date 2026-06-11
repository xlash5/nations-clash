import { createServer } from 'http'
import { Server } from 'socket.io'
import { createRoom, joinRoom, toggleReady, removePlayer, getRoom, serializeRoom } from './rooms.js'

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

const PORT = process.env.PORT ?? 3001

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
    } catch {
      // player not in a valid state
    }
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
