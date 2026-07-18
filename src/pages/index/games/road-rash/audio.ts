/**
 * Web Audio 程序化音效 + 背景音乐
 * - 无需外部音频文件
 * - 支持静音 / 音乐音量 / 音效音量
 * - 页面隐藏自动暂停，避免后台吵闹与资源浪费
 */
export class GameAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private engineGain: GainNode | null = null
  private engineFilter: BiquadFilterNode | null = null
  private engineOsc: OscillatorNode | null = null
  private engineNoise: AudioBufferSourceNode | null = null
  private engineNoiseGain: GainNode | null = null

  private bgmTimer: number | null = null
  private bgmStep = 0
  private started = false
  private disposed = false
  private pausedByVisibility = false

  muted = false
  musicVolume = 0.22
  sfxVolume = 0.85

  private lastAttackAt = 0
  private lastHitAt = 0

  private onVisibility = () => {
    if (document.hidden) {
      this.pausedByVisibility = true
      void this.suspend()
    } else {
      this.pausedByVisibility = false
      if (this.started && !this.muted) void this.resume()
    }
  }

  async ensure(): Promise<boolean> {
    if (this.disposed) return false
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        this.ctx = new AC()

        this.master = this.ctx.createGain()
        this.master.gain.value = this.muted ? 0.0001 : 0.9
        this.master.connect(this.ctx.destination)

        this.sfxGain = this.ctx.createGain()
        this.sfxGain.gain.value = this.sfxVolume
        this.sfxGain.connect(this.master)

        this.musicGain = this.ctx.createGain()
        this.musicGain.gain.value = this.musicVolume
        this.musicGain.connect(this.master)

        document.addEventListener('visibilitychange', this.onVisibility)
      }
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume()
      }
      return true
    } catch (e) {
      console.warn('[GameAudio] init failed', e)
      return false
    }
  }

  async start(): Promise<void> {
    if (this.disposed || this.started) return
    const ok = await this.ensure()
    if (!ok || !this.ctx || !this.sfxGain) return

    this.started = true
    this.buildEngineLayer()
    this.startBgm()
    this.applyMuteGains(true)
  }

  private buildEngineLayer() {
    if (!this.ctx || !this.sfxGain || this.engineOsc) return

    this.engineFilter = this.ctx.createBiquadFilter()
    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 420
    this.engineFilter.Q.value = 0.7
    this.engineFilter.connect(this.sfxGain)

    this.engineGain = this.ctx.createGain()
    this.engineGain.gain.value = 0.0001
    this.engineGain.connect(this.engineFilter)

    this.engineOsc = this.ctx.createOscillator()
    this.engineOsc.type = 'sawtooth'
    this.engineOsc.frequency.value = 52
    this.engineOsc.connect(this.engineGain)
    this.engineOsc.start()

    // 引擎噪声层，增加真实感
    const len = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.35

    this.engineNoise = this.ctx.createBufferSource()
    this.engineNoise.buffer = buf
    this.engineNoise.loop = true

    this.engineNoiseGain = this.ctx.createGain()
    this.engineNoiseGain.gain.value = 0.0001

    const noiseFilter = this.ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 800
    noiseFilter.Q.value = 0.6

    this.engineNoise.connect(noiseFilter)
    noiseFilter.connect(this.engineNoiseGain)
    this.engineNoiseGain.connect(this.engineFilter)
    this.engineNoise.start()
  }

  private startBgm() {
    if (!this.ctx || this.bgmTimer != null) return
    // ~138 BPM
    const intervalMs = 217
    this.bgmStep = 0
    this.bgmTimer = window.setInterval(() => {
      if (!this.ctx || this.disposed || !this.musicGain) return
      if (this.ctx.state !== 'running') return
      // 静音时仍推进节拍，避免取消静音后节奏错乱
      const t = this.ctx.currentTime + 0.02
      const step = this.bgmStep % 16
      this.bgmStep++
      if (this.muted || this.pausedByVisibility) return

      if (step % 4 === 0) this.playKick(t)
      if (step % 8 === 4) this.playSnare(t)
      if (step % 2 === 0) this.playHat(t, step % 4 === 0 ? 0.035 : 0.02)
      if (step % 2 === 0) {
        const notes = [55, 55, 73.4, 82.4, 55, 65.4, 73.4, 98]
        this.playBass(t, notes[(step / 2) % notes.length])
      }
      if (step === 0 || step === 8) {
        const lead = step === 0 ? [220, 277, 330] : [246.9, 293.7, 370]
        lead.forEach((f, i) => this.playLead(t + i * 0.068, f))
      }
    }, intervalMs)
  }

  private playKick(t: number) {
    if (!this.ctx || !this.musicGain) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.13)
    g.gain.setValueAtTime(0.85, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
    osc.connect(g)
    g.connect(this.musicGain)
    osc.start(t)
    osc.stop(t + 0.18)
  }

  private playSnare(t: number) {
    if (!this.ctx || !this.musicGain) return
    const noise = this.makeNoiseSource(0.09)
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 1400
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.28, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    noise.connect(filter)
    filter.connect(g)
    g.connect(this.musicGain)
    noise.start(t)
    noise.stop(t + 0.11)
  }

  private playHat(t: number, vol: number) {
    if (!this.ctx || !this.musicGain) return
    const noise = this.makeNoiseSource(0.03)
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 7500
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035)
    noise.connect(filter)
    filter.connect(g)
    g.connect(this.musicGain)
    noise.start(t)
    noise.stop(t + 0.04)
  }

  private playBass(t: number, freq: number) {
    if (!this.ctx || !this.musicGain) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(0.24, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.17)
    osc.connect(g)
    g.connect(this.musicGain)
    osc.start(t)
    osc.stop(t + 0.19)
  }

  private playLead(t: number, freq: number) {
    if (!this.ctx || !this.musicGain) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq * 1.8
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(0.07, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(filter)
    filter.connect(g)
    g.connect(this.musicGain)
    osc.start(t)
    osc.stop(t + 0.2)
  }

  private makeNoiseSource(seconds: number): AudioBufferSourceNode {
    const ctx = this.ctx!
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds))
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    return src
  }

  /** 引擎声随速度变化（含油门层次） */
  setEngineSpeed(speed: number) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || !this.engineFilter) return
    if (this.muted || this.pausedByVisibility) {
      const t0 = this.ctx.currentTime
      this.engineGain.gain.setTargetAtTime(0.0001, t0, 0.05)
      this.engineNoiseGain?.gain.setTargetAtTime(0.0001, t0, 0.05)
      return
    }
    const t = this.ctx.currentTime
    const n = Math.min(1, Math.max(0, speed / 300))
    const rush = n * n
    this.engineOsc.frequency.setTargetAtTime(48 + rush * 240 + n * 40, t, 0.07)
    this.engineGain.gain.setTargetAtTime(0.015 + rush * 0.13, t, 0.07)
    this.engineFilter.frequency.setTargetAtTime(260 + rush * 2200, t, 0.1)
    this.engineNoiseGain?.gain.setTargetAtTime(0.008 + rush * 0.05, t, 0.08)
  }

  playAttack(weapon: string | null) {
    if (!this.canPlaySfx()) return
    const now = performance.now()
    if (now - this.lastAttackAt < 80) return
    this.lastAttackAt = now

    const t = this.ctx!.currentTime
    const base = weapon === '链锤' ? 170 : weapon === '铁棍' ? 230 : 310
    const osc = this.ctx!.createOscillator()
    const g = this.ctx!.createGain()
    const filter = this.ctx!.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 180
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(base, t)
    osc.frequency.exponentialRampToValueAtTime(base * 0.32, t + 0.13)
    g.gain.setValueAtTime(0.2, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    osc.connect(filter)
    filter.connect(g)
    g.connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 0.16)

    const noise = this.makeNoiseSource(0.11)
    const nf = this.ctx!.createBiquadFilter()
    nf.type = 'bandpass'
    nf.frequency.value = weapon === '链锤' ? 550 : 1100
    const ng = this.ctx!.createGain()
    ng.gain.setValueAtTime(0.1, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    noise.connect(nf)
    nf.connect(ng)
    ng.connect(this.sfxGain!)
    noise.start(t)
    noise.stop(t + 0.11)
  }

  playHit() {
    if (!this.canPlaySfx()) return
    const now = performance.now()
    if (now - this.lastHitAt < 50) return
    this.lastHitAt = now

    const t = this.ctx!.currentTime
    const osc = this.ctx!.createOscillator()
    const g = this.ctx!.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(95, t)
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.14)
    g.gain.setValueAtTime(0.4, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(g)
    g.connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 0.2)

    const noise = this.makeNoiseSource(0.07)
    const ng = this.ctx!.createGain()
    ng.gain.setValueAtTime(0.22, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    noise.connect(ng)
    ng.connect(this.sfxGain!)
    noise.start(t)
    noise.stop(t + 0.08)
  }

  playHeal() {
    if (!this.canPlaySfx()) return
    const t = this.ctx!.currentTime
    ;[523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = this.ctx!.createOscillator()
      const g = this.ctx!.createGain()
      const st = t + i * 0.045
      osc.type = 'sine'
      osc.frequency.value = f
      g.gain.setValueAtTime(0.0001, st)
      g.gain.exponentialRampToValueAtTime(0.1, st + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.16)
      osc.connect(g)
      g.connect(this.sfxGain!)
      osc.start(st)
      osc.stop(st + 0.18)
    })
  }

  playKnockout() {
    if (!this.canPlaySfx()) return
    const t = this.ctx!.currentTime
    const osc = this.ctx!.createOscillator()
    const g = this.ctx!.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(210, t)
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.42)
    g.gain.setValueAtTime(0.28, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
    osc.connect(g)
    g.connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 0.48)
  }

  playFinish() {
    if (!this.canPlaySfx()) return
    const t = this.ctx!.currentTime
    ;[392, 493.88, 587.33, 783.99].forEach((f, i) => {
      const osc = this.ctx!.createOscillator()
      const g = this.ctx!.createGain()
      const st = t + i * 0.11
      osc.type = 'square'
      osc.frequency.value = f
      g.gain.setValueAtTime(0.0001, st)
      g.gain.exponentialRampToValueAtTime(0.13, st + 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.32)
      osc.connect(g)
      g.connect(this.sfxGain!)
      osc.start(st)
      osc.stop(st + 0.35)
    })
  }

  playMiss() {
    if (!this.canPlaySfx()) return
    const t = this.ctx!.currentTime
    const osc = this.ctx!.createOscillator()
    const g = this.ctx!.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(480, t)
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08)
    g.gain.setValueAtTime(0.07, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
    osc.connect(g)
    g.connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 0.1)
  }

  private canPlaySfx(): boolean {
    return !!(this.ctx && this.sfxGain && this.started && !this.muted && !this.disposed && !this.pausedByVisibility)
  }

  setMuted(m: boolean) {
    this.muted = m
    this.applyMuteGains()
    if (!m && this.started && !document.hidden) void this.resume()
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  private applyMuteGains(instant = false) {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    const target = this.muted ? 0.0001 : 0.9
    if (instant) this.master.gain.value = target
    else this.master.gain.setTargetAtTime(target, t, 0.04)
  }

  async suspend() {
    try {
      if (this.ctx?.state === 'running') await this.ctx.suspend()
    } catch {
      /* */
    }
  }

  async resume() {
    try {
      if (this.ctx?.state === 'suspended') await this.ctx.resume()
    } catch {
      /* */
    }
  }

  dispose() {
    this.disposed = true
    document.removeEventListener('visibilitychange', this.onVisibility)
    if (this.bgmTimer != null) {
      clearInterval(this.bgmTimer)
      this.bgmTimer = null
    }
    try {
      this.engineOsc?.stop()
      this.engineOsc?.disconnect()
      this.engineNoise?.stop()
      this.engineNoise?.disconnect()
    } catch {
      /* */
    }
    this.engineOsc = null
    this.engineNoise = null
    this.engineGain = null
    this.engineNoiseGain = null
    this.engineFilter = null
    this.master = null
    this.sfxGain = null
    this.musicGain = null
    this.started = false
    if (this.ctx) {
      const c = this.ctx
      this.ctx = null
      void c.close().catch(() => undefined)
    }
  }
}
