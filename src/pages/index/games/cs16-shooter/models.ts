import * as THREE from 'three'
import type { TeamId } from './types'

function mat(color: number, roughness = 0.82, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

/** 战术人形：头盔、背心、四肢与武器，比方块体更接近 FPS 角色 */
export function createSoldierMesh(team: TeamId): THREE.Group {
  const group = new THREE.Group()
  const isCt = team === 'ct'

  const skin = mat(0xc8956d, 0.9)
  const vest = mat(isCt ? 0x1e3a5f : 0x3d2817, 0.78, 0.08)
  const vestLight = mat(isCt ? 0x2f5a8a : 0x5c3a22, 0.75, 0.1)
  const pants = mat(isCt ? 0x1a2744 : 0x2a1810, 0.88)
  const helmet = mat(isCt ? 0x4a6fa5 : 0x4a3020, 0.55, 0.15)
  const boot = mat(0x1a1410, 0.92)
  const weaponBody = mat(0x1c1c1c, 0.45, 0.35)
  const glove = mat(0x2a2218, 0.86)

  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.72, 8), pants)
  leftLeg.position.set(-0.14, 0.36, 0)
  leftLeg.name = 'legL'
  group.add(leftLeg)

  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.72, 8), pants)
  rightLeg.position.set(0.14, 0.36, 0)
  rightLeg.name = 'legR'
  group.add(rightLeg)

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.28), boot)
  leftBoot.position.set(-0.14, 0.06, 0.04)
  group.add(leftBoot)

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.28), boot)
  rightBoot.position.set(0.14, 0.06, 0.04)
  group.add(rightBoot)

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.28), vest)
  torso.position.set(0, 0.98, 0)
  group.add(torso)

  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.08), vestLight)
  plate.position.set(0, 1.02, 0.16)
  group.add(plate)

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.48, 8), vest)
  leftArm.position.set(-0.34, 0.98, 0.08)
  leftArm.rotation.z = 0.35
  leftArm.rotation.x = -0.5
  leftArm.name = 'armL'
  group.add(leftArm)

  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.48, 8), vest)
  rightArm.position.set(0.34, 0.98, 0.08)
  rightArm.rotation.z = -0.35
  rightArm.rotation.x = -0.5
  rightArm.name = 'armR'
  group.add(rightArm)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), skin)
  neck.position.set(0, 1.34, 0)
  group.add(neck)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin)
  head.position.set(0, 1.52, 0)
  group.add(head)

  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), helmet)
  helm.position.set(0, 1.56, -0.01)
  group.add(helm)

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.08, 0.06),
    new THREE.MeshStandardMaterial({
      color: isCt ? 0x223344 : 0x332211,
      roughness: 0.2,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85,
    }),
  )
  visor.position.set(0, 1.5, 0.17)
  group.add(visor)

  const gun = new THREE.Group()
  const gunStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.28), weaponBody)
  gunStock.position.set(0, 0, -0.1)
  gun.add(gunStock)
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.42), weaponBody)
  gunBody.position.set(0, 0.02, 0.12)
  gun.add(gunBody)
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6), weaponBody)
  gunBarrel.rotation.x = Math.PI / 2
  gunBarrel.position.set(0, 0.04, 0.38)
  gun.add(gunBarrel)
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), glove)
  handL.position.set(-0.05, -0.02, 0.08)
  gun.add(handL)
  gun.position.set(0.22, 0.92, 0.28)
  gun.rotation.y = -0.15
  group.add(gun)

  group.userData.anim = { phase: Math.random() * Math.PI * 2, gun }
  return group
}

/** 行走时轻微摆腿、抬枪 */
export function animateSoldier(mesh: THREE.Group, moving: boolean, dt: number) {
  const anim = mesh.userData.anim as { phase: number; gun: THREE.Group } | undefined
  if (!anim) return

  if (moving) anim.phase += dt * 9
  else anim.phase += dt * 2

  const swing = moving ? Math.sin(anim.phase) * 0.28 : Math.sin(anim.phase) * 0.04
  const legL = mesh.getObjectByName('legL')
  const legR = mesh.getObjectByName('legR')
  if (legL) legL.rotation.x = swing
  if (legR) legR.rotation.x = -swing

  anim.gun.position.y = 0.92 + Math.abs(Math.sin(anim.phase * 2)) * (moving ? 0.015 : 0.004)
}
