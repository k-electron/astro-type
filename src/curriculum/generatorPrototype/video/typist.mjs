// PROTOTYPE typist for the #189 walkthrough videos. A made-up learner, after
// `beginner.ts` on prototype/debrief-flight-log, tuned to a point on the Path:
// a target speed, how often they miss, the keys the Detour is for (slower and
// missed more), and a Mix-up they make. Deterministic for a seed.
import '../generator.js';
const G = globalThis.Generator;

const FINGER_MS = { LP: 860, LR: 760, LM: 640, LI: 560, RI: 560, RM: 640, RR: 760, RP: 860 };
const ROW_FACTOR = { home: 1.0, top: 1.2, bottom: 1.3, number: 1.4 };
const THUMB_MS = 430;
const ROW_KEYS = { number: '`1234567890-=', top: 'qwertyuiop[]\\', home: "asdfghjkl;'", bottom: 'zxcvbnm,./' };
const MIRROR = {};
['fj', 'dk', 'sl', 'a;', 'ei', 'ru', 'ty', 'wo', 'qp', 'gh', 'vm', 'bn', 'c,', 'x.', 'z/', '47', '56', '38', '29', '10'].forEach(([a, b]) => {
  MIRROR[a] = b;
  MIRROR[b] = a;
});
const SHIFT_UP = {};
'~!@#$%^&*()_+'.split('').forEach((s, i) => (SHIFT_UP['`1234567890-='[i]] = s));
Object.assign(SHIFT_UP, { '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?' });

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function wrongKeyFor(c, r, allowed) {
  const ki = G.keyInfo(c);
  if (!ki) return 'x';
  const ok = (k) => k && k !== c && allowed.includes(k);
  if (ki.shifted && r() < 0.4 && ok(ki.base)) return ki.base; // forgot Shift
  const row = ROW_KEYS[ki.row];
  const i = row.indexOf(ki.base);
  const cands = [];
  for (const k of [row[i - 1], row[i + 1]]) if (k) cands.push(k);
  const roll = r();
  let base;
  if (roll < 0.6 && cands.length) base = cands[Math.floor(r() * cands.length)];
  else if (roll < 0.8 && MIRROR[ki.base]) base = MIRROR[ki.base];
  else {
    const other = ki.row === 'home' ? (r() < 0.5 ? 'top' : 'bottom') : 'home';
    base = ROW_KEYS[other][i] ?? cands[0];
  }
  if (!base) return 'x';
  const shifted = ki.shifted ? (/[a-z]/.test(base) ? base.toUpperCase() : SHIFT_UP[base] ?? base) : base;
  return ok(shifted) ? shifted : ok(base) ? base : cands.find(ok) ?? 'x';
}

/**
 * @param text   the Stage's text
 * @param p      { wpm, miss, weak: string[], weakMiss, weakSlow, mixup?: {expected, typed}, shiftOpposite, allowed, seed }
 * @returns      { presses: [{ key, afterMs, shift }], firstTry: boolean[] }
 */
function simulate(text, p, pace) {
  const r = rng(p.seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const presses = [];
  const firstTry = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const ki = G.keyInfo(c);
    const weak = p.weak.includes(c);
    let ms = c === ' ' || !ki ? THUMB_MS : FINGER_MS[ki.finger] * (ROW_FACTOR[ki.row] ?? 1);
    if (i > 0 && text[i - 1] === ' ') ms *= 1.6; // planning the next word
    if (ki?.shifted) ms *= /[A-Z]/.test(c) ? 2.0 : 2.6; // capitals and shifted symbols
    else if (ki && /[,.;'/]/.test(c)) ms *= 1.8;
    else if (ki && /[0-9]/.test(c)) ms *= 1.5;
    if (weak) ms *= p.weakSlow ?? 1.5;
    ms *= (1.1 - 0.15 * (i / text.length)) * pace;
    ms *= Math.exp(0.35 * gauss());
    if (r() < 0.05) ms += (1200 + r() * 1400) * Math.min(1, pace * 1.5); // a look at the keyboard
    const outer = ki && ['LP', 'RP', 'LR', 'RR'].includes(ki.finger);
    let missChance = c === ' ' ? 0.015 : (0.05 + (outer ? 0.03 : 0) + (ki && ki.row !== 'home' ? 0.03 : 0)) * p.miss;
    if (weak) missChance = Math.min(0.6, missChance * (p.weakMiss ?? 2.5));
    const shift = ki?.shifted ? (r() < (p.shiftOpposite ?? 0.75) ? 'opposite' : 'same') : undefined;
    let after = Math.max(80, ms);
    let tries = 0;
    while (c !== ' ' && r() < (tries === 0 ? missChance : 0.2)) {
      let wrong = wrongKeyFor(c, r, p.allowed);
      if (p.mixup && c === p.mixup.expected && r() < 0.75) wrong = p.mixup.typed;
      presses.push({ key: wrong, afterMs: after, shift: G.keyInfo(wrong)?.shifted ? shift ?? 'opposite' : undefined, wrong: true });
      after = (500 + r() * 600) * Math.min(1, pace * 1.3);
      tries++;
    }
    firstTry.push(tries === 0);
    presses.push({ key: c, afterMs: after, shift });
  }
  return { presses, firstTry };
}

export function typist(text, p) {
  // Scale the pace until the Run's net speed is near the target WPM.
  let pace = 1;
  let sim;
  for (let k = 0; k < 6; k++) {
    sim = simulate(text, p, pace);
    const ms = sim.presses.reduce((a, x) => a + x.afterMs, 0);
    const wrong = sim.presses.filter((x) => x.wrong).length;
    const wpm = ((text.length - wrong) / 5) / (ms / 60000);
    pace *= wpm / p.wpm;
  }
  const ms = sim.presses.reduce((a, x) => a + x.afterMs, 0);
  const firstOk = sim.firstTry.filter((x, i) => text[i] !== ' ').filter(Boolean).length;
  const letters = [...text].filter((c) => c !== ' ').length;
  const tIdx = [...text].map((c, i) => (p.focus.includes(c) ? i : -1)).filter((i) => i >= 0);
  const tOk = tIdx.filter((i) => sim.firstTry[i]).length;
  return {
    presses: sim.presses,
    seconds: ms / 1000,
    accuracy: Math.round((firstOk * 100) / letters),
    target: { right: tOk, of: tIdx.length, pct: tIdx.length ? Math.round((tOk * 100) / tIdx.length) : null },
    wpm: Math.round(((text.length - sim.presses.filter((x) => x.wrong).length) / 5) / (ms / 60000)),
  };
}

// Playwright key names for each base key.
const CODE = { ' ': 'Space', '-': 'Minus', '=': 'Equal', '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash', ';': 'Semicolon', "'": 'Quote', ',': 'Comma', '.': 'Period', '/': 'Slash', '`': 'Backquote' };
export function keyPlan(ch, shift) {
  const ki = G.keyInfo(ch);
  if (ch === ' ' || !ki) return { code: 'Space' };
  const base = ki.base;
  const code = /[a-z]/.test(base) ? `Key${base.toUpperCase()}` : /[0-9]/.test(base) ? `Digit${base}` : CODE[base];
  if (!ki.shifted) return { code };
  const opposite = ki.hand === 'L' ? 'ShiftRight' : 'ShiftLeft';
  const same = ki.hand === 'L' ? 'ShiftLeft' : 'ShiftRight';
  return { code, shiftKey: shift === 'same' ? same : opposite };
}
