import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import type {
  BotEntity,
  ColliderBox,
  EngineOptions,
  GameEvent,
  MapData,
  RoundPhase,
  TeamId,
  WeaponConfig,
} from './types'
import { countAlive, damageBot, spawnBots, updateBots } from './bots'
import { createDust2Map } from './map_dust2'
import {
  createPlayerBody,
  CROUCH_SPEED,
  getEyeHeight,
  GRAVITY,
  JUMP_VELOCITY,
  PLAYER_RADIUS,
  resolveHorizontalCollision,
  resolveVerticalCollision,
  WALK_SPEED,
  isCrouchKey,
  type PlayerBody,
} from './player'
import { BOT_WEAPON, DEFAULT_SECONDARY, SHOTGUN_PELLETS, WEAPONS, getWeaponPool } from './weapons'
import { CS16Audio } from './audio'

interface Bullet {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  damage: number
  life: number
  ownerTeam: TeamId
  /** 发射者 bot；玩家发射时为 null */
  ownerBot: BotEntity | null
}

interface FxItem {
  mesh: THREE.Object3D
  life: number
  maxLife: number
  vy?: number
  grow?: number
}

const TOTAL_ROUNDS = 15
const WIN_SCORE = 8
/** 每队总人数（玩家所在队为 4 bot + 玩家） */
const TEAM_SIZE = 5
const PLANT_TIME = 3.2
const DEFUSE_TIME = 5
const BOMB_FUSE = 40
const ROUND_WARMUP = 7
const ROUND_END_DELAY = 3.5
/** 常规回合时长（秒） */
const ROUND_COMBAT_TIME = 100
/** 开战后仍可购买的时间窗口（秒） */
const BUY_WINDOW = 15

const START_MONEY = 800
const KILL_REWARD = 300
const WIN_REWARD = 3250
const LOSE_REWARD = 1400
export const MAX_MONEY = 16000

export interface ScoreRow {
  name: string
  kills: number
  dead: boolean
  isPlayer: boolean
}

export interface ScoreboardData {
  ct: ScoreRow[]
  t: ScoreRow[]
  ctScore: number
  tScore: number
}

export class CS16Engine {
  private container!: HTMLElement
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private controls!: PointerLockControls
  private clock = new THREE.Clock()
  private rafId = 0
  private disposed = false

  private mapData!: MapData
  private colliders: ColliderBox[] = []

  private playerTeam: TeamId = 'ct'
  private player: PlayerBody = createPlayerBody()
  private deaths = 0

  private keys: Record<string, boolean> = {}
  private mouseDown = false
  private jumpQueued = false
  private audio = new CS16Audio()

  /** 双武器槽 */
  private primary: WeaponConfig | null = null
  private secondary: WeaponConfig = DEFAULT_SECONDARY
  private slot: 'primary' | 'secondary' = 'primary'
  private ammo = 0
  private reserve = 0
  private reloading = false
  private reloadTimer = 0
  private shootCooldown = 0
  private recoilPitch = 0

  private money = START_MONEY
  private combatElapsed = 0

  private bullets: Bullet[] = []
  private bulletPool: Bullet[] = []
  private fx: FxItem[] = []
  private bots: BotEntity[] = []

  private round = 1
  private roundPhase: RoundPhase = 'warmup'
  private roundTimer = ROUND_WARMUP
  private combatTimeLeft = ROUND_COMBAT_TIME
  private ctScore = 0
  private tScore = 0
  private kills = 0

  private bombPlanted = false
  private bombPosition = new THREE.Vector3()
  private bombMesh: THREE.Group | null = null
  private bombTimer = 0
  private bombBeepCd = 0
  private actionProgress = 0
  private message = '点击画面锁定鼠标 · 空闲资金可按 B 购买武器'
  private messageTimer = 4
  private gameFinished = false
  private matchResult: '' | 'win' | 'lose' = ''

  private onHudUpdate!: EngineOptions['onHudUpdate']
  private emitEvent: (e: GameEvent) => void

  private onKeyDown = (e: KeyboardEvent) => {
    if (
      [
        'Space', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight',
        'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Digit1', 'Digit2',
      ].includes(e.code)
    ) {
      e.preventDefault()
    }
    this.keys[e.code] = true
    if (e.code === 'Space') this.jumpQueued = true
    if (e.code === 'KeyR') this.startReload()
    if (e.code === 'KeyQ') this.switchSlot()
    if (e.code === 'Digit1') this.selectSlot('primary')
    if (e.code === 'Digit2') this.selectSlot('secondary')
  }
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false
  }
  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseDown = true
      this.shoot()
    }
  }
  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false
  }
  private onResize = () => {
    if (this.disposed || !this.container.clientWidth) return
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  constructor(opts: EngineOptions) {
    this.onHudUpdate = opts.onHudUpdate
    this.emitEvent = opts.onEvent ?? (() => {})
    this.playerTeam = opts.team
    this.primary = getWeaponPool(opts.weaponMode)[0]
    this.init(opts)
    this.startRound(true)
    this.animate()
  }

  /* ===================== 初始化 ===================== */

  private init(opts: EngineOptions) {
    this.container = opts.canvasHost

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x9db8d6)
    this.scene.fog = new THREE.Fog(0xb9c9dd, 55, 220)

    this.camera = new THREE.PerspectiveCamera(
      75,
      Math.max(1, this.container.clientWidth) / Math.max(1, this.container.clientHeight),
      0.1,
      420,
    )

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(
      Math.max(1, this.container.clientWidth),
      Math.max(1, this.container.clientHeight),
    )
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.container.appendChild(this.renderer.domElement)

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement)
    this.scene.add(this.controls.object)

    this.container.addEventListener('click', () => {
      if (!this.gameFinished && !this.buyMenuOpen()) {
        void this.audio.start()
        this.controls.lock()
      }
    })

    this.initLighting()
    this.mapData = createDust2Map()
    this.colliders = this.mapData.colliders
    this.scene.add(this.mapData.group)

    this.equipSlot(this.primary ? 'primary' : 'secondary')
    this.initInput()

    window.addEventListener('resize', this.onResize)
  }

  private initLighting() {
    this.scene.add(new THREE.HemisphereLight(0xe8f0ff, 0xa08a62, 0.65))
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.05)
    sun.position.set(50, 80, 30)
    this.scene.add(sun)
    // 补光，避免背光面死黑
    const fill = new THREE.DirectionalLight(0x88aaff, 0.25)
    fill.position.set(-40, 40, -20)
    this.scene.add(fill)
  }

  private initInput() {
    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('keyup', this.onKeyUp)
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown)
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp)
  }

  /* ===================== 武器槽 & 购买 ===================== */

  private get currentWeapon(): WeaponConfig {
    return (this.slot === 'primary' ? this.primary : this.secondary) ?? this.secondary
  }

  private equipSlot(slot: 'primary' | 'secondary') {
    this.slot = slot
    const w = this.currentWeapon
    this.ammo = w.magSize
    this.reserve = w.reserve
    this.reloading = false
    this.reloadTimer = 0
    this.emitHud()
  }

  private selectSlot(slot: 'primary' | 'secondary') {
    if (slot === 'primary' && !this.primary) return
    if (this.slot !== slot) this.equipSlot(slot)
  }

  private switchSlot() {
    const next = this.slot === 'primary' ? 'secondary' : 'primary'
    this.selectSlot(next)
    this.flashMessage(`切换至 ${this.currentWeapon.name}`, 1.2)
  }

  /** 是否处于购买窗口：冻结期 + 开战前 15 秒 */
  isBuyAllowed(): boolean {
    if (this.gameFinished || !this.player.alive) return false
    if (this.roundPhase === 'warmup') return true
    return this.roundPhase === 'combat' && this.combatElapsed < BUY_WINDOW
  }

  /** 供 Vue 层控制指针锁定（购买菜单打开时解锁） */
  setPointerLock(lock: boolean) {
    if (this.disposed || this.gameFinished) return
    try {
      if (lock) this.controls.lock()
      else this.controls.unlock()
    } catch {
      /* 浏览器冷却期内失败可忽略 */
    }
  }

  buyMenuOpen(): boolean {
    return this.controls.isLocked === false && this.roundPhase !== 'over' && !this.gameFinished
  }

  /** 购买接口（Vue 购买菜单调用） */
  buy(weaponId: string): boolean {
    const w = WEAPONS[weaponId]
    if (!w || !this.isBuyAllowed()) {
      this.audio.playBuyError()
      this.emitEvent({ type: 'buyError', reason: '当前无法购买' })
      return false
    }
    if (this.money < w.price) {
      this.audio.playBuyError()
      this.emitEvent({ type: 'buyError', reason: `资金不足，需要 $${w.price}` })
      return false
    }
    this.money -= w.price
    if (w.category === 'pistol') {
      this.secondary = w
      this.equipSlot('secondary')
    } else {
      this.primary = w
      this.equipSlot('primary')
    }
    this.audio.playBuy()
    this.emitEvent({ type: 'buy', item: w.name })
    this.flashMessage(`已购买 ${w.name} -$${w.price}`, 1.6)
    return true
  }

  /* ===================== 换弹 ===================== */

  private startReload() {
    const w = this.currentWeapon
    if (this.reloading || this.reserve <= 0 || this.ammo >= w.magSize) return
    this.reloading = true
    this.reloadTimer = w.reloadTime
    this.flashMessage(`${w.name} 换弹中…`, w.reloadTime)
  }

  private finishReload() {
    const w = this.currentWeapon
    const need = w.magSize - this.ammo
    const take = Math.min(need, this.reserve)
    this.ammo += take
    this.reserve -= take
    this.reloading = false
    this.reloadTimer = 0
  }

  /* ===================== 射击 ===================== */

  private shoot() {
    if (
      this.gameFinished ||
      this.roundPhase !== 'combat' ||
      !this.player.alive ||
      this.reloading ||
      this.ammo <= 0 ||
      this.shootCooldown > 0
    ) {
      return
    }

    const w = this.currentWeapon
    this.ammo--
    this.shootCooldown = 60 / w.rpm

    const pellets = w.id === 'm3' ? SHOTGUN_PELLETS : 1
    for (let i = 0; i < pellets; i++) {
      const dir = new THREE.Vector3()
      this.camera.getWorldDirection(dir)
      const spreadScale = pellets > 1 ? 1 : 1
      dir.x += (Math.random() - 0.5) * w.spread * spreadScale
      dir.y += (Math.random() - 0.5) * w.spread * spreadScale * 0.7
      dir.z += (Math.random() - 0.5) * w.spread * spreadScale
      dir.normalize()

      const bullet = this.getBullet(this.playerTeam)
      bullet.mesh.position.copy(this.camera.position)
      bullet.velocity.copy(dir).multiplyScalar(w.bulletSpeed)
      bullet.damage = w.damage
      bullet.life = 2.5
    }

    this.recoilPitch += 0.0018 * w.recoil
    this.spawnMuzzleFlash()
    this.audio.playGunshot(w.isSniper)
  }

  private getBullet(ownerTeam: TeamId, ownerBot: BotEntity | null = null): Bullet {
    let b = this.bulletPool.pop()
    if (!b) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffdd44 }),
      )
      b = { mesh, velocity: new THREE.Vector3(), damage: 0, life: 0, ownerTeam, ownerBot }
    } else {
      b.ownerTeam = ownerTeam
      b.ownerBot = ownerBot
      ;(b.mesh.material as THREE.MeshBasicMaterial).color.setHex(
        ownerTeam === this.playerTeam ? 0xffdd44 : 0xff8844,
      )
    }
    this.bullets.push(b)
    this.scene.add(b.mesh)
    return b
  }

  private recycleBullet(b: Bullet) {
    this.scene.remove(b.mesh)
    b.life = 0
    this.bulletPool.push(b)
  }

  private spawnMuzzleFlash() {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.85 }),
    )
    flash.position.copy(this.camera.position)
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    flash.position.addScaledVector(dir, 0.4)
    this.scene.add(flash)
    this.fx.push({ mesh: flash, life: 0.07, maxLife: 0.07, grow: 1.12 })
  }

  private spawnHitFx(pos: THREE.Vector3, color = 0xc23b3b, count = 4) {
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 4, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
      )
      p.position.copy(pos)
      p.position.x += (Math.random() - 0.5) * 0.3
      p.position.y += Math.random() * 0.5
      p.position.z += (Math.random() - 0.5) * 0.3
      this.scene.add(p)
      this.fx.push({ mesh: p, life: 0.35, maxLife: 0.35, vy: 1.2 + Math.random() })
    }
  }

  private flashMessage(text: string, duration = 2.2) {
    this.message = text
    this.messageTimer = duration
    this.emitHud()
  }

  /* ===================== 回合流程 ===================== */

  private clearBombMesh() {
    if (this.bombMesh) {
      this.scene.remove(this.bombMesh)
      this.bombMesh.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
      this.bombMesh = null
    }
  }

  private startRound(first = false) {
    this.roundPhase = 'warmup'
    this.roundTimer = first ? ROUND_WARMUP + 3 : ROUND_WARMUP
    this.combatTimeLeft = ROUND_COMBAT_TIME
    this.combatElapsed = 0
    this.actionProgress = 0
    this.bombPlanted = false
    this.bombTimer = 0
    this.clearBombMesh()

    // 玩家复位
    this.player = createPlayerBody()
    this.player.onGround = true
    this.jumpQueued = false
    const spawns = this.playerTeam === 'ct' ? this.mapData.ctSpawns : this.mapData.tSpawns
    const spawnPoint = spawns[Math.floor(Math.random() * spawns.length)]
    this.controls.object.position.set(spawnPoint.position.x, spawnPoint.position.y, spawnPoint.position.z)
    this.controls.object.rotation.set(0, spawnPoint.yaw, 0)
    this.camera.rotation.x = 0
    this.player.velocity.set(0, 0, 0)

    // 补满弹药
    if (this.primary) {
      this.primary = { ...this.primary }
    }
    this.secondary = { ...this.secondary }
    this.equipSlot(this.primary ? 'primary' : 'secondary')

    // —— 5v5：我方 4 bot + 敌方 5 bot ——
    for (const b of this.bots) {
      this.scene.remove(b.mesh)
      b.mesh.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
    }
    const allySpawns = this.playerTeam === 'ct' ? this.mapData.ctSpawns : this.mapData.tSpawns
    const enemyTeam: TeamId = this.playerTeam === 'ct' ? 't' : 'ct'
    const enemySpawns = enemyTeam === 'ct' ? this.mapData.ctSpawns : this.mapData.tSpawns

    this.bots = [
      ...spawnBots({ team: this.playerTeam, spawns: allySpawns, count: TEAM_SIZE - 1, scene: this.scene }),
      ...spawnBots({ team: enemyTeam, spawns: enemySpawns, count: TEAM_SIZE, scene: this.scene }),
    ]

    this.flashMessage(`第 ${this.round} 回合 · 冻结时间 — 按 B 购买装备`, this.roundTimer)
    this.emitEvent({ type: 'roundStart', round: this.round })
  }

  private aliveCtCount(): number {
    const base = this.playerTeam === 'ct' ? (this.player.alive ? 1 : 0) : 0
    return base + countAlive(this.bots.filter(b => b.team === 'ct'))
  }

  private aliveTCount(): number {
    const base = this.playerTeam === 't' ? (this.player.alive ? 1 : 0) : 0
    return base + countAlive(this.bots.filter(b => b.team === 't'))
  }

  private endRound(winner: TeamId) {
    if (this.roundPhase === 'over') return
    this.roundPhase = 'over'
    this.roundTimer = ROUND_END_DELAY
    this.emitEvent({ type: 'roundEnd', winner })

    const playerWon = winner === this.playerTeam
    if (winner === 'ct') this.ctScore++
    else this.tScore++
    this.money = Math.min(MAX_MONEY, this.money + (playerWon ? WIN_REWARD : LOSE_REWARD))

    if (playerWon) {
      this.flashMessage(`回合胜利！+$${WIN_REWARD}`, ROUND_END_DELAY)
    } else {
      this.flashMessage(`回合失败 +$${LOSE_REWARD}`, ROUND_END_DELAY)
    }

    if (this.round >= TOTAL_ROUNDS || this.ctScore >= WIN_SCORE || this.tScore >= WIN_SCORE) {
      this.gameFinished = true
      const won =
        this.playerTeam === 'ct' ? this.ctScore > this.tScore : this.tScore > this.ctScore
      this.matchResult = won ? 'win' : 'lose'
      this.flashMessage(won ? '🏆 比赛胜利！' : '💀 比赛失败', 999)
      this.controls.unlock()
    }
  }

  private nextRound() {
    if (this.gameFinished) return
    this.round++
    if (this.round > TOTAL_ROUNDS) {
      this.gameFinished = true
      this.controls.unlock()
      return
    }
    this.startRound()
  }

  private updateRound(dt: number) {
    if (this.roundPhase === 'warmup') {
      this.roundTimer -= dt
      if (this.roundTimer <= 0) {
        this.roundPhase = 'combat'
        this.flashMessage('战斗开始！Go Go Go!', 1.6)
        this.audio.playRoundStart()
      }
      return
    }

    if (this.roundPhase === 'over') {
      this.roundTimer -= dt
      if (this.roundTimer <= 0) this.nextRound()
      return
    }

    // —— combat ——
    this.combatElapsed += dt
    if (!this.bombPlanted) {
      this.combatTimeLeft -= dt
      if (this.combatTimeLeft <= 0) {
        // 时间耗尽未安包 → CT 守方胜利
        this.endRound('ct')
        return
      }
    }

    if (this.bombPlanted) {
      this.bombTimer -= dt
      this.bombBeepCd -= dt
      if (this.bombBeepCd <= 0) {
        this.audio.playBombBeep()
        this.bombBeepCd = Math.max(0.18, this.bombTimer / 22)
      }
      if (this.bombTimer <= 0) {
        // 爆炸特效
        this.spawnHitFx(this.bombPosition.clone().setY(1), 0xff7722, 26)
        this.endRound('t')
        return
      }
    }

    const tAlive = this.aliveTCount()
    const ctAlive = this.aliveCtCount()

    if (ctAlive <= 0) {
      this.endRound('t')
      return
    }
    // T 全灭：若已安包，CT 仍需拆弹或等待爆炸；否则 CT 胜
    if (tAlive <= 0 && !this.bombPlanted) {
      this.endRound('ct')
      return
    }
  }

  /* ===================== C4 ===================== */

  private updateBombAction(dt: number) {
    if (this.roundPhase !== 'combat' || !this.player.alive || this.gameFinished) {
      this.actionProgress = 0
      return
    }

    const holdingE = this.keys['KeyE']
    if (!holdingE) {
      this.actionProgress = 0
      return
    }

    const pos = this.controls.object.position

    if (this.playerTeam === 't' && !this.bombPlanted) {
      const site = this.mapData.bombSites.find(
        s => Math.hypot(pos.x - s.position.x, pos.z - s.position.z) <= s.radius,
      )
      if (!site) {
        this.actionProgress = 0
        return
      }
      this.actionProgress += dt
      this.message = `安放 C4… ${Math.ceil(PLANT_TIME - this.actionProgress)}s`
      this.messageTimer = 0.2
      if (this.actionProgress >= PLANT_TIME) {
        this.plantBomb(site)
      }
      return
    }

    if (this.playerTeam === 'ct' && this.bombPlanted) {
      const dist = Math.hypot(pos.x - this.bombPosition.x, pos.z - this.bombPosition.z)
      if (dist > 3.5) {
        this.actionProgress = 0
        return
      }
      this.actionProgress += dt
      this.message = `拆弹中… ${Math.ceil(DEFUSE_TIME - this.actionProgress)}s`
      this.messageTimer = 0.2
      if (this.actionProgress >= DEFUSE_TIME) {
        this.defuseBomb()
      }
    }
  }

  private plantBomb(site: { id: 'A' | 'B'; position: { x: number; z: number } }) {
    this.bombPlanted = true
    this.bombTimer = BOMB_FUSE
    this.bombBeepCd = 0
    this.actionProgress = 0
    this.bombPosition.set(site.position.x, 0.35, site.position.z)

    const group = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.25, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x331100 }),
    )
    group.add(body)
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2200 }),
    )
    light.position.set(0.15, 0.18, 0)
    group.add(light)
    this.bombMesh = group
    this.bombMesh.position.copy(this.bombPosition)
    this.scene.add(this.bombMesh)

    this.flashMessage('C4 已安放！40 秒后引爆', 2.2)
    this.audio.playBombPlanted()
    this.emitEvent({ type: 'bombPlanted', site: site.id })
  }

  private defuseBomb() {
    this.bombPlanted = false
    this.bombTimer = 0
    this.actionProgress = 0
    this.clearBombMesh()
    this.flashMessage('C4 已拆除！', 2)
    this.endRound('ct')
  }

  /* ===================== 移动 ===================== */

  private updateMovement(dt: number) {
    if (!this.player.alive || this.roundPhase === 'warmup') return

    const obj = this.controls.object
    this.player.crouching = this.player.onGround && isCrouchKey(this.keys)
    const eyeHeight = getEyeHeight(this.player.crouching)
    const speed = (this.player.crouching ? CROUCH_SPEED : WALK_SPEED) * dt

    const forward = new THREE.Vector3()
    this.camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    if (this.keys['KeyW']) obj.position.addScaledVector(forward, speed)
    if (this.keys['KeyS']) obj.position.addScaledVector(forward, -speed)
    if (this.keys['KeyA']) obj.position.addScaledVector(right, -speed)
    if (this.keys['KeyD']) obj.position.addScaledVector(right, speed)

    resolveHorizontalCollision(obj.position, PLAYER_RADIUS, eyeHeight, this.colliders)

    if (this.player.onGround && this.jumpQueued) {
      this.player.crouching = false
      this.player.velocity.y = JUMP_VELOCITY
      this.player.onGround = false
    }
    this.jumpQueued = false

    this.player.velocity.y -= GRAVITY * dt
    obj.position.y += this.player.velocity.y * dt

    const grounded = resolveVerticalCollision(
      obj.position,
      PLAYER_RADIUS,
      this.colliders,
      eyeHeight,
      this.player.velocity.y,
    )
    this.player.onGround = grounded
    if (grounded) this.player.velocity.y = 0

    if (this.recoilPitch > 0) {
      this.camera.rotation.x -= this.recoilPitch
      this.recoilPitch *= 0.6
      if (this.recoilPitch < 0.0001) this.recoilPitch = 0
    }
  }

  /* ===================== 子弹结算 ===================== */

  private updateBullets(dt: number) {
    const playerPos = this.controls.object.position

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]
      b.mesh.position.addScaledVector(b.velocity, dt)
      b.life -= dt

      let remove = b.life <= 0 || b.mesh.position.y < -2

      if (!remove && this.hitColliders(b.mesh.position)) {
        this.audio.playImpact('wall')
        remove = true
      }

      // 命中 bot（异队）
      if (!remove) {
        for (const bot of this.bots) {
          if (!bot.alive || bot.team === b.ownerTeam) continue
          const dxz = Math.hypot(bot.position.x - b.mesh.position.x, bot.position.z - b.mesh.position.z)
          const relY = b.mesh.position.y - bot.position.y
          const headshot = relY > 1.38
          const hitRadius = headshot ? 0.32 : 0.72
          if (dxz < hitRadius && relY > 0 && relY < 1.95) {
            const dmg = headshot ? Math.round(b.damage * 2.4) : b.damage
            const killed = damageBot(bot, dmg)
            this.spawnHitFx(b.mesh.position.clone())
            this.audio.playImpact('flesh')
            if (b.ownerTeam === this.playerTeam && !b.ownerBot) {
              // 玩家击中
              this.audio.playHitmarker(headshot)
              this.emitEvent({ type: 'hit', headshot })
              if (killed) {
                this.kills++
                this.money = Math.min(MAX_MONEY, this.money + KILL_REWARD)
                this.audio.playKillConfirm()
                this.emitEvent({
                  type: 'kill',
                  killer: '你',
                  killerTeam: this.playerTeam,
                  victim: bot.name,
                  victimTeam: bot.team,
                  weapon: this.currentWeapon.name,
                  headshot,
                })
                this.flashMessage(`${headshot ? '💥 爆头击杀 ' : '击杀 '}${bot.name} +$${KILL_REWARD}`, 1.4)
              }
            } else if (killed && b.ownerBot) {
              // bot 击杀 bot
              b.ownerBot.kills++
              this.emitEvent({
                type: 'kill',
                killer: b.ownerBot.name,
                killerTeam: b.ownerBot.team,
                victim: bot.name,
                victimTeam: bot.team,
                weapon: '自动步枪',
                headshot,
              })
            }
            remove = true
            break
          }
        }
      }

      // 命中玩家（敌队子弹）
      if (!remove && this.player.alive && b.ownerTeam !== this.playerTeam) {
        const aim = playerPos.clone()
        aim.y -= 0.15
        if (aim.distanceTo(b.mesh.position) < 0.55) {
          this.damagePlayer(b.damage)
          this.spawnHitFx(aim, 0xff6666)
          this.audio.playImpact('flesh')
          remove = true
        }
      }

      if (remove) {
        this.recycleBullet(b)
        this.bullets.splice(i, 1)
      }
    }
  }

  private hitColliders(pos: THREE.Vector3): boolean {
    for (const box of this.colliders) {
      if (
        pos.x > box.min.x &&
        pos.x < box.max.x &&
        pos.y > box.min.y &&
        pos.y < box.max.y &&
        pos.z > box.min.z &&
        pos.z < box.max.z
      ) {
        return true
      }
    }
    return false
  }

  private damagePlayer(amount: number) {
    if (!this.player.alive) return
    this.player.hp = Math.max(0, this.player.hp - amount)
    if (this.player.hp <= 0) {
      this.player.alive = false
      this.deaths++
      this.flashMessage('你已阵亡 — 观战队友继续作战', 2.4)
    }
  }

  /* ===================== Bot 射击回调 ===================== */

  private onBotShoot = (bot: BotEntity, direction: THREE.Vector3) => {
    if (this.roundPhase !== 'combat') return

    const origin = bot.position.clone()
    origin.y = 1.25
    const bullet = this.getBullet(bot.team, bot)
    bullet.mesh.position.copy(origin)
    bullet.velocity.copy(direction).multiplyScalar(230)
    bullet.damage = BOT_WEAPON.damage
    bullet.life = 1.8
    this.audio.playGunshot(false)
  }

  private onBotFootstep = () => {
    this.audio.playFootstep()
  }

  /* ===================== FX ===================== */

  private updateFx(dt: number) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]
      f.life -= dt
      if (f.vy) f.mesh.position.y += f.vy * dt
      if (f.grow) f.mesh.scale.multiplyScalar(f.grow)
      if (f.mesh instanceof THREE.Mesh && f.mesh.material instanceof THREE.MeshBasicMaterial) {
        f.mesh.material.opacity = Math.max(0, f.life / f.maxLife)
      }
      if (f.life <= 0) {
        this.scene.remove(f.mesh)
        if (f.mesh instanceof THREE.Mesh) {
          f.mesh.geometry.dispose()
          const mat = f.mesh.material
          if (Array.isArray(mat)) mat.forEach(m => m.dispose())
          else mat.dispose()
        }
        this.fx.splice(i, 1)
      }
    }
  }

  /* ===================== 主循环 ===================== */

  private animate = () => {
    if (this.disposed) return
    this.rafId = requestAnimationFrame(this.animate)
    const dt = Math.min(this.clock.getDelta(), 0.05)

    if (this.reloading) {
      this.reloadTimer -= dt
      if (this.reloadTimer <= 0) this.finishReload()
    }

    if (this.shootCooldown > 0) this.shootCooldown -= dt

    if (
      this.mouseDown &&
      this.currentWeapon.automatic &&
      this.shootCooldown <= 0 &&
      !this.reloading &&
      !this.buyMenuOpen()
    ) {
      this.shoot()
    }

    if (this.ammo <= 0 && !this.reloading && this.reserve > 0 && this.roundPhase === 'combat') {
      this.startReload()
    }

    this.updateMovement(dt)
    updateBots(this.bots, {
      dt,
      colliders: this.colliders,
      playerPos: this.controls.object.position,
      playerAlive: this.player.alive,
      playerTeam: this.playerTeam,
      bombSites: this.mapData.bombSites,
      onBotShoot: this.onBotShoot,
      onFootstep: this.onBotFootstep,
    })
    this.updateBullets(dt)
    this.updateFx(dt)
    this.updateBombAction(dt)
    this.updateRound(dt)

    // C4 倒地闪烁
    if (this.bombMesh) {
      const blink = Math.sin(performance.now() / (this.bombTimer < 10 ? 90 : 260)) > 0
      const light = this.bombMesh.children[1] as THREE.Mesh
      if (light) (light.material as THREE.MeshBasicMaterial).color.setHex(blink ? 0xff2200 : 0x330000)
    }

    if (this.messageTimer > 0) this.messageTimer -= dt
    if (this.messageTimer <= 0 && this.roundPhase === 'combat' && this.bombPlanted) {
      this.message = `C4 爆炸倒计时 ${Math.ceil(this.bombTimer)}s`
      this.messageTimer = 0.35
    }

    this.emitHud()
    this.renderer.render(this.scene, this.camera)
  }

  /* ===================== HUD / 计分板 ===================== */

  private emitHud() {
    const displayMessage = this.messageTimer > 0 ? this.message : ''
    this.onHudUpdate({
      team: this.playerTeam.toUpperCase(),
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      ammo: this.ammo,
      reserve: this.reserve,
      weaponName: this.currentWeapon.name,
      kills: this.kills,
      deaths: this.deaths,
      round: this.round,
      totalRounds: TOTAL_ROUNDS,
      ctScore: this.ctScore,
      tScore: this.tScore,
      score: this.playerTeam === 'ct' ? this.ctScore : this.tScore,
      money: this.money,
      aliveCt: this.aliveCtCount(),
      aliveT: this.aliveTCount(),
      roundTime: Math.max(0, Math.ceil(this.bombPlanted ? this.bombTimer : this.combatTimeLeft)),
      canBuy: this.isBuyAllowed(),
      ownedPrimary: this.primary?.name ?? '',
      ownedSecondary: this.secondary.name,
      slot: this.slot,
      message: displayMessage,
      finished: this.gameFinished,
      matchResult: this.matchResult,
      bombPlanted: this.bombPlanted,
      bombTimer: Math.max(0, Math.ceil(this.bombTimer)),
    })
  }

  /** Vue 计分板数据（Tab 键显示） */
  getScoreboard(): ScoreboardData {
    const mapRow = (b: BotEntity): ScoreRow => ({
      name: b.name,
      kills: b.kills,
      dead: !b.alive,
      isPlayer: false,
    })
    const ctRows: ScoreRow[] = this.bots.filter(b => b.team === 'ct').map(mapRow)
    const tRows: ScoreRow[] = this.bots.filter(b => b.team === 't').map(mapRow)
    const playerRow: ScoreRow = { name: '你', kills: this.kills, dead: !this.player.alive, isPlayer: true }
    if (this.playerTeam === 'ct') ctRows.unshift(playerRow)
    else tRows.unshift(playerRow)
    return { ct: ctRows, t: tRows, ctScore: this.ctScore, tScore: this.tScore }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.rafId)
    this.audio.dispose()

    document.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('resize', this.onResize)
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown)
    this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp)

    this.controls.disconnect()
    this.renderer.dispose()

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }

    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material?.dispose()
      }
    })
  }
}
