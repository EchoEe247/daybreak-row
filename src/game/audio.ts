export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let ambient: GainNode | null = null;
  let noiseSrc: AudioBufferSourceNode | null = null;
  let started = false;
  let lastFoot = 0;

  function context() {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      ambient = ctx.createGain();
      ambient.gain.value = 0;
      ambient.connect(master);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function unlock() {
    const c = context();
    if (started || !ambient || !master) return;
    started = true;
    const len = c.sampleRate * 2;
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    noiseSrc = c.createBufferSource();
    noiseSrc.buffer = buffer;
    noiseSrc.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    noiseSrc.connect(filter);
    filter.connect(ambient);
    noiseSrc.start();
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 98;
    const oscGain = c.createGain();
    oscGain.gain.value = 0.018;
    osc.connect(oscGain);
    oscGain.connect(ambient);
    osc.start();
    ambient.gain.setTargetAtTime(0.03, c.currentTime, 0.8);
  }

  function setAmbience(outdoor: boolean, night: boolean) {
    if (!ctx || !ambient) return;
    const target = outdoor ? (night ? 0.045 : 0.03) : 0.012;
    ambient.gain.setTargetAtTime(target, ctx.currentTime, 0.4);
  }

  function blip(freq = 520) {
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + 0.2);
  }

  function foot(nowMs: number) {
    if (!ctx || !master) return;
    if (nowMs - lastFoot < 280) return;
    lastFoot = nowMs;
    const len = Math.floor(ctx.sampleRate * 0.09);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
  }

  function chime() {
    blip(660);
    window.setTimeout(() => blip(880), 90);
  }

  function dispose() {
    noiseSrc?.stop();
    void ctx?.close();
    ctx = null;
    started = false;
  }

  return { unlock, setAmbience, blip, foot, chime, dispose };
}
