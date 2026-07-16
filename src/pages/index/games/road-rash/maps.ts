import type { MapConfig } from './types'

export const MAPS: MapConfig[] = [
  {
    id: 'desert',
    name: '荒漠公路',
    description: '黄沙漫天，直道与缓弯交错，夹杂沙丘起伏，适合高速追击。',
    skyColor: 0xf4c27a,
    fogColor: 0xe8c48a,
    fogNear: 90,
    fogFar: 480,
    groundColor: 0xc9a66b,
    roadColor: 0x4a4035,
    laneColor: 0xf0e6c8,
    sideColor: 0xb08955,
    propColors: [0x8b6914, 0xa67c52, 0x6b5344],
    ambientIntensity: 0.75,
    sunIntensity: 1.15,
    trackLength: 2800,
    racerCount: 5,
    curveAmp: 38,
    curveFreq: 0.0065,
    hillAmp: 9,
    hillFreq: 0.0085,
  },
  {
    id: 'city',
    name: '霓虹夜城',
    description: '都市立交风格：急弯与上下坡更密，霓虹路灯密布。',
    skyColor: 0x0b1026,
    fogColor: 0x12182e,
    fogNear: 50,
    fogFar: 320,
    groundColor: 0x1a1f2e,
    roadColor: 0x2a2e38,
    laneColor: 0xffcc33,
    sideColor: 0x3d4458,
    propColors: [0xff2d95, 0x2de2ff, 0x7b5cff],
    ambientIntensity: 0.35,
    sunIntensity: 0.45,
    trackLength: 2600,
    racerCount: 6,
    curveAmp: 48,
    curveFreq: 0.009,
    hillAmp: 12,
    hillFreq: 0.011,
  },
]

export function getMapById(id: string): MapConfig {
  return MAPS.find((m) => m.id === id) ?? MAPS[0]
}
