import { readFileSync, writeFileSync } from 'node:fs';
const t = readFileSync('template.html', 'utf8');
const g = readFileSync('generator.js', 'utf8');
writeFileSync('index.html', t.replace('/*GENERATOR*/', () => g));
const d = readFileSync('data.js', 'utf8');
writeFileSync('data.json', d.slice(d.indexOf('{'), d.lastIndexOf('}') + 1));
