import * as THREE from 'three'
import type { ColliderBox } from './types'

export const PLAYER_EYE_STAND = 1.6
export const PLAYER_EYE_CROUCH = 1.05
export const PLAYER_RADIUS = 0.38
export const WALK_SPEED = 9
export const CROUCH_SPEED = 5
export const JUMP_VELOCITY = 8.2
export const GRAVITY = 24

export interface PlayerBody {
  hp: number
  maxHp: number
  velocity: THREE.Vector3
  onGround: boolean
  crouching: boolean
  alive: boolean
}

export function createPlayerBody(): PlayerBody {
  return {
    hp: 100,
    maxHp: 100,
    velocity: new THREE.Vector3(),
    onGround: true,
    crouching: false,
    alive: true,
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

/** 水平 AABB 碰撞分离 */
export function resolveHorizontalCollision(
  pos: THREE.Vector3,
  radius: number,
  eyeHeight: number,
  colliders: ColliderBox[],
) {
  const feetY = pos.y - eyeHeight

  for (const box of colliders) {
    if (pos.y < box.min.y + 0.15 || feetY > box.max.y + 0.15) continue

    const closestX = clamp(pos.x, box.min.x, box.max.x)
    const closestZ = clamp(pos.z, box.min.z, box.max.z)
    const dx = pos.x - closestX
    const dz = pos.z - closestZ
    const distSq = dx * dx + dz * dz

    if (distSq >= radius * radius || distSq === 0) continue

    const dist = Math.sqrt(distSq)
    const push = radius - dist + 0.001
    pos.x += (dx / dist) * push
    pos.z += (dz / dist) * push
  }
}

/** 垂直碰撞；eyeHeight 随蹲/站变化，落地时对齐到当前视角高度 */
export function resolveVerticalCollision(
  pos: THREE.Vector3,
  radius: number,
  colliders: ColliderBox[],
  eyeHeight: number,
  vy = 0,
): boolean {
  let onGround = false
  // 用最大站立高度估测脚底，避免下蹲瞬间 feetY 虚高导致无法贴地
  const feetY = pos.y - PLAYER_EYE_STAND

  for (const box of colliders) {
    const insideX = pos.x + radius > box.min.x && pos.x - radius < box.max.x
    const insideZ = pos.z + radius > box.min.z && pos.z - radius < box.max.z
    if (!insideX || !insideZ) continue

    const standEye = box.max.y + eyeHeight
    // 上升中不贴顶面；下落/站立时允许从站高平滑落到蹲高
    if (
      vy <= 0.15 &&
      pos.y <= standEye + 0.4 &&
      pos.y >= box.max.y + 0.2 &&
      feetY <= box.max.y + 0.35
    ) {
      pos.y = standEye
      onGround = true
    }
  }

  // 地面 y=0：允许站立→下蹲时把视角从 1.6 收到 1.05
  if (vy <= 0.15 && pos.y <= PLAYER_EYE_STAND + 0.4 && feetY <= 0.35) {
    pos.y = eyeHeight
    onGround = true
  }

  return onGround
}

export function getEyeHeight(crouching: boolean) {
  return crouching ? PLAYER_EYE_CROUCH : PLAYER_EYE_STAND
}

export function isCrouchKey(keys: Record<string, boolean>) {
  return keys['ControlLeft'] || keys['ControlRight'] || keys['ShiftLeft'] || keys['ShiftRight']
}
