/**
 * CS16 Bot AI — 5v5 商业化版本
 * - 双方队伍均由 Bot 组成（玩家所在队 4 名队友 + 玩家）
 * - Bot 感知所有敌方实体（玩家 / 敌方 bot），选择最近可见目标交火
 * - 巡逻目标偏向炸弹点，制造攻防节奏
 * - 阵亡倒地而非消失，回合重生复位
 */
import * as THREE from 'three'
import type { BotEntity, ColliderBox, SpawnPoint, TeamId } from './types'
import { BOT_WEAPON } from './weapons'
import { PLAYER_RADIUS, resolveHorizontalCollision } from './player'
import { animateSoldier, createNameTag, createSoldierMesh, playDeathPose, resetPose } from './models'

const BOT_NAMES_CT = ['Nova', 'Falcon', 'Vortex', 'Titan']
const BOT_NAMES_T = ['Rush', 'Ghost', 'Blaze', 'Viper']

function pickPatrolTarget(
  bot: BotEntity,
  bombSites: { position: { x: number; z: number } }[],
) {
  // 30% 偏向包点附近巡逻（制造攻防交火），其余在自身周边游走
  if (bombSites.length > 0 && Math.random() < 0.3) {
    const site = bombSites[Math.floor(Math.random() * bombSites.length)]
    bot.patrolTarget.set(
      site.position.x + (Math.random() - 0.5) * 16,
      0,
      site.position.z + (Math.random() - 0.5) * 16,
    )
    return
  }
  bot.patrolTarget.set(
    bot.mesh.position.x + (Math.random() - 0.5) * 26,
    0,
    bot.mesh.position.z + (Math.random() - 0.5) * 26,
  )
}

/** 视线检测：从眼部到目标点逐段探测 AABB */
function canSeeTarget(
  from: THREE.Vector3,
  to: THREE.Vector3,
  colliders: ColliderBox[],
): boolean {
  const dir = new THREE.Vector3().subVectors(to, from)
  const dist = dir.length()
  if (dist > BOT_WEAPON.range) return false
  dir.normalize()

  const steps = Math.ceil(dist / 1.1)
  const probe = new THREE.Vector3()
  for (let i = 1; i < steps; i++) {
    probe.copy(from).addScaledVector(dir, i * 1.1)
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

export interface SpawnBotsOptions {
  team: TeamId
  spawns: SpawnPoint[]
  count: number
  scene: THREE.Scene
  showNameTags?: boolean
}

export function spawnBots(opts: SpawnBotsOptions): BotEntity[] {
  const { team, spawns, count, scene } = opts
  const bots: BotEntity[] = []
  const names = team === 'ct' ? BOT_NAMES_CT : BOT_NAMES_T

  for (let i = 0; i < count; i++) {
    const spawnPoint = spawns[i % spawns.length]
    const name = `${names[i % names.length]}`
    const mesh = createSoldierMesh(team)
    mesh.position.set(spawnPoint.position.x, 0, spawnPoint.position.z)
    mesh.rotation.y = spawnPoint.yaw

    if (opts.showNameTags !== false) {
      mesh.add(createNameTag(name, team))
    }
    scene.add(mesh)

    bots.push({
      id: i + 1,
      mesh,
      team,
      hp: 100,
      maxHp: 100,
      alive: true,
      position: mesh.position.clone(),
      yaw: spawnPoint.yaw,
      shootCd: 0.4 + Math.random() * 0.8,
      thinkCd: 0,
      state: 'patrol',
      patrolTarget: new THREE.Vector3(
        spawnPoint.position.x + (Math.random() - 0.5) * 16,
        0,
        spawnPoint.position.z + (Math.random() - 0.5) * 16,
      ),
      name,
      stepDist: 0,
      kills: 0,
      deathTimer: 0,
    })
  }

  return bots
}

export interface Combatant {
  /** 玩家时为 null */
  bot: BotEntity | null
  team: TeamId
  position: THREE.Vector3
  alive: boolean
  name: string
}

export interface BotUpdateCtx {
  dt: number
  colliders: ColliderBox[]
  playerPos: THREE.Vector3
  playerAlive: boolean
  playerTeam: TeamId
  bombSites: { id: string; position: { x: number; z: number } }[]
  onBotShoot: (bot: BotEntity, direction: THREE.Vector3) => void
  onFootstep?: () => void
}

export function updateBots(bots: BotEntity[], ctx: BotUpdateCtx) {
  const { dt, colliders, playerPos, playerAlive, playerTeam } = ctx

  // 组装实体列表：玩家 + 全部 bot
  const combatants: Combatant[] = [
    {
      bot: null,
      team: playerTeam,
      position: playerPos.clone(),
      alive: playerAlive,
      name: '你',
    },
    ...bots.map(b => ({
      bot: b,
      team: b.team,
      position: b.position,
      alive: b.alive,
      name: b.name,
    })),
  ]

  const moveSpeed = 4.2

  for (const bot of bots) {
    if (!bot.alive) {
      // 倒地淡出由 damageBot 处理姿态；这里保持可见
      continue
    }
    bot.mesh.visible = true
    bot.position.copy(bot.mesh.position)
    bot.shootCd = Math.max(0, bot.shootCd - dt)
    bot.thinkCd -= dt

    const prevX = bot.mesh.position.x
    const prevZ = bot.mesh.position.z
    let moved = false

    const botAim = bot.position.clone()
    botAim.y = 1.25

    // —— 目标选择：最近的可见敌人（含玩家与敌方 bot）——
    let target: Combatant | null = null
    let targetDist = Infinity
    for (const c of combatants) {
      if (!c.alive || c.team === bot.team) continue
      const aimTo = c.position.clone()
      aimTo.y = 1.15
      const d = botAim.distanceTo(aimTo)
      if (d < targetDist && canSeeTarget(botAim, aimTo, colliders)) {
        target = c
        targetDist = d
      }
    }

    if (target) {
      bot.state = 'combat'
      const targetPos = target.position.clone()
      targetPos.y = target.bot ? 1.15 : 0.95
      const aimAt = targetPos.clone()

      const dir = new THREE.Vector3().subVectors(targetPos, botAim)
      dir.y = 0
      if (dir.lengthSq() > 0.001) {
        bot.yaw = Math.atan2(dir.x, dir.z)
        bot.mesh.rotation.y = bot.yaw
      }

      if (bot.shootCd <= 0) {
        const shotDir = new THREE.Vector3().subVectors(aimAt, botAim).normalize()
        shotDir.x += (Math.random() - 0.5) * BOT_WEAPON.spread
        shotDir.y += (Math.random() - 0.5) * BOT_WEAPON.spread * 0.6
        shotDir.z += (Math.random() - 0.5) * BOT_WEAPON.spread
        shotDir.normalize()
        ctx.onBotShoot(bot, shotDir)
        bot.shootCd = 60 / BOT_WEAPON.rpm + Math.random() * 0.12
      }

      if (targetDist > 11) {
        const moveDir = dir.clone().normalize()
        bot.mesh.position.x += moveDir.x * moveSpeed * dt
        bot.mesh.position.z += moveDir.z * moveSpeed * dt
        resolveHorizontalCollision(bot.mesh.position, PLAYER_RADIUS, 1.6, colliders)
        moved = true
      }
    } else {
      bot.state = 'patrol'
      if (bot.thinkCd <= 0 || bot.mesh.position.distanceTo(bot.patrolTarget) < 1.5) {
        pickPatrolTarget(bot, ctx.bombSites)
        bot.thinkCd = 2.2 + Math.random() * 2
      }

      const toPatrol = new THREE.Vector3().subVectors(bot.patrolTarget, bot.mesh.position)
      toPatrol.y = 0
      if (toPatrol.length() > 0.5) {
        toPatrol.normalize()
        bot.yaw = Math.atan2(toPatrol.x, toPatrol.z)
        bot.mesh.rotation.y = bot.yaw
        bot.mesh.position.x += toPatrol.x * moveSpeed * 0.62 * dt
        bot.mesh.position.z += toPatrol.z * moveSpeed * 0.62 * dt
        resolveHorizontalCollision(bot.mesh.position, PLAYER_RADIUS, 1.6, colliders)
        moved = true
      }
    }

    const stepDelta = Math.hypot(bot.mesh.position.x - prevX, bot.mesh.position.z - prevZ)
    bot.stepDist += stepDelta
    if (moved && bot.stepDist > 0.85) {
      bot.stepDist = 0
      ctx.onFootstep?.()
    }

    animateSoldier(bot.mesh, moved, dt)
    bot.position.copy(bot.mesh.position)
  }
}

/**
 * 对 bot 造成伤害。
 * @param isHeadshot 爆头倍率已在外部计算完毕，这里只负责结算
 * @returns true 表示本次击杀
 */
export function damageBot(bot: BotEntity, amount: number): boolean {
  if (!bot.alive) return false
  bot.hp = Math.max(0, bot.hp - amount)
  if (bot.hp <= 0) {
    bot.alive = false
    playDeathPose(bot.mesh)
    return true
  }
  return false
}

/** 回合重生复位 */
export function resetBot(bot: BotEntity, spawn: SpawnPoint) {
  bot.hp = bot.maxHp
  bot.alive = true
  bot.mesh.visible = true
  resetPose(bot.mesh)
  bot.mesh.position.set(spawn.position.x, 0, spawn.position.z)
  bot.mesh.rotation.y = spawn.yaw
  bot.position.copy(bot.mesh.position)
  bot.yaw = spawn.yaw
  bot.shootCd = 0.5 + Math.random()
  bot.state = 'patrol'
  bot.stepDist = 0
  bot.deathTimer = 0
  pickPatrolTarget(bot, [])
}

/** 统计存活人数 */
export function countAlive(bots: BotEntity[]): number {
  return bots.reduce((n, b) => n + (b.alive ? 1 : 0), 0)
}
