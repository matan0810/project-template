import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARD, ICONS, readBrand } from './brandFacts';

const publicFile = (path: string) => new URL(`../public/${path}`, import.meta.url);

describe('the brand', () => {
  const brand = readBrand();

  it('has a name, a tagline, colours and an https address', () => {
    expect(brand.name.length).toBeGreaterThan(0);
    expect(brand.homepage).toMatch(/^https:\/\//);
  });

  it('has its files drawn: the link card, the icons and the manifest', () => {
    for (const path of [CARD, ...ICONS.map((i) => i.path), 'manifest.webmanifest'])
      expect(existsSync(publicFile(path)), `public/${path}: run node scripts/brand.ts`).toBe(true);
  });

  it('was drawn from the current facts (otherwise: node scripts/brand.ts)', () => {
    const manifest: unknown = JSON.parse(readFileSync(publicFile('manifest.webmanifest'), 'utf8'));
    expect(manifest).toMatchObject({
      name: brand.name,
      description: brand.tagline,
      theme_color: brand.ink,
    });
  });
});
