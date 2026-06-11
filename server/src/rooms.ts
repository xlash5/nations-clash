const ROOM_CODE_LENGTH = 6
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export interface PlayerInfo {
  id: string
  ready: boolean
}

export interface Room {
  code: string
  players: Map<string, PlayerInfo>
}

const rooms = new Map<string, Room>()

// Exported for testing only — clears all rooms
export function __resetRoomsForTest(): void {
  rooms.clear()
}

function generateCode(): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

export function createRoom(): string {
  let code: string
  do {
    code = generateCode()
  } while (rooms.has(code))

  rooms.set(code, { code, players: new Map() })
  return code
}

export function joinRoom(code: string, playerId: string): Room {
  const room = rooms.get(code)
  if (!room) {
    throw new Error('Room not found')
  }
  if (room.players.size >= 2) {
    throw new Error('Room is full')
  }
  room.players.set(playerId, { id: playerId, ready: false })
  return room
}

export function toggleReady(code: string, playerId: string): Room {
  const room = rooms.get(code)
  if (!room) throw new Error('Room not found')
  const player = room.players.get(playerId)
  if (!player) throw new Error('Player not in room')
  player.ready = !player.ready
  return room
}

export function removePlayer(code: string, playerId: string): { room: Room | null; wasLastPlayer: boolean } {
  const room = rooms.get(code)
  if (!room) return { room: null, wasLastPlayer: false }

  room.players.delete(playerId)

  if (room.players.size === 0) {
    rooms.delete(code)
    return { room: null, wasLastPlayer: true }
  }

  return { room, wasLastPlayer: false }
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code)
}

export function areBothReady(code: string): boolean {
  const room = rooms.get(code)
  if (!room || room.players.size < 2) return false
  return Array.from(room.players.values()).every((p) => p.ready)
}

export function serializeRoom(room: Room): { code: string; players: { id: string; ready: boolean }[] } {
  return {
    code: room.code,
    players: Array.from(room.players.values()),
  }
}
