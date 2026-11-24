import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
const DIR = process.argv[2];
const VOICE = 'Samantha';
const RATE = '178';

const SEGMENTS = [
  { id: 'top', text: "Version D puts everything together. It opens with the plain sentence, then one row of lifetime totals: days played, practice time, words typed, and your best day." },
  { id: 'timeline', text: "Next comes the timeline from version A. Speed now counts letters only, so the number drills in Pulsar Core no longer look like a step backwards." },
  { id: 'pick', text: "Clicking a Sector's name, or any day on the timeline, jumps down to that Sector's chapter in the logbook, and rings it." },
  { id: 'sweep', text: "The keyboard from version A still turns back in time as you move along the timeline." },
  { id: 'key', text: "Click a key to see its story, from version B. It starts on your trickiest key. The trend line is smoothed now: each point is your last five days, so it reads as a trend instead of noise." },
  { id: 'panels', text: "Underneath sit mix-ups, Shift hand and letter pairs, side by side." },
  { id: 'logbook', text: "At the bottom is the logbook from version C. The keys in each chapter are clickable too, and open that key's story above." },
  { id: 'trimmed', text: "And what's gone from today's screen: the old lifetime cards, hand balance, the heatmap and struggling reaches. The technique tips, Backup and the wipes stay." },
];

// 1. The voice, one clip per segment, and how long each lasts.
rmSync(`${DIR}/clips`, { recursive: true, force: true });
mkdirSync(`${DIR}/clips`, { recursive: true });
for (const [i, s] of SEGMENTS.entries()) {
  const aiff = `${DIR}/clips/${i}.aiff`;
  execFileSync('say', ['-v', VOICE, '-r', RATE, '-o', aiff, s.text]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@22050', '-c', '1', aiff, `${DIR}/clips/${i}.wav`]);
  const info = execFileSync('afinfo', [aiff]).toString();
  s.seconds = Number(/estimated duration: ([\d.]+)/.exec(info)[1]);
}

// 2. The recording.
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: `${DIR}/video`, size: { width: 1280, height: 800 } } });
const t0 = Date.now();
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms);
await page.goto('http://localhost:3147/?analytics=D');
await page.addStyleTag({ content: `
  div.fixed.bottom-4.left-4 { display: none !important; }
  #vo-hl { position: fixed; z-index: 9998; pointer-events: none; border: 3px solid #facc15; border-radius: 14px;
    box-shadow: 0 0 0 9999px rgba(2,6,23,0.55), 0 0 24px rgba(250,204,21,0.55); transition: all .45s ease; opacity: 0; }
  #vo-cap { position: fixed; z-index: 9999; left: 50%; bottom: 18px; transform: translateX(-50%); width: min(980px, 90vw);
    background: rgba(2,6,23,0.92); color: #f8fafc; border: 1px solid #334155; border-radius: 12px; padding: 12px 18px;
    font: 500 17px/1.4 Inter, system-ui, sans-serif; text-align: center; opacity: 0; transition: opacity .3s; }
  #vo-tag { position: fixed; z-index: 9999; top: 74px; right: 24px; background: #facc15; color: #111827;
    font: 700 13px/1 ui-monospace, monospace; padding: 7px 10px; border-radius: 8px; opacity: 0; transition: opacity .3s; }
`});
await page.evaluate(() => { for (const id of ['vo-hl', 'vo-cap', 'vo-tag']) { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); } });
const caption = (text) => page.evaluate((t) => { const c = document.getElementById('vo-cap'); c.textContent = t; c.style.opacity = t ? '1' : '0'; }, text);
const tag = (text) => page.evaluate((t) => { const c = document.getElementById('vo-tag'); c.textContent = t; c.style.opacity = t ? '1' : '0'; }, text);
const hlBox = (b, pad = 8) => page.evaluate(([b, pad]) => {
  const h = document.getElementById('vo-hl');
  if (!b) { h.style.opacity = '0'; return; }
  Object.assign(h.style, { left: `${b.x - pad}px`, top: `${b.y - pad}px`, width: `${b.width + pad * 2}px`, height: `${b.height + pad * 2}px`, opacity: '1' });
}, [b, pad]);
const hl = async (locator, pad) => hlBox(await locator.boundingBox(), pad);
const into = async (locator, block = 'center') => { await locator.evaluate((el, block) => el.scrollIntoView({ block, behavior: 'smooth' }), block); await wait(900); };
const setV = async (v) => { await page.evaluate((v) => { const u = new URL(location.href); u.searchParams.set('analytics', v); history.replaceState(null, '', u); window.dispatchEvent(new Event('prototype-params')); }, v); await wait(500); };
const card = (text) => page.getByText(text).first().locator('xpath=..');
const journey = () => page.locator('svg[aria-label="Journey"]').first();
// Geometry of the journey strips (see journeyCharts.tsx).
const LEFT = 92, RIGHT = 12, HEAD = 18, STRIP = 54, GAP = 10, LAST_DAY = 55;
const strip = async (i) => { const b = await journey().boundingBox(); return { x: b.x + LEFT - 4, y: b.y + HEAD + i * (STRIP + GAP) - 4, width: b.width - LEFT - RIGHT + 8, height: STRIP + 8 }; };
const dayX = async (day) => { const b = await journey().boundingBox(); const w = b.width - LEFT - RIGHT; return b.x + LEFT + ((day + 0.5) / (LAST_DAY + 1)) * w; };

const marks = [];
async function say(i, during) {
  const s = SEGMENTS[i];
  await caption(s.text);
  marks.push({ i, t: (Date.now() - t0) / 1000 });
  const ms = s.seconds * 1000 + 450;
  await Promise.all([wait(ms), during ? during() : Promise.resolve()]);
}

await page.getByRole('button', { name: 'Analytics', exact: true }).first().click();
await wait(1200);
const body = page.locator('.overflow-y-auto').last();
await tag('D · Together');
{ const h = await page.getByText(/^In \d+ days of play/).boundingBox(); const r = await page.getByText('Days played').locator('xpath=../..').boundingBox(); await hlBox({ x: h.x, y: h.y, width: h.width, height: r.y + r.height - h.y }); }
await say(0);
await hl(journey());
await say(1, async () => { await wait(4200); const x1 = await dayX(34.5), x2 = await dayX(42.5); const s0 = await strip(0); await hlBox({ x: x1, y: s0.y, width: x2 - x1, height: s0.height }, 4); });
{ const t = page.locator('svg[aria-label="Journey"] text', { hasText: 'Pulsar Core' }).first(); await hl(t, 6); }
await say(2, async () => { await wait(2600); await page.locator('svg[aria-label="Journey"] text', { hasText: 'Pulsar Core' }).first().click(); await wait(1100); await hl(page.locator('ol li.ring-2').first()); await wait(3200); await hlBox(null); await body.evaluate((el) => el.scrollTo({ top: 0, behavior: 'smooth' })); });
await wait(900);
await into(card(/Your keys/), 'center');
await hl(card(/Your keys/).locator('xpath=..'));
await say(3, async () => {
  const b = await journey().boundingBox();
  const y = b.y + b.height - 50 > 170 ? b.y + b.height - 50 : 200;
  for (let k = 0; k <= 50; k++) { await page.mouse.move(await dayX(Math.round((k / 50) * LAST_DAY)), y); await wait(130); }
  await page.mouse.move(1260, 500);
});
await hl(page.getByText(/^Learned /).first().locator('xpath=../../..'));
await say(4, async () => { await wait(7500); await page.locator('button[title^="p ("]').first().click(); });
await into(card('Mix-ups · all time').locator('xpath=..'), 'center');
await hl(card('Mix-ups · all time').locator('xpath=..'));
await say(5);
await into(page.getByText(/Your logbook/), 'start');
await hl(page.locator('ol').first());
await say(6, async () => { await wait(4000); await page.locator('ol li').nth(2).locator('button').first().click(); await wait(500); await into(page.getByText(/^Learned /).first(), 'center'); await hl(page.getByText(/^Learned /).first().locator('xpath=../../..')); });
await hlBox(null);
await into(page.getByText(/Touch Typing Master Techniques/i), 'start');
{ const t = await page.getByText(/Touch Typing Master Techniques/i).locator('xpath=..').boundingBox(); const bk = await page.getByText('Save & Backup').locator('xpath=../..').boundingBox(); await hlBox({ x: t.x, y: t.y, width: t.width, height: bk.y + bk.height - t.y }); }
await say(7);
await caption(''); await hlBox(null); await tag('');
await wait(1000);
const video = page.video();
await context.close();
await browser.close();
const path = await video.path();

// 3. One soundtrack: each clip placed at the moment its caption appeared.
writeFileSync(`${DIR}/marks.json`, JSON.stringify({ path, total: (Date.now() - t0) / 1000, marks, segments: SEGMENTS.map((s) => ({ id: s.id, seconds: s.seconds, text: s.text })) }, null, 1));
console.log(path);
