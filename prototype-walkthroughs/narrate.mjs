import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
const DIR = process.argv[2];
const VOICE = 'Samantha';
const RATE = '178';

const SEGMENTS = [
  { id: 'headline', text: "This is the Analytics screen after two made-up months of a beginner's play. It opens with one plain sentence: how far you've come, and the one key to work on next. A beginner can stop reading right here." },
  { id: 'strips', text: "Version A is a timeline. Each strip is one measure across the calendar: speed, accuracy, rhythm, and which hand holds Shift. Every dot is a day you played." },
  { id: 'bands', text: "The coloured bands are the Sectors. Each day takes the colour of the furthest Sector you'd reached, because Star gates sometimes send you back to earlier Stages for a while." },
  { id: 'away', text: "The dark columns are days away. They're never drawn as a zero, and nothing is lost while you're away." },
  { id: 'guides', text: "The dashed lines are the targets. On accuracy, they're the Star bars: ninety, ninety-five and ninety-eight percent. On rhythm, they mark Paced and Steady." },
  { id: 'dip', text: "Now watch speed here. It drops in Pulsar Core, the number drills, then recovers. The player didn't get worse; numbers are just slower to type. So the real version will count speed on letters and Space only." },
  { id: 'sweep', text: "Moving along the timeline turns the keyboard back in time. Each key shows how it was on that day. Green is quick, amber is slow, red is very slow, and a red ring means often missed. Dark keys weren't learned yet." },
  { id: 'mixups', text: "Mix-ups list the key you meant, the key you pressed instead, and why: next door, same finger, or the other hand." },
  { id: 'shift', text: "Shift hand shows how often capitals were typed with the Shift on the other hand, the way touch typists do it." },
  { id: 'pairs', text: "Letter pairs show how long the second letter takes after the first. Your slowest pairs are on top. Below them are the ten most common pairs in English, with your time on each." },
  { id: 'b-keys', text: "Version B puts the keys first. You pick a key on the keyboard, or one from Needs work, or Most improved." },
  { id: 'b-detail', text: "Each key shows its finger, how fast it was at first and how fast it is now, and its trend: time per key in amber, right first time in green. See how jumpy one key's line is on days it was barely typed. The real version will smooth that out." },
  { id: 'c', text: "Version C is a logbook, with one chapter per Sector: when you flew it, for how many days, the Stars you earned, how your speed and accuracy changed, and the keys it taught you, coloured by how they are now." },
  { id: 'today', text: "Below every version is today's Analytics screen. Backup and the wipes stay. The lifetime totals shrink to one row, and the hand balance and the old heatmap go, because the keyboard does their job." },
  { id: 'wrap', text: "My suggestion: version A as the backbone, with B's key detail when you click a key, and C's chapter when you click a Sector." },
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
await page.goto('http://localhost:3147/?analytics=A');
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

await tag('A · Timeline');
await hl(page.getByText(/^In \d+ days of play/));
await say(0);
await hl(journey());
await say(1);
{ const b = await journey().boundingBox(); await hlBox({ x: b.x + LEFT, y: b.y, width: b.width - LEFT - RIGHT, height: HEAD + 2 * (STRIP + GAP) }, 6); }
await say(2);
{ const x1 = await dayX(21.5), x2 = await dayX(25.5); const b = await journey().boundingBox(); await hlBox({ x: x1, y: b.y + HEAD, width: x2 - x1, height: 4 * (STRIP + GAP) - GAP }, 4); }
await say(3);
await hlBox(await strip(1));
await say(4, async () => { await wait(5200); await hlBox(await strip(2)); });
{ const x1 = await dayX(34.5), x2 = await dayX(42.5); const s0 = await strip(0); await hlBox({ x: x1, y: s0.y, width: x2 - x1, height: s0.height }, 4); }
await say(5);
await into(card('Your keys'), 'center');
await hl(card(/Your keys/));
await say(6, async () => {
  const b = await journey().boundingBox();
  const y = b.y + b.height - 50 > 170 ? b.y + b.height - 50 : 200;
  for (let k = 0; k <= 60; k++) { await page.mouse.move(await dayX(Math.round((k / 60) * LAST_DAY)), y); await wait(150); }
  await page.mouse.move(1260, 500);
});
await hl(card('Mix-ups · all time'));
await say(7);
await hl(card('Shift hand · all time'));
await say(8);
await into(card(/^Letter pairs/), 'center');
await hl(card(/^Letter pairs/));
await say(9);

await hlBox(null); await body.evaluate((el) => el.scrollTo({ top: 0 })); await setV('B'); await tag('B · Keys first');
await into(card(/Your keys · click one/), 'start');
await hl(card(/Your keys · click one/));
await say(10, async () => { await wait(2500); await page.locator('button[title^="p ("]').first().click(); });
await into(page.getByText(/^Learned /).first().locator('xpath=../../../..'), 'center');
await hl(page.getByText(/^Learned /).first().locator('xpath=../../../..'));
await say(11);

await hlBox(null); await body.evaluate((el) => el.scrollTo({ top: 0 })); await setV('C'); await tag('C · Logbook');
await hl(page.locator('ol li').first());
await say(12, async () => { await wait(5000); await hl(page.locator('ol li').first().locator('div.flex.flex-wrap.gap-1').first(), 6); await wait(3000); await into(page.locator('ol li').nth(3), 'center'); await hl(page.locator('ol li').nth(3)); });

await hlBox(null); await tag('Today\'s screen');
await into(page.getByText(/Today's Analytics screen/), 'start');
await wait(300);
{ const b1 = await page.getByText(/Today's Analytics screen/).boundingBox(); await hlBox({ x: b1.x, y: b1.y, width: 846, height: 560 }, 8); }
await say(13, async () => { await wait(4500); await into(page.getByText(/Backup/i).first(), 'center'); await hl(page.getByText(/Backup/i).first().locator('xpath=../..')); });

await hlBox(null); await setV('A'); await body.evaluate((el) => el.scrollTo({ top: 0, behavior: 'smooth' })); await wait(800); await tag('A + B + C');
await hl(journey());
await say(14);
await caption(''); await hlBox(null); await tag('');
await wait(1000);
const video = page.video();
await context.close();
await browser.close();
const path = await video.path();

// 3. One soundtrack: each clip placed at the moment its caption appeared.
writeFileSync(`${DIR}/marks.json`, JSON.stringify({ path, total: (Date.now() - t0) / 1000, marks, segments: SEGMENTS.map((s) => ({ id: s.id, seconds: s.seconds, text: s.text })) }, null, 1));
console.log(path);
