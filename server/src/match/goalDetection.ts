import type { Position } from '../../../shared/types.js'
import { checkGoalScored, PITCH_HALF_LENGTH } from './collision.js'

export interface GoalResult {
  team: 'home' | 'away'
  scorer: string | null
  isOwnGoal: boolean
  side: 'positive' | 'negative'
}

export function checkGoal(
  ballPos: Position,
  lastTouch: { playerId: string; team: 'home' | 'away' } | null,
): GoalResult | null {
  if (!checkGoalScored(ballPos)) return null

  const side: 'positive' | 'negative' = ballPos.z > 0 ? 'positive' : 'negative'
  const scoringTeam: 'home' | 'away' = side === 'positive' ? 'home' : 'away'

  if (!lastTouch) {
    return { team: scoringTeam, scorer: null, isOwnGoal: false, side }
  }

  if (lastTouch.team === scoringTeam) {
    return { team: scoringTeam, scorer: lastTouch.playerId, isOwnGoal: false, side }
  }

  return { team: scoringTeam, scorer: null, isOwnGoal: true, side }
}
