import * as THREE from 'three'

export type WeaponId = '徒手' | '铁棍' | '链锤'

export interface WeaponProfile {
  id: WeaponId
  baseDamage: number
  range: number
  sideRange: number
  cooldown: number
  color: number
  trailColor: number
  hitColor: number
  label: string
  /** 击中回血 */
  lifesteal: number
}

export const WEAPON_PROFILES: Record<WeaponId, WeaponProfile> = {
  徒手: {
    id: '徒手',
    baseDamage: 8,
    range: 5.0,
    sideRange: 3.4,
    cooldown: 0.68,
    color: 0xffe4c4,
    trailColor: 0xffffff,
    hitColor: 0xffcc88,
    label: '拳脚',
    lifesteal: 3,
  },
  铁棍: {
    id: '铁棍',
    baseDamage: 11,
    range: 6.4,
    sideRange: 4.0,
    cooldown: 0.55,
    color: 0xb0b8c4,
    trailColor: 0xdfe7f3,
    hitColor: 0xffdd55,
    label: '铁棍',
    lifesteal: 4,
  },
  链锤: {
    id: '链锤',
    baseDamage: 10,
    range: 7.6,
    sideRange: 4.8,
    cooldown: 0.6,
    color: 0x9ca3af,
    trailColor: 0xe9d5ff,
    hitColor: 0xf0abfc,
    label: '链锤',
    lifesteal: 5,
  },
}

export function resolveWeapon(weapon: string | null): WeaponProfile {
  if (weapon === '铁棍') return WEAPON_PROFILES.铁棍
  if (weapon === '链锤') return WEAPON_PROFILES.链锤
  return WEAPON_PROFILES.徒手
}

/** 挂在右手上的武器模型（本地坐标，相对手臂） */
export function createHeldWeapon(weapon: string | null): THREE.Group {
  const g = new THREE.Group()
  g.name = 'heldWeapon'
  const profile = resolveWeapon(weapon)

  if (profile.id === '徒手') {
    // 拳套
    const glove = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xc45c26, roughness: 0.55, metalness: 0.1 })
    )
    glove.position.set(0, 0, 0)
    g.add(glove)
    const knuckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.06, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x8b3a12, roughness: 0.5 })
    )
    knuckle.position.set(0.02, 0.02, 0.06)
    g.add(knuckle)
    return g
  }

  if (profile.id === '铁棍') {
    // 握把
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0x3f2a1a, roughness: 0.8 })
    )
    grip.position.set(0, 0, 0.05)
    g.add(grip)
    // 金属棍身
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 1.35, 10),
      new THREE.MeshStandardMaterial({ color: profile.color, metalness: 0.85, roughness: 0.28 })
    )
    bar.position.set(0, 0, 0.75)
    bar.rotation.x = Math.PI / 2
    g.add(bar)
    // 末端加重
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.9, roughness: 0.2 })
    )
    tip.position.set(0, 0, 1.42)
    g.add(tip)
    return g
  }

  // 链锤：握柄 + 链条 + 带刺锤头
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.55, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.75 })
  )
  handle.rotation.x = Math.PI / 2
  handle.position.set(0, 0, 0.2)
  g.add(handle)

  const chainGroup = new THREE.Group()
  for (let i = 0; i < 6; i++) {
    const link = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.018, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.85, roughness: 0.3 })
    )
    link.position.set(0, 0, 0.48 + i * 0.11)
    link.rotation.y = (i % 2) * (Math.PI / 2)
    chainGroup.add(link)
  }
  g.add(chainGroup)

  const ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.14, 0),
    new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.7, roughness: 0.35 })
  )
  ball.position.set(0, 0, 1.2)
  g.add(ball)

  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.14, 5),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.75, roughness: 0.3 })
    )
    const a = (i / 6) * Math.PI * 2
    spike.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 1.2)
    spike.lookAt(0, 0, 1.2)
    g.add(spike)
  }

  return g
}

/** 世界空间挥砍残影特效 */
export function createSwingEffect(weapon: string | null): THREE.Group {
  const profile = resolveWeapon(weapon)
  const g = new THREE.Group()
  g.name = 'swingFx'

  if (profile.id === '徒手') {
    const fist = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshBasicMaterial({ color: profile.trailColor, transparent: true, opacity: 0.9 })
    )
    g.add(fist)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.05, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff7ed, transparent: true, opacity: 0.7 })
    )
    ring.rotation.y = Math.PI / 2
    g.add(ring)
    return g
  }

  if (profile.id === '铁棍') {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 2.2),
      new THREE.MeshBasicMaterial({ color: profile.trailColor, transparent: true, opacity: 0.88 })
    )
    bar.position.z = 0.85
    g.add(bar)
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.07, 8, 28, Math.PI * 0.95),
      new THREE.MeshBasicMaterial({ color: profile.hitColor, transparent: true, opacity: 0.65 })
    )
    arc.rotation.x = Math.PI / 2
    arc.rotation.z = -0.5
    g.add(arc)
    return g
  }

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 12),
    new THREE.MeshBasicMaterial({ color: profile.hitColor, transparent: true, opacity: 0.92 })
  )
  ball.position.z = 1.35
  g.add(ball)
  for (let i = 0; i < 5; i++) {
    const link = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 6),
      new THREE.MeshBasicMaterial({
        color: profile.trailColor,
        transparent: true,
        opacity: 0.7 - i * 0.1,
      })
    )
    link.position.set(0, 0.04 * i, 0.35 + i * 0.2)
    g.add(link)
  }
  const slash = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.09, 8, 32, Math.PI * 1.15),
    new THREE.MeshBasicMaterial({ color: 0xf5d0fe, transparent: true, opacity: 0.6 })
  )
  slash.rotation.x = Math.PI / 2
  g.add(slash)
  return g
}

export function createDamageLabel(text: string, color = '#ffee55'): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 160, 64)
  ctx.font = 'bold 34px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 6
  ctx.strokeText(text, 80, 32)
  ctx.fillStyle = color
  ctx.fillText(text, 80, 32)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(2.6, 1.15, 1)
  return sprite
}
