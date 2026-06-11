const ROOM_CODE_LENGTH = 6
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export interface PlayerInfo {
  id: string
  ready: boolean
}

export interface TeamSelection {
  teamId: string | null
}

export interface FormationSelection {
  formation: string | null
}

export interface HomeAwayAssignment {
  playerId: string
  teamId: string
  side: 'home' | 'away'
}

export interface Room {
  code: string
  players: Map<string, PlayerInfo>
  teamSelections: Map<string, TeamSelection>
  formationSelections: Map<string, FormationSelection>
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

  rooms.set(code, { code, players: new Map(), teamSelections: new Map(), formationSelections: new Map() })
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

export function selectTeam(code: string, playerId: string, teamId: string): Room {
  const room = rooms.get(code)
  if (!room) throw new Error('Room not found')
  if (!room.players.has(playerId)) throw new Error('Player not in room')
  room.teamSelections.set(playerId, { teamId })
  return room
}

export function areBothTeamsSelected(code: string): boolean {
  const room = rooms.get(code)
  if (!room || room.players.size < 2) return false
  if (room.teamSelections.size < 2) return false
  return Array.from(room.teamSelections.values()).every((s) => s.teamId !== null)
}

export function getTeamSelection(code: string, playerId: string): TeamSelection | undefined {
  const room = rooms.get(code)
  if (!room) return undefined
  return room.teamSelections.get(playerId)
}

export function assignHomeAway(code: string): [HomeAwayAssignment, HomeAwayAssignment] {
  const room = rooms.get(code)
  if (!room) throw new Error('Room not found')

  const playerIds = Array.from(room.players.keys())
  if (playerIds.length !== 2) throw new Error('Need exactly 2 players')

  const seed = code.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const homeIdx = seed % 2

  const homePlayerId = playerIds[homeIdx]
  const awayPlayerId = playerIds[1 - homeIdx]

  const homeTeamId = room.teamSelections.get(homePlayerId)!.teamId!
  const awayTeamId = room.teamSelections.get(awayPlayerId)!.teamId!

  return [
    { playerId: homePlayerId, teamId: homeTeamId, side: 'home' },
    { playerId: awayPlayerId, teamId: awayTeamId, side: 'away' },
  ]
}

export function selectFormation(code: string, playerId: string, formation: string): Room {
  const room = rooms.get(code)
  if (!room) throw new Error('Room not found')
  if (!room.players.has(playerId)) throw new Error('Player not in room')
  room.formationSelections.set(playerId, { formation })
  return room
}

export function areBothFormationsSelected(code: string): boolean {
  const room = rooms.get(code)
  if (!room || room.players.size < 2) return false
  if (room.formationSelections.size < 2) return false
  return Array.from(room.formationSelections.values()).every((s) => s.formation !== null)
}

export function getFormationSelection(code: string, playerId: string): FormationSelection | undefined {
  const room = rooms.get(code)
  if (!room) return undefined
  return room.formationSelections.get(playerId)
}

export function hasTeamPhaseStarted(code: string): boolean {
  const room = rooms.get(code)
  return room?.teamSelections.size === 2
}
