// Sound effects and music, all made in code with the Web Audio API. No files to download.

export type Sfx = 'click' | 'win' | 'lose' | 'news' | 'alarm' | 'coin' | 'month';
export type Mood = 'calm' | 'campaign' | 'crisis';

export interface AudioSettings { muted: boolean; volume: number; music: boolean; sfx: boolean; effects: boolean }

const KEY = 'polsim:audio';
const DEFAULTS: AudioSettings = { muted: false, volume: 0.6, music: true, sfx: true, effects: true };

export function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}
export function saveSettings(s: AudioSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

let settings = loadSettings();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;

export const getSettings = () => settings;

function apply() {
  if (!master || !musicBus || !sfxBus || !ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(settings.muted ? 0 : settings.volume, t, 0.05);
  musicBus.gain.setTargetAtTime(settings.music ? 0.35 : 0, t, 0.3);
  sfxBus.gain.setTargetAtTime(settings.sfx ? 0.8 : 0, t, 0.05);
}

export function setSettings(next: Partial<AudioSettings>) {
  settings = { ...settings, ...next };
  saveSettings(settings);
  apply();
  if (settings.music && !settings.muted) startMusic(); else stopMusic();
}

/** Browsers only allow sound after a tap, so this runs on the first tap. */
export function unlock() {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    try { ctx = new AC(); } catch { return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    apply();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  if (settings.music && !settings.muted) startMusic();
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function tone(midi: number, at: number, len: number, opts: { type?: OscillatorType; gain?: number; bus?: GainNode | null; glide?: number } = {}) {
  if (!ctx) return;
  const bus = opts.bus ?? sfxBus;
  if (!bus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = opts.type ?? 'triangle';
  o.frequency.setValueAtTime(hz(midi), at);
  if (opts.glide) o.frequency.exponentialRampToValueAtTime(hz(midi + opts.glide), at + len);
  const peak = opts.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.02, len / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g); g.connect(bus);
  o.start(at); o.stop(at + len + 0.05);
}

function noise(at: number, len: number, gain: number, bus: GainNode | null, freq = 1200) {
  if (!ctx || !bus) return;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * len)), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = gain;
  src.connect(f); f.connect(g); g.connect(bus);
  src.start(at);
}

export function play(s: Sfx) {
  if (!ctx || settings.muted || !settings.sfx) return;
  const t = ctx.currentTime + 0.01;
  switch (s) {
    case 'click': tone(84, t, 0.04, { type: 'square', gain: 0.04 }); break;
    case 'month': tone(72, t, 0.12, { gain: 0.08 }); tone(79, t + 0.06, 0.16, { gain: 0.06 }); break;
    case 'coin': tone(88, t, 0.08, { type: 'square', gain: 0.06 }); tone(93, t + 0.07, 0.2, { type: 'square', gain: 0.06 }); break;
    case 'news': tone(76, t, 0.15, { type: 'sine', gain: 0.15 }); tone(83, t + 0.12, 0.3, { type: 'sine', gain: 0.12 }); break;
    case 'win': [60, 64, 67, 72, 76].forEach((m, i) => tone(m, t + i * 0.09, 0.5, { gain: 0.16 })); tone(48, t, 1.0, { type: 'sine', gain: 0.12 }); break;
    case 'lose': [67, 63, 60, 55].forEach((m, i) => tone(m, t + i * 0.18, 0.5, { type: 'sine', gain: 0.14 })); break;
    case 'alarm':
      for (let i = 0; i < 3; i++) tone(70, t + i * 0.32, 0.26, { type: 'sawtooth', gain: 0.06, glide: -5 });
      noise(t, 0.25, 0.25, sfxBus, 200);
      break;
  }
}

// ---------- Music: soft chords and a little tune, changing with the mood ----------

const SONGS: Record<Mood, { bpm: number; chords: number[][]; scale: number[]; drum: boolean }> = {
  calm: { bpm: 70, chords: [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]], scale: [72, 74, 76, 79, 81], drum: false },
  campaign: { bpm: 104, chords: [[48, 55, 64], [43, 50, 59], [45, 52, 60], [41, 48, 57]], scale: [72, 74, 76, 79, 81, 84], drum: true },
  crisis: { bpm: 84, chords: [[45, 52, 60], [41, 48, 57], [43, 50, 55], [40, 47, 56]], scale: [69, 71, 72, 76, 77], drum: true },
};

let mood: Mood = 'calm';
let timer: ReturnType<typeof setInterval> | null = null;
let nextBeat = 0;
let beat = 0;

export function setMood(m: Mood) { mood = m; }
export const currentMood = () => mood;

function schedule() {
  if (!ctx || !musicBus) return;
  const song = SONGS[mood];
  const spb = 60 / song.bpm;
  while (nextBeat < ctx.currentTime + 0.4) {
    const bar = Math.floor(beat / 4) % song.chords.length;
    const chord = song.chords[bar];
    if (beat % 4 === 0) for (const n of chord) tone(n, nextBeat, spb * 4, { type: 'sine', gain: 0.09, bus: musicBus });
    if (beat % 2 === 0 && Math.random() < 0.7) {
      const n = song.scale[Math.floor(Math.random() * song.scale.length)];
      tone(n, nextBeat, spb * 1.5, { type: 'triangle', gain: 0.05, bus: musicBus });
    }
    if (song.drum) {
      if (beat % 4 === 0) tone(36, nextBeat, 0.25, { type: 'sine', gain: 0.18, bus: musicBus, glide: -12 });
      if (beat % 4 === 2) noise(nextBeat, 0.08, 0.08, musicBus, mood === 'crisis' ? 400 : 3000);
    }
    nextBeat += spb;
    beat++;
  }
}

export function startMusic() {
  if (!ctx || timer) return;
  nextBeat = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 150);
}
export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
}
