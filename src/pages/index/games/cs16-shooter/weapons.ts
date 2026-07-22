// src/games/cs16/weapons.ts
import type { WeaponConfig } from './types'

export const WEAPONS: Record<string, WeaponConfig> = {
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    damage: 36,
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
    damage: 32,
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
  awp: {
    id: 'awp',
    name: 'AWP',
    damage: 115,
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
  scout: {
    id: 'scout',
    name: 'Scout',
    damage: 88,
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
}

export const BOT_WEAPON = {
  damage: 26,
  rpm: 480,
  spread: 0.055,
  range: 42,
}

export function getWeaponPool(mode: 'rifle' | 'sniper') {
  return mode === 'rifle'
    ? [WEAPONS.ak47, WEAPONS.m4a1]
    : [WEAPONS.awp, WEAPONS.scout]
}