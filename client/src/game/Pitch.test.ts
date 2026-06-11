import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  createPitch,
  countMeshes,
  countLights,
  PITCH_LENGTH,
  PITCH_WIDTH,
  GOAL_WIDTH,
  GOAL_HEIGHT,
  CENTRE_CIRCLE_RADIUS,
  PENALTY_AREA_WIDTH,
  PENALTY_AREA_DEPTH,
  GOAL_AREA_WIDTH,
  GOAL_AREA_DEPTH,
} from './Pitch'

describe('Pitch', () => {
  it('returns a Group with the correct name', () => {
    const pitch = createPitch()
    expect(pitch).toBeInstanceOf(THREE.Group)
    expect(pitch.name).toBe('pitch-root')
  })

  it('contains a pitch surface mesh', () => {
    const pitch = createPitch()
    const surface = pitch.getObjectByName('pitch-surface')
    expect(surface).toBeDefined()
    expect((surface as THREE.Mesh).isMesh).toBe(true)
  })

  it('contains a halfway line', () => {
    const pitch = createPitch()
    const line = pitch.getObjectByName('halfway-line')
    expect(line).toBeDefined()
  })

  it('contains a centre circle', () => {
    const pitch = createPitch()
    const circle = pitch.getObjectByName('centre-circle')
    expect(circle).toBeDefined()
  })

  it('contains a centre spot', () => {
    const pitch = createPitch()
    const spot = pitch.getObjectByName('centre-spot')
    expect(spot).toBeDefined()
  })

  it('contains two penalty areas', () => {
    const pitch = createPitch()
    const top = pitch.getObjectByName('penalty-area-top')
    const bottom = pitch.getObjectByName('penalty-area-bottom')
    expect(top).toBeDefined()
    expect(bottom).toBeDefined()
  })

  it('contains two goal areas', () => {
    const pitch = createPitch()
    const top = pitch.getObjectByName('goal-area-top')
    const bottom = pitch.getObjectByName('goal-area-bottom')
    expect(top).toBeDefined()
    expect(bottom).toBeDefined()
  })

  it('contains corner arcs', () => {
    const pitch = createPitch()
    const arcs = pitch.getObjectByName('corner-arc')
    expect(arcs).toBeDefined()
    const allArcs: THREE.Object3D[] = []
    pitch.traverse((child) => {
      if (child.name === 'corner-arc') allArcs.push(child)
    })
    expect(allArcs.length).toBe(4)
  })

  it('contains two penalty spots', () => {
    const pitch = createPitch()
    const top = pitch.getObjectByName('penalty-spot-top')
    const bottom = pitch.getObjectByName('penalty-spot-bottom')
    expect(top).toBeDefined()
    expect(bottom).toBeDefined()
  })

  it('contains two penalty arcs', () => {
    const pitch = createPitch()
    const top = pitch.getObjectByName('penalty-arc-top')
    const bottom = pitch.getObjectByName('penalty-arc-bottom')
    expect(top).toBeDefined()
    expect(bottom).toBeDefined()
  })

  it('contains two goals', () => {
    const pitch = createPitch()
    const top = pitch.getObjectByName('goal-top')
    const bottom = pitch.getObjectByName('goal-bottom')
    expect(top).toBeDefined()
    expect(bottom).toBeDefined()
  })

  it('goals have posts and crossbar', () => {
    const pitch = createPitch()
    const goal = pitch.getObjectByName('goal-top') as THREE.Group
    expect(goal).toBeDefined()
    expect(goal.getObjectByName('left-post')).toBeDefined()
    expect(goal.getObjectByName('right-post')).toBeDefined()
    expect(goal.getObjectByName('crossbar')).toBeDefined()
  })

  it('goals have nets', () => {
    const pitch = createPitch()
    const goal = pitch.getObjectByName('goal-top') as THREE.Group
    expect(goal).toBeDefined()
    expect(goal.getObjectByName('net')).toBeDefined()
    expect(goal.getObjectByName('net-top')).toBeDefined()
    expect(goal.getObjectByName('net-left')).toBeDefined()
    expect(goal.getObjectByName('net-right')).toBeDefined()
  })

  it('goal posts are at correct width', () => {
    const pitch = createPitch()
    const goal = pitch.getObjectByName('goal-top') as THREE.Group
    const left = goal.getObjectByName('left-post') as THREE.Mesh
    const right = goal.getObjectByName('right-post') as THREE.Mesh
    expect(Math.abs(left.position.x)).toBeCloseTo(GOAL_WIDTH / 2, 1)
    expect(Math.abs(right.position.x)).toBeCloseTo(GOAL_WIDTH / 2, 1)
  })

  it('crossbar is at correct height', () => {
    const pitch = createPitch()
    const goal = pitch.getObjectByName('goal-top') as THREE.Group
    const crossbar = goal.getObjectByName('crossbar') as THREE.Mesh
    expect(crossbar.position.y).toBeCloseTo(GOAL_HEIGHT, 1)
  })

  it('contains stadium stands', () => {
    const pitch = createPitch()
    const stands: THREE.Object3D[] = []
    pitch.traverse((child) => {
      if (child.name === 'stand') stands.push(child)
    })
    expect(stands.length).toBe(4)
  })

  it('contains lights', () => {
    const pitch = createPitch()
    const lightCount = countLights(pitch)
    expect(lightCount).toBe(3)
  })

  it('pitch surface has correct dimensions', () => {
    const pitch = createPitch()
    const surface = pitch.getObjectByName('pitch-surface') as THREE.Mesh
    const geo = surface.geometry as THREE.PlaneGeometry
    expect(geo.parameters.width).toBeCloseTo(PITCH_WIDTH, 0)
    expect(geo.parameters.height).toBeCloseTo(PITCH_LENGTH, 0)
  })

  it('has expected total mesh count', () => {
    const pitch = createPitch()
    const meshCount = countMeshes(pitch)
    expect(meshCount).toBeGreaterThan(20)
  })
})
