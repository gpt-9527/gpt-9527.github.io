/**
 * 十三张音效 — Web Audio API 合成，无需外部资源
 * 发牌（沙沙声）、确认出牌、开牌对比、胜利（上行琶音）、失败（下行小调）
 */

let ctx: AudioContext | null = null
let muted = false

const MUTE_KEY = 'thirteen-sfx-muted'

export function isMuted(): boolean {
  return muted
}

export function loadMutePref(): boolean {
  try {
    muted = localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    muted = false
  }
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    /* 忽略 */
  }
}

function ensureCtx(): AudioContext | null {
  if (muted) return null
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** 单音：freq 起始，可选滑向 slideTo */
function tone(
  freq: number,
  delay: number,
  dur: number,
  type: OscillatorType = 'sine',
  peak = 0.15,
  slideTo?: number,
): void {
  const ac = ensureCtx()
  if (!ac) return
  const t0 = ac.currentTime + delay
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo && slideTo > 0) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  }
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), t0 + Math.min(0.02, dur / 3))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

/** 白噪声爆发（模拟纸牌摩擦/拍桌） */
function swish(delay: number, dur: number, peak = 0.22, freq = 2600): void {
  const ac = ensureCtx()
  if (!ac) return
  const t0 = ac.currentTime + delay
  const frames = Math.max(1, Math.floor(ac.sampleRate * dur))
  const buffer = ac.createBuffer(1, frames, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
  }
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = 0.8
  const g = ac.createGain()
  g.gain.setValueAtTime(peak, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter)
  filter.connect(g)
  g.connect(ac.destination)
  src.start(t0)
}

export const sfx = {
  /** 发一张牌 */
  deal(): void {
    swish(0, 0.07, 0.24, 3200)
    tone(1300, 0, 0.04, 'triangle', 0.05, 800)
  },

  /** 连续发牌（每人 13 张的节奏感） */
  dealFan(count = 8): void {
    for (let i = 0; i < count; i++) {
      swish(i * 0.075, 0.06, 0.18 - i * 0.008, 2800 + i * 120)
    }
  },

  /** 确认出牌 */
  confirm(): void {
    tone(660, 0, 0.09, 'square', 0.1)
    tone(990, 0.09, 0.14, 'square', 0.1)
  },

  /** 开牌对比 */
  reveal(): void {
    swish(0, 0.16, 0.2, 1800)
    tone(520, 0.05, 0.18, 'triangle', 0.09, 780)
    tone(780, 0.16, 0.16, 'triangle', 0.07, 1040)
  },

  /** 赢钱：上行琶音 */
  win(): void {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, i * 0.11, 0.2, 'triangle', 0.16),
    )
    tone(1318.5, 0.46, 0.34, 'sine', 0.13)
  },

  /** 输钱：下行小三度叹息 */
  lose(): void {
    ;[392, 329.63, 261.63].forEach((f, i) => tone(f, i * 0.16, 0.26, 'sine', 0.15))
    tone(196, 0.48, 0.44, 'sine', 0.12)
  },

  /** 平局/无输赢：中性双音 */
  neutral(): void {
    tone(440, 0, 0.12, 'sine', 0.09)
    tone(440, 0.14, 0.12, 'sine', 0.07)
  },
}
