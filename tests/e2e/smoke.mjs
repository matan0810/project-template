// Browser smoke test: drives the built site in a real Chromium, on a desktop and on an
// emulated phone, in Hebrew and English.
//
//   npm run build && npm run e2e
//
// It fails on any page error, console error or Content Security Policy violation, on any
// request that leaves the site's own address, and on sideways scroll. Extend it with a step
// for every new screen or flow.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, devices } from 'playwright';
import { preview } from 'vite';

const { version } = JSON.parse(await readFile(new URL('../../package.json', import.meta.url)));

async function main() {
  const server = await preview({ preview: { port: 0 }, logLevel: 'silent' });
  const url = server.resolvedUrls.local[0];
  const browser = await chromium.launch();
  const problems = [];
  const step = (name) => console.log(`ok  ${name}`);

  const open = async (options, tag) => {
    const context = await browser.newContext(options);
    // A broken step fails in seconds, not after Playwright's half-minute wait.
    context.setDefaultTimeout(15_000);
    await context.route(
      (target) => target.hostname !== 'localhost',
      (route) => {
        problems.push(`${tag}: request to another host ${route.request().url()}`);
        return route.abort();
      },
    );
    await context.exposeFunction('__cspViolation', (what) =>
      problems.push(`${tag}: blocked by the CSP: ${what}`),
    );
    await context.addInitScript(() =>
      document.addEventListener('securitypolicyviolation', (e) =>
        window.__cspViolation(`${e.violatedDirective} ${e.blockedURI}`),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (error) => problems.push(`${tag}: ${error.message}`));
    page.on('console', (m) => m.type() === 'error' && problems.push(`${tag}: console ${m.text()}`));
    return { context, page };
  };
  const noOverflow = async (page, where) => {
    const extra = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert.ok(extra <= 0, `${where}: the page is ${extra}px wider than the screen`);
  };

  // ---------- Desktop ----------
  const { context: desk, page } = await open(
    { viewport: { width: 1280, height: 800 }, locale: 'he-IL' },
    'desktop',
  );
  await page.goto(url);
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.getByText(`v${version}`, { exact: true }).waitFor();
  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  assert.match(policy ?? '', /default-src 'none'/, 'the page carries its CSP');
  step('desktop: Hebrew, right to left, with the version and the CSP');

  await page.getByRole('button', { name: 'Switch to English' }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'ltr');
  await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  step('desktop: English, left to right, remembered after a reload');
  await desk.close();

  // ---------- Phone, both languages ----------
  for (const locale of ['he-IL', 'en-US']) {
    const { context, page: phone } = await open(
      { ...devices['iPhone 13'], locale },
      `phone ${locale}`,
    );
    await phone.goto(url);
    await phone.getByRole('heading', { level: 1 }).waitFor();
    await noOverflow(phone, locale);
    step(`phone ${locale}: fits the width`);
    await context.close();
  }

  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('all good');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
