// PROTOTYPE: the Detour generator for "What the generator builds" (#189).
// Throwaway. A pure module: no DOM, no clock, no Math.random. Same request and
// data in, same Stage out, in every browser (integer-only random numbers).
(function (root) {
  const VERSION = 'proto-1';

  // ── The keyboard: finger, row, hand and home key of every character ──
  const FINGERS = {
    LP: { name: 'Left little', hand: 'L', home: 'a', keys: '`1qaz' },
    LR: { name: 'Left ring', hand: 'L', home: 's', keys: '2wsx' },
    LM: { name: 'Left middle', hand: 'L', home: 'd', keys: '3edc' },
    LI: { name: 'Left index', hand: 'L', home: 'f', keys: '45rtfgvb' },
    RI: { name: 'Right index', hand: 'R', home: 'j', keys: '67yuhjnm' },
    RM: { name: 'Right middle', hand: 'R', home: 'k', keys: '8ik,' },
    RR: { name: 'Right ring', hand: 'R', home: 'l', keys: '9ol.' },
    RP: { name: 'Right little', hand: 'R', home: ';', keys: "0-=p[]\\;'/" },
  };
  const ROWS = {
    number: { name: 'Number row', keys: '`1234567890-=' },
    top: { name: 'Top row', keys: 'qwertyuiop[]\\' },
    home: { name: 'Home row', keys: "asdfghjkl;'" },
    bottom: { name: 'Bottom row', keys: 'zxcvbnm,./' },
  };
  const SHIFTED = '~!@#$%^&*()_+{}|:"<>?';
  const SHIFT_OF = {};
  '~!@#$%^&*()_+'.split('').forEach((s, i) => (SHIFT_OF[s] = '`1234567890-='[i]));
  Object.assign(SHIFT_OF, { '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/' });

  function keyInfo(ch) {
    const shifted = /[A-Z]/.test(ch) || SHIFTED.includes(ch);
    const base = /[A-Z]/.test(ch) ? ch.toLowerCase() : SHIFT_OF[ch] ?? ch;
    for (const [id, f] of Object.entries(FINGERS)) {
      if (f.keys.includes(base)) {
        const row = Object.keys(ROWS).find((r) => ROWS[r].keys.includes(base));
        return { ch, base, shifted, finger: id, hand: f.hand, home: f.home, row };
      }
    }
    return null;
  }

  // ── Seeded random numbers: FNV-1a hash → SplitMix32 → xoshiro128++ ──
  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  function rng(seedText) {
    let x = fnv1a(seedText);
    const sm = () => {
      x = (x + 0x9e3779b9) >>> 0;
      let z = x;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return (z ^ (z >>> 16)) >>> 0;
    };
    const s = [sm(), sm(), sm(), sm()];
    const rotl = (v, k) => ((v << k) | (v >>> (32 - k))) >>> 0;
    function next() {
      const r = (rotl((s[0] + s[3]) >>> 0, 7) + s[0]) >>> 0;
      const t = (s[1] << 9) >>> 0;
      s[2] ^= s[0];
      s[3] ^= s[1];
      s[1] ^= s[2];
      s[0] ^= s[3];
      s[2] ^= t;
      s[3] = rotl(s[3], 11);
      return r;
    }
    // Uniform integer in [0, n) without modulo bias (rejection).
    function int(n) {
      const limit = Math.floor(0x100000000 / n) * n;
      for (;;) {
        const v = next();
        if (v < limit) return v % n;
      }
    }
    // Pick by integer weights.
    function pick(items, weightOf) {
      let total = 0;
      for (const it of items) total += weightOf(it);
      let r = int(total);
      for (const it of items) {
        r -= weightOf(it);
        if (r < 0) return it;
      }
      return items[items.length - 1];
    }
    return { int, pick };
  }

  // ── Length from the Waypoint's Sector Recipe draft ──
  const LENGTH = {
    s1: [60, 100], s2: [100, 160], s3: [100, 160], s4: [120, 180], s5: [150, 250],
    s6: [120, 180], s7: [140, 200], s8: [120, 180], s9: [250, 400],
  };

  // ── What a Target asks to practise, among the keys allowed ──
  function describeTarget(t) {
    switch (t.type) {
      case 'keys': return t.keys.length > 1 ? `${t.keys.join(' and ').toUpperCase()}` : `${t.keys[0].toUpperCase()}`;
      case 'mixup': return `Mix-up: ${t.expected} typed as ${t.typed}`;
      case 'finger': return `${FINGERS[t.finger].name} finger`;
      case 'row': return ROWS[t.row].name;
      case 'hand': return t.hand === 'L' ? 'Left hand' : 'Right hand';
      case 'shift': return 'Opposite-hand Shift';
    }
    return '?';
  }
  function focusKeys(t, allowed) {
    const ok = (c) => allowed.includes(c);
    switch (t.type) {
      case 'keys': return t.keys.filter(ok);
      case 'mixup': return [t.expected, t.typed].filter(ok);
      case 'finger': return [...allowed].filter((c) => keyInfo(c)?.finger === t.finger && !keyInfo(c).shifted);
      case 'row': return [...allowed].filter((c) => keyInfo(c)?.row === t.row && !keyInfo(c).shifted);
      case 'hand': return [...allowed].filter((c) => /[a-z]/.test(c) && keyInfo(c)?.hand === t.hand);
      case 'shift': return [...allowed].filter((c) => keyInfo(c)?.shifted);
    }
    return [];
  }

  // ── Drill: the four shapes (repeats, alternation, anchored reach, Shift pairs) ──
  const MIRROR = {};
  ['fj', 'dk', 'sl', 'a;', 'ei', 'ru', 'ty', 'wo', 'qp', 'gh', 'vm', 'bn', 'c,', 'x.', 'z/', '47', '56', '38', '29', '10']
    .forEach(([a, b]) => { MIRROR[a] = b; MIRROR[b] = a; });
  // A lone key alternates with its mirror key and its row neighbours, where learned.
  function partners(k, allowed) {
    const out = [];
    if (MIRROR[k] && allowed.includes(MIRROR[k])) out.push(MIRROR[k]);
    const row = Object.values(ROWS).find((r) => r.keys.includes(k));
    if (row) {
      const i = row.keys.indexOf(k);
      for (const n of [row.keys[i - 1], row.keys[i + 1]]) if (n && allowed.includes(n) && !out.includes(n)) out.push(n);
    }
    return out;
  }

  function drillGroups(focus, t, allowed) {
    const groups = [];
    const keys = focus.slice(0, 6);
    if (keys.length === 1 && t.type !== 'mixup') {
      for (const p of partners(keys[0], allowed)) {
        groups.push({ shape: 'alternation', text: keys[0] + p + keys[0], keys: [keys[0], p] });
        groups.push({ shape: 'alternation', text: p + keys[0] + p, keys: [keys[0], p] });
      }
    }
    for (const k of keys) {
      const ki = keyInfo(k);
      if (!ki) continue;
      if (/[A-Z]/.test(k)) {
        groups.push({ shape: 'Shift pair', text: k + k.toLowerCase(), keys: [k] });
        continue;
      }
      if (ki.shifted || ki.base !== ki.home) {
        groups.push({ shape: 'anchored reach', text: ki.home + k + ki.home, keys: [k] });
      }
      if (!ki.shifted) {
        groups.push({ shape: 'repeats', text: k + k + k, keys: [k] });
        groups.push({ shape: 'repeats', text: k + k, keys: [k] });
      }
    }
    // Alternation between pairs of focus keys (a Mix-up's two keys side by side).
    const pairKeys = t.type === 'mixup' ? [t.expected, t.typed] : keys;
    for (let i = 0; i < pairKeys.length; i++) {
      for (let j = i + 1; j < pairKeys.length && j < i + 3; j++) {
        const a = pairKeys[i];
        const b = pairKeys[j];
        if (!a || !b || /[A-Z]/.test(a + b)) continue;
        groups.push({ shape: 'alternation', text: a + b + a, keys: [a, b] });
        groups.push({ shape: 'alternation', text: b + a + b, keys: [a, b] });
      }
    }
    return groups;
  }

  function buildDrill(req, focus, length, r) {
    const groups = drillGroups(focus, req.target, req.waypoint.known);
    if (!groups.length) return null;
    const tokens = [];
    let len = 0;
    let last = null;
    // Each group comes twice in a row ("frf frf"), then the next one.
    while (len < length) {
      let g = r.pick(groups, (x) => (x.shape === 'anchored reach' || x.shape === 'alternation' ? 3 : 2));
      if (last && g.text === last.text && groups.length > 1) continue;
      for (let n = 0; n < 2 && len < length; n++) {
        tokens.push({ text: g.text, from: 'drill', shape: g.shape });
        len += g.text.length + 1;
      }
      last = g;
    }
    return tokens;
  }

  // ── Words: from the Word list, every word holding a Target key ──
  const SIZE_WEIGHT = { 10: 6, 20: 3, 35: 1 };
  function wordPool(data, letters, allowed) {
    const out = [];
    for (const s of ['10', '20', '35']) {
      for (const w of data.words[s].split(' ')) {
        if (w.includes("'") && !allowed.includes("'")) continue;
        let ok = true;
        for (const c of w) if (c !== "'" && !letters.includes(c)) { ok = false; break; }
        if (ok) out.push({ w, size: +s, made: false });
      }
    }
    return out;
  }

  // Where each symbol lives in real text: one shape per symbol, wrapped
  // around a word or a number. Digits use only digits learned by then.
  const SYMBOL_SHAPE = {
    ',': (w) => `${w},`, '.': (w) => `${w}.`, '/': (w, v) => `${w}/${v}`,
    '?': (w) => `${w}?`, ':': (w) => `${w}:`, ';': (w) => `${w};`,
    "'": (w) => `'${w}'`, '"': (w) => `"${w}"`, '-': (w, v) => `${w}-${v}`,
    '!': (w) => `${w}!`, '(': (w) => `(${w})`, ')': (w) => `(${w})`,
    '$': (w, v, n) => `$${n}`, '%': (w, v, n) => `${n}%`, '@': (w, v) => `${w}@${v}`,
    '#': (w, v, n) => `#${n}`, '&': (w, v) => `${w} & ${v}`, '*': (w) => `*${w}*`,
    '=': (w, v, n) => `${w} = ${n}`, '+': (w, v, n) => `${n}+${n}`, '_': (w, v) => `${w}_${v}`,
    '[': (w) => `[${w}]`, ']': (w) => `[${w}]`, '{': (w) => `{${w}}`, '}': (w) => `{${w}}`,
    '<': (w) => `<${w}>`, '>': (w) => `<${w}>`, '^': (w, v, n) => `${n}^2`,
    '\\': (w, v) => `${w}\\${v}`, '|': (w, v) => `${w}|${v}`, '`': (w) => `\`${w}\``,
    '~': (w) => `~/${w}`,
  };

  function numberToken(digits, focusDigits, r, allowed) {
    const len = [2, 2, 3, 3, 4][r.int(5)];
    let s = '';
    for (let i = 0; i < len; i++) {
      const pool = i === 0 && focusDigits.length ? focusDigits : digits;
      let d = pool[r.int(pool.length)];
      if (i > 0 && d === s[i - 1] && digits.length > 1) d = digits[r.int(digits.length)];
      if (i === 0 && d === '0' && len > 1) d = digits.find((x) => x !== '0') ?? d;
      s += d;
    }
    if (len === 4 && allowed.includes(',') && r.int(3) === 0) s = `${s[0]},${s.slice(1)}`;
    return s;
  }

  // Dressed like the Waypoint's own text: commas and full stops where learned,
  // and a capital to start the list and after each full stop where learned.
  function dress(tokens, allowed, r) {
    const cap = (t) => (allowed.includes(t.text[0].toUpperCase()) && /[a-z]/.test(t.text[0]) ? t.text[0].toUpperCase() + t.text.slice(1) : t.text);
    let start = true;
    tokens.forEach((t, i) => {
      if (t.from !== 'word' && t.from !== 'made-up word') { start = false; return; }
      if (start) t.text = cap(t);
      start = false;
      if (i === tokens.length - 1) { if (allowed.includes('.')) t.text += '.'; return; }
      const roll = r.int(12);
      if (roll < 2 && allowed.includes(',')) t.text += ',';
      else if (roll === 2 && allowed.includes('.')) { t.text += '.'; start = true; }
    });
  }

  function buildWords(req, data, focus, length, r) {
    const wp = req.waypoint;
    const allowed = wp.known;
    const letters = [...allowed].filter((c) => /[a-z]/.test(c)).join('');
    const all = wordPool(data, letters, allowed);
    const t = req.target;
    const focusLetters = [...new Set(focus.filter((c) => /[a-z]/.test(c)))];
    const focusCaps = focus.filter((c) => /[A-Z]/.test(c));
    const focusDigits = focus.filter((c) => /[0-9]/.test(c));
    const focusSymbols = focus.filter((c) => SYMBOL_SHAPE[c] && !/[a-z0-9A-Z]/.test(c));
    const digits = [...allowed].filter((c) => /[0-9]/.test(c));
    const notes = [];

    // Which words, weighted toward the Target.
    let pool;
    const maxLen = { s1: 6, s2: 7, s3: 8 }[wp.sector] ?? 9;
    if (focusLetters.length) {
      pool = all.filter((x) => x.w.length <= maxLen && focusLetters.some((c) => x.w.includes(c)));
      // The commonest words first: SCOWL sizes 10-20, and 35 only when fewer than 40 fit.
      if (pool.filter((x) => x.size <= 20).length >= 40) pool = pool.filter((x) => x.size <= 20);
      const real = pool.length;
      const scarce = req.options?.scarce ?? 'made-up';
      if (real < 15 && scarce === 'drill') return null;
      if (real < 15 && scarce === 'repeat') {
        notes.push(`Only ${real} real words hold the Target here; they repeat.`);
      } else if (real < 15 && data.madeUp[wp.n]) {
        const made = data.madeUp[wp.n].filter((w) => focusLetters.some((c) => w.includes(c)));
        pool = pool.concat(made.map((w) => ({ w, size: 35, made: true })));
        notes.push(`${real ? `Only ${real}` : 'No'} real words hold the Target here, so ${made.length} vetted made-up words join them.`);
      } else {
        notes.push(`${real.toLocaleString('en')} real words hold the Target here.`);
      }
    } else if (focusCaps.length) {
      pool = all.filter((x) => x.size <= 20 && x.w.length <= maxLen && focusCaps.includes(x.w[0].toUpperCase()));
      notes.push(`${pool.length.toLocaleString('en')} real words start with a capital learned by now.`);
    } else {
      // Digits and symbols: short common words carry them.
      pool = all.filter((x) => x.size <= 20 && x.w.length <= 6);
    }
    if (!pool.length) return null;

    const weight = (x) => {
      let n = 0;
      for (const c of x.w) if (focusLetters.includes(c)) n++;
      let wgt = (x.made ? 2 : SIZE_WEIGHT[x.size]) * (1 + Math.min(n, 3));
      if (t.type === 'mixup' && x.w.includes(t.expected) && x.w.includes(t.typed)) wgt *= 4;
      if (x.w.length > 8) wgt = 1;
      return wgt;
    };

    const used = new Set();
    const tokens = [];
    let len = 0;
    let guard = 0;
    const capOk = (w) => allowed.includes(w[0].toUpperCase());
    while (len < length && guard++ < 2000) {
      let x = r.pick(pool, weight);
      if (used.has(x.w) && used.size < Math.min(pool.length, 40)) continue;
      used.add(x.w);
      let text = x.w;
      let from = x.made ? 'made-up word' : 'word';
      // Dress the word with what the Target needs.
      if (focusCaps.length) {
        if (capOk(text) && (t.type === 'shift' ? r.int(10) < 7 : true)) {
          text = text[0].toUpperCase() + text.slice(1);
          from = 'capital word';
        }
        const shiftSyms = focus.filter((c) => SYMBOL_SHAPE[c] && !/[A-Za-z0-9]/.test(c));
        if (shiftSyms.length && r.int(4) === 0) {
          const s = shiftSyms[r.int(shiftSyms.length)];
          text = SYMBOL_SHAPE[s](text, text, '1');
          from = 'symbol shape';
        }
      } else if (focusDigits.length && r.int(2) === 0) {
        text = numberToken(digits, focusDigits, r, allowed);
        from = 'number';
      } else if (focusSymbols.length && req.options?.symbols === 'drill' && r.int(10) < 5) {
        const s = focusSymbols[r.int(focusSymbols.length)];
        const ki = keyInfo(s);
        tokens.push({ text: ki.home + s + ki.home, from: 'drill' });
        len += 4;
      } else if (focusSymbols.length && req.options?.symbols !== 'drill' && (focusLetters.length ? r.int(10) < 3 : r.int(10) < 6)) {
        const s = focusSymbols[r.int(focusSymbols.length)];
        const other = r.pick(pool, weight).w;
        const num = digits.length ? numberToken(digits, [], r, allowed) : '1';
        text = SYMBOL_SHAPE[s](text, other, num);
        if ([...text].some((c) => c !== ' ' && !allowed.includes(c))) text = x.w;
        else from = 'symbol shape';
      }
      tokens.push({ text, from });
      len += text.length + 1;
    }
    if (req.options?.look === 'dressed') dress(tokens, allowed, r);
    return { tokens, notes };
  }

  // ── The generator: one Detour request in, one Stage out ──
  // A Detour's Runs step from drill to words: Run 1 is a drill; every later
  // Run is words. Where no words can hold the Target, every Run is a drill.
  function generate(req, data) {
    const wp = req.waypoint;
    const allowed = wp.known;
    const focus = focusKeys(req.target, allowed);
    const request = {
      waypoint: wp.n,
      target: req.target,
      detourRun: req.run,
      seed: req.seed,
    };
    const seedText = JSON.stringify({ v: VERSION, ...request });
    const r = rng(seedText);
    const [lo, hi] = LENGTH[wp.sector];
    const notes = [];
    if (!focus.length) {
      return { error: `Nothing to practise: ${describeTarget(req.target)} has no keys learned by ${wp.name}.`, request };
    }

    const steps = req.options?.steps ?? 'drill-then-words';
    let kind = steps === 'words-first' ? 'words' : steps === 'mini-ladder' ? 'drill + words' : req.run === 1 ? 'drill' : 'words';
    let tokens = null;
    // A drill Run is short (seconds of typing); a words Run fills the Recipe's middle length.
    const drillLength = wp.sector === 's1' ? 60 : 80;
    let length = kind === 'drill' ? drillLength : Math.round((lo + hi) / 2);
    if (kind !== 'drill') {
      // A mini-ladder Run opens on a few seconds of drill, then words.
      const head = kind === 'drill + words' ? buildDrill(req, focus, 24, r) ?? [] : [];
      const headLen = head.reduce((a, x) => a + x.text.length + 1, 0);
      const built = buildWords(req, data, focus, length - headLen, r);
      if (built) {
        tokens = head.concat(built.tokens);
        notes.push(...built.notes);
      } else {
        kind = 'drill';
        length = drillLength;
        notes.push('No word can hold this Target with the keys learned so far, so this Run is a drill too.');
      }
    }
    if (kind === 'drill') tokens = buildDrill(req, focus, length, r);
    if (!tokens) return { error: 'No drill shape fits this Target.', request };

    const text = tokens.map((x) => x.text).join(' ');
    return {
      stage: {
        text,
        origin: 'Detour',
        options: req.options ?? {},
        kind,
        target: describeTarget(req.target),
        source: { madeBy: 'generator', version: VERSION, wordList: data.wordListVersion, ...request },
      },
      tokens,
      focus,
      notes,
      numbers: measure(text, focus, allowed, tokens, req.target),
      fingerprint: fnv1a(text).toString(16).padStart(8, '0'),
    };
  }

  // ── Worked-out numbers (the measuring function the checks share) ──
  function measure(text, focus, allowed, tokens, t) {
    const chars = [...text].filter((c) => c !== ' ');
    const bad = [...new Set(chars.filter((c) => !allowed.includes(c)))];
    const onFocus = chars.filter((c) => focus.includes(c)).length;
    const byFrom = {};
    for (const x of tokens) byFrom[x.from] = (byFrom[x.from] ?? 0) + 1;
    const wordsLike = tokens.filter((x) => x.from !== 'drill');
    const holds = wordsLike.filter((x) => [...x.text].some((c) => focus.includes(c))).length;
    const fingers = {};
    for (const c of chars) {
      const f = keyInfo(c)?.finger;
      if (f) fingers[f] = (fingers[f] ?? 0) + 1;
    }
    let mixBoth = null;
    if (t.type === 'mixup') mixBoth = wordsLike.filter((x) => x.text.includes(t.expected) && x.text.includes(t.typed)).length;
    return {
      length: text.length,
      targetKeystrokes: onFocus,
      targetShare: chars.length ? Math.round((onFocus * 100) / chars.length) : 0,
      onlyAllowedKeys: bad.length === 0,
      badKeys: bad,
      tokens: byFrom,
      wordsHoldingTarget: wordsLike.length ? `${holds} of ${wordsLike.length}` : null,
      mixupBoth: mixBoth,
      capitals: chars.filter((c) => /[A-Z]/.test(c)).length,
      fingers,
    };
  }

  root.Generator = { generate, focusKeys, describeTarget, keyInfo, FINGERS, ROWS, VERSION };
})(typeof window !== 'undefined' ? window : globalThis);
