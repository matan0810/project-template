import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

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

export default defineConfig({
  plugins: [react(), securityMeta()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  // GitHub Pages serves a project site at /<repository>/; package.json's name is the repository.
  base: `/${name}/`,
  test: {
    environment: 'node',
  },
});
