# Security

What there is to protect, what the site stores and talks to, and how each threat is answered.
Update it whenever any of these change (CLAUDE.md, section 4).

## What the site stores on a device

| Key            | What                              |
| -------------- | --------------------------------- |
| `app:language` | The language chosen in the header |

Every value read back is parsed and checked (`src/hooks/storage.ts`), never cast.

## Hosts

The site talks to no host but its own. The Content Security Policy (`vite.config.ts`)
enforces it, and the browser test fails if any request leaves the site. A new host needs a
reason, a change to the policy and a line here.

## Threats and what answers them

| Threat                      | Answer                                                                                 | Checked by                      |
| --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| Script injection (XSS)      | Text is rendered as React text; CSP allows only the site's own files; Trusted Types on | e2e: CSP present, no violations |
| Tampered saved choices      | Parsed and checked; a bad value means the default                                      | unit (`storage.test.ts`)        |
| A compromised dependency    | Few runtime dependencies; `npm audit` blocks high advisories; no install scripts       | CI                              |
| A compromised workflow step | Read-only permissions by default; checkouts keep no token                              | review                          |
| A forged release            | Releases only from the deploy workflow; version, commit and date checked               | unit (`changelog.test.ts`)      |

## Known limits, accepted

- GitHub Pages sends no headers, so the policy is a `<meta>` tag and cannot forbid framing.
- Every Pages project of an account shares one origin (`<account>.github.io`), and with it
  `localStorage`. A custom domain gives the site an origin of its own.

## Repository settings

Set by the owner in the repository's settings on GitHub (README.md, "Starting a project"):
Dependabot alerts and security updates, secret scanning with push protection, CodeQL
default setup, a ruleset blocking force pushes and deletion on `{{PROD}}` and `dev`, and
read-only workflow permissions.

## Reporting

Open an issue on the repository, or tell the owner directly.
