// 音效系统:用 Web Audio API 实时合成,无需任何音频素材文件。
// 通过 sound.configure() 接入设置(开关 / 音量),由设置面板与 localStorage 驱动。

export type SoundName = 'place' | 'capture' | 'win' | 'wrong' | 'click' | 'levelup'

interface SoundSettings {
  sfx: boolean
  volume: number
}

// 对局背景音乐:Erik Satie - Gymnopédie No.1(演奏:Kevin MacLeod,CC BY 3.0)
// 舒缓钢琴,循环播放;放在 public/bgm/ 下,运行时按需加载。
const BGM_SRC = `${import.meta.env.BASE_URL}bgm/gymnopedie-no1.mp3`
const BGM_VOLUME = 0.5 // 背景音乐基准音量(再乘以设置里的总音量)

class SoundEngine {
  private ctx: AudioContext | null = null
  private settings: SoundSettings = { sfx: true, volume: 0.6 }
  private bgm: HTMLAudioElement | null = null
  private bgmOn = false

  configure(partial: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...partial }
    // 实时跟随音量设置
    if (this.bgm) this.bgm.volume = BGM_VOLUME * this.settings.volume
  }

  /** 浏览器要求音频在用户交互后才能启动,首次点击时会自动 resume */
  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private tone(
    freq: number,
    startAt: number,
    dur: number,
    type: OscillatorType,
    peak: number,
  ): void {
    const ctx = this.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, startAt)
    const v = Math.max(0.0001, peak * this.settings.volume)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(v, startAt + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + dur + 0.03)
  }

  play(name: SoundName): void {
    if (!this.settings.sfx) return
    const ctx = this.ensure()
    if (!ctx) return
    const t = ctx.currentTime
    switch (name) {
      case 'place':
        this.tone(300, t, 0.09, 'triangle', 0.5)
        break
      case 'click':
        this.tone(420, t, 0.05, 'square', 0.22)
        break
      case 'capture':
        this.tone(540, t, 0.08, 'triangle', 0.45)
        this.tone(330, t + 0.04, 0.12, 'sine', 0.4)
        break
      case 'wrong':
        this.tone(190, t, 0.16, 'sawtooth', 0.28)
        this.tone(130, t + 0.06, 0.2, 'sawtooth', 0.28)
        break
      case 'win':
        this.tone(523, t, 0.12, 'triangle', 0.4)
        this.tone(659, t + 0.1, 0.12, 'triangle', 0.4)
        this.tone(784, t + 0.2, 0.22, 'triangle', 0.45)
        break
      case 'levelup':
        this.tone(523, t, 0.1, 'triangle', 0.4)
        this.tone(659, t + 0.09, 0.1, 'triangle', 0.4)
        this.tone(784, t + 0.18, 0.1, 'triangle', 0.4)
        this.tone(1047, t + 0.27, 0.26, 'triangle', 0.5)
        break
    }
  }

  // ===== 背景音乐 =====
  // 循环播放纯钢琴曲(mp3),不受 sfx 开关影响,由设置里的 music 单独控制。

  private ensureBgm(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null
    if (!this.bgm) {
      const el = new Audio(BGM_SRC)
      el.loop = true
      el.preload = 'auto'
      el.volume = BGM_VOLUME * this.settings.volume
      this.bgm = el
    }
    return this.bgm
  }

  startBgm(): void {
    if (this.bgmOn) return
    const el = this.ensureBgm()
    if (!el) return
    this.bgmOn = true
    el.volume = BGM_VOLUME * this.settings.volume
    // 浏览器可能因未交互而拒绝自动播放;被拒时挂一次性手势监听,下次点击/触摸再补播
    void el.play().catch(() => this.armResumeOnGesture())
  }

  /** 自动播放被拒时:监听下一次用户手势,补播一次(若届时仍需要) */
  private armResumeOnGesture(): void {
    if (typeof window === 'undefined') return
    const resume = () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
      if (this.bgmOn && this.bgm) void this.bgm.play().catch(() => {})
    }
    window.addEventListener('pointerdown', resume, { once: true })
    window.addEventListener('keydown', resume, { once: true })
  }

  stopBgm(): void {
    this.bgmOn = false
    if (this.bgm) {
      this.bgm.pause()
      this.bgm.currentTime = 0
    }
  }
}

export const sound = new SoundEngine()
