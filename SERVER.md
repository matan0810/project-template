# Server standard

For every project that has a server: where it runs, how it is built, and how people and
devices are known and allowed. A project without a server ignores this file. A project with
one follows it and records its own choices in `CLAUDE.md`, section 13, and `SECURITY.md`.

Status: proposed on 2026-11-27, at the owner's request to put every server in one place and
to raise the bar set by family-bingo's user management. Part 1 waits for the owner's choice
of platform; part 2 applies whatever the platform.

## Part 1. One platform for every server

### The choice

| Need of a project              | Cloudflare (Workers, D1, Durable Objects, KV) | Firebase (Firestore, Auth)              | Render (Node)             |
| ------------------------------ | --------------------------------------------- | --------------------------------------- | ------------------------- |
| Code of our own on the server  | Yes, TypeScript, tested like the site         | Only on the paid plan (Cloud Functions) | Yes                       |
| Live rooms (a game, live mode) | Durable Objects with WebSockets               | Live queries, but no referee of our own | WebSockets                |
| Always awake on the free plan  | Yes                                           | Yes                                     | No: sleeps, ~30 s to wake |
| Sign-in with Google later      | Our own code (OpenID Connect)                 | Built in                                | Our own code              |
| Works offline, syncs later     | Our own code                                  | Built in                                | Our own code              |
| Already used by                | OnAir (`live-video`)                          | family-bingo                            | kavoom                    |

**Recommended: Cloudflare.** It is the only one of the three that runs our own server code,
keeps live rooms and stays awake on the free plan. A referee for kavoom's games, a lock time for
Douze's predictions and a check of a bingo claim all need server code. The owner already runs
OnAir's Worker there, with its token in the repository secrets.

What it costs us:

- Google sign-in and offline sync are not built in. Google sign-in is about a hundred lines
  of tested code (part 2, "Accounts"). Offline sync is needed only by family-bingo; it stays
  on Firebase until a move is worth it.

Free limits, far above a group of friends:

- Workers: 100,000 requests a day.
- D1: 5 GB, 5 million reads a day.
- Durable Objects (SQLite) and KV within their free quotas.

### Moving the existing servers (after the owner chooses)

| Project      | Today                    | Plan                                                                          |
| ------------ | ------------------------ | ----------------------------------------------------------------------------- |
| OnAir        | Cloudflare Worker and KV | Stays; adopts part 2 when it gains users                                      |
| Douze        | No server                | Built on Cloudflare from the start                                            |
| kavoom       | Node on Render           | Rooms move to a Durable Object each; the site to Workers static assets; issue |
| family-bingo | Firebase                 | Stays while offline play matters on a trip; part 2's upgrades apply; issue    |

### How a server project is laid out

- `worker/`: the Worker (`wrangler.jsonc`, `src/`), one module per endpoint, and a Durable
  Object class per kind of live room.
- `shared/`: what the site and the Worker both use: types, parsing and checks of every value,
  limits, the rules of the game. No DOM and no Worker APIs, so both sides import it, and a value
  is checked by the same code on both ends.
- `worker/migrations/`: D1 schema migrations, numbered and append-only.
- Deploy: `.github/workflows/deploy-worker.yml` runs the checks, applies the migrations, then
  `wrangler deploy`. It deploys from the production branch only, and skips politely until the
  secrets exist.
- Secrets: `CLOUDFLARE_API_TOKEN` (a token limited to Workers, D1 and Durable Objects of one
  account) and `CLOUDFLARE_ACCOUNT_ID`, in the repository's secrets; runtime secrets with
  `wrangler secret`. Never in the repository.
- The site stays on GitHub Pages. The CSP's `connect-src` gains the Worker's host, and only
  that; `SECURITY.md` lists it with the reason.

## Part 2. Identity and access

### Principles

1. **The server is the only judge.** The site hides what a person may not do, but only the
   server decides. Every rule below is enforced on the server, and has a test that it refuses.
2. **Deny by default.** An endpoint states who may call it; anything not stated is refused.
3. **Least knowledge.** Store names, not people: no email, phone or real identity unless a
   feature needs it and the owner agreed.
4. **Secrets are never stored or logged in clear.** Only their hashes are kept; they never
   appear in an address's path or query, and never in an error message.
5. **Every limit is written down** (the table below), in `shared/`, and tested.

### Who is who

| Identity    | What it is                                                                    | How it is proven                                                             |
| ----------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Device**  | A browser on a phone or computer                                              | A random 256-bit device token, made on joining, kept in the device's storage |
| **Member**  | A name in a group (one person), held by one or more devices                   | The server's record of which devices hold the name                           |
| **Account** | Later: a person signed in with Google, linked to their members in every group | Google's signed ID token, checked on the server (OpenID Connect)             |

**First without accounts** (the owner's choice for Douze, 2026-11-27). Accounts come later and
add to members; they replace nothing.

### Roles in a group

| Role       | Who                                    | Can                                                                                                       |
| ---------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Owner**  | Whoever created the group; exactly one | Everything an admin can; name and remove admins; hand ownership over; rotate the invite; delete the group |
| **Admin**  | Named by the owner                     | The game's settings and results; drive live moments; release a stuck name; approve joiners                |
| **Member** | Anyone who joined with the invite      | Their own entries; read what the phase allows                                                             |

Roles are per group. A capability table in `shared/` (role × action) is the one source of
truth. The Worker checks it, the site reads it to hide buttons, and a test walks every cell,
allowed and refused.

### Joining and names

- **The invite** is an address with the group's id and a secret after `#`, so the secret
  never reaches a server log. The site sends it in a header. The owner can **rotate** it: old
  links stop letting people in, and the devices already in stay in.
- **Optional approval:** the owner may switch on "a new device waits until an admin approves
  it". It is off by default for a group of friends.
- **Picking a name:** a new device picks a free name, or adds a new one within the group's
  limit.
- **Taking over a held name:**
  - Every name: the device asks "is this you?", and the takeover is allowed but noted in
    the log, and the owner sees it.
  - The owner's and admins' names (**protected names**): they move only through a
    **move link**, made on the old device or by the owner. It is single use and expires
    after 15 minutes.

  This is family-bingo's trust model, with its first planned hardening built in.

### Devices and recovery

- **Device list:** each member sees the devices that hold their name (when added, last
  seen), and can sign out the others. The owner sees every device in the group and can revoke
  one.
- **Recovery code:** on creating a group, the owner gets a recovery code once (to save). It
  restores ownership on a new phone when the old one is lost. Only its hash is stored, and
  using it revokes the old owner devices.
- **Leaving and deleting:** a member can leave, and their entries go with them, or are kept
  anonymised if the group's history needs them. The owner can delete the group: everything goes,
  after the owner types the group's name.

### Phases and secrecy

What a member may read depends on the phase of the game, on the server:

- Hidden entries are not sent, not merely not shown.
- The reveal opens them all at once.
- Times come from the server's clock, never the client's. A lock time (for example the start
  of a show) is stored with the season and checked on every write.

### Tokens and requests

- Bearer device tokens go in the `Authorization` header and are compared in constant time.
- Tokens are stored as SHA-256 hashes. A token belongs to one device and one group.
- CORS allows the site's own origin only.
- JSON bodies only, with a size cap, parsed by `shared/`. An unknown field is refused, not
  ignored.
- Errors say what was wrong in general terms: no stack, no data, no hint of whether a
  secret was close.

### Limits (defaults; a project may lower them, and raises one only with a reason)

| What                                      | Limit                                                      |
| ----------------------------------------- | ---------------------------------------------------------- |
| Request body                              | 32 KB                                                      |
| Names (member, group)                     | 1 to 40 characters, cleaned of control and direction marks |
| Members in a group                        | 40                                                         |
| Devices per member                        | 5                                                          |
| Groups created from one address           | 5 a day                                                    |
| Groups in all                             | 2,000 (a warning to the owner at 1,500)                    |
| Writes from one device                    | 60 a minute                                                |
| Joins and failed secrets from one address | 10 an hour, then a pause                                   |
| Live room connections                     | 50 per group                                               |
| Audit log                                 | 1,000 entries per group, or 1 year                         |

### The audit log

Joins, name takeovers, role changes, revocations, invite rotations, deletions and every admin
action are appended to the group's log: who, what, when, from which device. The owner and the
admins read it. Nobody edits it.

### Accounts later (Google)

- The site signs in with Google, and the Worker checks the ID token: Google's signature, the
  audience, the issuer and the expiry.
- The account is linked to the member the device holds. From then on, the account can bring the
  member to any new device, with no move link.
- The owner may require accounts in a group. Only the account's subject id is stored, with the
  email if the owner wants to show it.

### Testing

- **The capability matrix:** every role × every action, allowed and refused, on the Worker,
  in the Workers runtime (`@cloudflare/vitest-pool-workers`).
- **Every refusal:** no token; a wrong token; a token of another group; a revoked device; a
  non-admin; too big; an unknown field or country; after the lock; over a limit; an expired or
  used move link.
- **Secrecy:** hidden entries are absent from the response, not only from the screen.
- **The browser test** runs against a local Worker with two devices: join, pick names, a
  takeover of a protected name refused, a move link that works once, a hidden entry revealed
  at its time, and a live room followed by the second device.
