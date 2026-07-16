import * as THREE from 'three'

export type WeaponId = '徒手' | '铁棍' | '链锤'

export interface WeaponProfile {
  id: WeaponId
  /** 基础伤害 */
  baseDamage: number
  /** 纵向攻击范围 */
  range: number
  /** 横向攻击范围 */
  sideRange: number
  /** 攻击冷却 */
  cooldown: number
  color: number
  trailColor: number
  hitColor: number
  label: string
}

export const WEAPON_PROFILES: Record<WeaponId, WeaponProfile> = {
  徒手: {
    id: '徒手',
    baseDamage: 8,
    range: 5.0,
    sideRange: 3.4,
    cooldown: 0.72,
    color: 0xffe4c4,
    trailColor: 0xffffff,
    hitColor: 0xffcc88,
    label: '拳脚',
  },
  铁棍: {
    id: '铁棍',
    baseDamage: 11,
    range: 6.4,
    sideRange: 4.0,
    cooldown: 0.58,
    color: 0xb0b8c4,
    trailColor: 0xdfe7f3,
    hitColor: 0xffdd55,
    label: '铁棍',
  },
  链锤: {
    id: '链锤',
    baseDamage: 10,
    range: 7.6,
    sideRange: 4.8,
    cooldown: 0.62,
    color: 0xc4b5fd,
    trailColor: 0xe9d5ff,
    hitColor: 0xf0abfc,
    label: '链锤',
  },
}

export function resolveWeapon(weapon: string | null): WeaponProfile {
  if (weapon === '铁棍') return WEAPON_PROFILES.铁棍
  if (weapon === '链锤') return WEAPON_PROFILES.链锤
  return WEAPON_PROFILES.徒手
}

/** 挂在摩托上的武器模型 */
export function createHeldWeapon(weapon: string | null): THREE.Group {
  const g = new THREE.Group()
  g.name = 'heldWeapon'
  const profile = resolveWeapon(weapon)

  if (profile.id === '徒手') {
    // 拳套感
    const glove = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xf5d0a9 })
    )
    glove.position.set(0.55, 1.25, 0.35)
    g.add(glove)
    return g
  }

  if (profile.id === '铁棍') {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: profile.color, metalness: 0.7, roughness: 0.35 })
    )
    bar.rotation.z = Math.PI / 2.4
    bar.position.set(0.7, 1.35, 0.1)
    g.add(bar)
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.8, roughness: 0.25 })
    )
    tip.position.set(1.35, 1.55, 0.05)
    g.add(tip)
    return g
  }

  // 链锤
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0x5b4636, metalness: 0.2, roughness: 0.7 })
  )
  handle.rotation.z = Math.PI / 2.6
  handle.position.set(0.55, 1.3, 0.15)
  g.add(handle)

  for (let i = 0; i < 4; i++) {
    const link = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.025, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8, roughness: 0.3 })
    )
    link.position.set(0.85 + i * 0.14, 1.4 + i * 0.06, 0.2)
    link.rotation.y = Math.PI / 2
    g.add(link)
  }

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: profile.color, metalness: 0.65, roughness: 0.35 })
  )
  ball.position.set(1.45, 1.65, 0.25)
  g.add(ball)

  // 尖刺
  for (let i = 0; i < 5; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.16, 5),
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.7, roughness: 0.3 })
    )
    const a = (i / 5) * Math.PI * 2
    spike.position.set(1.45 + Math.cos(a) * 0.16, 1.65 + Math.sin(a) * 0.16, 0.25)
    spike.lookAt(1.45, 1.65, 0.25)
    g.add(spike)
  }

  return g
}

/** 攻击挥砍特效（世界坐标由外部放置） */
export function createSwingEffect(weapon: string | null): THREE.Group {
  const profile = resolveWeapon(weapon)
  const g = new THREE.Group()
  g.name = 'swingFx'

  if (profile.id === '徒手') {
    const fist = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 10),
      new THREE.MeshBasicMaterial({ color: profile.trailColor, transparent: true, opacity: 0.95 })
    )
    g.add(fist)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.06, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff7ed, transparent: true, opacity: 0.75 })
    )
    ring.rotation.y = Math.PI / 2
    g.add(ring)
    return g
  }

  if (profile.id === '铁棍') {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 2.4),
      new THREE.MeshBasicMaterial({ color: profile.trailColor, transparent: true, opacity: 0.92 })
    )
    bar.position.z = 0.9
    g.add(bar)
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.08, 8, 28, Math.PI * 0.9),
      new THREE.MeshBasicMaterial({ color: profile.hitColor, transparent: true, opacity: 0.7 })
    )
    arc.rotation.x = Math.PI / 2
    arc.rotation.z = -0.4
    g.add(arc)
    return g
  }

  // 链锤：球体 + 链条残影
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 12, 12),
    new THREE.MeshBasicMaterial({ color: profile.hitColor, transparent: true, opacity: 0.95 })
  )
  ball.position.z = 1.4
  g.add(ball)
  for (let i = 0; i < 5; i++) {
    const link = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color: profile.trailColor, transparent: true, opacity: 0.7 - i * 0.1 })
    )
    link.position.set(0, 0.05 * i, 0.35 + i * 0.22)
    g.add(link)
  }
  const slash = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.1, 8, 32, Math.PI * 1.1),
    new THREE.MeshBasicMaterial({ color: 0xf5d0fe, transparent: true, opacity: 0.65 })
  )
  slash.rotation.x = Math.PI / 2
  g.add(slash)
  return g
}

export function createDamageLabel(damage: number, color = '#ffee55'): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 128, 64)
  ctx.font = 'bold 36px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 6
  ctx.strokeText(`-${damage}`, 64, 32)
  ctx.fillStyle = color
  ctx.fillText(`-${damage}`, 64, 32)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(2.4, 1.2, 1)
  return sprite
}
