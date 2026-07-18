import * as THREE from 'three'
import { createHeldWeapon } from './weapons'

export interface BikeBuild {
  root: THREE.Group
  /** 右臂枢轴，用于挥击动画 */
  rightArmPivot: THREE.Group
  wheels: THREE.Mesh[]
}

/** 更立体的摩托 + 骑手模型 */
export function createMotorcycle(
  color: number,
  riderColor: number,
  isPlayer: boolean
): BikeBuild {
  const root = new THREE.Group()
  root.name = 'bikeRoot'

  const metal = new THREE.MeshStandardMaterial({
    color: 0x2a2a2e,
    metalness: 0.75,
    roughness: 0.35,
  })
  const paint = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.45,
    roughness: 0.4,
  })
  const accent = new THREE.MeshStandardMaterial({
    color: isPlayer ? 0xffcc33 : color,
    metalness: 0.55,
    roughness: 0.35,
  })
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.1,
    roughness: 0.9,
  })
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xc0c8d0,
    metalness: 0.9,
    roughness: 0.2,
  })
  const leather = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.15,
    roughness: 0.85,
  })
  const skin = new THREE.MeshStandardMaterial({
    color: isPlayer ? 0xf0c8a0 : 0xd4b090,
    roughness: 0.7,
  })
  const suit = new THREE.MeshStandardMaterial({
    color: riderColor,
    metalness: 0.25,
    roughness: 0.55,
  })

  // —— 车架 ——
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 1.6), metal)
  frame.position.set(0, 0.72, -0.05)
  frame.castShadow = true
  root.add(frame)

  // 油箱
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 6, 12), paint)
  tank.rotation.z = Math.PI / 2
  tank.rotation.y = Math.PI / 2
  tank.scale.set(1, 0.85, 1.15)
  tank.position.set(0, 1.02, 0.15)
  tank.castShadow = true
  root.add(tank)

  // 侧壳
  for (const sx of [-1, 1]) {
    const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 1.1), accent)
    fairing.position.set(sx * 0.42, 0.85, 0.05)
    fairing.castShadow = true
    root.add(fairing)
  }

  // 座位
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.75), leather)
  seat.position.set(0, 0.98, -0.55)
  root.add(seat)

  // 尾部
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.45), paint)
  tail.position.set(0, 0.95, -1.05)
  root.add(tail)

  // 前叉
  for (const sx of [-1, 1]) {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), chrome)
    fork.position.set(sx * 0.18, 0.65, 0.95)
    fork.rotation.x = 0.25
    root.add(fork)
  }

  // 车把
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 8), chrome)
  handle.rotation.z = Math.PI / 2
  handle.position.set(0, 1.15, 0.85)
  root.add(handle)
  for (const sx of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 8), rubber)
    grip.rotation.z = Math.PI / 2
    grip.position.set(sx * 0.4, 1.15, 0.85)
    root.add(grip)
  }

  // 排气管
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.1, 8), chrome)
  exhaust.rotation.x = Math.PI / 2
  exhaust.position.set(0.38, 0.55, -0.35)
  root.add(exhaust)

  // 前灯
  const headlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffffee,
      emissive: 0xfff2aa,
      emissiveIntensity: isPlayer ? 0.85 : 0.35,
      metalness: 0.3,
      roughness: 0.2,
    })
  )
  headlight.position.set(0, 0.95, 1.25)
  root.add(headlight)

  // 尾灯
  const taillight = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.1, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xaa0000,
      emissiveIntensity: 0.5,
    })
  )
  taillight.position.set(0, 0.95, -1.28)
  root.add(taillight)

  // 轮子（更厚实）
  const wheels: THREE.Mesh[] = []
  const makeWheel = (z: number) => {
    const wheel = new THREE.Group()
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 10, 22), rubber)
    tire.rotation.y = Math.PI / 2
    tire.castShadow = true
    wheel.add(tire)
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12), chrome)
    rim.rotation.z = Math.PI / 2
    wheel.add(rim)
    // 辐条感
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.03), chrome)
      spoke.rotation.z = (i / 5) * Math.PI
      wheel.add(spoke)
    }
    wheel.position.set(0, 0.42, z)
    root.add(wheel)
    wheels.push(tire)
  }
  makeWheel(0.95)
  makeWheel(-0.9)

  // —— 骑手 ——
  const rider = new THREE.Group()
  rider.name = 'rider'
  rider.position.set(0, 0, -0.12)

  // 躯干（前倾骑姿）
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), suit)
  torso.position.set(0, 1.35, -0.2)
  torso.rotation.x = 0.45
  torso.castShadow = true
  rider.add(torso)

  // 头盔
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 14, 14),
    new THREE.MeshStandardMaterial({
      color: isPlayer ? 0x1e40af : 0x374151,
      metalness: 0.5,
      roughness: 0.35,
    })
  )
  helmet.position.set(0, 1.82, 0.02)
  helmet.castShadow = true
  rider.add(helmet)
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.08, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      metalness: 0.8,
      roughness: 0.15,
      transparent: true,
      opacity: 0.75,
    })
  )
  visor.position.set(0, 1.8, 0.14)
  rider.add(visor)

  // 腿
  for (const sx of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 3, 6), suit)
    thigh.position.set(sx * 0.16, 1.05, -0.15)
    thigh.rotation.x = 1.1
    rider.add(thigh)
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.28), leather)
    boot.position.set(sx * 0.18, 0.72, 0.15)
    rider.add(boot)
  }

  // 左臂扶把
  const leftArm = new THREE.Group()
  leftArm.position.set(-0.28, 1.48, 0.05)
  const leftUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 3, 6), suit)
  leftUpper.position.set(-0.08, 0, 0.15)
  leftUpper.rotation.x = -0.9
  leftUpper.rotation.z = 0.4
  leftArm.add(leftUpper)
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), skin)
  leftHand.position.set(-0.22, -0.05, 0.55)
  leftArm.add(leftHand)
  rider.add(leftArm)

  // 右臂枢轴（挥击）
  const rightArmPivot = new THREE.Group()
  rightArmPivot.name = 'rightArmPivot'
  rightArmPivot.position.set(0.28, 1.48, 0.05)
  const rightUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 3, 6), suit)
  rightUpper.position.set(0.12, -0.02, 0.12)
  rightUpper.rotation.x = -0.75
  rightUpper.rotation.z = -0.35
  rightArmPivot.add(rightUpper)
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), skin)
  rightHand.name = 'rightHand'
  rightHand.position.set(0.28, -0.08, 0.48)
  rightArmPivot.add(rightHand)
  rider.add(rightArmPivot)

  root.add(rider)

  return { root, rightArmPivot, wheels }
}

/** 将武器挂到右手上，并返回武器根节点（跟着手臂挥动） */
export function attachWeaponToArm(
  rightArmPivot: THREE.Group,
  weapon: string | null
): THREE.Group {
  // 移除旧武器
  const old = rightArmPivot.getObjectByName('heldWeapon')
  if (old) {
    rightArmPivot.remove(old)
    old.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
        else obj.material?.dispose()
      }
    })
  }

  const held = createHeldWeapon(weapon)
  // 对齐到右手位置
  held.position.set(0.32, -0.05, 0.55)
  held.rotation.set(0.2, 0, -0.4)
  rightArmPivot.add(held)
  return held
}
