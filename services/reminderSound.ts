import { SystemConfig } from '../types';

type SoundKind = NonNullable<SystemConfig['reminderSettings']>['sound'];

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

function playTone(freq: number, durationMs: number, volume: number, when: number) {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.value = Math.max(0, Math.min(1, volume));
  o.connect(g);
  g.connect(c.destination);
  const startAt = c.currentTime + when;
  o.start(startAt);
  o.stop(startAt + durationMs / 1000);
}

export async function ensureAudioReady() {
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === 'suspended') await c.resume();
  } catch {
    // ignore
  }
}

export function playReminderSound(config?: SystemConfig) {
  const s = config?.reminderSettings;
  if (!s?.enableSound) return;
  const volume = typeof s.volume === 'number' ? s.volume : 0.6;
  const kind: SoundKind = s.sound || 'beep';

  void ensureAudioReady();

  if (kind === 'beep') {
    playTone(880, 180, volume, 0);
    return;
  }
  if (kind === 'chime') {
    playTone(660, 140, volume, 0);
    playTone(990, 180, volume, 0.18);
    return;
  }
  // bell
  playTone(1200, 120, volume, 0);
  playTone(900, 140, volume, 0.14);
  playTone(700, 160, volume, 0.30);
}
