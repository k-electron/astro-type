// PROTOTYPE recorder for the #189 walkthrough videos.
// Usage: node record.mjs <video id> <out dir>
// Plays each Run in the real game through Free Flight, with a voice clip per
// line, and writes marks.json (clip times and fast-forward spans).
import { chromium } from '/Users/karim/Documents/repos/astro-type/node_modules/@playwright/test/index.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { VIDEOS } from './script.mjs';
import { keyPlan } from './typist.mjs';

const [id, OUT] = process.argv.slice(2);
const V = VIDEOS.find((v) => v.id === id);
const REAL_SECONDS = 16;

// 1. The lines, in order, and the voice clip for each.
const lines = [];
const line = (text) => {
  lines.push({ text });
  return lines.length - 1;
};
const plan = { intro: line(V.intro), runs: [] };
for (const r of V.runs) {
  const stat = `${V.spoken}: ${r.play.target.right} of ${r.play.target.of} right first time.`;
  const after = r.say.after ? r.say.after.replace('{r}', r.play.target.right).replace('{o}', r.play.target.of) : stat;
  plan.runs.push({ card: line(r.say.card), during: r.say.during ? line(r.say.during) : null, after: line(after) });
}
rmSync(`${OUT}/clips`, { recursive: true, force: true });
mkdirSync(`${OUT}/clips`, { recursive: true });
for (const [i, l] of lines.entries()) {
  const aiff = `${OUT}/clips/${i}.aiff`;
  execFileSync('say', ['-v', 'Samantha', '-r', '178', '-o', aiff, l.text]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@22050', '-c', '1', aiff, `${OUT}/clips/${i}.wav`]);
  l.seconds = Number(/estimated duration: ([\d.]+)/.exec(execFileSync('afinfo', [aiff]).toString())[1]);
}

// 2. The recording.
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: `${OUT}/video`, size: { width: 1280, height: 800 } } });
const page = await context.newPage();
const t0 = Date.now();
const now = () => (Date.now() - t0) / 1000;
const wait = (ms) => page.waitForTimeout(ms);
await page.goto('http://localhost:3000/');
await wait(1500);
await page.addStyleTag({ content: `
  #vo-card { position: fixed; inset: 0; z-index: 9990; background: rgba(2,6,23,0.95); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .35s; pointer-events: none; }
  #vo-card .box { width: 980px; font-family: Inter, system-ui, sans-serif; color: #e2e8f0; }
  #vo-card .eyebrow { font: 600 13px/1 'JetBrains Mono', ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; color: #22d3ee; }
  #vo-card h1 { font: 700 34px/1.2 Inter, sans-serif; margin: 12px 0 10px; color: #f8fafc; }
  #vo-card .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
  #vo-card .pill { font: 600 13px/1 Inter, sans-serif; padding: 7px 11px; border-radius: 99px; background: #0f172a; border: 1px solid #334155; color: #cbd5e1; }
  #vo-card .pill.kind { background: #083344; border-color: #0891b2; color: #67e8f9; }
  #vo-card .pill.opt { background: #3b2a05; border-color: #ca8a04; color: #fde68a; }
  #vo-card .stage { font: 500 21px/1.75 'JetBrains Mono', ui-monospace, monospace; background: #020617; border: 1px solid #1e293b; border-radius: 14px; padding: 18px 22px; white-space: pre-wrap; word-break: break-word; color: #94a3b8; max-height: 300px; overflow: hidden; }
  #vo-card .stage b { color: #fde047; font-weight: 700; }
  #vo-card .say { margin-top: 20px; font: 500 19px/1.5 Inter, sans-serif; color: #e2e8f0; min-height: 3em; }
  #vo-card .result { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 8px; }
  #vo-card .result div { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 14px 16px; }
  #vo-card .result span { display: block; font: 600 12px/1 Inter; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }
  #vo-card .result strong { font: 700 28px/1 'JetBrains Mono', monospace; color: #f8fafc; }
  #vo-cap { position: fixed; z-index: 9995; left: 34px; top: 392px; width: 248px; background: rgba(2,6,23,0.93); color: #f1f5f9; border: 1px solid #334155; border-left: 3px solid #facc15; border-radius: 10px; padding: 12px 14px; font: 500 15px/1.45 Inter, system-ui, sans-serif; opacity: 0; transition: opacity .3s; }
  #vo-cap.bottom { left: 50%; top: auto; bottom: 14px; transform: translateX(-50%); width: 880px; text-align: center; font-size: 17px; border-left-width: 1px; border-color: #facc15; }
  #vo-tag { position: fixed; z-index: 9995; right: 34px; top: 392px; background: #facc15; color: #111827; font: 700 13px/1.3 'JetBrains Mono', ui-monospace, monospace; padding: 8px 11px; border-radius: 8px; opacity: 0; transition: opacity .3s; max-width: 250px; text-align: right; white-space: pre-line; }
  #vo-tag.ff { background: #f472b6; color: #1f0a17; }
`});
await page.evaluate(() => { for (const id of ['vo-card', 'vo-cap', 'vo-tag']) { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); } });

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const hl = (text, focus) => [...text].map((c) => (focus.includes(c) ? `<b>${esc(c)}</b>` : esc(c))).join('');
async function card(html) {
  await page.evaluate((h) => { const c = document.getElementById('vo-card'); if (h) c.innerHTML = `<div class="box">${h}</div>`; c.style.opacity = h ? '1' : '0'; }, html);
}
async function caption(text, mode = 'deck') {
  await page.evaluate(([t, m]) => { const c = document.getElementById('vo-cap'); c.textContent = t; c.className = m === 'bottom' ? 'bottom' : ''; c.style.opacity = t ? '1' : '0'; }, [text, mode]);
}
async function tag(text, ff = false) {
  await page.evaluate(([t, f]) => { const c = document.getElementById('vo-tag'); c.textContent = t; c.className = f ? 'ff' : ''; c.style.opacity = t ? '1' : '0'; }, [text, ff]);
}
async function setCardSay(text) {
  await page.evaluate((t) => { const s = document.querySelector('#vo-card .say'); if (s) s.textContent = t; }, text);
}
const marks = [];
const ff = [];
async function say(i) {
  marks.push({ i, t: now() });
  await wait(lines[i].seconds * 1000 + 450);
}

const head = (r) => `<div class="eyebrow">${V.part === 1 ? 'Part 1 · The proposal' : 'Part 2 · An open call'} · ${esc(r.day)} · about ${r.wpm} WPM</div>`;

// Intro.
const r0 = V.runs[0];
await card(`${head(r0)}<h1>${esc(V.title)}</h1><div class="meta"><span class="pill">Waypoint ${esc(r0.waypoint)}</span><span class="pill">Sector: ${esc(r0.sector)}</span><span class="pill">Detour Target: ${esc(r0.target)}</span></div><div class="say">${esc(V.intro)}</div>`);
await wait(700);
await say(plan.intro);

for (const [k, r] of V.runs.entries()) {
  const p = plan.runs[k];
  // The Stage card, while Free Flight is set up underneath.
  const runLabel = `Run ${r.run} · ${r.kind}`;
  await card(`${head(r)}<h1>${esc(V.title)}</h1><div class="meta"><span class="pill">${esc(r.waypoint)}</span><span class="pill">Target: ${esc(r.target)}</span><span class="pill kind">${esc(runLabel)}</span>${r.option ? `<span class="pill opt">${esc(r.option)}</span>` : ''}</div><div class="stage">${hl(r.text, r.focus)}</div><div class="say">${esc(lines[p.card].text)}</div>`);
  await page.getByRole('button', { name: 'Free Flight', exact: true }).click();
  await wait(500);
  await page.locator('textarea').fill(r.text);
  await say(p.card);
  await page.getByRole('button', { name: /Start Free Flight/ }).click();
  await wait(600);
  await card('');
  await tag(`${runLabel}\nreal time`);
  await wait(900);

  // Type it.
  const typingStart = now();
  let speed = 1;
  const total = r.play.seconds;
  const typing = (async () => {
    for (const pr of r.play.presses) {
      await wait(pr.afterMs);
      const kp = keyPlan(pr.key, pr.shift);
      if (kp.shiftKey) { await page.keyboard.down(kp.shiftKey); await page.keyboard.press(kp.code); await page.keyboard.up(kp.shiftKey); }
      else await page.keyboard.press(kp.code);
    }
  })();
  if (p.during !== null) { await wait(1200); await caption(lines[p.during].text); await say(p.during); await caption(''); }
  const realUntil = typingStart + Math.max(REAL_SECONDS, now() - typingStart + 1);
  const remaining = total - (realUntil - typingStart);
  if (remaining > 6) {
    await wait((realUntil - now()) * 1000);
    const factor = Math.max(3, Math.ceil(remaining / 9));
    const a = now();
    await tag(`▶▶ fast-forward ×${factor}`, true);
    await typing;
    await wait(700);
    ff.push({ a: a + 0.4, b: now(), k: factor });
  } else {
    await typing;
  }
  await page.locator('text=/debrief/i').first().waitFor({ timeout: 15000 });
  await tag(`${runLabel}\nthe Debrief`);
  await wait(2600);
  const pl = r.play;
  await card(`${head(r)}<h1>${esc(runLabel)}: how it went</h1><div class="meta"><span class="pill">${esc(r.waypoint)}</span><span class="pill">Target: ${esc(r.target)}</span>${r.option ? `<span class="pill opt">${esc(r.option)}</span>` : ''}</div>
    <div class="result"><div><span>${esc(V.spoken)}, right first time</span><strong>${pl.target.right} / ${pl.target.of}</strong></div><div><span>Whole Run accuracy</span><strong>${pl.accuracy}%</strong></div><div><span>Speed</span><strong>${pl.wpm} WPM</strong></div></div>
    <div class="say">${esc(lines[p.after].text)}</div>`);
  await tag('');
  await say(p.after);
}
await card('');
await wait(800);
const video = page.video();
await context.close();
await browser.close();
const path = await video.path();
writeFileSync(`${OUT}/marks.json`, JSON.stringify({ id, path, total: now(), marks, ff, lines }, null, 1));
console.log(id, 'recorded', now().toFixed(1), 's', path);
