# project-template

The starting point for every new project: a working React and TypeScript site on GitHub
Pages, with the whole working method already in place. `CLAUDE.md` (how work is done),
continuous integration, versioned releases, Dependabot, a security baseline, and the
documents a project keeps. Everything works on the first push.

## Starting a project

### The owner, in a browser (a phone is fine)

1. On https://github.com/matan0810/project-template press **Use this template** →
   **Create a new repository**. Name it (lowercase, with hyphens: it becomes the site's
   address), public, and create it.
2. In the new repository, **Settings**:
   - **Pages** → **Source**: **GitHub Actions**.
   - **Branches** is left as it is; the default branch is `master`.
   - **Advanced Security**: turn on Dependabot alerts, Dependabot security updates, Grouped
     security updates, Malware alerts, secret scanning with Push protection, and CodeQL
     analysis (Default).
   - **Rules** → **Rulesets** → **New branch ruleset**: name `protect`, Active, targets
     `master` and `dev` (by pattern), rules **Restrict deletions** and **Block force
     pushes** only. Create.
   - **Actions** → **General** → **Workflow permissions**: **Read repository contents and
     packages permissions**, and leave "Allow GitHub Actions to create and approve pull
     requests" off. Save.
3. Open a Claude Code session on the new repository and say what the project is.

### Claude, in the first session

1. Create `dev` from `master` and work there (`CLAUDE.md`, section 3).
2. In `package.json`: `name` = the repository's name, `description`, `homepage`; then
   `npm install` to bring `package-lock.json` in step.
3. In `CLAUDE.md`: replace every `{{PLACEHOLDER}}`, fill section 13, delete what does not
   apply and the opening comment. Do the same in `DESIGN.md` and `SECURITY.md`, and rewrite
   this README for the project.
4. Replace the first screen, the strings and the favicon.
5. `npm run check`, `npm run build && npm run e2e`, push `dev`, check CI.
6. On the owner's order, the first release: `npm run bump -- minor` (0.0.0 → 0.1.0), then
   `CLAUDE.md`, section 9. From then on, the live site exists and every release is tagged.

## What is in it

| Path                                                    | What                                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                                             | The working method; section 13 holds the project's own facts                                             |
| `README.md`, `DESIGN.md`, `CHANGELOG.md`, `SECURITY.md` | The project's documents, as skeletons                                                                    |
| `src/`                                                  | The site: first screen, Hebrew and English strings, saved settings, design tokens                        |
| `vite.config.ts`                                        | Build, the Pages path from `package.json`, the Content Security Policy                                   |
| `scripts/`                                              | `npm run bump`, the CHANGELOG helpers, the release plan, their tests                                     |
| `tests/e2e/smoke.mjs`                                   | Browser test: desktop and phone, both languages, CSP, no outside hosts                                   |
| `.github/workflows/`                                    | `checks.yml` (every check), `ci.yml` (dev and pull requests), `deploy.yml` (Pages, then tag and release) |
| `.github/dependabot.yml`                                | Grouped monthly updates against `dev`                                                                    |
| `.npmrc`, `.nvmrc`                                      | No install scripts; the Node version                                                                     |

## Commands

- `npm run dev`: the site with instant reload.
- `npm run check`: types, lint, format, unit tests. Must pass before any push.
- `npm run build && npm run e2e`: the browser test.
- `npm run bump -- patch|minor|major`: prepare a release.

## Improving the template

A lesson learned in a project that belongs in every project is made here, in this
repository, so the next project starts with it. Projects already created do not change by
themselves; bring a lesson to them in their own sessions.
