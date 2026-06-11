import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { createPlayerMesh } from './PlayerMesh'

describe('PlayerMesh', () => {
  it('returns a Group', () => {
    const player = createPlayerMesh('#ff0000')
    expect(player).toBeInstanceOf(THREE.Group)
    expect(player.name).toBe('player')
  })

  it('has at least 4 child meshes (head, torso, 2 limbs minimum)', () => {
    const player = createPlayerMesh('#ff0000')
    let meshCount = 0
    player.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshCount++
    })
    expect(meshCount).toBeGreaterThanOrEqual(4)
  })

  it('has a head mesh', () => {
    const player = createPlayerMesh('#ff0000')
    const head = player.getObjectByName('head')
    expect(head).toBeDefined()
    expect((head as THREE.Mesh).isMesh).toBe(true)
  })

  it('has a torso mesh', () => {
    const player = createPlayerMesh('#ff0000')
    const torso = player.getObjectByName('torso')
    expect(torso).toBeDefined()
    expect((torso as THREE.Mesh).isMesh).toBe(true)
  })

  it('applies the passed colour to kit parts (torso)', () => {
    const color = '#ff0000'
    const player = createPlayerMesh(color)
    const torso = player.getObjectByName('torso') as THREE.Mesh
    const mat = torso.material as THREE.MeshStandardMaterial
    expect(mat.color.getHexString()).toBe('ff0000')
  })

  it('creates different-coloured kits for different colours', () => {
    const red = createPlayerMesh('#ff0000')
    const blue = createPlayerMesh('#0000ff')
    const redTorso = red.getObjectByName('torso') as THREE.Mesh
    const blueTorso = blue.getObjectByName('torso') as THREE.Mesh
    const redMat = redTorso.material as THREE.MeshStandardMaterial
    const blueMat = blueTorso.material as THREE.MeshStandardMaterial
    expect(redMat.color.getHex()).not.toBe(blueMat.color.getHex())
  })

  it('has arms', () => {
    const player = createPlayerMesh('#ff0000')
    expect(player.getObjectByName('left-upper-arm')).toBeDefined()
    expect(player.getObjectByName('right-upper-arm')).toBeDefined()
  })

  it('has legs', () => {
    const player = createPlayerMesh('#ff0000')
    expect(player.getObjectByName('left-upper-leg')).toBeDefined()
    expect(player.getObjectByName('right-upper-leg')).toBeDefined()
  })

  it('uses flat shaded materials', () => {
    const player = createPlayerMesh('#ff0000')
    const torso = player.getObjectByName('torso') as THREE.Mesh
    const mat = torso.material as THREE.MeshStandardMaterial
    expect(mat.flatShading).toBe(true)
  })
})
