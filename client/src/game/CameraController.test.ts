import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CameraController } from './CameraController'
import { PITCH_LENGTH } from './Pitch'

describe('CameraController', () => {
  it('has FOV of approximately 60 degrees', () => {
    const cam = new CameraController(16 / 9)
    expect(cam.camera.fov).toBeCloseTo(60, 0)
  })

  it('initial position is behind Team A goal (negative z)', () => {
    const cam = new CameraController(16 / 9)
    const halfLength = PITCH_LENGTH / 2
    expect(cam.camera.position.z).toBeLessThan(-halfLength)
    expect(cam.camera.position.x).toBe(0)
    expect(cam.camera.position.y).toBe(40)
  })

  it('starts on side -1 (Team A)', () => {
    const cam = new CameraController(16 / 9)
    expect(cam.getSide()).toBe(-1)
  })

  it('update lerps camera x toward ball x over multiple frames', () => {
    const cam = new CameraController(16 / 9)
    const initialX = cam.camera.position.x
    const ballPos = new THREE.Vector3(20, 0, 0)

    for (let i = 0; i < 10; i++) {
      cam.update(ballPos, 1 / 60)
    }
    const afterFrames = cam.camera.position.x
    expect(afterFrames).toBeGreaterThan(initialX)
    expect(afterFrames).toBeLessThan(ballPos.x * 0.3)
  })

  it('flipSide switches camera behind Team B goal (positive z)', () => {
    const cam = new CameraController(16 / 9)
    const halfLength = PITCH_LENGTH / 2
    const initialZ = cam.camera.position.z

    cam.flipSide()

    expect(cam.camera.position.z).toBeGreaterThan(halfLength)
    expect(cam.camera.position.z).toBeCloseTo(-initialZ, 1)
    expect(cam.getSide()).toBe(1)
  })

  it('flipSide toggles back to Team A side', () => {
    const cam = new CameraController(16 / 9)
    cam.flipSide()
    cam.flipSide()
    expect(cam.getSide()).toBe(-1)
  })
})
