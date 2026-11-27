import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { CARD, CARD_SIZE, readBrand } from './scripts/brandFacts.ts';

const { name, version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

/**
 * What the built page may load and run. GitHub Pages cannot send headers, so the policy is
 * a <meta> tag (which cannot carry frame-ancestors). Everything comes from the site itself;
 * no inline script, no plugin, no form. React sets styles through the CSSOM, which
 * `style-src 'self'` allows. Trusted Types make any write of HTML from script fail.
 * Only in the build: the dev server injects inline scripts of its own.
 * A new outside host needs a reason here and a line in SECURITY.md.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
].join('; ');

function securityMeta(): Plugin {
  return {
    name: 'security-meta',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
      {
        tag: 'meta',
        attrs: { name: 'referrer', content: 'no-referrer' },
        injectTo: 'head-prepend',
      },
    ],
  };
}

/**
 * The page's name, description, icons and link card: what a browser tab, a home screen and
 * a chat (WhatsApp, Telegram and the like) show for the site's address. All from the brand's
 * facts (scripts/brandFacts.ts); the card itself is drawn by scripts/brand.ts. The card's
 * address must be absolute, so it comes from package.json's homepage.
 */
function brandMeta(): Plugin {
  const brand = readBrand();
  const meta = (attrs: Record<string, string>) => ({
    tag: 'meta',
    attrs,
    injectTo: 'head' as const,
  });
  const link = (attrs: Record<string, string>) => ({
    tag: 'link',
    attrs,
    injectTo: 'head' as const,
  });
  return {
    name: 'brand-meta',
    transformIndexHtml: (html) => ({
      html: html.replace(/<title>[^<]*<\/title>/, ''),
      tags: [
        { tag: 'title', children: brand.name, injectTo: 'head' },
        meta({ name: 'description', content: brand.tagline }),
        meta({ name: 'theme-color', content: brand.ink }),
        link({ rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }),
        link({ rel: 'apple-touch-icon', href: `${BASE}apple-touch-icon.png` }),
        link({ rel: 'manifest', href: `${BASE}manifest.webmanifest` }),
        meta({ property: 'og:type', content: 'website' }),
        meta({ property: 'og:site_name', content: brand.name }),
        meta({ property: 'og:title', content: brand.name }),
        meta({ property: 'og:description', content: brand.tagline }),
        meta({ property: 'og:url', content: `${brand.homepage}/` }),
        meta({ property: 'og:locale', content: brand.locale }),
        meta({ property: 'og:image', content: `${brand.homepage}/${CARD}` }),
        meta({ property: 'og:image:width', content: String(CARD_SIZE.width) }),
        meta({ property: 'og:image:height', content: String(CARD_SIZE.height) }),
        meta({ property: 'og:image:alt', content: `${brand.name}: ${brand.tagline}` }),
        meta({ name: 'twitter:card', content: 'summary_large_image' }),
      ],
    }),
  };
}

// GitHub Pages serves a project site at /<repository>/; package.json's name is the repository.
const BASE = `/${name}/`;

export default defineConfig({
  plugins: [react(), securityMeta(), brandMeta()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  base: BASE,
  test: {
    environment: 'node',
  },
});
