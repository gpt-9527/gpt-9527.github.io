/**
 * CS16 武器库 — 商业化数值（参考 CS1.6 手感做休闲化平衡）
 * 分类：手枪 / 冲锋枪 / 霰弹枪 / 步枪 / 狙击枪
 */
import type { WeaponConfig, WeaponCategory } from './types'

export const WEAPONS: Record<string, WeaponConfig> = {
  usp: {
    id: 'usp',
    name: 'USP-S',
    category: 'pistol',
    price: 0,
    damage: 30,
    headshotMult: 2.6,
    rpm: 352,
    magSize: 12,
    reserve: 60,
    reloadTime: 1.9,
    spread: 0.012,
    recoil: 0.9,
    penetration: 1,
    bulletSpeed: 190,
    isSniper: false,
    automatic: false,
  },
  deagle: {
    id: 'deagle',
    name: '沙漠之鹰',
    category: 'pistol',
    price: 650,
    damage: 62,
    headshotMult: 2.8,
    rpm: 267,
    magSize: 7,
    reserve: 35,
    reloadTime: 2.3,
    spread: 0.02,
    recoil: 2.6,
    penetration: 2,
    bulletSpeed: 220,
    isSniper: false,
    automatic: false,
  },
  mp5: {
    id: 'mp5',
    name: 'MP5-SD',
    category: 'smg',
    price: 1500,
    damage: 27,
    headshotMult: 2.2,
    rpm: 750,
    magSize: 30,
    reserve: 90,
    reloadTime: 2.4,
    spread: 0.028,
    recoil: 0.7,
    penetration: 1,
    bulletSpeed: 170,
    isSniper: false,
    automatic: true,
  },
  p90: {
    id: 'p90',
    name: 'P90',
    category: 'smg',
    price: 2350,
    damage: 24,
    headshotMult: 2,
    rpm: 857,
    magSize: 50,
    reserve: 100,
    reloadTime: 3.2,
    spread: 0.034,
    recoil: 0.65,
    penetration: 1,
    bulletSpeed: 175,
    isSniper: false,
    automatic: true,
  },
  m3: {
    id: 'm3',
    name: 'M3 霰弹枪',
    category: 'shotgun',
    price: 1700,
    damage: 22,
    /** 霰弹每颗弹丸伤害，单发 8 颗 */
    headshotMult: 1.5,
    rpm: 68,
    magSize: 8,
    reserve: 32,
    reloadTime: 3.6,
    spread: 0.11,
    recoil: 3.2,
    penetration: 1,
    bulletSpeed: 130,
    isSniper: false,
    automatic: false,
  },
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    category: 'rifle',
    price: 2700,
    damage: 36,
    headshotMult: 2.9,
    rpm: 600,
    magSize: 30,
    reserve: 90,
    reloadTime: 2.5,
    spread: 0.04,
    recoil: 1.8,
    penetration: 2,
    bulletSpeed: 180,
    isSniper: false,
    automatic: true,
  },
  m4a1: {
    id: 'm4a1',
    name: 'M4A1',
    category: 'rifle',
    price: 3100,
    damage: 32,
    headshotMult: 2.7,
    rpm: 680,
    magSize: 30,
    reserve: 90,
    reloadTime: 2.2,
    spread: 0.02,
    recoil: 1.1,
    penetration: 2,
    bulletSpeed: 200,
    isSniper: false,
    automatic: true,
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    category: 'sniper',
    price: 2750,
    damage: 88,
    headshotMult: 3,
    rpm: 70,
    magSize: 10,
    reserve: 40,
    reloadTime: 2.8,
    spread: 0.01,
    recoil: 0.8,
    penetration: 3,
    bulletSpeed: 320,
    isSniper: true,
    automatic: false,
  },
  awp: {
    id: 'awp',
    name: 'AWP',
    category: 'sniper',
    price: 4750,
    damage: 115,
    headshotMult: 2.5,
    rpm: 40,
    magSize: 10,
    reserve: 30,
    reloadTime: 3.5,
    spread: 0.001,
    recoil: 0.6,
    penetration: 4,
    bulletSpeed: 400,
    isSniper: true,
    automatic: false,
  },
}

/** 霰弹枪一次发射的弹丸数 */
export const SHOTGUN_PELLETS = 8

export const CATEGORY_LABEL: Record<WeaponCategory, string> = {
  pistol: '手枪',
  smg: '冲锋枪',
  shotgun: '霰弹枪',
  rifle: '步枪',
  sniper: '狙击枪',
}

/** 购买菜单分类展示顺序 */
export const BUY_CATEGORIES: WeaponCategory[] = ['pistol', 'smg', 'shotgun', 'rifle', 'sniper']

/** 可购买清单（购买菜单数据源） */
export function getBuyList(): WeaponConfig[] {
  return Object.values(WEAPONS)
}

export const DEFAULT_SECONDARY = WEAPONS.usp

/** bot 使用的主武器池：按回合经济随机 */
export const BOT_RIFLES = [WEAPONS.ak47, WEAPONS.m4a1, WEAPONS.mp5]

export const BOT_WEAPON = {
  damage: 24,
  rpm: 430,
  spread: 0.05,
  range: 46,
}

/** 兼容旧接口：按偏好返回初始出装（主武器 + USP） */
export function getWeaponPool(mode: 'rifle' | 'sniper'): WeaponConfig[] {
  return mode === 'rifle'
    ? [WEAPONS.ak47, WEAPONS.usp]
    : [WEAPONS.scout, WEAPONS.usp]
}
