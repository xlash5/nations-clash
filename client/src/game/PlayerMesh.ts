import * as THREE from 'three'

const BODY_WIDTH = 0.4
const BODY_HEIGHT = 0.6
const BODY_DEPTH = 0.25
const HEAD_RADIUS = 0.15
const LIMB_RADIUS = 0.06
const UPPER_ARM_LENGTH = 0.25
const LOWER_ARM_LENGTH = 0.25
const UPPER_LEG_LENGTH = 0.3
const LOWER_LEG_LENGTH = 0.3
const SKIN_COLOR = 0xf5d0a9

function createLimb(
  radius: number,
  length: number,
  color: number,
  segments = 6,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(radius, radius, length, segments)
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = length / 2
  return mesh
}

export function createPlayerMesh(color: string): THREE.Group {
  const group = new THREE.Group()
  group.name = 'player'

  const kitColor = new THREE.Color(color)

  const torsoGeo = new THREE.BoxGeometry(BODY_WIDTH, BODY_HEIGHT, BODY_DEPTH)
  const torsoMat = new THREE.MeshStandardMaterial({ color: kitColor, roughness: 0.8, flatShading: true })
  const torso = new THREE.Mesh(torsoGeo, torsoMat)
  torso.position.y = BODY_HEIGHT / 2 + LOWER_LEG_LENGTH + UPPER_LEG_LENGTH
  torso.name = 'torso'
  group.add(torso)

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(HEAD_RADIUS, 8, 6),
    new THREE.MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.7, flatShading: true }),
  )
  head.position.y = BODY_HEIGHT + LOWER_LEG_LENGTH + UPPER_LEG_LENGTH + HEAD_RADIUS * 0.6
  head.name = 'head'
  group.add(head)

  const armMat = new THREE.MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.7, flatShading: true })
  const legMat = new THREE.MeshStandardMaterial({ color: kitColor, roughness: 0.8, flatShading: true })
  const sockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true })

  const leftUpperArm = createLimb(LIMB_RADIUS, UPPER_ARM_LENGTH, SKIN_COLOR)
  leftUpperArm.position.set(-BODY_WIDTH / 2 - LIMB_RADIUS, BODY_HEIGHT + LOWER_LEG_LENGTH + UPPER_LEG_LENGTH - 0.05, 0)
  leftUpperArm.rotation.z = 0.3
  leftUpperArm.name = 'left-upper-arm'
  group.add(leftUpperArm)

  const rightUpperArm = createLimb(LIMB_RADIUS, UPPER_ARM_LENGTH, SKIN_COLOR)
  rightUpperArm.position.set(BODY_WIDTH / 2 + LIMB_RADIUS, BODY_HEIGHT + LOWER_LEG_LENGTH + UPPER_LEG_LENGTH - 0.05, 0)
  rightUpperArm.rotation.z = -0.3
  rightUpperArm.name = 'right-upper-arm'
  group.add(rightUpperArm)

  const leftLowerArm = createLimb(LIMB_RADIUS, LOWER_ARM_LENGTH, SKIN_COLOR)
  leftLowerArm.position.set(-BODY_WIDTH / 2 - LIMB_RADIUS - 0.02, BODY_HEIGHT + LOWER_LEG_LENGTH + UPPER_LEG_LENGTH - 0.05 - UPPER_ARM_LENGTH, 0)
  leftLowerArm.rotation.z = 0.1
  leftLowerArm.name = 'left-lower-arm'
  group.add(leftLowerArm)

  const rightLowerArm = createLimb(LIMB_RADIUS, LOWER_ARM_LENGTH, SKIN_COLOR)
  rightLowerArm.position.set(BODY_WIDTH / 2 + LIMB_RADIUS + 0.02, BODY_HEIGHT + LOWER_LEG_LENGTH + UPPER_LEG_LENGTH - 0.05 - UPPER_ARM_LENGTH, 0)
  rightLowerArm.rotation.z = -0.1
  rightLowerArm.name = 'right-lower-arm'
  group.add(rightLowerArm)

  const leftUpperLeg = createLimb(LIMB_RADIUS + 0.02, UPPER_LEG_LENGTH, kitColor.getHex())
  leftUpperLeg.position.set(-BODY_WIDTH / 4, LOWER_LEG_LENGTH + UPPER_LEG_LENGTH / 2, 0)
  leftUpperLeg.name = 'left-upper-leg'
  group.add(leftUpperLeg)

  const rightUpperLeg = createLimb(LIMB_RADIUS + 0.02, UPPER_LEG_LENGTH, kitColor.getHex())
  rightUpperLeg.position.set(BODY_WIDTH / 4, LOWER_LEG_LENGTH + UPPER_LEG_LENGTH / 2, 0)
  rightUpperLeg.name = 'right-upper-leg'
  group.add(rightUpperLeg)

  const leftLowerLeg = createLimb(LIMB_RADIUS + 0.01, LOWER_LEG_LENGTH, SKIN_COLOR)
  leftLowerLeg.position.set(-BODY_WIDTH / 4, LOWER_LEG_LENGTH / 2, 0)
  leftLowerLeg.name = 'left-lower-leg'
  group.add(leftLowerLeg)

  const rightLowerLeg = createLimb(LIMB_RADIUS + 0.01, LOWER_LEG_LENGTH, SKIN_COLOR)
  rightLowerLeg.position.set(BODY_WIDTH / 4, LOWER_LEG_LENGTH / 2, 0)
  rightLowerLeg.name = 'right-lower-leg'
  group.add(rightLowerLeg)

  return group
}
