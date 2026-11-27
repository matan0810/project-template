/**
 * Draws the brand files from the mark (public/favicon.svg) and the brand's facts
 * (scripts/brandFacts.ts): the home-screen icons, the web manifest, and the link card a
 * chat shows for the site's address (1200 × 630, JPEG to stay small). Drawn once and
 * committed; run again after any change to the mark, the name, the tagline or the colours:
 *
 *   node scripts/brand.ts
 *
 * The card uses the system's fonts. A project with a typeface of its own embeds it here,
 * as a data: URL, so the card looks like the site.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { CARD, CARD_SIZE, ICONS, readBrand } from './brandFacts.ts';

const root = new URL('../', import.meta.url);
const file = (path: string) => new URL(path, root);
const brand = readBrand();
const mark = await readFile(file('public/favicon.svg'));
const markUrl = `data:image/svg+xml;base64,${mark.toString('base64')}`;
const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
const rtl = /^(he|ar|fa)_/.test(brand.locale);

const page = (body: string) => `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;overflow:hidden;font-family:system-ui,sans-serif}
  </style><body>${body}</body>`;
const glow = `radial-gradient(ellipse at 30% 40%, ${brand.accent}33 0%, transparent 60%), ${brand.ink}`;

const icon = (size: number) =>
  page(`<div style="width:${size}px;height:${size}px;background:${brand.ink};display:grid;place-items:center">
    <img src="${markUrl}" style="width:${size}px;height:${size}px"></div>`);

const card =
  page(`<div dir="${rtl ? 'rtl' : 'ltr'}" style="width:${CARD_SIZE.width}px;height:${CARD_SIZE.height}px;
  background:${glow};display:flex;align-items:center;gap:64px;padding:0 96px;color:#fff">
  <img src="${markUrl}" style="width:240px;height:240px;flex:none;border-radius:48px">
  <div style="display:flex;flex-direction:column;gap:24px">
    <div dir="auto" style="font-size:96px;font-weight:800;line-height:1;color:${brand.accent}">${escape(brand.name)}</div>
    <div dir="auto" style="font-size:42px;line-height:1.3;opacity:.85">${escape(brand.tagline)}</div>
  </div></div>`);

await mkdir(file('public/brand'), { recursive: true });
const browser = await chromium.launch();
const shots: [string, string, number, number][] = [
  ...ICONS.map((i): [string, string, number, number] => [i.path, icon(i.size), i.size, i.size]),
  [CARD, card, CARD_SIZE.width, CARD_SIZE.height],
];
for (const [path, html, width, height] of shots) {
  const tab = await browser.newPage({ viewport: { width, height } });
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  await tab.locator('img').evaluate((img: HTMLImageElement) => img.decode());
  const jpeg = path.endsWith('.jpg');
  await tab.screenshot({
    path: file(`public/${path}`).pathname,
    type: jpeg ? 'jpeg' : 'png',
    quality: jpeg ? 88 : undefined,
  });
  await tab.close();
}
await browser.close();

const manifest = {
  name: brand.name,
  short_name: brand.name,
  description: brand.tagline,
  start_url: '.',
  display: 'standalone',
  background_color: brand.ink,
  theme_color: brand.ink,
  icons: ICONS.filter((i) => i.size >= 192).map((i) => ({
    src: i.path,
    sizes: `${i.size}x${i.size}`,
    type: 'image/png',
  })),
};
await writeFile(file('public/manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Brand files written.');
