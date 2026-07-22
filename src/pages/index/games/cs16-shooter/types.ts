export type TeamId = 'ct' | 't'

export type WeaponMode = 'rifle' | 'sniper'

export type RoundPhase = 'warmup' | 'combat' | 'over'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface ColliderBox {
  min: Vec3
  max: Vec3
}

export interface SpawnPoint {
  position: Vec3
  yaw: number
}

export interface BombSite {
  id: 'A' | 'B'
  position: Vec3
  radius: number
}

export interface MapData {
  group: import('three').Group
  colliders: ColliderBox[]
  ctSpawns: SpawnPoint[]
  tSpawns: SpawnPoint[]
  bombSites: BombSite[]
}

export interface HudState {
  team: string
  hp: number
  maxHp: number
  ammo: number
  reserve: number
  weaponName: string
  kills: number
  round: number
  totalRounds: number
  ctScore: number
  tScore: number
  score: number
  message: string
  finished: boolean
  bombPlanted: boolean
  bombTimer: number
}

export interface WeaponConfig {
  id: string
  name: string
  damage: number
  rpm: number
  magSize: number
  reserve: number
  reloadTime: number
  spread: number
  recoil: number
  penetration: number
  bulletSpeed: number
  isSniper: boolean
  automatic: boolean
}

export interface EngineOptions {
  canvasHost: HTMLElement
  team: TeamId
  weaponMode: WeaponMode
  onHudUpdate: (state: Partial<HudState>) => void
}

export interface BotEntity {
  id: number
  mesh: import('three').Group
  team: TeamId
  hp: number
  maxHp: number
  alive: boolean
  position: import('three').Vector3
  yaw: number
  shootCd: number
  thinkCd: number
  state: 'patrol' | 'combat'
  patrolTarget: import('three').Vector3
  name: string
  stepDist: number
}
