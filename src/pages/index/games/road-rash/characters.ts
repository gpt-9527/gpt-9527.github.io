import type { CharacterConfig, CharacterId } from './types'

export const CHARACTERS: CharacterConfig[] = [
  {
    id: 'jack',
    name: '铁拳杰克',
    title: '近战猛汉',
    description: '体格强健，近身重拳伤害高，开局无武器但拳脚威力惊人。',
    emoji: '🥊',
    color: 0x3366ff,
    riderColor: 0x1d4ed8,
    maxHp: 130,
    accelMult: 1.0,
    topSpeed: 280,
    attackMult: 1.35,
    attackRangeMult: 0.95,
    defenseMult: 0.85,
    turnMult: 0.95,
    startWeapon: null,
    traits: ['高血量', '重拳', '稍慢极速'],
  },
  {
    id: 'lily',
    name: '夜刃莉莉',
    title: '远程刺客',
    description: '手持链锤，攻击范围更广，机动灵活，但身板较脆。',
    emoji: '⛓️',
    color: 0xc026d3,
    riderColor: 0x86198f,
    maxHp: 90,
    accelMult: 1.15,
    topSpeed: 295,
    attackMult: 1.1,
    attackRangeMult: 1.45,
    defenseMult: 1.15,
    turnMult: 1.2,
    startWeapon: '链锤',
    traits: ['链锤开局', '攻击范围大', '高速灵敏'],
  },
  {
    id: 'bear',
    name: '重装熊',
    title: '铁壁坦克',
    description: '扛着铁棍上路，防御强、血厚，加速慢但撞打都很硬。',
    emoji: '🐻',
    color: 0xb45309,
    riderColor: 0x78350f,
    maxHp: 160,
    accelMult: 0.8,
    topSpeed: 260,
    attackMult: 1.2,
    attackRangeMult: 1.15,
    defenseMult: 0.7,
    turnMult: 0.8,
    startWeapon: '铁棍',
    traits: ['铁棍开局', '超高血防', '加速偏慢'],
  },
  {
    id: 'ashura',
    name: '疾风阿修',
    title: '极速浪客',
    description: '以速度见长，极速接近上限，靠高速撞击放大伤害。',
    emoji: '💨',
    color: 0x059669,
    riderColor: 0x065f46,
    maxHp: 95,
    accelMult: 1.35,
    topSpeed: 300,
    attackMult: 0.95,
    attackRangeMult: 1.05,
    defenseMult: 1.2,
    turnMult: 1.15,
    startWeapon: null,
    traits: ['极速 300', '加速最快', '高速增伤'],
  },
]

export function getCharacterById(id: string): CharacterConfig {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]
}

export function isCharacterId(id: string): id is CharacterId {
  return CHARACTERS.some((c) => c.id === id)
}
