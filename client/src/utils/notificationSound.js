export const NOTIFICATION_SOUNDS = [
  { id: 'classic', name: 'Classic Ping', description: 'Temiz ve kısa varsayılan bildirim sesi.' },
  { id: 'soft', name: 'Soft Bell', description: 'Daha yumuşak ve hafif bir zil hissi.' },
  { id: 'digital', name: 'Digital Pop', description: 'Modern ve hızlı dijital uyarı tonu.' },
  { id: 'chime', name: 'Glass Chime', description: 'Katmanlı ve parlak bir chime efekti.' },
  { id: 'alert', name: 'Alert Pulse', description: 'Daha belirgin ve dikkat çekici uyarı.' },
  { id: 'arcade', name: 'Arcade', description: 'Retro oyun hissi veren kısa ses.' },
];

export function playNotificationSound(audioContext, soundId = 'classic') {
  if (!audioContext) return;
  const ctx = audioContext;
  const now = ctx.currentTime;

  const tone = (type, frequency, start, duration, volume, rampTo = 0.001) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(rampTo, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
    return { osc, gain };
  };

  switch (soundId) {
    case 'soft':
      tone('sine', 392, now, 0.28, 0.18);
      tone('sine', 523, now + 0.08, 0.34, 0.12);
      break;
    case 'digital':
      tone('square', 660, now, 0.09, 0.12);
      tone('square', 990, now + 0.09, 0.12, 0.08);
      break;
    case 'chime':
      tone('sine', 523, now, 0.4, 0.15);
      tone('triangle', 784, now + 0.05, 0.45, 0.08);
      tone('sine', 1046, now + 0.1, 0.35, 0.05);
      break;
    case 'alert':
      tone('sawtooth', 440, now, 0.12, 0.08);
      tone('sawtooth', 554, now + 0.12, 0.14, 0.08);
      tone('triangle', 740, now + 0.24, 0.22, 0.09);
      break;
    case 'arcade':
      tone('square', 784, now, 0.08, 0.1);
      tone('square', 1046, now + 0.08, 0.08, 0.08);
      tone('square', 1318, now + 0.16, 0.14, 0.06);
      break;
    case 'classic':
    default:
      tone('sine', 523, now, 0.16, 0.2);
      tone('sine', 784, now + 0.1, 0.26, 0.14);
      break;
  }
}
