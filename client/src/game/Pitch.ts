import * as THREE from 'three'

export const PITCH_LENGTH = 105
export const PITCH_WIDTH = 68
export const GOAL_WIDTH = 7.32
export const GOAL_HEIGHT = 2.44
export const GOAL_DEPTH = 2
export const CENTRE_CIRCLE_RADIUS = 9.15
export const PENALTY_AREA_WIDTH = 40.3
export const PENALTY_AREA_DEPTH = 16.5
export const GOAL_AREA_WIDTH = 18.3
export const GOAL_AREA_DEPTH = 5.5
export const CORNER_ARC_RADIUS = 1
export const LINE_WIDTH = 0.12
export const STADIUM_STAND_HEIGHT = 8
export const STADIUM_STAND_DEPTH = 12
export const STADIUM_STAND_OFFSET = 5
export const NET_RESOLUTION_X = 10
export const NET_RESOLUTION_Y = 8

const GRASS_COLOR = 0x2e8b2e
const LINE_COLOR = 0xffffff
const GOAL_COLOR = 0xffffff
const NET_COLOR = 0xcccccc
const STAND_COLOR = 0x4a4a6a

function createPitchSurface(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(PITCH_WIDTH, PITCH_LENGTH)
  const mat = new THREE.MeshStandardMaterial({
    color: GRASS_COLOR,
    roughness: 0.9,
    metalness: 0,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0, 0)
  mesh.name = 'pitch-surface'
  return mesh
}

function createLineSegment(
  points: THREE.Vector2[],
  y: number,
): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].y)
  }
  shape.closePath()

  const geo = new THREE.ShapeGeometry(shape)
  const mat = new THREE.MeshBasicMaterial({ color: LINE_COLOR, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, y + 0.001, 0)
  return mesh
}

function createRectangleLine(
  cx: number, cz: number,
  w: number, d: number,
): THREE.Vector2[] {
  const hw = w / 2
  const hd = d / 2
  return [
    new THREE.Vector2(cx - hw, cz - hd),
    new THREE.Vector2(cx + hw, cz - hd),
    new THREE.Vector2(cx + hw, cz + hd),
    new THREE.Vector2(cx - hw, cz + hd),
  ]
}

function createHalfwayLine(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(LINE_WIDTH, PITCH_LENGTH)
  const mat = new THREE.MeshBasicMaterial({ color: LINE_COLOR })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0.002, 0)
  mesh.name = 'halfway-line'
  return mesh
}

function createCentreCircle(): THREE.Mesh {
  const geo = new THREE.RingGeometry(
    CENTRE_CIRCLE_RADIUS - LINE_WIDTH / 2,
    CENTRE_CIRCLE_RADIUS + LINE_WIDTH / 2,
    64,
  )
  const mat = new THREE.MeshBasicMaterial({
    color: LINE_COLOR,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0.002, 0)
  mesh.name = 'centre-circle'
  return mesh
}

function createCentreSpot(): THREE.Mesh {
  const geo = new THREE.CircleGeometry(0.15, 16)
  const mat = new THREE.MeshBasicMaterial({ color: LINE_COLOR })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0.002, 0)
  mesh.name = 'centre-spot'
  return mesh
}

function createPenaltyAreas(): THREE.Mesh[] {
  const halfZ = PITCH_LENGTH / 2
  return [-1, 1].map((side) => {
    const cz = side * (halfZ - PENALTY_AREA_DEPTH / 2)
    const pts = createRectangleLine(0, cz, PENALTY_AREA_WIDTH, PENALTY_AREA_DEPTH)
    const mesh = createLineSegment(pts, 0.002)
    mesh.name = `penalty-area-${side > 0 ? 'top' : 'bottom'}`
    return mesh
  })
}

function createGoalAreas(): THREE.Mesh[] {
  const halfZ = PITCH_LENGTH / 2
  return [-1, 1].map((side) => {
    const cz = side * (halfZ - GOAL_AREA_DEPTH / 2)
    const pts = createRectangleLine(0, cz, GOAL_AREA_WIDTH, GOAL_AREA_DEPTH)
    const mesh = createLineSegment(pts, 0.002)
    mesh.name = `goal-area-${side > 0 ? 'top' : 'bottom'}`
    return mesh
  })
}

function createCornerArcs(): THREE.Mesh[] {
  const halfW = PITCH_WIDTH / 2
  const halfZ = PITCH_LENGTH / 2
  const arcs: THREE.Mesh[] = []
  const corners = [
    [-halfW, -halfZ, 0],
    [halfW, -halfZ, Math.PI / 2],
    [halfW, halfZ, Math.PI],
    [-halfW, halfZ, -Math.PI / 2],
  ]
  for (const [cx, cz, rot] of corners) {
    const geo = new THREE.RingGeometry(
      CORNER_ARC_RADIUS - LINE_WIDTH / 2,
      CORNER_ARC_RADIUS + LINE_WIDTH / 2,
      16,
      Math.PI / 2,
      Math.PI / 2,
    )
    const mat = new THREE.MeshBasicMaterial({
      color: LINE_COLOR,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(cx, 0.002, cz)
    mesh.rotation.z = rot
    mesh.name = `corner-arc`
    arcs.push(mesh)
  }
  return arcs
}

function createPitchOutline(): THREE.Mesh {
  const pts = createRectangleLine(0, 0, PITCH_WIDTH, PITCH_LENGTH)
  return createLineSegment(pts, 0.002)
}

function createPenaltySpots(): THREE.Mesh[] {
  const halfZ = PITCH_LENGTH / 2
  const distFromGoal = 11
  return [-1, 1].map((side) => {
    const geo = new THREE.CircleGeometry(0.15, 16)
    const mat = new THREE.MeshBasicMaterial({ color: LINE_COLOR })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(0, 0.002, side * (halfZ - distFromGoal))
    mesh.name = `penalty-spot-${side > 0 ? 'top' : 'bottom'}`
    return mesh
  })
}

function createPenaltyArcs(): THREE.Mesh[] {
  const halfZ = PITCH_LENGTH / 2
  const distFromGoal = 16.5
  const radius = 9.15
  return [-1, 1].map((side) => {
    const geo = new THREE.RingGeometry(
      radius - LINE_WIDTH / 2,
      radius + LINE_WIDTH / 2,
      24,
      Math.PI,
      Math.PI,
    )
    const mat = new THREE.MeshBasicMaterial({
      color: LINE_COLOR,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(0, 0.002, side * (halfZ - distFromGoal))
    const forward = side > 0 ? 0 : Math.PI
    mesh.rotation.z = forward
    mesh.name = `penalty-arc-${side > 0 ? 'top' : 'bottom'}`
    return mesh
  })
}

function createGoal(side: number): THREE.Group {
  const halfZ = PITCH_LENGTH / 2
  const zPos = side * (halfZ + 0.5)
  const group = new THREE.Group()
  group.name = `goal-${side > 0 ? 'top' : 'bottom'}`

  const postMat = new THREE.MeshStandardMaterial({
    color: GOAL_COLOR,
    roughness: 0.3,
    metalness: 0.1,
  })

  const postRadius = 0.08

  const leftPost = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, GOAL_HEIGHT, 8),
    postMat,
  )
  leftPost.position.set(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, zPos)
  leftPost.name = 'left-post'

  const rightPost = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, GOAL_HEIGHT, 8),
    postMat,
  )
  rightPost.position.set(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, zPos)
  rightPost.name = 'right-post'

  const crossbar = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, GOAL_WIDTH, 8),
    postMat,
  )
  crossbar.rotation.x = Math.PI / 2
  crossbar.position.set(0, GOAL_HEIGHT, zPos)
  crossbar.name = 'crossbar'

  group.add(leftPost, rightPost, crossbar)

  const netGeo = new THREE.PlaneGeometry(
    GOAL_WIDTH,
    GOAL_HEIGHT,
    NET_RESOLUTION_X,
    NET_RESOLUTION_Y,
  )
  const pos = netGeo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const xNorm = x / (GOAL_WIDTH / 2)
    const yNorm = y / (GOAL_HEIGHT / 2)
    const sag = -0.3 * (1 - Math.abs(xNorm)) * (1 - Math.abs(yNorm))
    pos.setZ(i, sag)
  }
  pos.needsUpdate = true
  netGeo.computeVertexNormals()

  const netMat = new THREE.MeshBasicMaterial({
    color: NET_COLOR,
    wireframe: true,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  })
  const net = new THREE.Mesh(netGeo, netMat)
  net.position.set(0, GOAL_HEIGHT / 2, zPos)
  net.name = 'net'

  const netDepth = new THREE.PlaneGeometry(
    GOAL_WIDTH,
    GOAL_DEPTH,
    NET_RESOLUTION_X,
    Math.ceil(NET_RESOLUTION_Y / 2),
  )
  const netDepthMat = new THREE.MeshBasicMaterial({
    color: NET_COLOR,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  })
  const netTop = new THREE.Mesh(netDepth, netDepthMat)
  netTop.rotation.x = -Math.PI / 2
  netTop.position.set(0, GOAL_HEIGHT, zPos - side * GOAL_DEPTH / 2)
  netTop.name = 'net-top'

  const netLeft = new THREE.Mesh(netDepth, netDepthMat)
  netLeft.rotation.y = Math.PI / 2
  netLeft.position.set(-GOAL_WIDTH / 2, GOAL_HEIGHT / 2, zPos - side * GOAL_DEPTH / 2)
  netLeft.name = 'net-left'

  const netRight = new THREE.Mesh(netDepth, netDepthMat)
  netRight.rotation.y = -Math.PI / 2
  netRight.position.set(GOAL_WIDTH / 2, GOAL_HEIGHT / 2, zPos - side * GOAL_DEPTH / 2)
  netRight.name = 'net-right'

  group.add(net, netTop, netLeft, netRight)

  return group
}

function createStadiumShell(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'stadium-shell'

  const standMat = new THREE.MeshStandardMaterial({
    color: STAND_COLOR,
    roughness: 0.8,
    metalness: 0,
    flatShading: true,
  })

  const halfZ = PITCH_LENGTH / 2
  const halfW = PITCH_WIDTH / 2

  const positions = [
    { x: 0, z: -(halfZ + STADIUM_STAND_OFFSET + STADIUM_STAND_DEPTH / 2), w: PITCH_WIDTH + 10, d: STADIUM_STAND_DEPTH },
    { x: 0, z: halfZ + STADIUM_STAND_OFFSET + STADIUM_STAND_DEPTH / 2, w: PITCH_WIDTH + 10, d: STADIUM_STAND_DEPTH },
    { x: -(halfW + STADIUM_STAND_OFFSET + STADIUM_STAND_DEPTH / 2), z: 0, w: STADIUM_STAND_DEPTH, d: PITCH_LENGTH + 10 },
    { x: halfW + STADIUM_STAND_OFFSET + STADIUM_STAND_DEPTH / 2, z: 0, w: STADIUM_STAND_DEPTH, d: PITCH_LENGTH + 10 },
  ]

  for (const pos of positions) {
    const geo = new THREE.BoxGeometry(pos.w, STADIUM_STAND_HEIGHT, pos.d)
    const mesh = new THREE.Mesh(geo, standMat)
    mesh.position.set(pos.x, 0, pos.z)
    mesh.name = 'stand'
    group.add(mesh)
  }

  return group
}

function createLighting(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'lighting'

  const ambient = new THREE.AmbientLight(0x404060, 0.5)
  ambient.name = 'ambient-light'
  group.add(ambient)

  const sun = new THREE.DirectionalLight(0xffeedd, 1.2)
  sun.position.set(40, 60, 30)
  sun.name = 'sun-light'
  group.add(sun)

  const fill = new THREE.DirectionalLight(0x8888ff, 0.3)
  fill.position.set(-30, 20, -40)
  fill.name = 'fill-light'
  group.add(fill)

  return group
}

export function createPitch(): THREE.Group {
  const group = new THREE.Group()
  group.name = 'pitch-root'

  group.add(createPitchSurface())

  group.add(createPitchOutline())
  group.add(createHalfwayLine())
  group.add(createCentreCircle())
  group.add(createCentreSpot())

  for (const mesh of createPenaltyAreas()) group.add(mesh)
  for (const mesh of createGoalAreas()) group.add(mesh)
  for (const mesh of createCornerArcs()) group.add(mesh)
  for (const mesh of createPenaltySpots()) group.add(mesh)
  for (const mesh of createPenaltyArcs()) group.add(mesh)

  group.add(createGoal(1))
  group.add(createGoal(-1))

  group.add(createStadiumShell())
  group.add(createLighting())

  return group
}

export function countMeshes(group: THREE.Group): number {
  let count = 0
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) count++
  })
  return count
}

export function countLights(group: THREE.Group): number {
  let count = 0
  group.traverse((child) => {
    if ((child as THREE.Light).isLight) count++
  })
  return count
}
