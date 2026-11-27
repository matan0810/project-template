/**
 * The brand's facts, from their one source each: the name and the tagline in brand.json,
 * the colours in the design tokens (src/styles/global.css), the address in package.json.
 * Read by the build (the page's title, description and link card) and by scripts/brand.ts.
 */
import { readFileSync } from 'node:fs';

export interface Brand {
  name: string;
  tagline: string;
  /** The card's language for chat apps, such as he_IL. */
  locale: string;
  /** The site's address, from package.json's homepage, without a trailing slash. */
  homepage: string;
  ink: string;
  accent: string;
}

/** Where the brand files live, relative to the site's root. */
export const CARD = 'brand/card.jpg';
export const CARD_SIZE = { width: 1200, height: 630 } as const;
export const ICONS = [
  { path: 'apple-touch-icon.png', size: 180 },
  { path: 'brand/icon-192.png', size: 192 },
  { path: 'brand/icon-512.png', size: 512 },
] as const;

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function text(value: unknown, what: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`brand.json: ${what} must be a text of 1 to ${max} characters`);
  return value.trim();
}

function token(css: string, name: string): string {
  const found = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(css)?.[1];
  if (!found) throw new Error(`src/styles/global.css: --${name} must be a hex colour`);
  return found;
}

export function readBrand(): Brand {
  const raw: unknown = JSON.parse(read('brand.json'));
  const pkg: unknown = JSON.parse(read('package.json'));
  if (typeof raw !== 'object' || raw === null) throw new Error('brand.json: expected an object');
  if (typeof pkg !== 'object' || pkg === null || !('homepage' in pkg))
    throw new Error('package.json: expected a homepage');
  const homepage = text(pkg.homepage, 'homepage', 200).replace(/\/$/, '');
  if (!/^https:\/\//.test(homepage)) throw new Error('package.json: homepage must be https');
  const css = read('src/styles/global.css');
  const field = (key: string) => (key in raw ? (raw as Record<string, unknown>)[key] : undefined);
  const locale = text(field('locale'), 'locale', 10);
  if (!/^[a-z]{2}_[A-Z]{2}$/.test(locale)) throw new Error('brand.json: locale like he_IL');
  return {
    name: text(field('name'), 'name', 40),
    tagline: text(field('tagline'), 'tagline', 120),
    locale,
    homepage,
    ink: token(css, 'ink'),
    accent: token(css, 'accent'),
  };
}
