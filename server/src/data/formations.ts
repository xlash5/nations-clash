import type { Position } from '../../../shared/types.js'

export const PITCH_HALF_LENGTH = 52.5
export const PITCH_HALF_WIDTH = 34

export interface FormationSlot {
  x: number
  z: number
  role: string
}

export type FormationName = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2'

export const FORMATIONS: Record<FormationName, FormationSlot[]> = {
  '4-4-2': [
    { x: 0, z: -0.95, role: 'GK' },
    { x: -0.7, z: -0.55, role: 'LB' },
    { x: -0.2, z: -0.7, role: 'CB' },
    { x: 0.2, z: -0.7, role: 'CB' },
    { x: 0.7, z: -0.55, role: 'RB' },
    { x: -0.7, z: 0.0, role: 'LM' },
    { x: -0.2, z: 0.05, role: 'CM' },
    { x: 0.2, z: 0.05, role: 'CM' },
    { x: 0.7, z: 0.0, role: 'RM' },
    { x: -0.3, z: 0.65, role: 'ST' },
    { x: 0.3, z: 0.65, role: 'ST' },
  ],

  '4-3-3': [
    { x: 0, z: -0.95, role: 'GK' },
    { x: -0.7, z: -0.5, role: 'LB' },
    { x: -0.2, z: -0.65, role: 'CB' },
    { x: 0.2, z: -0.65, role: 'CB' },
    { x: 0.7, z: -0.5, role: 'RB' },
    { x: -0.3, z: 0.0, role: 'CM' },
    { x: 0, z: 0.1, role: 'CM' },
    { x: 0.3, z: 0.0, role: 'CM' },
    { x: -0.7, z: 0.55, role: 'LW' },
    { x: 0, z: 0.7, role: 'ST' },
    { x: 0.7, z: 0.55, role: 'RW' },
  ],

  '3-5-2': [
    { x: 0, z: -0.95, role: 'GK' },
    { x: -0.35, z: -0.55, role: 'CB' },
    { x: 0, z: -0.7, role: 'CB' },
    { x: 0.35, z: -0.55, role: 'CB' },
    { x: -0.85, z: 0.0, role: 'LM' },
    { x: -0.2, z: 0.1, role: 'CM' },
    { x: 0, z: 0.15, role: 'CM' },
    { x: 0.2, z: 0.1, role: 'CM' },
    { x: 0.85, z: 0.0, role: 'RM' },
    { x: -0.3, z: 0.6, role: 'ST' },
    { x: 0.3, z: 0.6, role: 'ST' },
  ],

  '4-2-3-1': [
    { x: 0, z: -0.95, role: 'GK' },
    { x: -0.7, z: -0.5, role: 'LB' },
    { x: -0.2, z: -0.65, role: 'CB' },
    { x: 0.2, z: -0.65, role: 'CB' },
    { x: 0.7, z: -0.5, role: 'RB' },
    { x: -0.2, z: -0.15, role: 'CDM' },
    { x: 0.2, z: -0.15, role: 'CDM' },
    { x: -0.7, z: 0.35, role: 'LW' },
    { x: 0, z: 0.35, role: 'CAM' },
    { x: 0.7, z: 0.35, role: 'RW' },
    { x: 0, z: 0.7, role: 'ST' },
  ],

  '5-3-2': [
    { x: 0, z: -0.95, role: 'GK' },
    { x: -0.8, z: -0.4, role: 'LB' },
    { x: -0.3, z: -0.6, role: 'CB' },
    { x: 0, z: -0.7, role: 'CB' },
    { x: 0.3, z: -0.6, role: 'CB' },
    { x: 0.8, z: -0.4, role: 'RB' },
    { x: -0.25, z: 0.05, role: 'CM' },
    { x: 0, z: 0.1, role: 'CM' },
    { x: 0.25, z: 0.05, role: 'CM' },
    { x: -0.3, z: 0.6, role: 'ST' },
    { x: 0.3, z: 0.6, role: 'ST' },
  ],
}

export function getFormationNames(): FormationName[] {
  return Object.keys(FORMATIONS) as FormationName[]
}

export function getAbsoluteFormationPositions(
  formationName: FormationName | string,
  side: -1 | 1,
): Position[] {
  const formation = FORMATIONS[formationName as FormationName]
  if (!formation) {
    return getAbsoluteFormationPositions('4-4-2', side)
  }

  return formation.map((slot) => ({
    x: slot.x * PITCH_HALF_WIDTH,
    y: 0,
    z: -side * slot.z * PITCH_HALF_LENGTH,
  }))
}
