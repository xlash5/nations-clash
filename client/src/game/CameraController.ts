import * as THREE from 'three'
import { PITCH_LENGTH } from './Pitch'

const CAMERA_FOV = 60
const CAMERA_NEAR = 0.1
const CAMERA_FAR = 200
const CAMERA_HEIGHT = 40
const CAMERA_BEHIND_OFFSET = 15
const LERP_SPEED = 3

const REPLAY_CAMERA_HEIGHT = 50
const REPLAY_CAMERA_BEHIND_OFFSET = 10
const REPLAY_LERP_SPEED = 8

export class CameraController {
  readonly camera: THREE.PerspectiveCamera
  private side: -1 | 1 = -1
  private currentPosition: THREE.Vector3
  private targetPosition: THREE.Vector3
  private lookTarget: THREE.Vector3

  private replayMode: boolean = false
  private replayTargetPosition: THREE.Vector3
  private replayLookTarget: THREE.Vector3
  private replayGoalSide: -1 | 1 = -1

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR)
    this.currentPosition = new THREE.Vector3()
    this.targetPosition = new THREE.Vector3()
    this.lookTarget = new THREE.Vector3()
    this.replayTargetPosition = new THREE.Vector3()
    this.replayLookTarget = new THREE.Vector3()
    this.resetPosition()
  }

  private resetPosition(): void {
    const halfLength = PITCH_LENGTH / 2
    const zPos = this.side * (halfLength + CAMERA_BEHIND_OFFSET)
    this.currentPosition.set(0, CAMERA_HEIGHT, zPos)
    this.targetPosition.copy(this.currentPosition)
    this.camera.position.copy(this.currentPosition)
    this.lookTarget.set(0, 0, 0)
    this.camera.lookAt(this.lookTarget)
  }

  update(ballPosition: THREE.Vector3, delta: number): void {
    if (this.replayMode) {
      const halfLength = PITCH_LENGTH / 2
      const zPos = this.replayGoalSide * (halfLength + REPLAY_CAMERA_BEHIND_OFFSET)

      this.replayTargetPosition.set(
        ballPosition.x * 0.3,
        REPLAY_CAMERA_HEIGHT,
        zPos,
      )
      this.replayLookTarget.copy(ballPosition)

      this.currentPosition.lerp(this.replayTargetPosition, Math.min(REPLAY_LERP_SPEED * delta, 1))
      this.camera.position.copy(this.currentPosition)
      this.camera.lookAt(this.replayLookTarget)
      return
    }

    const halfLength = PITCH_LENGTH / 2
    const zPos = this.side * (halfLength + CAMERA_BEHIND_OFFSET)

    this.targetPosition.set(
      ballPosition.x * 0.3,
      CAMERA_HEIGHT,
      zPos,
    )
    this.lookTarget.copy(ballPosition)

    this.currentPosition.lerp(this.targetPosition, Math.min(LERP_SPEED * delta, 1))
    this.camera.position.copy(this.currentPosition)
    this.camera.lookAt(this.lookTarget)
  }

  activateReplayMode(team: 'home' | 'away', ballPosition: THREE.Vector3): void {
    this.replayMode = true
    this.replayGoalSide = team === 'home' ? 1 : -1
    const halfLength = PITCH_LENGTH / 2
    const zPos = this.replayGoalSide * (halfLength + REPLAY_CAMERA_BEHIND_OFFSET)

    this.replayTargetPosition.set(
      ballPosition.x * 0.3,
      REPLAY_CAMERA_HEIGHT,
      zPos,
    )
    this.replayLookTarget.copy(ballPosition)
  }

  deactivateReplayMode(): void {
    this.replayMode = false
  }

  isReplayModeActive(): boolean {
    return this.replayMode
  }

  flipSide(): void {
    this.side = this.side === -1 ? 1 : -1
    this.resetPosition()
  }

  getSide(): -1 | 1 {
    return this.side
  }
}
