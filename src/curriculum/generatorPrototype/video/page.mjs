// PROTOTYPE: writes the walkthrough page (#189) from the video script.
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { VIDEOS } from './script.mjs';

const dur = (id) => {
  try {
    const m = /([\d.]+)s [\d.]+MB/.exec(readFileSync(new URL(`./out/${id}.log`, import.meta.url), 'utf8'));
    return m ? Math.round(+m[1]) : null;
  } catch { return null; }
};
const chapters = VIDEOS.filter((v) => existsSync(new URL(`./out/${v.id}.mp4`, import.meta.url))).map((v) => ({
  id: v.id, part: v.part, title: v.title, intro: v.intro, seconds: dur(v.id),
  day: v.runs[0].day, wpm: v.runs[0].wpm, waypoint: v.runs[0].waypoint, target: v.runs[0].target,
  runs: v.runs.map((r) => ({ label: `Run ${r.run} · ${r.kind}`, option: r.option ?? null, text: r.text, focus: r.focus,
    right: r.play.target.right, of: r.play.target.of, acc: r.play.accuracy, wpm: r.play.wpm })),
}));

const CALLS = [
  { id: 'A', video: 'v11', q: 'How does a Detour step from Run to Run?', options: [
    ['drill-then-words', 'Run 1 a drill, every later Run words', 'proposal', 'v03'],
    ['mini-ladder', 'Every Run a mini ladder: a few seconds of drill, then words'],
    ['words-first', 'Words from Run 1, no drill'],
  ] },
  { id: 'B', video: 'v12', q: 'How does a words Run look?', options: [
    ['plain', 'A plain list (capitals and symbols only when they are the Target)', 'proposal'],
    ['dressed', 'Dressed like the Waypoint\'s text: capitals, commas and full stops learned so far'],
  ] },
  { id: 'C', video: 'v13', q: 'When fewer than 15 real words fit (only A and ; and the Home row review)?', options: [
    ['made-up', 'Real words topped up with vetted made-up words', 'proposal', 'v02'],
    ['repeat', 'Real words only, repeated'],
    ['drill', 'Drill only until words are plentiful'],
  ] },
  { id: 'D', video: 'v14', q: 'How do symbols appear in a words Run?', options: [
    ['shapes', 'In the shape people use them: (word), $47, word-word', 'proposal', 'v09'],
    ['drill', 'As drill groups between plain words: l(l'],
  ] },
];

const tpl = readFileSync(new URL('./page.template.html', import.meta.url), 'utf8');
writeFileSync(new URL('./out/index.html', import.meta.url), tpl.replace('/*DATA*/', () => `const CHAPTERS = ${JSON.stringify(chapters)};\nconst CALLS = ${JSON.stringify(CALLS)};`));
console.log('chapters', chapters.length, chapters.map((c) => `${c.id}:${c.seconds}s`).join(' '));
