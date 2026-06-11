import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CameraController } from './CameraController'
import { PITCH_LENGTH } from './Pitch'

const REPLAY_HEIGHT = 50
const REPLAY_OFFSET = 10

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

describe('CameraController — Replay Mode', () => {
  it('activateReplayMode positions camera behind positive-Z goal for home team', () => {
    const cam = new CameraController(16 / 9)
    const ballPos = new THREE.Vector3(0, 0, 10)
    cam.activateReplayMode('home', ballPos)
    expect(cam.isReplayModeActive()).toBe(true)

    for (let i = 0; i < 60; i++) {
      cam.update(ballPos, 1 / 60)
    }
    const halfLength = PITCH_LENGTH / 2
    expect(cam.camera.position.z).toBeGreaterThan(halfLength)
  })

  it('activateReplayMode positions camera behind negative-Z goal for away team', () => {
    const cam = new CameraController(16 / 9)
    const ballPos = new THREE.Vector3(0, 0, -10)
    cam.activateReplayMode('away', ballPos)
    cam.update(ballPos, 1 / 60)
    expect(cam.isReplayModeActive()).toBe(true)

    for (let i = 0; i < 60; i++) {
      cam.update(ballPos, 1 / 60)
    }
    const halfLength = PITCH_LENGTH / 2
    expect(cam.camera.position.z).toBeLessThan(-halfLength)
  })

  it('replay camera is more elevated than normal broadcast camera', () => {
    const cam = new CameraController(16 / 9)
    const normalHeight = cam.camera.position.y
    const ballPos = new THREE.Vector3(0, 0, 0)

    cam.activateReplayMode('home', ballPos)
    for (let i = 0; i < 60; i++) {
      cam.update(ballPos, 1 / 60)
    }
    expect(cam.camera.position.y).toBeGreaterThan(normalHeight)
  })

  it('lerp transition reaches replay target position over ~0.5s', () => {
    const cam = new CameraController(16 / 9)
    const initialPos = cam.camera.position.clone()
    const ballPos = new THREE.Vector3(0, 0, 20)

    cam.activateReplayMode('home', ballPos)
    for (let i = 0; i < 10; i++) {
      cam.update(ballPos, 1 / 60)
    }

    const midPos = cam.camera.position.clone()
    expect(midPos.z).not.toBeCloseTo(initialPos.z, 0)
    expect(midPos.y).toBeGreaterThan(initialPos.y)

    for (let i = 0; i < 50; i++) {
      cam.update(ballPos, 1 / 60)
    }
    const halfLength = PITCH_LENGTH / 2
    expect(cam.camera.position.z).toBeCloseTo(halfLength + REPLAY_OFFSET, 0)
    expect(cam.camera.position.y).toBeCloseTo(REPLAY_HEIGHT, 0)
  })

  it('deactivateReplayMode returns camera to normal broadcast angle', () => {
    const cam = new CameraController(16 / 9)
    const ballPos = new THREE.Vector3(5, 0, 0)

    cam.activateReplayMode('home', ballPos)
    for (let i = 0; i < 60; i++) {
      cam.update(ballPos, 1 / 60)
    }
    expect(cam.isReplayModeActive()).toBe(true)

    cam.deactivateReplayMode()
    expect(cam.isReplayModeActive()).toBe(false)

    for (let i = 0; i < 60; i++) {
      cam.update(ballPos, 1 / 60)
    }
    expect(cam.camera.position.y).toBeLessThan(45)
  })

  it('replay camera follows ball x position', () => {
    const cam = new CameraController(16 / 9)
    const ballPosRight = new THREE.Vector3(10, 0, 0)

    cam.activateReplayMode('home', ballPosRight)
    for (let i = 0; i < 60; i++) {
      cam.update(ballPosRight, 1 / 60)
    }
    const xAfterRight = cam.camera.position.x

    const ballPosLeft = new THREE.Vector3(-10, 0, 0)
    for (let i = 0; i < 60; i++) {
      cam.update(ballPosLeft, 1 / 60)
    }
    const xAfterLeft = cam.camera.position.x
    expect(xAfterLeft).toBeLessThan(xAfterRight)
  })

  it('ball remains roughly in camera view during replay (frustum check)', () => {
    const cam = new CameraController(16 / 9)
    const ballPos = new THREE.Vector3(5, 0, 15)

    cam.activateReplayMode('home', ballPos)
    for (let i = 0; i < 60; i++) {
      cam.update(ballPos, 1 / 60)
    }

    cam.camera.updateMatrixWorld(true)
    const frustum = new THREE.Frustum()
    frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(
        cam.camera.projectionMatrix,
        cam.camera.matrixWorldInverse,
      ),
    )
    const ballVec = new THREE.Vector3(ballPos.x, ballPos.y, ballPos.z)
    expect(frustum.containsPoint(ballVec)).toBe(true)
  })
})
