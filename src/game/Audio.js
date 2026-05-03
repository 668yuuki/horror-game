// WebAudio で簡単な BGM・効果音・心音をプロシージャル生成
// （アセット未配置でも雰囲気が出るように）
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.heartbeatTimer = 0;
    this.bgmNodes = null;
  }

  _ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(this.ctx.destination);
  }

  start() {
    this._ensure();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this._startBgm();
  }

  stop() {
    if (this.bgmNodes) {
      this.bgmNodes.osc.stop();
      this.bgmNodes = null;
    }
  }

  _startBgm() {
    if (this.bgmNodes) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55;        // 低い不安なドローン
    gain.gain.value = 0.05;
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain).connect(osc.frequency);
    osc.connect(gain).connect(this.master);
    osc.start();
    lfo.start();
    this.bgmNodes = { osc, gain, lfo };
  }

  // 短いノイズバースト（足音・塩・封印などに）
  _noise(durationMs, freq = 600, q = 5, gain = 0.3) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * durationMs / 1000, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filt).connect(g).connect(this.master);
    src.start();
  }

  pickup() { this._beep(880, 0.15, 0.3); }
  damage() { this._beep(110, 0.4, 0.5, 'square'); }
  saltThrow() { this._noise(150, 900, 4, 0.3); }
  juzu() { this._beep(660, 0.1, 0.2, 'triangle'); }
  seal() { this._beep(220, 0.6, 0.4, 'sawtooth'); this._beep(440, 0.4, 0.3, 'sine'); }

  _beep(freq, dur, gain = 0.3, type = 'sine') {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.05);
  }

  /**
   * ゴースト距離に応じて心音を鳴らす
   */
  updateHeartbeat(dt, ghostDist) {
    if (!this.ctx) return;
    if (ghostDist > 12) { this.heartbeatTimer = 0; return; }
    // 距離が近いほど早く
    const interval = 0.4 + (ghostDist / 12) * 0.8;
    this.heartbeatTimer -= dt;
    if (this.heartbeatTimer <= 0) {
      this._beep(60, 0.18, 0.5, 'sine');
      this.heartbeatTimer = interval;
    }
  }
}
