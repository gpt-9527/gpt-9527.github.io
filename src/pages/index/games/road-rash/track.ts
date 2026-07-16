import type { MapConfig, TrackSample } from './types'

/** 沿赛道进度 s 采样中心线：直弯结合 + 上下坡 */
export function sampleTrack(s: number, map: MapConfig): TrackSample {
  const { curveAmp, curveFreq, hillAmp, hillFreq } = map

  const x =
    Math.sin(s * curveFreq) * curveAmp +
    Math.sin(s * curveFreq * 0.41 + 1.2) * curveAmp * 0.38 +
    Math.sin(s * curveFreq * 1.7 + 0.4) * curveAmp * 0.12

  const y =
    Math.sin(s * hillFreq) * hillAmp +
    Math.sin(s * hillFreq * 1.65 + 0.8) * hillAmp * 0.4 +
    Math.sin(s * hillFreq * 0.55) * hillAmp * 0.2

  const z = s

  // 数值求导，得到切线方向
  const ds = 0.35
  const x2 =
    Math.sin((s + ds) * curveFreq) * curveAmp +
    Math.sin((s + ds) * curveFreq * 0.41 + 1.2) * curveAmp * 0.38 +
    Math.sin((s + ds) * curveFreq * 1.7 + 0.4) * curveAmp * 0.12
  const y2 =
    Math.sin((s + ds) * hillFreq) * hillAmp +
    Math.sin((s + ds) * hillFreq * 1.65 + 0.8) * hillAmp * 0.4 +
    Math.sin((s + ds) * hillFreq * 0.55) * hillAmp * 0.2
  const z2 = s + ds

  const tx = x2 - x
  const ty = y2 - y
  const tz = z2 - z
  const yaw = Math.atan2(tx, tz)
  const flatLen = Math.hypot(tx, tz) || 1
  const pitch = Math.atan2(ty, flatLen)

  // 水平右向量（yaw 的垂直方向）
  const rightX = Math.cos(yaw)
  const rightZ = -Math.sin(yaw)

  return { x, y, z, yaw, pitch, rightX, rightZ }
}

/** 将赛道进度 + 车道偏移转换为世界坐标 */
export function trackToWorld(s: number, lane: number, map: MapConfig, heightOffset = 0) {
  const t = sampleTrack(s, map)
  return {
    x: t.x + t.rightX * lane,
    y: t.y + heightOffset,
    z: t.z + t.rightZ * lane,
    yaw: t.yaw,
    pitch: t.pitch,
  }
}
