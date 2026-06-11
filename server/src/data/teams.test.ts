import { describe, it, expect } from 'vitest'
import { TEAMS } from './teams.js'
import { FORMATIONS, type FormationName } from './formations.js'

const VALID_ROLES = [
  'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB',
  'CDM', 'CM', 'LM', 'RM',
  'CAM', 'LW', 'RW',
  'ST', 'CF',
]

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

describe('teams data', () => {
  it('exports exactly 32 teams', () => {
    expect(TEAMS.length).toBe(32)
  })

  it('every team has all required fields', () => {
    for (const team of TEAMS) {
      expect(team).toHaveProperty('id')
      expect(team).toHaveProperty('name')
      expect(team).toHaveProperty('flagEmoji')
      expect(team).toHaveProperty('homeColor')
      expect(team).toHaveProperty('awayColor')
      expect(team).toHaveProperty('formation')
      expect(team).toHaveProperty('players')

      expect(typeof team.id).toBe('string')
      expect(team.id.length).toBeGreaterThan(0)
      expect(typeof team.name).toBe('string')
      expect(team.name.length).toBeGreaterThan(0)
      expect(typeof team.flagEmoji).toBe('string')
      expect(team.flagEmoji.length).toBeGreaterThan(0)
    }
  })

  it('every team has exactly 11 players', () => {
    for (const team of TEAMS) {
      expect(team.players.length).toBe(11)
    }
  })

  it('all player positions are valid roles', () => {
    for (const team of TEAMS) {
      for (const player of team.players) {
        expect(VALID_ROLES).toContain(player.position)
      }
    }
  })

  it('each team has exactly one GK', () => {
    for (const team of TEAMS) {
      const gkCount = team.players.filter((p) => p.position === 'GK').length
      expect(gkCount).toBe(1)
    }
  })

  it('each team has at least 10 outfield players', () => {
    for (const team of TEAMS) {
      const outfield = team.players.filter((p) => p.position !== 'GK')
      expect(outfield.length).toBe(10)
    }
  })

  it('no two teams share the same id', () => {
    const ids = TEAMS.map((t) => t.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('no two teams share the same name', () => {
    const names = TEAMS.map((t) => t.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })

  it('home and away colors are valid 6-character hex strings', () => {
    for (const team of TEAMS) {
      expect(team.homeColor).toMatch(HEX_REGEX)
      expect(team.awayColor).toMatch(HEX_REGEX)
    }
  })

  it('every team references a valid formation', () => {
    const validFormations = Object.keys(FORMATIONS) as FormationName[]
    for (const team of TEAMS) {
      expect(validFormations).toContain(team.formation)
    }
  })

  it('data imports without error', () => {
    expect(TEAMS).toBeDefined()
    expect(Array.isArray(TEAMS)).toBe(true)
  })
})

describe('formations data', () => {
  it('exports exactly 5 formations', () => {
    const names = Object.keys(FORMATIONS)
    expect(names.length).toBe(5)
  })

  it('each formation has exactly 11 position entries', () => {
    const names = Object.keys(FORMATIONS) as FormationName[]
    for (const name of names) {
      expect(FORMATIONS[name].length).toBe(11)
    }
  })

  it('each formation has exactly one GK', () => {
    const names = Object.keys(FORMATIONS) as FormationName[]
    for (const name of names) {
      const gkCount = FORMATIONS[name].filter((s) => s.role === 'GK').length
      expect(gkCount).toBe(1)
    }
  })

  it('each formation has exactly 10 outfield slots', () => {
    const names = Object.keys(FORMATIONS) as FormationName[]
    for (const name of names) {
      const outfield = FORMATIONS[name].filter((s) => s.role !== 'GK')
      expect(outfield.length).toBe(10)
    }
  })

  it('all formation slot positions are within pitch bounds', () => {
    const names = Object.keys(FORMATIONS) as FormationName[]
    for (const name of names) {
      for (const slot of FORMATIONS[name]) {
        expect(slot.x).toBeGreaterThanOrEqual(-1)
        expect(slot.x).toBeLessThanOrEqual(1)
        expect(slot.z).toBeGreaterThanOrEqual(-1)
        expect(slot.z).toBeLessThanOrEqual(1)
      }
    }
  })

  it('formation names match the expected set', () => {
    const names = Object.keys(FORMATIONS).sort()
    expect(names).toEqual(['3-5-2', '4-2-3-1', '4-3-3', '4-4-2', '5-3-2'])
  })
})
