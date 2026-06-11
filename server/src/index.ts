import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

const PORT = process.env.PORT ?? 3001

io.on('connection', (socket) => {
  console.log('client connected', socket.id)

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id)
  })
})

httpServer.listen(PORT, () => {
  console.log(`listening on port ${PORT}`)
})
