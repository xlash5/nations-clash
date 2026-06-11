import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { createBallMesh, BALL_RADIUS } from './BallMesh'

describe('BallMesh', () => {
  it('returns a Mesh', () => {
    const ball = createBallMesh()
    expect(ball).toBeInstanceOf(THREE.Mesh)
    expect(ball.name).toBe('ball')
  })

  it('uses IcosahedronGeometry', () => {
    const ball = createBallMesh()
    expect(ball.geometry.type).toBe('IcosahedronGeometry')
  })

  it('has radius approximately 0.22', () => {
    const ball = createBallMesh()
    const geo = ball.geometry as THREE.IcosahedronGeometry
    const r = geo.parameters.radius
    expect(r).toBeCloseTo(BALL_RADIUS, 2)
    expect(r).toBeCloseTo(0.22, 2)
  })

  it('has vertex colors attribute', () => {
    const ball = createBallMesh()
    const colorAttr = ball.geometry.getAttribute('color')
    expect(colorAttr).toBeDefined()
    expect(colorAttr.itemSize).toBe(3)
  })

  it('uses flat shading', () => {
    const ball = createBallMesh()
    const mat = ball.material as THREE.MeshStandardMaterial
    expect(mat.flatShading).toBe(true)
  })

  it('has vertexColors enabled', () => {
    const ball = createBallMesh()
    const mat = ball.material as THREE.MeshStandardMaterial
    expect(mat.vertexColors).toBe(true)
  })

  it('has subdivided geometry (detail >= 1)', () => {
    const ball = createBallMesh()
    const geo = ball.geometry as THREE.IcosahedronGeometry
    expect(geo.parameters.detail).toBeGreaterThanOrEqual(1)
  })
})
