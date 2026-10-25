// Smoke check: the URL serves the app shell and its script bundle.
// Usage: node scripts/smoke.mjs <url>
const base = process.argv[2];
if (!base) {
  console.error('usage: node scripts/smoke.mjs <url>');
  process.exit(2);
}

// A Worker's first workers.dev hostname can take a minute or two to resolve.
const attempts = 12;
const delayMs = 10000;

async function fetchOk(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} returned ${response.status}`);
  }
  return response;
}

async function check() {
  const html = await (await fetchOk(base)).text();
  if (!html.includes('<title>AstroType')) {
    throw new Error(`${base} did not serve the AstroType page`);
  }
  if (!html.includes('id="root"')) {
    throw new Error(`${base} is missing the #root mount point`);
  }
  const script = html.match(/<script[^>]*\ssrc="([^"]+)"/)?.[1];
  if (!script) {
    throw new Error(`${base} has no script bundle`);
  }
  await fetchOk(new URL(script, base));
}

for (let attempt = 1; ; attempt++) {
  try {
    await check();
    console.log(`smoke check passed: ${base}`);
    break;
  } catch (error) {
    if (attempt >= attempts) {
      console.error(`smoke check failed: ${error.message}`);
      process.exit(1);
    }
    console.log(`attempt ${attempt} failed (${error.message}); retrying`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
