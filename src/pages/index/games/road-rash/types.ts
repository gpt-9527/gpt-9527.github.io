export type MapId = 'desert' | 'city'

export type CharacterId = 'jack' | 'lily' | 'bear' | 'ashura'

export interface MapConfig {
  id: MapId
  name: string
  description: string
  skyColor: number
  fogColor: number
  fogNear: number
  fogFar: number
  groundColor: number
  roadColor: number
  laneColor: number
  sideColor: number
  propColors: number[]
  ambientIntensity: number
  sunIntensity: number
  trackLength: number
  racerCount: number
  /** 弯道横向振幅 */
  curveAmp: number
  /** 弯道频率 */
  curveFreq: number
  /** 坡度振幅 */
  hillAmp: number
  /** 坡度频率 */
  hillFreq: number
}

export interface CharacterConfig {
  id: CharacterId
  name: string
  title: string
  description: string
  emoji: string
  color: number
  riderColor: number
  maxHp: number
  /** 加速度倍率 */
  accelMult: number
  /** 极速上限（不超过全局 300） */
  topSpeed: number
  /** 攻击伤害倍率 */
  attackMult: number
  /** 攻击范围倍率 */
  attackRangeMult: number
  /** 承伤倍率（越小越肉） */
  defenseMult: number
  /** 转向灵敏度 */
  turnMult: number
  /** 开局武器 */
  startWeapon: string | null
  traits: string[]
}

export interface GameOptions {
  fullscreen: boolean
}

export interface HudState {
  speed: number
  hp: number
  maxHp: number
  rank: number
  totalRacers: number
  progress: number
  weapon: string | null
  attackCooldown: number
  message: string
  finished: boolean
  score: number
  characterName: string
  rankList: Array<{ name: string; progress: number; isPlayer: boolean; score?: number }>
}

export type HudListener = (state: HudState) => void

export interface TrackSample {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  /** 右方向（水平横向） */
  rightX: number
  rightZ: number
}
