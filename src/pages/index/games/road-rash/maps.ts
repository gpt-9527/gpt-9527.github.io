import type { MapConfig } from './types'

/** 全局固定 NPC 数量 */
export const NPC_COUNT = 20

export const MAPS: MapConfig[] = [
  {
    id: 'desert',
    name: '荒漠公路',
    description: '黄沙漫天，长直道与缓弯交错，沙丘起伏，适合高速追击。',
    skyColor: 0xf4c27a,
    fogColor: 0xe8c48a,
    fogNear: 100,
    fogFar: 520,
    groundColor: 0xc9a66b,
    roadColor: 0x4a4035,
    laneColor: 0xf0e6c8,
    sideColor: 0xb08955,
    propColors: [0x8b6914, 0xa67c52, 0x6b5344],
    ambientIntensity: 0.75,
    sunIntensity: 1.15,
    trackLength: 4200,
    racerCount: NPC_COUNT,
    curveAmp: 42,
    curveFreq: 0.0058,
    hillAmp: 10,
    hillFreq: 0.0075,
  },
  {
    id: 'city',
    name: '霓虹夜城',
    description: '都市立交长道：急弯与上下坡更密，霓虹路灯密布。',
    skyColor: 0x0b1026,
    fogColor: 0x12182e,
    fogNear: 55,
    fogFar: 360,
    groundColor: 0x1a1f2e,
    roadColor: 0x2a2e38,
    laneColor: 0xffcc33,
    sideColor: 0x3d4458,
    propColors: [0xff2d95, 0x2de2ff, 0x7b5cff],
    ambientIntensity: 0.35,
    sunIntensity: 0.45,
    trackLength: 4000,
    racerCount: NPC_COUNT,
    curveAmp: 52,
    curveFreq: 0.0082,
    hillAmp: 13,
    hillFreq: 0.01,
  },
]

export function getMapById(id: string): MapConfig {
  return MAPS.find((m) => m.id === id) ?? MAPS[0]
}
