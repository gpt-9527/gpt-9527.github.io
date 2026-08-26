/**
 * CS16 角色模型 — 商业化战术人形
 * CT：深蓝作战服 + 白蓝头盔 + 护目镜 + 战术背包
 * T：沙漠作训服 + 黑色面罩 + 红头巾 + 弹药背心
 * 附带头顶敌我名牌 Sprite 与倒地姿态辅助
 */
import * as THREE from 'three'
import type { TeamId } from './types'

function mat(color: number, roughness = 0.82, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

/** 头顶名牌：队友蓝底 / 敌人红底，Canvas 纹理 Sprite */
export function createNameTag(name: string, team: TeamId): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const g = canvas.getContext('2d')!

  const bg = team === 'ct' ? 'rgba(38,108,205,0.85)' : 'rgba(196,74,54,0.85)'
  const border = team === 'ct' ? 'rgba(140,190,255,0.95)' : 'rgba(255,170,140,0.95)'

  // 圆角底板
  g.fillStyle = bg
  const r = 14
  g.beginPath()
  g.moveTo(r, 4)
  g.lineTo(252 - r, 4)
  g.quadraticCurveTo(252, 4, 252, 4 + r)
  g.lineTo(252, 60 - r)
  g.quadraticCurveTo(252, 60, 252 - r, 60)
  g.lineTo(r, 60)
  g.quadraticCurveTo(4, 60, 4, 60 - r)
  g.lineTo(4, 4 + r)
  g.quadraticCurveTo(4, 4, r, 4)
  g.fill()
  g.strokeStyle = border
  g.lineWidth = 3
  g.stroke()

  g.font = 'bold 30px Inter, system-ui, sans-serif'
  g.fillStyle = '#ffffff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(name, 128, 33)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
  )
  sprite.scale.set(1.5, 0.38, 1)
  sprite.position.set(0, 2.12, 0)
  sprite.renderOrder = 10
  return sprite
}

/** 战术人形：头盔、面罩、背心、四肢与武器 */
export function createSoldierMesh(team: TeamId): THREE.Group {
  const group = new THREE.Group()
  const isCt = team === 'ct'

  const skin = mat(isCt ? 0xd8a077 : 0xc8956d, 0.9)
  const vest = mat(isCt ? 0x24466e : 0x8a6f47, 0.78, 0.08)
  const vestLight = mat(isCt ? 0x35619a : 0xa5854f, 0.75, 0.1)
  const cloth = mat(isCt ? 0x2c3f63 : 0xb59a6a, 0.88)
  const pants = mat(isCt ? 0x1e2c49 : 0x8f7b52, 0.88)
  const helmet = mat(isCt ? 0xe8eef5 : 0x3a2a1c, 0.5, 0.18)
  const boot = mat(0x1a1410, 0.92)
  const weaponBody = mat(0x1c1c1c, 0.45, 0.35)
  const glove = mat(0x2a2218, 0.86)
  const pack = mat(isCt ? 0x1b3050 : 0x6e5636, 0.9)

  // —— 下肢 ——
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.1, 0.72, 10), pants)
  leftLeg.position.set(-0.14, 0.36, 0)
  leftLeg.name = 'legL'
  group.add(leftLeg)

  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.1, 0.72, 10), pants)
  rightLeg.position.set(0.14, 0.36, 0)
  rightLeg.name = 'legR'
  group.add(rightLeg)

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.13, 0.3), boot)
  leftBoot.position.set(-0.14, 0.06, 0.05)
  group.add(leftBoot)

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.13, 0.3), boot)
  rightBoot.position.set(0.14, 0.06, 0.05)
  group.add(rightBoot)

  // 膝盖护具
  for (const sx of [-1, 1]) {
    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), vestLight)
    knee.position.set(sx * 0.14, 0.52, 0.11)
    group.add(knee)
  }

  // —— 躯干 ——
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.64, 0.3), cloth)
  torso.position.set(0, 1.0, 0)
  group.add(torso)

  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.09), vest)
  plate.position.set(0, 1.04, 0.17)
  group.add(plate)

  // 胸前弹匣包 ×2
  for (const sx of [-1, 1]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), vestLight)
    pouch.position.set(sx * 0.11, 0.94, 0.22)
    group.add(pouch)
  }

  // 腰带
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.07, 0.32), boot)
  belt.position.set(0, 0.72, 0)
  group.add(belt)

  // 背包
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.18), pack)
  backpack.position.set(0, 1.06, -0.22)
  group.add(backpack)
  const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.05), vestLight)
  packFlap.position.set(0, 1.22, -0.31)
  group.add(packFlap)

  // 肩甲
  for (const sx of [-1, 1]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), vest)
    pad.position.set(sx * 0.3, 1.28, 0)
    group.add(pad)
  }

  // —— 手臂（持枪姿势）——
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.48, 8), cloth)
  leftArm.position.set(-0.34, 0.98, 0.08)
  leftArm.rotation.z = 0.35
  leftArm.rotation.x = -0.5
  leftArm.name = 'armL'
  group.add(leftArm)

  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.48, 8), cloth)
  rightArm.position.set(0.34, 0.98, 0.08)
  rightArm.rotation.z = -0.35
  rightArm.rotation.x = -0.5
  rightArm.name = 'armR'
  group.add(rightArm)

  // —— 头部 ——
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), skin)
  neck.position.set(0, 1.36, 0)
  group.add(neck)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), skin)
  head.position.set(0, 1.54, 0)
  head.name = 'head'
  group.add(head)

  if (isCt) {
    // CT：白色战术头盔 + 护目镜
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.215, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      helmet,
    )
    helm.position.set(0, 1.58, -0.01)
    group.add(helm)

    const helmRim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.028, 8, 20), mat(0x9fb4cc, 0.55, 0.2))
    helmRim.rotation.x = Math.PI / 2
    helmRim.position.set(0, 1.53, 0)
    group.add(helmRim)

    const goggles = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.09, 0.07),
      new THREE.MeshStandardMaterial({
        color: 0x27435e,
        roughness: 0.15,
        metalness: 0.5,
        transparent: true,
        opacity: 0.9,
      }),
    )
    goggles.position.set(0, 1.55, 0.16)
    group.add(goggles)
  } else {
    // T：黑色面罩 + 红头巾
    const balaclava = new THREE.Mesh(new THREE.SphereGeometry(0.195, 14, 12), mat(0x18181c, 0.85))
    balaclava.position.set(0, 1.54, 0)
    group.add(balaclava)

    const faceHole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.05), skin)
    faceHole.position.set(0, 1.5, 0.165)
    group.add(faceHole)

    const bandana = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.21, 0.09, 14, 1, true),
      mat(0xb03a2e, 0.8),
    )
    bandana.position.set(0, 1.62, 0)
    group.add(bandana)

    // 飘带
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.03), mat(0xb03a2e, 0.8))
    tail.position.set(-0.12, 1.5, -0.14)
    tail.rotation.z = 0.4
    group.add(tail)
  }

  // —— 武器 ——
  const gun = new THREE.Group()
  const gunStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.28), weaponBody)
  gunStock.position.set(0, 0, -0.1)
  gun.add(gunStock)
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.42), weaponBody)
  gunBody.position.set(0, 0.02, 0.12)
  gun.add(gunBody)
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), mat(0x2c2c2c, 0.5, 0.3))
  mag.position.set(0, -0.08, 0.14)
  gun.add(mag)
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.34, 6), weaponBody)
  gunBarrel.rotation.x = Math.PI / 2
  gunBarrel.position.set(0, 0.05, 0.4)
  gun.add(gunBarrel)
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), glove)
  handL.position.set(-0.05, -0.02, 0.08)
  gun.add(handL)
  gun.position.set(0.22, 0.94, 0.28)
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

  anim.gun.position.y = 0.94 + Math.abs(Math.sin(anim.phase * 2)) * (moving ? 0.015 : 0.004)
}

/** 死亡倒地：向后仰倒并贴地 */
export function playDeathPose(mesh: THREE.Group) {
  mesh.rotation.x = -Math.PI / 2.15
  mesh.position.y = 0.18
}

/** 回合重生复位姿态 */
export function resetPose(mesh: THREE.Group) {
  mesh.rotation.x = 0
  mesh.position.y = 0
}
