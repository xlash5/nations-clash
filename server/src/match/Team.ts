import { Player } from './Player.js'

import type { FormationName } from '../data/formations.js'

export class Team {
  id: 'home' | 'away'
  humanPlayerId: string
  players: Player[]
  score: number
  formationName: FormationName
  humanControlledIndex: number

  constructor(id: 'home' | 'away', humanPlayerId: string, playerCount: number = 11) {
    this.id = id
    this.humanPlayerId = humanPlayerId
    this.players = []
    this.score = 0
    this.formationName = '4-4-2'
    this.humanControlledIndex = 1

    for (let i = 0; i < playerCount; i++) {
      const isGk = i === 0
      const player = new Player(`${id}-${i}`, id, isGk)
      this.players.push(player)
    }

    this.players[this.humanControlledIndex].isHumanControlled = true
  }
}
