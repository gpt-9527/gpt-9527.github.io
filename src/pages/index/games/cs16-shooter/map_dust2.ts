import * as THREE from 'three'
import type { ColliderBox, MapData, SpawnPoint } from './types'

function boxCollider(
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
): ColliderBox {
  return {
    min: { x: x - sx / 2, y: y - sy / 2, z: z - sz / 2 },
    max: { x: x + sx / 2, y: y + sy / 2, z: z + sz / 2 },
  }
}

function addBox(
  map: THREE.Group,
  colliders: ColliderBox[],
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  mat: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat)
  mesh.position.set(x, y, z)
  mesh.castShadow = false
  map.add(mesh)
  colliders.push(boxCollider(x, y, z, sx, sy, sz))
}

function spawn(x: number, z: number, yaw: number): SpawnPoint {
  return { position: { x, y: 1.6, z }, yaw }
}

export function createDust2Map(): MapData {
  const map = new THREE.Group()
  const colliders: ColliderBox[] = []

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.92 })
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xbfa76f, roughness: 0.95 })
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.88 })
  const siteAMat = new THREE.MeshStandardMaterial({ color: 0x2255aa, roughness: 0.8 })
  const siteBMat = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.8 })
  const midMat = new THREE.MeshStandardMaterial({ color: 0x9a8b6a, roughness: 0.9 })

  // Ground
  addBox(map, colliders, 0, -1, 0, 120, 2, 120, floorMat)

  const wallH = 10
  const wallT = 2
  addBox(map, colliders, 0, wallH / 2 - 1, -61, 120, wallH, wallT, wallMat)
  addBox(map, colliders, 0, wallH / 2 - 1, 61, 120, wallH, wallT, wallMat)
  addBox(map, colliders, -61, wallH / 2 - 1, 0, wallT, wallH, 120, wallMat)
  addBox(map, colliders, 61, wallH / 2 - 1, 0, wallT, wallH, 120, wallMat)

  // Mid structure
  addBox(map, colliders, 0, 1.5, 0, 14, 3, 6, midMat)
  addBox(map, colliders, -8, 1, -6, 4, 2, 4, crateMat)
  addBox(map, colliders, 8, 1, 6, 4, 2, 4, crateMat)

  // A site area
  const aSite = new THREE.Mesh(new THREE.BoxGeometry(22, 0.15, 22), siteAMat)
  aSite.position.set(-32, 0.08, -32)
  map.add(aSite)
  addBox(map, colliders, -38, 1.2, -26, 5, 2.4, 5, crateMat)
  addBox(map, colliders, -28, 1.2, -38, 5, 2.4, 5, crateMat)
  addBox(map, colliders, -22, 1, -32, 8, 2, 3, wallMat)

  // B site area
  const bSite = new THREE.Mesh(new THREE.BoxGeometry(22, 0.15, 22), siteBMat)
  bSite.position.set(32, 0.08, 32)
  map.add(bSite)
  addBox(map, colliders, 38, 1.2, 26, 5, 2.4, 5, crateMat)
  addBox(map, colliders, 28, 1.2, 38, 5, 2.4, 5, crateMat)
  addBox(map, colliders, 22, 1, 32, 8, 2, 3, wallMat)

  // Long corridors
  addBox(map, colliders, -45, 1.5, -10, 3, 3, 30, wallMat)
  addBox(map, colliders, 45, 1.5, 10, 3, 3, 30, wallMat)
  addBox(map, colliders, -15, 1, 18, 20, 2, 4, crateMat)
  addBox(map, colliders, 15, 1, -18, 20, 2, 4, crateMat)

  // CT / T spawn cover
  addBox(map, colliders, 0, 1, 48, 16, 2, 4, crateMat)
  addBox(map, colliders, 0, 1, -48, 16, 2, 4, crateMat)

  const ctSpawns: SpawnPoint[] = [
    spawn(-6, 50, Math.PI),
    spawn(0, 52, Math.PI),
    spawn(6, 50, Math.PI),
    spawn(-10, 46, Math.PI),
    spawn(10, 46, Math.PI),
  ]

  const tSpawns: SpawnPoint[] = [
    spawn(-6, -50, 0),
    spawn(0, -52, 0),
    spawn(6, -50, 0),
    spawn(-10, -46, 0),
    spawn(10, -46, 0),
  ]

  const bombSites = [
    { id: 'A' as const, position: { x: -32, y: 0, z: -32 }, radius: 9 },
    { id: 'B' as const, position: { x: 32, y: 0, z: 32 }, radius: 9 },
  ]

  return { group: map, colliders, ctSpawns, tSpawns, bombSites }
}
