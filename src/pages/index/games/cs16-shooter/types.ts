export type TeamId = 'ct' | 't'

export type WeaponMode = 'rifle' | 'sniper'

export type RoundPhase = 'warmup' | 'combat' | 'over'

export type WeaponCategory = 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'sniper'

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
  deaths: number
  round: number
  totalRounds: number
  ctScore: number
  tScore: number
  score: number
  money: number
  aliveCt: number
  aliveT: number
  roundTime: number
  canBuy: boolean
  ownedPrimary: string
  ownedSecondary: string
  slot: 'primary' | 'secondary'
  message: string
  finished: boolean
  matchResult: '' | 'win' | 'lose'
  bombPlanted: boolean
  bombTimer: number
}

/** 武器配置：商业化数值（价格 / 分类 / 爆头系数） */
export interface WeaponConfig {
  id: string
  name: string
  category: WeaponCategory
  price: number
  damage: number
  /** 爆头伤害倍率 */
  headshotMult: number
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
  /** 击杀播报等游戏事件，供 Vue 层渲染 Killfeed 等 */
  onEvent?: (event: GameEvent) => void
}

export type GameEvent =
  | { type: 'kill'; killer: string; killerTeam: TeamId; victim: string; victimTeam: TeamId; weapon: string; headshot: boolean }
  | { type: 'hit'; headshot: boolean }
  | { type: 'buy'; item: string }
  | { type: 'buyError'; reason: string }
  | { type: 'roundStart'; round: number }
  | { type: 'roundEnd'; winner: TeamId }
  | { type: 'bombPlanted'; site: 'A' | 'B' }

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
  kills: number
  /** 阵亡倒地动画进度 */
  deathTimer: number
}
