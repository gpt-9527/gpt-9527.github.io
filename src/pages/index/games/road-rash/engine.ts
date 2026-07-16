import * as THREE from 'three'
import type { CharacterConfig, HudListener, HudState, MapConfig } from './types'
import { sampleTrack, trackToWorld } from './track'
import {
  createDamageLabel,
  createHeldWeapon,
  createSwingEffect,
  resolveWeapon,
} from './weapons'

const GLOBAL_MAX_SPEED = 300
/** 更宽的赛道 */
const ROAD_HALF_WIDTH = 11.5
const LANE_LIMIT = 9.5
/** 受击减速下限 */
const HIT_SPEED_FLOOR = 50
/** 高速失控阈值 */
const UNSTABLE_SPEED = 250

interface Racer {
  mesh: THREE.Group
  name: string
  isPlayer: boolean
  speed: number
  targetSpeed: number
  hp: number
  maxHp: number
  progress: number
  lane: number
  stun: number
  weapon: string | null
  attackCd: number
  alive: boolean
  color: number
  finished: boolean
  finishTime: number
  /** 角色能力（NPC 用简化模板） */
  attackMult: number
  attackRangeMult: number
  defenseMult: number
  accelMult: number
  /** 满血时的极速上限 */
  baseTopSpeed: number
  topSpeed: number
  turnMult: number
  weaponRoot: THREE.Group | null
}

interface FxItem {
  mesh: THREE.Object3D
  life: number
  maxLife: number
  vy?: number
  grow?: number
}

interface SpeedStreak {
  mesh: THREE.Mesh
  life: number
  speed: number
}

export class RoadRashEngine {
  private container: HTMLElement
  private map: MapConfig
  private character: CharacterConfig
  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  private rafId = 0
  private disposed = false

  private keys: Record<string, boolean> = {}
  private racers: Racer[] = []
  private player!: Racer
  private fx: FxItem[] = []
  private streaks: SpeedStreak[] = []
  private streakGroup = new THREE.Group()
  private propGroup = new THREE.Group()
  private onHud: HudListener
  private messageTimer = 0
  private message = ''
  private gameOver = false
  private elapsed = 0
  private baseFov = 56
  private shake = 0

  private onKeyDown = (e: KeyboardEvent) => this.handleKey(e, true)
  private onKeyUp = (e: KeyboardEvent) => this.handleKey(e, false)
  private onResize = () => this.resize()

  constructor(
    container: HTMLElement,
    map: MapConfig,
    character: CharacterConfig,
    onHud: HudListener
  ) {
    this.container = container
    this.map = map
    this.character = character
    this.onHud = onHud
    this.init()
  }

  private init() {
    const w = this.container.clientWidth || window.innerWidth
    const h = this.container.clientHeight || window.innerHeight

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(this.map.skyColor)
    this.scene.fog = new THREE.Fog(this.map.fogColor, this.map.fogNear, this.map.fogFar)

    this.camera = new THREE.PerspectiveCamera(this.baseFov, w / h, 0.1, 900)
    this.camera.position.set(0, 6, -12)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.container.appendChild(this.renderer.domElement)

    const ambient = new THREE.AmbientLight(0xffffff, this.map.ambientIntensity)
    this.scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffffff, this.map.sunIntensity)
    sun.position.set(30, 80, 20)
    sun.castShadow = true
    this.scene.add(sun)

    if (this.map.id === 'city') {
      const neon = new THREE.PointLight(0x2de2ff, 1.2, 80)
      neon.position.set(0, 8, 0)
      this.scene.add(neon)
    }

    this.scene.add(this.propGroup)
    this.scene.add(this.streakGroup)

    this.buildWorld()
    this.spawnRacers()

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('resize', this.onResize)

    this.clock.start()
    this.loop()
    this.emitHud()
  }

  private buildWorld() {
    const len = this.map.trackLength
    const step = 5

    // 随路径铺设地面宽带
    const groundMat = new THREE.MeshLambertMaterial({ color: this.map.groundColor })
    const roadMat = new THREE.MeshLambertMaterial({ color: this.map.roadColor })
    const sideMat = new THREE.MeshLambertMaterial({ color: this.map.sideColor })
    const dashMat = new THREE.MeshBasicMaterial({ color: this.map.laneColor })

    for (let s = 0; s < len; s += step) {
      const a = sampleTrack(s, this.map)
      const b = sampleTrack(Math.min(s + step, len), this.map)
      const midS = s + step * 0.5
      const mid = sampleTrack(midS, this.map)
      const segLen = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || step

      // ground under road
      const ground = new THREE.Mesh(new THREE.BoxGeometry(120, 0.4, segLen + 0.2), groundMat)
      ground.position.set(mid.x, mid.y - 0.35, mid.z)
      ground.rotation.order = 'YXZ'
      ground.rotation.y = mid.yaw
      ground.rotation.x = mid.pitch
      ground.receiveShadow = true
      this.scene.add(ground)

      // road ribbon
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(ROAD_HALF_WIDTH * 2, 0.18, segLen + 0.15),
        roadMat
      )
      road.position.set(mid.x, mid.y + 0.02, mid.z)
      road.rotation.order = 'YXZ'
      road.rotation.y = mid.yaw
      road.rotation.x = mid.pitch
      road.receiveShadow = true
      this.scene.add(road)

      // side rails
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, segLen + 0.1), sideMat)
        rail.position.set(
          mid.x + mid.rightX * side * (ROAD_HALF_WIDTH + 0.9),
          mid.y + 0.15,
          mid.z + mid.rightZ * side * (ROAD_HALF_WIDTH + 0.9)
        )
        rail.rotation.order = 'YXZ'
        rail.rotation.y = mid.yaw
        rail.rotation.x = mid.pitch
        this.scene.add(rail)
      }

      // center dashes every other segment
      if (Math.floor(s / step) % 2 === 0) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, Math.min(3.2, segLen * 0.7)), dashMat)
        dash.position.set(mid.x, mid.y + 0.12, mid.z)
        dash.rotation.order = 'YXZ'
        dash.rotation.y = mid.yaw
        dash.rotation.x = mid.pitch
        this.scene.add(dash)
      }
    }

    // finish
    const fin = sampleTrack(len, this.map)
    const finish = new THREE.Mesh(
      new THREE.BoxGeometry(ROAD_HALF_WIDTH * 2, 0.12, 3),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    )
    finish.position.set(fin.x, fin.y + 0.15, fin.z)
    finish.rotation.order = 'YXZ'
    finish.rotation.y = fin.yaw
    finish.rotation.x = fin.pitch
    this.scene.add(finish)

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(1, 6, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xff3344 })
    )
    flag.position.set(
      fin.x + fin.rightX * -(ROAD_HALF_WIDTH + 1.2),
      fin.y + 3,
      fin.z + fin.rightZ * -(ROAD_HALF_WIDTH + 1.2)
    )
    this.scene.add(flag)

    // props along track sides
    const propCount = this.map.id === 'desert' ? 100 : 140
    for (let i = 0; i < propCount; i++) {
      const s = Math.random() * len
      const t = sampleTrack(s, this.map)
      const side = Math.random() > 0.5 ? 1 : -1
      const dist = ROAD_HALF_WIDTH + 5 + Math.random() * 42
      const px = t.x + t.rightX * side * dist
      const pz = t.z + t.rightZ * side * dist
      const py = t.y
      const color = this.map.propColors[i % this.map.propColors.length]

      if (this.map.id === 'desert') {
        const cactus = new THREE.Group()
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.45, 2.2 + Math.random(), 6),
          new THREE.MeshLambertMaterial({ color })
        )
        body.position.y = 1.1
        body.castShadow = true
        cactus.add(body)
        if (Math.random() > 0.4) {
          const arm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.22, 1.1, 5),
            new THREE.MeshLambertMaterial({ color })
          )
          arm.position.set(0.55, 1.4, 0)
          arm.rotation.z = -0.7
          cactus.add(arm)
        }
        cactus.position.set(px, py, pz)
        this.propGroup.add(cactus)
      } else {
        const pole = new THREE.Group()
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.15, 5, 6),
          new THREE.MeshLambertMaterial({ color: 0x333844 })
        )
        post.position.y = 2.5
        pole.add(post)
        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.35, 0.8),
          new THREE.MeshBasicMaterial({ color })
        )
        lamp.position.y = 5.1
        pole.add(lamp)
        const light = new THREE.PointLight(color, 0.5, 16)
        light.position.y = 5
        pole.add(light)
        pole.position.set(px, py, pz)
        this.propGroup.add(pole)
      }
    }

    // distant blocks
    for (let i = 0; i < 22; i++) {
      const s = (i / 22) * len
      const t = sampleTrack(s, this.map)
      const side = i % 2 === 0 ? -1 : 1
      const h = this.map.id === 'city' ? 10 + Math.random() * 30 : 4 + Math.random() * 8
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(8 + Math.random() * 20, h, 8 + Math.random() * 12),
        new THREE.MeshLambertMaterial({
          color: this.map.id === 'city' ? 0x1e2438 : 0xa8885a,
        })
      )
      const dist = 48 + Math.random() * 40
      mesh.position.set(
        t.x + t.rightX * side * dist,
        t.y + h / 2,
        t.z + t.rightZ * side * dist
      )
      this.scene.add(mesh)
    }
  }

  private createBike(color: number, riderColor: number, isPlayer: boolean): THREE.Group {
    const g = new THREE.Group()

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.45, 2.2),
      new THREE.MeshLambertMaterial({ color })
    )
    body.position.y = 0.75
    body.castShadow = true
    g.add(body)

    const tank = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.35, 0.9),
      new THREE.MeshLambertMaterial({ color: isPlayer ? 0xffdd55 : color })
    )
    tank.position.set(0, 1.05, 0.15)
    g.add(tank)

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.2, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    )
    seat.position.set(0, 1.0, -0.55)
    g.add(seat)

    const wheelGeo = new THREE.TorusGeometry(0.38, 0.12, 8, 16)
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 })
    const front = new THREE.Mesh(wheelGeo, wheelMat)
    front.rotation.y = Math.PI / 2
    front.position.set(0, 0.38, 0.85)
    g.add(front)
    const rear = front.clone()
    rear.position.z = -0.85
    g.add(rear)

    const rider = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.55, 4, 8),
      new THREE.MeshLambertMaterial({ color: riderColor })
    )
    rider.position.set(0, 1.45, -0.15)
    rider.castShadow = true
    g.add(rider)

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshLambertMaterial({ color: isPlayer ? 0xffccaa : 0xddbb99 })
    )
    head.position.set(0, 1.95, -0.05)
    g.add(head)

    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.18, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffaa })
    )
    lamp.position.set(0, 0.9, 1.15)
    g.add(lamp)

    return g
  }

  private attachWeapon(racer: Racer, weapon: string | null) {
    if (racer.weaponRoot) {
      racer.mesh.remove(racer.weaponRoot)
      racer.weaponRoot.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
          else obj.material?.dispose()
        }
      })
      racer.weaponRoot = null
    }
    const held = createHeldWeapon(weapon)
    racer.mesh.add(held)
    racer.weaponRoot = held
    racer.weapon = weapon
  }

  /** 血量越低，极速上限越低 */
  private refreshTopSpeed(r: Racer) {
    const ratio = r.maxHp > 0 ? r.hp / r.maxHp : 0
    // 满血 100% 极速，残血最低保留约 42% 极速
    r.topSpeed = r.baseTopSpeed * (0.42 + 0.58 * Math.max(0, ratio))
  }

  /**
   * 将显示速度映射为赛道推进量：高速差距被放大
   * 速度 10 → 很慢；100 中等；250+ 明显冲刺；300 最快
   */
  private speedToProgress(speed: number): number {
    const t = THREE.MathUtils.clamp(speed / GLOBAL_MAX_SPEED, 0, 1)
    // 指数曲线：高段加速更明显
    return (Math.pow(t, 1.55) * 36 + t * 8) 
  }

  private spawnRacers() {
    const c = this.character
    const palette = [0xff4444, 0x44aa88, 0xaa66ff, 0xff8800, 0x44aaff, 0xee4488]
    const names = ['赤影', '狂风', '夜刃', '铁拳', '闪电', '修罗']
    const riderColors = [0x7f1d1d, 0x14532d, 0x4c1d95, 0x9a3412, 0x1e3a8a, 0x9d174d]

    this.player = {
      mesh: this.createBike(c.color, c.riderColor, true),
      name: c.name,
      isPlayer: true,
      speed: 0,
      targetSpeed: 0,
      hp: c.maxHp,
      maxHp: c.maxHp,
      progress: 0,
      lane: 0,
      stun: 0,
      weapon: c.startWeapon,
      attackCd: 0,
      alive: true,
      color: c.color,
      finished: false,
      finishTime: 0,
      attackMult: c.attackMult,
      attackRangeMult: c.attackRangeMult,
      defenseMult: c.defenseMult,
      accelMult: c.accelMult,
      baseTopSpeed: c.topSpeed,
      topSpeed: c.topSpeed,
      turnMult: c.turnMult,
      weaponRoot: null,
    }
    this.attachWeapon(this.player, c.startWeapon)
    this.applyRacerPose(this.player)
    this.scene.add(this.player.mesh)
    this.racers.push(this.player)

    for (let i = 0; i < this.map.racerCount; i++) {
      const color = palette[i % palette.length]
      const top = 200 + Math.random() * 70
      const npcWeapon = Math.random() > 0.45 ? (Math.random() > 0.5 ? '链锤' : '铁棍') : null
      const npc: Racer = {
        mesh: this.createBike(color, riderColors[i % riderColors.length], false),
        name: names[i % names.length],
        isPlayer: false,
        speed: 80 + Math.random() * 40,
        targetSpeed: 140 + Math.random() * 100,
        hp: 80 + Math.floor(Math.random() * 40),
        maxHp: 100,
        progress: 10 + i * 7 + Math.random() * 5,
        lane: (Math.random() - 0.5) * LANE_LIMIT * 1.5,
        stun: 0,
        weapon: npcWeapon,
        attackCd: 0,
        alive: true,
        color,
        finished: false,
        finishTime: 0,
        attackMult: 0.9 + Math.random() * 0.3,
        attackRangeMult: 1,
        defenseMult: 1,
        accelMult: 0.9 + Math.random() * 0.3,
        baseTopSpeed: Math.min(GLOBAL_MAX_SPEED - 10, top),
        topSpeed: Math.min(GLOBAL_MAX_SPEED - 10, top),
        turnMult: 0.9 + Math.random() * 0.3,
        weaponRoot: null,
      }
      npc.maxHp = npc.hp
      this.refreshTopSpeed(npc)
      this.attachWeapon(npc, npcWeapon)
      this.applyRacerPose(npc)
      this.scene.add(npc.mesh)
      this.racers.push(npc)
    }
  }

  private applyRacerPose(r: Racer) {
    if (!r.alive) {
      const w = trackToWorld(r.progress, r.lane, this.map, 0.3)
      r.mesh.position.set(w.x, w.y, w.z)
      r.mesh.rotation.order = 'YXZ'
      r.mesh.rotation.y = w.yaw
      r.mesh.rotation.x = Math.PI / 2
      return
    }
    const w = trackToWorld(r.progress, r.lane, this.map, 0)
    r.mesh.position.set(w.x, w.y, w.z)
    r.mesh.rotation.order = 'YXZ'
    r.mesh.rotation.y = w.yaw
    r.mesh.rotation.x = w.pitch
    r.mesh.rotation.z = THREE.MathUtils.clamp(-r.lane * 0.03, -0.28, 0.28)
  }

  private handleKey(e: KeyboardEvent, down: boolean) {
    const k = e.key.toLowerCase()
    if (
      ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(k) ||
      e.code === 'Space'
    ) {
      e.preventDefault()
    }
    this.keys[e.code] = down
    this.keys[k] = down
    if (e.code === 'Space') this.keys['space'] = down
  }

  private isDown(code: string, key?: string) {
    return !!(this.keys[code] || (key && this.keys[key]))
  }

  private loop = () => {
    if (this.disposed) return
    this.rafId = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.elapsed += dt

    if (!this.gameOver) {
      this.updatePlayer(dt)
      this.updateNpcs(dt)
      this.resolveCombat()
      this.checkFinish()
    }

    this.updateVisuals(dt)
    this.updateSpeedFx(dt)
    this.updateCamera(dt)
    this.renderer.render(this.scene, this.camera)
    this.emitHud()
  }

  private updatePlayer(dt: number) {
    const p = this.player
    if (!p.alive || p.finished) {
      this.applyRacerPose(p)
      return
    }

    this.refreshTopSpeed(p)

    if (p.stun > 0) {
      p.stun -= dt
      p.speed = Math.max(0, p.speed - 80 * dt)
    } else {
      const accel = this.isDown('ArrowUp', 'w') || this.isDown('KeyW')
      const brake = this.isDown('ArrowDown', 's') || this.isDown('KeyS')
      const left = this.isDown('ArrowLeft', 'a') || this.isDown('KeyA')
      const right = this.isDown('ArrowRight', 'd') || this.isDown('KeyD')
      const attack = this.isDown('Space', ' ') || this.isDown('space')

      const cap = Math.min(GLOBAL_MAX_SPEED, p.topSpeed)
      if (accel) p.targetSpeed = cap
      else if (brake) p.targetSpeed = Math.max(0, p.speed - 120)
      else p.targetSpeed = Math.max(0, p.speed - 22)

      // 高速段加速度更猛，拉开速度档次
      const speedBoost = 1 + Math.pow(p.speed / GLOBAL_MAX_SPEED, 1.4) * 0.55
      const rate = (accel ? 110 : brake ? 180 : 45) * p.accelMult * speedBoost
      p.speed += Math.sign(p.targetSpeed - p.speed) * Math.min(Math.abs(p.targetSpeed - p.speed), rate * dt)
      p.speed = THREE.MathUtils.clamp(p.speed, 0, cap)

      // 上坡减速 / 下坡加速
      const t = sampleTrack(p.progress, this.map)
      const grade = Math.sin(t.pitch)
      if (grade > 0.02) p.speed = Math.max(0, p.speed - grade * 55 * dt)
      if (grade < -0.02) p.speed = Math.min(cap, p.speed - grade * 40 * dt)

      const steer = (left ? 1 : 0) + (right ? -1 : 0)
      // 基础转向随速度减弱
      let turnPower = 14 * p.turnMult * (1 - p.speed / (GLOBAL_MAX_SPEED * 1.55))
      // 250+ 明显失控：转向变钝 + 左右甩尾
      if (p.speed >= UNSTABLE_SPEED) {
        const over = THREE.MathUtils.clamp((p.speed - UNSTABLE_SPEED) / (GLOBAL_MAX_SPEED - UNSTABLE_SPEED), 0, 1)
        turnPower *= 1 - over * 0.82
        p.lane += Math.sin(this.elapsed * 16 + p.progress * 0.05) * over * 3.2 * dt
        p.lane += (Math.random() - 0.5) * over * 5.5 * dt
        // 输入反向延迟感：高速时轻微过度转向抖动
        if (steer !== 0) {
          p.lane += steer * over * 0.35 * Math.sin(this.elapsed * 22) * dt * 8
        }
      }
      p.lane += steer * turnPower * dt
      p.lane = THREE.MathUtils.clamp(p.lane, -LANE_LIMIT, LANE_LIMIT)

      if (attack && p.attackCd <= 0) this.doAttack(p)
    }

    p.progress += this.speedToProgress(p.speed) * dt
    if (p.attackCd > 0) p.attackCd -= dt
    this.applyRacerPose(p)
  }

  private updateNpcs(dt: number) {
    for (const r of this.racers) {
      if (r.isPlayer || !r.alive || r.finished) {
        if (!r.isPlayer) this.applyRacerPose(r)
        continue
      }

      this.refreshTopSpeed(r)

      if (r.stun > 0) {
        r.stun -= dt
        r.speed = Math.max(HIT_SPEED_FLOOR * 0.6, r.speed - 60 * dt)
      } else {
        r.targetSpeed =
          150 + Math.sin(this.elapsed * 0.7 + r.progress * 0.01) * 40 + Math.random() * 10
        r.targetSpeed = Math.min(r.topSpeed, r.targetSpeed)
        r.speed +=
          Math.sign(r.targetSpeed - r.speed) *
          Math.min(Math.abs(r.targetSpeed - r.speed), 50 * r.accelMult * dt)
        r.speed = Math.min(r.speed, r.topSpeed)

        r.lane += Math.sin(this.elapsed * 0.9 + r.progress * 0.02) * 2.5 * r.turnMult * dt
        r.lane = THREE.MathUtils.clamp(r.lane, -LANE_LIMIT, LANE_LIMIT)

        if (r.attackCd <= 0 && Math.random() < 0.018) this.doAttack(r)
      }

      const t = sampleTrack(r.progress, this.map)
      const grade = Math.sin(t.pitch)
      if (grade > 0.02) r.speed = Math.max(30, r.speed - grade * 40 * dt)
      if (grade < -0.02) r.speed = Math.min(r.topSpeed, r.speed - grade * 30 * dt)

      r.progress += this.speedToProgress(r.speed) * dt
      if (r.attackCd > 0) r.attackCd -= dt
      this.applyRacerPose(r)
    }
  }

  private doAttack(attacker: Racer) {
    const profile = resolveWeapon(attacker.weapon)
    attacker.attackCd = profile.cooldown

    const range = profile.range * attacker.attackRangeMult
    const sideRange = profile.sideRange * attacker.attackRangeMult
    // 伤害整体下调；高速仍有加成但更克制
    const speedFactor = 0.38 + (attacker.speed / GLOBAL_MAX_SPEED) * 1.05
    const damage = Math.max(1, Math.round(profile.baseDamage * speedFactor * attacker.attackMult))

    // 武器挥砍特效（区分徒手 / 铁棍 / 链锤）
    const swing = createSwingEffect(attacker.weapon)
    const swingPos = trackToWorld(attacker.progress + 1.2, attacker.lane, this.map, 1.25)
    swing.position.set(swingPos.x, swingPos.y, swingPos.z)
    swing.rotation.y = sampleTrack(attacker.progress, this.map).yaw
    this.scene.add(swing)
    this.fx.push({ mesh: swing, life: 0.28, maxLife: 0.28, grow: 1.08 })

    // 攻击弧光
    const arcPos = trackToWorld(attacker.progress + 0.6, attacker.lane, this.map, 0.35)
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(0.8, range * 0.28, 28, 1, 0, Math.PI * 1.2),
      new THREE.MeshBasicMaterial({
        color: profile.trailColor,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
    )
    arc.rotation.x = -Math.PI / 2
    arc.rotation.z = sampleTrack(attacker.progress, this.map).yaw
    arc.position.set(arcPos.x, arcPos.y + 0.25, arcPos.z)
    this.scene.add(arc)
    this.fx.push({ mesh: arc, life: 0.22, maxLife: 0.22, grow: 1.12 })

    let hitAny = false
    let totalHitDmg = 0
    for (const target of this.racers) {
      if (target === attacker || !target.alive || target.finished) continue
      const dz = Math.abs(target.progress - attacker.progress)
      const dx = Math.abs(target.lane - attacker.lane)
      if (dz < range && dx < sideRange) {
        const dealt = this.applyHit(target, damage, attacker, profile.hitColor)
        hitAny = true
        totalHitDmg += dealt
      }
    }

    if (attacker.isPlayer) {
      this.setMessage(
        hitAny
          ? `${profile.label}命中！-${totalHitDmg}`
          : `${profile.label}落空…`
      )
    }

    if (hitAny && attacker.isPlayer && !attacker.weapon && Math.random() < 0.14) {
      this.attachWeapon(attacker, '铁棍')
      this.setMessage('拾取武器：铁棍！')
    }
  }

  private applyHit(
    target: Racer,
    damage: number,
    attacker: Racer,
    hitColor = 0xff5522
  ): number {
    const finalDmg = Math.max(1, Math.round(damage * target.defenseMult))
    target.hp = Math.max(0, target.hp - finalDmg)
    target.stun = 0.4
    this.refreshTopSpeed(target)

    // 被打瞬间速度减半，但不低于 50
    if (target.speed > HIT_SPEED_FLOOR) {
      target.speed = Math.max(HIT_SPEED_FLOOR, target.speed * 0.5)
    }
    // 同时不能超过因血量下降后的极速
    target.speed = Math.min(target.speed, Math.max(HIT_SPEED_FLOOR, target.topSpeed))

    target.lane += (target.lane >= attacker.lane ? 1 : -1) * 0.85
    target.lane = THREE.MathUtils.clamp(target.lane, -LANE_LIMIT, LANE_LIMIT)

    const pos = trackToWorld(target.progress, target.lane, this.map, 1.5)

    // 命中爆点
    const burst = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 12, 12),
      new THREE.MeshBasicMaterial({ color: hitColor, transparent: true, opacity: 1 })
    )
    burst.position.set(pos.x, pos.y, pos.z)
    this.scene.add(burst)
    this.fx.push({ mesh: burst, life: 0.4, maxLife: 0.4, grow: 1.15 })

    // 冲击波环
    const wave = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.9, 24),
      new THREE.MeshBasicMaterial({
        color: hitColor,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    )
    wave.rotation.x = -Math.PI / 2
    wave.position.set(pos.x, pos.y - 0.3, pos.z)
    this.scene.add(wave)
    this.fx.push({ mesh: wave, life: 0.35, maxLife: 0.35, grow: 1.18 })

    // 飘字伤害
    const label = createDamageLabel(finalDmg, '#ffe566')
    label.position.set(pos.x, pos.y + 0.8, pos.z)
    this.scene.add(label)
    this.fx.push({ mesh: label, life: 0.9, maxLife: 0.9, vy: 2.2 })

    // 受击闪白
    target.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material && 'emissive' in obj.material) {
        const mat = obj.material as THREE.MeshLambertMaterial
        if (mat.emissive) {
          mat.emissive.setHex(0xff3300)
          setTimeout(() => {
            try {
              mat.emissive.setHex(0x000000)
            } catch {
              /* disposed */
            }
          }, 120)
        }
      }
    })

    if (target.hp <= 0) {
      target.alive = false
      target.speed = 0
      if (attacker.isPlayer) this.setMessage(`${target.name} 被击倒！`)
      if (target.isPlayer) {
        this.setMessage('你被击倒了，比赛结束')
        this.endGame()
      }
    }

    return finalDmg
  }

  private resolveCombat() {
    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i]
        const b = this.racers[j]
        if (!a.alive || !b.alive) continue
        const dz = Math.abs(a.progress - b.progress)
        const dx = Math.abs(a.lane - b.lane)
        if (dz < 1.9 && dx < 1.35) {
          const push = 0.09
          if (a.lane < b.lane) {
            a.lane -= push
            b.lane += push
          } else {
            a.lane += push
            b.lane -= push
          }
          a.speed *= 0.985
          b.speed *= 0.985
        }
      }
    }
  }

  private updateVisuals(dt: number) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const s = this.fx[i]
      s.life -= dt
      if (s.grow) s.mesh.scale.multiplyScalar(s.grow)
      if (s.vy) s.mesh.position.y += s.vy * dt

      const fade = Math.max(0, s.life / Math.max(0.001, s.maxLife))
      s.mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
          const mat = obj.material as THREE.Material & { opacity?: number; transparent?: boolean }
          if (mat && 'opacity' in mat) {
            mat.transparent = true
            mat.opacity = fade
          }
        }
      })

      if (s.life <= 0) {
        this.scene.remove(s.mesh)
        s.mesh.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose()
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
            else (obj.material as THREE.Material)?.dispose?.()
          }
          if (obj instanceof THREE.Sprite) {
            const mat = obj.material as THREE.SpriteMaterial
            mat.map?.dispose()
            mat.dispose()
          }
        })
        this.fx.splice(i, 1)
      }
    }
    if (this.messageTimer > 0) this.messageTimer -= dt
    else this.message = ''
  }

  /** 速度冲刺感：速度线、FOV、抖动、雾效 */
  private updateSpeedFx(dt: number) {
    const spd = this.player.speed
    const t = THREE.MathUtils.clamp(spd / GLOBAL_MAX_SPEED, 0, 1)
    // 更陡的非线性：低速几乎静、300 段极强冲刺感
    const rush = Math.pow(t, 1.8)

    // FOV：低速收窄、高速猛拉
    const targetFov = this.baseFov + rush * 48 + (spd >= UNSTABLE_SPEED ? 8 : 0)
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 7)
    this.camera.updateProjectionMatrix()

    // 雾：高速时更贴脸，增强掠过感
    if (this.scene.fog instanceof THREE.Fog) {
      const near = this.map.fogNear * (1 - rush * 0.65)
      const far = this.map.fogFar * (1 - rush * 0.42)
      this.scene.fog.near = near
      this.scene.fog.far = Math.max(near + 40, far)
    }

    this.shake = rush * 0.28 + (spd >= UNSTABLE_SPEED ? 0.12 : 0)

    // 速度线生成频率随速度剧增
    const spawnRate = rush * 42
    if (Math.random() < spawnRate * dt) {
      this.spawnStreak(rush)
    }

    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i]
      s.life -= dt
      s.mesh.position.z += s.speed * dt
      s.mesh.position.y -= 2 * dt
      const mat = s.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, s.life * 1.2) * (0.25 + rush * 0.75)
      if (s.life <= 0) {
        this.streakGroup.remove(s.mesh)
        s.mesh.geometry.dispose()
        mat.dispose()
        this.streaks.splice(i, 1)
      }
    }
  }

  private spawnStreak(rush: number) {
    const len = 1.5 + rush * 9
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.04 + rush * 0.06, 0.04, len),
      new THREE.MeshBasicMaterial({
        color: this.map.id === 'city' ? 0xa5f3fc : 0xfff7ed,
        transparent: true,
        opacity: 0.15 + rush * 0.65,
      })
    )
    // 相对相机本地空间放置在 streakGroup，由相机附着
    mesh.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.2) * 7, -4 - Math.random() * 10)
    this.streakGroup.add(mesh)
    this.streaks.push({ mesh, life: 0.2 + rush * 0.4, speed: 50 + rush * 220 })
  }

  private updateCamera(dt: number) {
    const p = this.player
    const tNorm = THREE.MathUtils.clamp(p.speed / GLOBAL_MAX_SPEED, 0, 1)
    const rush = Math.pow(tNorm, 1.8)
    // 高速镜头更远更低，强化冲刺
    const back = 10 + rush * 8
    const look = trackToWorld(p.progress + 12 + rush * 6, p.lane * 0.25, this.map, 1.2)
    const behind = trackToWorld(p.progress - back, p.lane * 0.2, this.map, 0)
    const camHeight = 5.0 + rush * 2.4 + Math.sin(sampleTrack(p.progress, this.map).pitch) * 1.5
    const target = new THREE.Vector3(behind.x, behind.y + camHeight, behind.z)

    // 轻微抖动
    if (this.shake > 0) {
      target.x += (Math.random() - 0.5) * this.shake
      target.y += (Math.random() - 0.5) * this.shake * 0.6
    }

    this.camera.position.lerp(target, 1 - Math.pow(0.001, dt))
    this.camera.lookAt(look.x, look.y + 1.1, look.z)

    // 速度线挂在相机上
    this.streakGroup.position.copy(this.camera.position)
    this.streakGroup.quaternion.copy(this.camera.quaternion)
  }

  private checkFinish() {
    for (const r of this.racers) {
      if (!r.finished && r.progress >= this.map.trackLength) {
        r.finished = true
        r.finishTime = this.elapsed
        r.speed = 0
        r.progress = this.map.trackLength
        if (r.isPlayer) {
          this.setMessage('冲线！')
          this.endGame()
        }
      }
    }
    const active = this.racers.filter((r) => r.alive && !r.finished)
    if (active.length === 0 && !this.gameOver) this.endGame()
  }

  private endGame() {
    if (this.gameOver) return
    this.gameOver = true
    for (const r of this.racers) {
      if (!r.finished) {
        r.finishTime = this.elapsed + (this.map.trackLength - r.progress) / Math.max(r.speed, 40)
      }
    }
  }

  private computeScore(): { score: number; rank: number; list: HudState['rankList'] } {
    const sorted = [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime
      if (a.finished !== b.finished) return a.finished ? -1 : 1
      return b.progress - a.progress
    })

    const rank = sorted.findIndex((r) => r.isPlayer) + 1
    const player = this.player
    const rankBase = Math.max(100, 1200 - (rank - 1) * 280)
    const behind = sorted.filter((r) => !r.isPlayer && r.progress < player.progress)
    const avgGap =
      behind.length > 0
        ? behind.reduce((s, r) => s + (player.progress - r.progress), 0) / behind.length
        : 0
    const gapBonus = Math.round(avgGap * 1.8)
    const finishBonus = player.finished
      ? 400
      : Math.round((player.progress / this.map.trackLength) * 200)
    const hpBonus = Math.round((player.hp / player.maxHp) * 200)
    const score = Math.max(0, rankBase + gapBonus + finishBonus + hpBonus)

    const list = sorted.map((r, i) => {
      const rRank = i + 1
      const rBase = Math.max(100, 1200 - (rRank - 1) * 280)
      const rGap = Math.round(
        Math.max(0, r.progress - (sorted[sorted.length - 1]?.progress ?? 0)) * 0.5
      )
      return {
        name: r.name,
        progress: Math.min(1, r.progress / this.map.trackLength),
        isPlayer: r.isPlayer,
        score: r.isPlayer ? score : Math.max(0, rBase + rGap),
      }
    })

    return { score, rank, list }
  }

  private setMessage(msg: string) {
    this.message = msg
    this.messageTimer = 2.2
  }

  private emitHud() {
    const { score, rank, list } = this.computeScore()
    const state: HudState = {
      speed: Math.round(this.player.speed),
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      rank,
      totalRacers: this.racers.length,
      progress: Math.min(1, this.player.progress / this.map.trackLength),
      weapon: this.player.weapon,
      attackCooldown: Math.max(0, this.player.attackCd),
      message: this.message,
      finished: this.gameOver,
      score,
      characterName: this.character.name,
      rankList: list,
    }
    this.onHud(state)
  }

  private resize() {
    if (this.disposed) return
    const w = this.container.clientWidth || window.innerWidth
    const h = this.container.clientHeight || window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('resize', this.onResize)
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
        else obj.material?.dispose()
      }
    })
  }
}
