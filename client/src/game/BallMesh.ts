import * as THREE from 'three'

export const BALL_RADIUS = 0.22
export const BALL_DETAIL = 1

const PENTAGON_COLOR = new THREE.Color(0x222222)
const PANEL_COLOR = new THREE.Color(0xffffff)

function getIcosahedronVertices(radius: number): THREE.Vector3[] {
  const phi = (1 + Math.sqrt(5)) / 2
  const normalizedPhi = phi / Math.sqrt(1 + phi * phi)
  const one = 1 / Math.sqrt(1 + phi * phi)
  const verts: THREE.Vector3[] = []
  const signs = [-1, 1]
  for (const s1 of signs) {
    for (const s2 of signs) {
      verts.push(new THREE.Vector3(0, s1 * one, s2 * normalizedPhi).multiplyScalar(radius))
      verts.push(new THREE.Vector3(s1 * one, s2 * normalizedPhi, 0).multiplyScalar(radius))
      verts.push(new THREE.Vector3(s1 * normalizedPhi, 0, s2 * one).multiplyScalar(radius))
    }
  }
  return verts
}

function isPentagonVertex(position: THREE.Vector3, radius: number, threshold: number): boolean {
  const icosahedronVerts = getIcosahedronVertices(radius)
  const dir = position.clone().normalize()
  for (const v of icosahedronVerts) {
    if (dir.distanceTo(v.clone().normalize()) < threshold) {
      return true
    }
  }
  return false
}

export function createBallMesh(): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(BALL_RADIUS, BALL_DETAIL)

  const positions = geo.attributes.position
  const colors: number[] = []
  const vertex = new THREE.Vector3()
  const threshold = 0.15

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i)
    const isPentagon = isPentagonVertex(vertex, BALL_RADIUS, threshold)
    const c = isPentagon ? PENTAGON_COLOR : PANEL_COLOR
    colors.push(c.r, c.g, c.b)
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.4,
    metalness: 0,
    flatShading: true,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = 'ball'
  return mesh
}
