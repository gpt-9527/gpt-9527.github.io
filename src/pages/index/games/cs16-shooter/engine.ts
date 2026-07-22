import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import type {
  BotEntity,
  ColliderBox,
  EngineOptions,
  MapData,
  RoundPhase,
  TeamId,
  WeaponConfig,
} from './types'
import { damageBot, spawnBots, updateBots } from './bots'
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
import { BOT_WEAPON, getWeaponPool } from './weapons'
import { CS16Audio } from './audio'

interface Bullet {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  damage: number
  life: number
  fromPlayer: boolean
}

interface FxItem {
  mesh: THREE.Object3D
  life: number
  maxLife: number
  vy?: number
  grow?: number
}

const TOTAL_ROUNDS = 15
const BOT_COUNT = 5
const PLANT_TIME = 3.2
const DEFUSE_TIME = 5
const BOMB_FUSE = 40
const ROUND_WARMUP = 2.5
const ROUND_END_DELAY = 3

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

  private keys: Record<string, boolean> = {}
  private mouseDown = false
  private jumpQueued = false
  private audio = new CS16Audio()

  private weapons: WeaponConfig[] = []
  private currentWeaponIndex = 0
  private ammo = 0
  private reserve = 0
  private reloading = false
  private reloadTimer = 0
  private shootCooldown = 0
  private recoilPitch = 0

  private bullets: Bullet[] = []
  private bulletPool: Bullet[] = []
  private fx: FxItem[] = []
  private bots: BotEntity[] = []

  private round = 1
  private roundPhase: RoundPhase = 'warmup'
  private roundTimer = ROUND_WARMUP
  private ctScore = 0
  private tScore = 0
  private kills = 0

  private bombPlanted = false
  private bombPosition = new THREE.Vector3()
  private bombMesh: THREE.Mesh | null = null
  private bombTimer = 0
  private actionProgress = 0
  private message = '点击画面锁定鼠标'
  private messageTimer = 4
  private gameFinished = false

  private onHudUpdate!: EngineOptions['onHudUpdate']

  private onKeyDown = (e: KeyboardEvent) => {
    if (['Space', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
      e.preventDefault()
    }
    this.keys[e.code] = true
    if (e.code === 'Space') this.jumpQueued = true
    if (e.code === 'KeyR') this.startReload()
    if (e.code === 'KeyQ') this.switchWeapon()
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
    if (this.disposed) return
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  constructor(opts: EngineOptions) {
    this.onHudUpdate = opts.onHudUpdate
    this.playerTeam = opts.team
    this.init(opts)
    this.startRound()
    this.animate()
  }

  private init(opts: EngineOptions) {
    this.container = opts.canvasHost

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87a6c4)
    this.scene.fog = new THREE.Fog(0x87a6c4, 35, 180)

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      400,
    )

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.container.appendChild(this.renderer.domElement)

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement)
    this.scene.add(this.controls.object)

    this.container.addEventListener('click', () => {
      if (!this.gameFinished) {
        void this.audio.start()
        this.controls.lock()
      }
    })

    this.initLighting()
    this.mapData = createDust2Map()
    this.colliders = this.mapData.colliders
    this.scene.add(this.mapData.group)

    this.initWeapons(opts.weaponMode)
    this.initInput()
    this.initHud()

    window.addEventListener('resize', this.onResize)
  }

  private initLighting() {
    this.scene.add(new THREE.HemisphereLight(0xdce8ff, 0x8b7355, 0.55))
    const sun = new THREE.DirectionalLight(0xfff2dd, 0.95)
    sun.position.set(40, 70, 20)
    this.scene.add(sun)
  }

  private initWeapons(mode: 'rifle' | 'sniper') {
    this.weapons = getWeaponPool(mode)
    this.currentWeaponIndex = 0
    this.equipWeapon()
  }

  private initInput() {
    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('keyup', this.onKeyUp)
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown)
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp)
  }

  private initHud() {
    this.emitHud()
  }

  private get currentWeapon(): WeaponConfig {
    return this.weapons[this.currentWeaponIndex]
  }

  private equipWeapon() {
    const w = this.currentWeapon
    this.ammo = w.magSize
    this.reserve = w.reserve
    this.reloading = false
    this.reloadTimer = 0
    this.emitHud()
  }

  private switchWeapon() {
    if (this.reloading || this.weapons.length <= 1) return
    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length
    this.equipWeapon()
    this.flashMessage(`切换至 ${this.currentWeapon.name}`)
  }

  private startReload() {
    const w = this.currentWeapon
    if (this.reloading || this.reserve <= 0 || this.ammo >= w.magSize) return
    this.reloading = true
    this.reloadTimer = w.reloadTime
    this.flashMessage('换弹中…')
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

    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    dir.x += (Math.random() - 0.5) * w.spread
    dir.y += (Math.random() - 0.5) * w.spread
    dir.z += (Math.random() - 0.5) * w.spread
    dir.normalize()

    const bullet = this.getBullet(w.isSniper ? 0x00ffff : 0xffdd44)
    bullet.mesh.position.copy(this.camera.position)
    bullet.velocity.copy(dir).multiplyScalar(w.bulletSpeed)
    bullet.damage = w.damage
    bullet.life = 2.5
    bullet.fromPlayer = true

    this.recoilPitch += 0.0018 * w.recoil
    this.spawnMuzzleFlash()
    this.audio.playGunshot(w.isSniper)
  }

  private getBullet(color: number): Bullet {
    let b = this.bulletPool.pop()
    if (!b) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        new THREE.MeshBasicMaterial({ color }),
      )
      b = { mesh, velocity: new THREE.Vector3(), damage: 0, life: 0, fromPlayer: true }
    } else {
      ;(b.mesh.material as THREE.MeshBasicMaterial).color.setHex(color)
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
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.85 }),
    )
    flash.position.copy(this.camera.position)
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    flash.position.addScaledVector(dir, 0.35)
    this.scene.add(flash)
    this.fx.push({ mesh: flash, life: 0.08, maxLife: 0.08, grow: 1.08 })
  }

  private spawnHitFx(pos: THREE.Vector3, color = 0xff4444) {
    for (let i = 0; i < 4; i++) {
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

  private startRound() {
    this.roundPhase = 'warmup'
    this.roundTimer = ROUND_WARMUP
    this.actionProgress = 0
    this.bombPlanted = false
    this.bombTimer = 0
    if (this.bombMesh) {
      this.scene.remove(this.bombMesh)
      this.bombMesh.geometry.dispose()
      ;(this.bombMesh.material as THREE.Material).dispose()
      this.bombMesh = null
    }

    this.player = createPlayerBody()
    this.player.onGround = true
    this.jumpQueued = false
    const spawns = this.playerTeam === 'ct' ? this.mapData.ctSpawns : this.mapData.tSpawns
    const spawn = spawns[0]
    this.controls.object.position.set(spawn.position.x, spawn.position.y, spawn.position.z)
    this.controls.object.rotation.set(0, spawn.yaw, 0)
    this.camera.rotation.x = 0
    this.player.velocity.set(0, 0, 0)

    this.equipWeapon()

    const enemyTeam: TeamId = this.playerTeam === 'ct' ? 't' : 'ct'
    const enemySpawns = enemyTeam === 'ct' ? this.mapData.ctSpawns : this.mapData.tSpawns
    this.bots.forEach(b => this.scene.remove(b.mesh))
    this.bots = spawnBots(enemyTeam, enemySpawns, BOT_COUNT, this.scene)

    this.flashMessage(`第 ${this.round} 回合 · 准备战斗`, ROUND_WARMUP)
  }

  private endRound(playerWon: boolean) {
    if (this.roundPhase === 'over') return
    this.roundPhase = 'over'
    this.roundTimer = ROUND_END_DELAY

    if (playerWon) {
      if (this.playerTeam === 'ct') this.ctScore++
      else this.tScore++
      this.flashMessage('回合胜利！', ROUND_END_DELAY)
    } else {
      if (this.playerTeam === 'ct') this.tScore++
      else this.ctScore++
      this.flashMessage('回合失败', ROUND_END_DELAY)
    }

    if (this.round >= TOTAL_ROUNDS || this.ctScore >= 8 || this.tScore >= 8) {
      this.gameFinished = true
      const won = this.playerTeam === 'ct' ? this.ctScore > this.tScore : this.tScore > this.ctScore
      this.flashMessage(won ? '比赛胜利！' : '比赛失败', 999)
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
        this.flashMessage('战斗开始！', 1.5)
      }
      return
    }

    if (this.roundPhase === 'over') {
      this.roundTimer -= dt
      if (this.roundTimer <= 0) this.nextRound()
      return
    }

    if (this.bombPlanted) {
      this.bombTimer -= dt
      if (this.bombTimer <= 0) {
        this.endRound(this.playerTeam === 't')
        return
      }
    }

    const enemiesAlive = this.bots.some(b => b.alive)
    if (!enemiesAlive) {
      this.endRound(true)
      return
    }
    if (!this.player.alive) {
      this.endRound(false)
    }
  }

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
        this.plantBomb(site.position.x, site.position.z)
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

  private plantBomb(x: number, z: number) {
    this.bombPlanted = true
    this.bombTimer = BOMB_FUSE
    this.actionProgress = 0
    this.bombPosition.set(x, 0.35, z)

    this.bombMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.25, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x331100 }),
    )
    this.bombMesh.position.copy(this.bombPosition)
    this.scene.add(this.bombMesh)
    this.flashMessage('C4 已安放！', 2)
  }

  private defuseBomb() {
    this.bombPlanted = false
    this.bombTimer = 0
    this.actionProgress = 0
    if (this.bombMesh) {
      this.scene.remove(this.bombMesh)
      this.bombMesh.geometry.dispose()
      ;(this.bombMesh.material as THREE.Material).dispose()
      this.bombMesh = null
    }
    this.endRound(this.playerTeam === 'ct')
  }

  private updateMovement(dt: number) {
    if (!this.player.alive || this.roundPhase === 'warmup') return

    const obj = this.controls.object
    // 空中不可下蹲，避免跳跃高度被错误压低
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

    // 边沿触发跳跃，避免长按 Space 每帧重复起跳；蹲跳会先起身
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

      if (!remove && b.fromPlayer) {
        for (const bot of this.bots) {
          if (!bot.alive) continue
          const hitPos = bot.position.clone()
          hitPos.y = 1.1
          if (hitPos.distanceTo(b.mesh.position) < 0.75) {
            const killed = damageBot(bot, b.damage)
            this.spawnHitFx(hitPos)
            this.audio.playImpact('flesh')
            if (killed) {
              this.kills++
              this.flashMessage(`击杀 ${bot.name}`, 1.2)
            }
            remove = true
            break
          }
        }
      }

      if (!remove && !b.fromPlayer && this.player.alive) {
        const aim = playerPos.clone()
        aim.y -= 0.1
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
      this.flashMessage('你已阵亡', 2)
    }
  }

  private onBotShoot = (bot: BotEntity, direction: THREE.Vector3) => {
    if (this.roundPhase !== 'combat' || !this.player.alive) return

    const origin = bot.position.clone()
    origin.y = 1.25
    const bullet = this.getBullet(0xff8844)
    bullet.mesh.position.copy(origin)
    bullet.velocity.copy(direction).multiplyScalar(220)
    bullet.damage = BOT_WEAPON.damage
    bullet.life = 1.8
    bullet.fromPlayer = false
    this.audio.playGunshot(false)
  }

  private onBotFootstep = () => {
    this.audio.playFootstep()
  }

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
      !this.reloading
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
      onBotShoot: this.onBotShoot,
      onFootstep: this.onBotFootstep,
    })
    this.updateBullets(dt)
    this.updateFx(dt)
    this.updateBombAction(dt)
    this.updateRound(dt)

    if (this.messageTimer > 0) this.messageTimer -= dt
    if (this.messageTimer <= 0 && this.roundPhase === 'combat' && this.bombPlanted) {
      this.message = `C4 爆炸 ${Math.ceil(this.bombTimer)}s`
      this.messageTimer = 0.35
    }

    this.emitHud()
    this.renderer.render(this.scene, this.camera)
  }

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
      round: this.round,
      totalRounds: TOTAL_ROUNDS,
      ctScore: this.ctScore,
      tScore: this.tScore,
      score: this.playerTeam === 'ct' ? this.ctScore : this.tScore,
      message: displayMessage,
      finished: this.gameFinished,
      bombPlanted: this.bombPlanted,
      bombTimer: Math.max(0, Math.ceil(this.bombTimer)),
    })
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
