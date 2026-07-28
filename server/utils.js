const crypto = require('crypto');

/**
 * Rastgele kullanıcı adı oluşturur (anlamlı: ingilizce kelime + sayı)
 * @param {number} length - Uzunluk (varsayılan 8)
 * @returns {string} - kelime + sayı formatında username (asla sayı ile başlamaz)
 */
function generateUsername(length = 8) {
  const words = [
    // predators & birds (30)
    'fox', 'wolf', 'bear', 'lion', 'tiger', 'eagle', 'shark', 'hawk', 'lynx', 'otter',
    'raven', 'falcon', 'viper', 'cobra', 'puma', 'bison', 'crane', 'heron', 'osprey', 'ibis',
    'jaguar', 'leopard', 'cheetah', 'wolverine', 'mongoose', 'kestrel', 'harrier', 'condor', 'magpie', 'raptor',
    // sea life (20)
    'whale', 'dolphin', 'marlin', 'tuna', 'ray', 'eel', 'squid', 'octopus', 'coral', 'kelp',
    'tide', 'lagoon', 'reef', 'wave', 'pearl', 'shell', 'scallop', 'urchin', 'anchor', 'compass',
    // forest & ground animals (20)
    'deer', 'moose', 'badger', 'ferret', 'weasel', 'marten', 'beaver', 'porcupine', 'hedgehog', 'squirrel',
    'rabbit', 'hare', 'hare', 'mole', 'shrew', 'vole', 'chipmunk', 'marmot', 'ibex', 'gnu',
    // nature & weather (30)
    'comet', 'nova', 'echo', 'delta', 'forge', 'prism', 'vortex', 'zenith', 'cypher', 'orbit',
    'pulse', 'flux', 'drift', 'ember', 'frost', 'haven', 'iris', 'jade', 'onyx', 'atlas',
    'bloom', 'crest', 'dusk', 'elm', 'fern', 'gale', 'haze', 'ivory', 'jolt', 'quartz',
    // space & cosmic (30)
    'mars', 'venus', 'jupiter', 'saturn', 'neptune', 'pluto', 'mercury', 'orion', 'cassini', 'apollo',
    'lunar', 'solar', 'stellar', 'cosmic', 'galaxy', 'nebula', 'pulsar', 'quasar', 'meteor', 'asteroid',
    'crater', 'orbit', 'zenith', 'aurora', 'eclipse', 'solstice', 'equinox', 'horizon', 'meridian', 'zodiac',
    // colors & gems (30)
    'ruby', 'sapphire', 'emerald', 'amber', 'jade', 'opal', 'topaz', 'garnet', 'pearl', 'coral',
    'ivory', 'cobalt', 'crimson', 'scarlet', 'azure', 'teal', 'indigo', 'violet', 'amber', 'bronze',
    'copper', 'silver', 'golden', 'pearl', 'onyx', 'jasper', 'agate', 'beryl', 'zircon', 'marble',
    // objects & tools (30)
    'anvil', 'hammer', 'chisel', 'lathe', 'forge', 'kiln', 'crucible', 'bellows', 'pivot', 'lever',
    'gear', 'cog', 'axle', 'pulley', 'wedge', 'screw', 'rivet', 'bolt', 'clamp', 'vise',
    'plane', 'drill', 'saw', 'file', 'rasp', 'mallet', 'trowel', 'spade', 'plow', 'loom',
    // music & waves (20)
    'lyre', 'harp', 'lute', 'drum', 'gong', 'flute', 'reed', 'chord', 'scale', 'mode',
    'pitch', 'tone', 'note', 'clef', 'staff', 'bar', 'beat', 'tempo', 'rhythm', 'melody',
    // mythic & abstract (30)
    'atlas', 'titan', 'oracle', 'sage', 'rune', 'glyph', 'sigil', 'talisman', 'charm', 'relic',
    'legend', 'myth', 'fable', 'saga', 'ode', 'hymn', 'psalm', 'crest', 'banner', 'pennant',
    'beacon', 'torch', 'lantern', 'brazier', 'cinder', 'ash', 'soot', 'smoke', 'steam', 'spark',
    // food & spice (30)
    'mango', 'papaya', 'guava', 'lychee', 'durian', 'peach', 'plum', 'cherry', 'apricot', 'date',
    'fig', 'olive', 'basil', 'thyme', 'sage', 'mint', 'dill', 'cumin', 'coriander', 'turmeric',
    'saffron', 'vanilla', 'cocoa', 'mocha', 'caramel', 'honey', 'maple', 'almond', 'cashew', 'pistachio',
    // names (30)
    'alex', 'sam', 'jordan', 'casey', 'riley', 'morgan', 'taylor', 'quinn', 'avery', 'reese',
    'blake', 'cameron', 'drew', 'ellis', 'finley', 'gale', 'harper', 'indigo', 'jamie', 'kai',
    'lane', 'max', 'noa', 'parker', 'remy', 'sage', 'toby', 'vera', 'wren', 'zane',
  ];
  // Dedupe — some categories repeat words; unique keeps output clean.
  const unique = [...new Set(words)];
  const word = unique[crypto.randomBytes(2).readUInt16LE() % unique.length];
  // 1-4 digit random number (10-9999), never leading (word comes first)
  const numLen = 1 + (crypto.randomBytes(1)[0] % 4);
  let num = '';
  for (let i = 0; i < numLen; i++) {
    num += String(crypto.randomBytes(1)[0] % 10);
  }
  return word + num;
}

/**
 * Süreyi okunabilir formata çevirir
 * @param {Date} expiresAt - Bitiş tarihi
 * @returns {string} - "45 dk kaldı" gibi
 */
function formatTimeRemaining(expiresAt) {
  const now = new Date();
  const diff = new Date(expiresAt) - now;

  if (diff <= 0) return 'Süresi doldu';

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours} saat ${remainingMins} dk kaldı`;
  }

  return `${minutes} dk ${seconds} sn kaldı`;
}

/**
 * Tarih formatını okunabilir hale getirir
 * @param {string|Date} date
 * @returns {string}
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

module.exports = { generateUsername, formatTimeRemaining, formatDate };
