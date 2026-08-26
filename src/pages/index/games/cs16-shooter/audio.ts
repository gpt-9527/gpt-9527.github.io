/**
 * CS16 程序化音效：枪声、弹着、脚步、战场环境
 */
export class CS16Audio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxGain: GainNode | null = null
  private ambGain: GainNode | null = null

  private ambOsc: OscillatorNode[] = []
  private ambNoise: AudioBufferSourceNode | null = null
  private ambTimer: number | null = null
  private started = false
  private disposed = false

  private lastShotAt = 0
  private lastImpactAt = 0
  private lastStepAt = 0

  muted = false
  sfxVolume = 0.75
  ambVolume = 0.18

  async ensure(): Promise<boolean> {
    if (this.disposed) return false
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        this.ctx = new AC()

        this.master = this.ctx.createGain()
        this.master.gain.value = 0.9
        this.master.connect(this.ctx.destination)

        this.sfxGain = this.ctx.createGain()
        this.sfxGain.gain.value = this.sfxVolume
        this.sfxGain.connect(this.master)

        this.ambGain = this.ctx.createGain()
        this.ambGain.gain.value = this.ambVolume
        this.ambGain.connect(this.master)
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      return true
    } catch {
      return false
    }
  }

  async start(): Promise<void> {
    if (this.started || this.disposed) return
    const ok = await this.ensure()
    if (!ok) return
    this.started = true
    this.startAmbience()
  }

  private canPlay() {
    return this.started && !this.muted && this.ctx && this.sfxGain && this.ctx.state === 'running'
  }

  private makeNoise(seconds: number): AudioBufferSourceNode {
    const ctx = this.ctx!
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds))
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    return src
  }

  private startAmbience() {
    if (!this.ctx || !this.ambGain) return

    // 低频风噪
    const len = this.ctx.sampleRate * 4
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.25

    this.ambNoise = this.ctx.createBufferSource()
    this.ambNoise.buffer = buf
    this.ambNoise.loop = true

    const windFilter = this.ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 280
    windFilter.Q.value = 0.4

    const windGain = this.ctx.createGain()
    windGain.gain.value = 0.12
    this.ambNoise.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(this.ambGain)
    this.ambNoise.start()

    // 远处低沉氛围
    const drone = this.ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 42
    const droneGain = this.ctx.createGain()
    droneGain.gain.value = 0.04
    drone.connect(droneGain)
    droneGain.connect(this.ambGain)
    drone.start()
    this.ambOsc.push(drone)

    const drone2 = this.ctx.createOscillator()
    drone2.type = 'triangle'
    drone2.frequency.value = 63
    const d2g = this.ctx.createGain()
    d2g.gain.value = 0.025
    drone2.connect(d2g)
    d2g.connect(this.ambGain)
    drone2.start()
    this.ambOsc.push(drone2)

    // 偶发远处枪声/回声
    this.ambTimer = window.setInterval(() => {
      if (!this.canPlay() || !this.ctx || !this.ambGain) return
      if (Math.random() > 0.35) return
      const tt = this.ctx.currentTime
      const noise = this.makeNoise(0.08 + Math.random() * 0.12)
      const f = this.ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 600 + Math.random() * 1200
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.001, tt)
      g.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.05, tt + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.25)
      noise.connect(f)
      f.connect(g)
      g.connect(this.ambGain)
      noise.start(tt)
      noise.stop(tt + 0.3)
    }, 2800 + Math.random() * 2000)
  }

  /** 射击声：步枪 / 狙击 */
  playGunshot(sniper = false) {
    if (!this.canPlay()) return
    const now = performance.now()
    if (now - this.lastShotAt < (sniper ? 280 : 55)) return
    this.lastShotAt = now

    const t = this.ctx!.currentTime

    const crack = this.makeNoise(sniper ? 0.06 : 0.045)
    const crackF = this.ctx!.createBiquadFilter()
    crackF.type = 'highpass'
    crackF.frequency.value = sniper ? 900 : 1400
    const crackG = this.ctx!.createGain()
    crackG.gain.setValueAtTime(sniper ? 0.55 : 0.42, t)
    crackG.gain.exponentialRampToValueAtTime(0.001, t + (sniper ? 0.12 : 0.08))
    crack.connect(crackF)
    crackF.connect(crackG)
    crackG.connect(this.sfxGain!)
    crack.start(t)
    crack.stop(t + 0.1)

    const body = this.ctx!.createOscillator()
    body.type = 'square'
    body.frequency.setValueAtTime(sniper ? 110 : 165, t)
    body.frequency.exponentialRampToValueAtTime(45, t + 0.14)
    const bodyG = this.ctx!.createGain()
    bodyG.gain.setValueAtTime(sniper ? 0.28 : 0.22, t)
    bodyG.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
    const bodyF = this.ctx!.createBiquadFilter()
    bodyF.type = 'lowpass'
    bodyF.frequency.value = sniper ? 520 : 780
    body.connect(bodyF)
    bodyF.connect(bodyG)
    bodyG.connect(this.sfxGain!)
    body.start(t)
    body.stop(t + 0.18)
  }

  /** 子弹击中：墙体 / 人体 */
  playImpact(kind: 'wall' | 'flesh') {
    if (!this.canPlay()) return
    const now = performance.now()
    if (now - this.lastImpactAt < 45) return
    this.lastImpactAt = now

    const t = this.ctx!.currentTime
    const noise = this.makeNoise(kind === 'wall' ? 0.05 : 0.04)
    const f = this.ctx!.createBiquadFilter()
    f.type = kind === 'wall' ? 'bandpass' : 'lowpass'
    f.frequency.value = kind === 'wall' ? 2200 + Math.random() * 800 : 420
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(kind === 'wall' ? 0.22 : 0.18, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    noise.connect(f)
    f.connect(g)
    g.connect(this.sfxGain!)
    noise.start(t)
    noise.stop(t + 0.08)

    if (kind === 'wall') {
      const ping = this.ctx!.createOscillator()
      ping.type = 'triangle'
      ping.frequency.setValueAtTime(1800 + Math.random() * 600, t)
      const pg = this.ctx!.createGain()
      pg.gain.setValueAtTime(0.06, t)
      pg.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
      ping.connect(pg)
      pg.connect(this.sfxGain!)
      ping.start(t)
      ping.stop(t + 0.05)
    }
  }

  /** NPC 脚步声 */
  playFootstep() {
    if (!this.canPlay()) return
    const now = performance.now()
    if (now - this.lastStepAt < 320) return
    this.lastStepAt = now

    const t = this.ctx!.currentTime
    const noise = this.makeNoise(0.035)
    const f = this.ctx!.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 180 + Math.random() * 120
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0.14, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    noise.connect(f)
    f.connect(g)
    g.connect(this.sfxGain!)
    noise.start(t)
    noise.stop(t + 0.06)

    const thump = this.ctx!.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(80 + Math.random() * 30, t)
    const tg = this.ctx!.createGain()
    tg.gain.setValueAtTime(0.08, t)
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    thump.connect(tg)
    tg.connect(this.sfxGain!)
    thump.start(t)
    thump.stop(t + 0.05)
  }

  /** 命中标记：短促高频 click */
  playHitmarker(headshot = false) {
    if (!this.canPlay()) return
    const t = this.ctx!.currentTime
    const osc = this.ctx!.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(headshot ? 2400 : 1700, t)
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0.09, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + (headshot ? 0.07 : 0.045))
    osc.connect(g)
    g.connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 0.08)
  }

  /** 击杀确认：双音下行叮 */
  playKillConfirm() {
    if (!this.canPlay()) return
    const t = this.ctx!.currentTime
    for (const [freq, delay] of [[1320, 0], [880, 0.07]] as const) {
      const osc = this.ctx!.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t + delay)
      const g = this.ctx!.createGain()
      g.gain.setValueAtTime(0.12, t + delay)
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.1)
      osc.connect(g)
      g.connect(this.sfxGain!)
      osc.start(t + delay)
      osc.stop(t + delay + 0.12)
    }
  }

  /** 购买成功：收银双音 */
  playBuy() {
    if (!this.canPlay()) return
    const t = this.ctx!.currentTime
    for (const [freq, delay] of [[740, 0], [1108, 0.08]] as const) {
      const osc = this.ctx!.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t + delay)
      const g = this.ctx!.createGain()
      g.gain.setValueAtTime(0.14, t + delay)
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.16)
      osc.connect(g)
      g.connect(this.sfxGain!)
      osc.start(t + delay)
      osc.stop(t + delay + 0.18)
    }
  }

  /** 购买失败：低频 buzz */
  playBuyError() {
    if (!this.canPlay()) return
    const t = this.ctx!.currentTime
    const osc = this.ctx!.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(160, t)
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0.1, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(g)
    g.connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 0.2)
  }

  /** 回合开始哨音 */
  playRoundStart() {
    if (!this.canPlay()) return
    const t = this.ctx!.currentTime
    const osc = this.ctx!.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(520, t)
    osc.frequency.linearRampToValueAtTime(880, t + 0.25)
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0.16, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
    osc.connect(g)
    g.connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 0.5)
  }

  /** C4 已安放：急促三连哔 */
  playBombPlanted() {
    if (!this.canPlay()) return
    const t = this.ctx!.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx!.createOscillator()
      osc.type = 'square'
      osc.frequency.setValueAtTime(990, t + i * 0.22)
      const g = this.ctx!.createGain()
      g.gain.setValueAtTime(0.13, t + i * 0.22)
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.22 + 0.12)
      osc.connect(g)
      g.connect(this.sfxGain!)
      osc.start(t + i * 0.22)
      osc.stop(t + i * 0.22 + 0.14)
    }
  }

  /** C4 滴答倒计时（随剩余时间加快） */
  playBombBeep() {
    if (!this.canPlay()) return
    const t = this.ctx!.currentTime
    const osc = this.ctx!.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1180, t)
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0.08, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
    osc.connect(g)
    g.connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 0.1)
  }

  dispose() {
    this.disposed = true
    if (this.ambTimer != null) window.clearInterval(this.ambTimer)
    this.ambNoise?.stop()
    this.ambOsc.forEach(o => {
      try {
        o.stop()
      } catch {}
    })
    this.ambOsc = []
    void this.ctx?.close()
    this.ctx = null
  }
}
