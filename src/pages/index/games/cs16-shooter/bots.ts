import * as THREE from 'three'
import type { BotEntity, ColliderBox, SpawnPoint, TeamId } from './types'
import { BOT_WEAPON } from './weapons'
import { PLAYER_RADIUS, resolveHorizontalCollision } from './player'
import { animateSoldier, createSoldierMesh } from './models'

const BOT_NAMES = ['Rush', 'Flash', 'Ghost', 'Viper', 'Hawk', 'Blaze', 'Nova', 'Echo']

function pickPatrolTarget(bot: BotEntity, anchor: THREE.Vector3) {
  bot.patrolTarget.set(
    anchor.x + (Math.random() - 0.5) * 24,
    0,
    anchor.z + (Math.random() - 0.5) * 24,
  )
}

function canSeeTarget(
  from: THREE.Vector3,
  to: THREE.Vector3,
  colliders: ColliderBox[],
): boolean {
  const dir = new THREE.Vector3().subVectors(to, from)
  const dist = dir.length()
  if (dist > BOT_WEAPON.range) return false
  dir.normalize()

  const steps = Math.ceil(dist / 1.2)
  const probe = new THREE.Vector3()
  for (let i = 1; i < steps; i++) {
    probe.copy(from).addScaledVector(dir, i * 1.2)
    probe.y = 1.2
    for (const box of colliders) {
      if (
        probe.x > box.min.x &&
        probe.x < box.max.x &&
        probe.y > box.min.y &&
        probe.y < box.max.y &&
        probe.z > box.min.z &&
        probe.z < box.max.z
      ) {
        return false
      }
    }
  }
  return true
}

export function spawnBots(
  team: TeamId,
  spawns: SpawnPoint[],
  count: number,
  scene: THREE.Scene,
): BotEntity[] {
  const bots: BotEntity[] = []

  for (let i = 0; i < count; i++) {
    const spawn = spawns[i % spawns.length]
    const name = BOT_NAMES[i % BOT_NAMES.length]
    const mesh = createSoldierMesh(team)
    mesh.position.set(spawn.position.x, 0, spawn.position.z)
    mesh.rotation.y = spawn.yaw
    scene.add(mesh)

    bots.push({
      id: i + 1,
      mesh,
      team,
      hp: 100,
      maxHp: 100,
      alive: true,
      position: mesh.position.clone(),
      yaw: spawn.yaw,
      shootCd: 0.4 + Math.random() * 0.8,
      thinkCd: 0,
      state: 'patrol',
      patrolTarget: new THREE.Vector3(
        spawn.position.x + (Math.random() - 0.5) * 16,
        0,
        spawn.position.z + (Math.random() - 0.5) * 16,
      ),
      name,
      stepDist: 0,
    })
  }

  return bots
}

export interface BotUpdateCtx {
  dt: number
  colliders: ColliderBox[]
  playerPos: THREE.Vector3
  playerAlive: boolean
  playerTeam: TeamId
  onBotShoot: (bot: BotEntity, direction: THREE.Vector3) => void
  onFootstep?: () => void
}

export function updateBots(bots: BotEntity[], ctx: BotUpdateCtx) {
  const { dt, colliders, playerPos, playerAlive, playerTeam, onBotShoot, onFootstep } = ctx
  const moveSpeed = 4.2

  for (const bot of bots) {
    if (!bot.alive) {
      bot.mesh.visible = false
      continue
    }
    bot.mesh.visible = true
    bot.position.copy(bot.mesh.position)
    bot.shootCd = Math.max(0, bot.shootCd - dt)
    bot.thinkCd -= dt

    const prevX = bot.mesh.position.x
    const prevZ = bot.mesh.position.z
    let moved = false

    const isEnemy = bot.team !== playerTeam
    const targetPos = playerPos.clone()
    targetPos.y = 1.2
    const botAim = bot.position.clone()
    botAim.y = 1.2
    const distToPlayer = botAim.distanceTo(targetPos)
    const seesPlayer =
      isEnemy &&
      playerAlive &&
      distToPlayer < BOT_WEAPON.range &&
      canSeeTarget(botAim, targetPos, colliders)

    if (seesPlayer) {
      bot.state = 'combat'
      const dir = new THREE.Vector3().subVectors(targetPos, botAim)
      dir.y = 0
      if (dir.lengthSq() > 0.001) {
        bot.yaw = Math.atan2(dir.x, dir.z)
        bot.mesh.rotation.y = bot.yaw
      }

      if (bot.shootCd <= 0) {
        const shotDir = new THREE.Vector3().subVectors(targetPos, botAim).normalize()
        shotDir.x += (Math.random() - 0.5) * BOT_WEAPON.spread
        shotDir.y += (Math.random() - 0.5) * BOT_WEAPON.spread * 0.6
        shotDir.z += (Math.random() - 0.5) * BOT_WEAPON.spread
        shotDir.normalize()
        onBotShoot(bot, shotDir)
        bot.shootCd = 60 / BOT_WEAPON.rpm
      }

      if (distToPlayer > 12) {
        const moveDir = dir.clone().normalize()
        bot.mesh.position.x += moveDir.x * moveSpeed * dt
        bot.mesh.position.z += moveDir.z * moveSpeed * dt
        resolveHorizontalCollision(bot.mesh.position, PLAYER_RADIUS, 1.6, colliders)
        moved = true
      }
    } else {
      bot.state = 'patrol'
      if (bot.thinkCd <= 0 || bot.mesh.position.distanceTo(bot.patrolTarget) < 1.5) {
        pickPatrolTarget(bot, bot.mesh.position)
        bot.thinkCd = 2 + Math.random() * 2
      }

      const toPatrol = new THREE.Vector3().subVectors(bot.patrolTarget, bot.mesh.position)
      toPatrol.y = 0
      const patrolDist = toPatrol.length()
      if (patrolDist > 0.5) {
        toPatrol.normalize()
        bot.yaw = Math.atan2(toPatrol.x, toPatrol.z)
        bot.mesh.rotation.y = bot.yaw
        bot.mesh.position.x += toPatrol.x * moveSpeed * 0.65 * dt
        bot.mesh.position.z += toPatrol.z * moveSpeed * 0.65 * dt
        resolveHorizontalCollision(bot.mesh.position, PLAYER_RADIUS, 1.6, colliders)
        moved = true
      }
    }

    const stepDelta = Math.hypot(bot.mesh.position.x - prevX, bot.mesh.position.z - prevZ)
    bot.stepDist += stepDelta
    if (moved && bot.stepDist > 0.85) {
      bot.stepDist = 0
      onFootstep?.()
    }

    animateSoldier(bot.mesh, moved, dt)
    bot.position.copy(bot.mesh.position)
  }
}

export function damageBot(bot: BotEntity, amount: number): boolean {
  if (!bot.alive) return false
  bot.hp = Math.max(0, bot.hp - amount)
  if (bot.hp <= 0) {
    bot.alive = false
    bot.mesh.visible = false
    return true
  }
  return false
}

export function resetBot(bot: BotEntity, spawn: SpawnPoint) {
  bot.hp = bot.maxHp
  bot.alive = true
  bot.mesh.visible = true
  bot.mesh.position.set(spawn.position.x, 0, spawn.position.z)
  bot.mesh.rotation.y = spawn.yaw
  bot.position.copy(bot.mesh.position)
  bot.yaw = spawn.yaw
  bot.shootCd = 0.5 + Math.random()
  bot.state = 'patrol'
  bot.stepDist = 0
  pickPatrolTarget(bot, bot.mesh.position)
}
