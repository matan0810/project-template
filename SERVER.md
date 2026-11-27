# Server standard

For every project that has a server: where it runs, how it is built, how people are known and
what they may do, how it is watched, and how it is tested. A project without a server ignores
this file. A project with one follows it, and records its own choices in `CLAUDE.md`
(section 13) and `SECURITY.md`.

Status: draft of 2026-11-27, written at the owner's request: one place for every server, and
user management raised from family-bingo's to a professional standard. Waiting for the owner's
choice of platform (part 1) and of access level (part 2).

Built on these professional references:

- **OWASP ASVS 5.0** (Application Security Verification Standard): the chapters on
  authentication, session management, authorization, OAuth and OIDC, API and web service,
  validation and business logic, and security logging.
- **OWASP cheat sheets** on authorization, session management, logging and mass assignment.
- **NIST SP 800-63B** (digital identity: authenticators, sessions, recovery).
- **NIST RBAC** (role-based access control) and the principle of least privilege.
- **RFC 9700** (OAuth 2.0 Security Best Current Practice) with **RFC 7636** (PKCE), and
  **OpenID Connect Core**.
- **GDPR article 5** (data minimisation and storage limitation).
- The group model of products people already know: WhatsApp and Discord (an owner, admins,
  invite links that can be revoked, an admin log).

## Part 1. One platform for every server

### The candidates

| Need                                 | Cloudflare (Workers, D1, Durable Objects, KV) | Firebase (Firestore, Auth)              | Render (Node)              |
| ------------------------------------ | --------------------------------------------- | --------------------------------------- | -------------------------- |
| Code of our own on the server        | Yes, TypeScript, tested like the site         | Only on the paid plan (Cloud Functions) | Yes                        |
| Live rooms (a game, live mode)       | Durable Objects with WebSockets               | Live queries, but no referee of our own | WebSockets                 |
| Awake on the free plan               | Always                                        | Always                                  | Sleeps; about 30 s to wake |
| Sign-in with Google                  | Our own code (about a day's work)             | Built in                                | Our own code               |
| Works with no reception, syncs later | Our own code                                  | Built in                                | Our own code               |
| Already used by                      | OnAir (`live-video`)                          | family-bingo                            | kavoom                     |

### Cloudflare's drawbacks, honestly

1. **A different runtime.** Workers are not Node: some npm packages do not run, and local
   development and tests need Cloudflare's tools (`wrangler`, the Workers test pool).
2. **10 ms of CPU per request on the free plan.** It is plenty for checks, scores and
   database work, since waiting on the network does not count. It is not enough to draw an
   image or run heavy maths per request: such work is done ahead of time, or moved to the paid
   plan ($5 a month).
3. **Hard daily caps on the free plan.** 100,000 requests a day for Workers, and D1's daily
   read and write quotas. Past a cap, requests fail until midnight UTC; nothing is billed.
   Hence the usage warnings below.
4. **D1 is SQLite.** It has one primary database, a 10 GB cap per database, and no
   long-running transactions (statements are sent as a batch). This fits our data; a database
   for heavy analytics it is not.
5. **Lock-in.** D1 and Durable Objects are Cloudflare's own. To keep a way out, the rules live
   in `shared/`, and the storage behind a thin interface of our own, so another host means
   rewriting the adapter, not the app.
6. **Build it ourselves.** Accounts, offline sync and email are not provided: more code of our
   own, and more tests.
7. **One account for every project.** It is one point of failure. Each project gets its own
   API token, limited to its own resources, and the account has two-factor sign-in.
8. **Shorter logs on the free plan.** We keep our own audit and usage records in the database
   for what matters.

Firebase's drawbacks, for balance:

- No server code without the paid plan.
- A heavy SDK, served from Google's hosts, so the CSP must allow them.
- The rules language is hard to test deeply (family-bingo's rules hit the limit of 10 document
  reads per request).
- Data shaped around documents, not relations.

Render's drawback: the free server sleeps, so the first visit waits about 30 seconds.

**Recommendation: Cloudflare.** It is the only one of the three that runs our own code, holds
live rooms and stays awake for free. Its drawbacks are answered above. Firebase stays where its
built-in offline sync is the point (family-bingo on a trip), until moving is worth it.

### "Works with no reception"

family-bingo is played on a road trip, often without reception. Firestore keeps a copy of the
game on the phone, so the game opens with no signal, and a cell marked in a tunnel is kept and
sent when the signal returns. On Cloudflare we would have to build that ourselves: a local copy
in the browser, a queue of pending changes, and a rule for two phones that changed the same
thing. It is possible, but it is real work, and it is why family-bingo stays on Firebase for now.

### Moving the existing servers (after the owner chooses)

| Project      | Today                    | Plan                                                                        |
| ------------ | ------------------------ | --------------------------------------------------------------------------- |
| OnAir        | Cloudflare Worker and KV | Stays; adopts part 2 when it gains users                                    |
| Douze        | No server                | Built on Cloudflare from the start                                          |
| kavoom       | Node on Render           | Each room becomes a Durable Object; the site moves to Workers static assets |
| family-bingo | Firebase                 | Stays while offline play matters; adopts part 2's model in its rules        |

### How a server project is laid out

- `worker/`: the Worker (`wrangler.jsonc`, `src/`), one module per group of endpoints, and a
  Durable Object class per kind of live room.
- `shared/`: what the site and the Worker both use. It holds the types, the parsing and checks
  of every value, the limits, the capability table (part 2) and the rules of the game. No DOM
  and no Worker APIs, so a value is checked by the same code on both ends.
- `worker/migrations/`: D1 schema migrations, numbered and append-only; each one tested on a
  copy of the previous schema.
- **Deploy:** `.github/workflows/deploy-worker.yml` runs the checks, applies the migrations,
  then `wrangler deploy`. It deploys from the production branch only, after the site's checks
  pass, and skips politely until the secrets exist. Rollback is the previous deploy in the
  Cloudflare dashboard (a phone is enough).
- **Secrets:** a Cloudflare API token limited to the project's own Worker, D1 and Durable
  Objects, and the account id, are kept in the repository's secrets. Runtime secrets are set
  with `wrangler secret`. Nothing is in the repository.
- **The site** stays on GitHub Pages. The CSP's `connect-src` gains the Worker's host, and only
  that; `SECURITY.md` lists it with the reason.

### Watching usage: warnings before trouble

A scheduled workflow, once a day, reads the Worker's usage endpoint (protected by a secret)
and opens a GitHub issue when a line is crossed. The owner gets it as a GitHub notification
on the phone; no email service is needed.

| Measure                       | Warn at                                     | Hard limit (part 2)       |
| ----------------------------- | ------------------------------------------- | ------------------------- |
| Groups in all                 | 100, 250, 500, 1,000, 1,500, then every 100 | 2,000: new groups refused |
| Members in all                | 1,000, 5,000, 10,000                        | none                      |
| Requests yesterday            | 50% and 80% of the daily cap                | Cloudflare's cap          |
| D1 reads or writes yesterday  | 50% and 80% of the daily quota              | Cloudflare's quota        |
| Database size                 | 1 GB, 2.5 GB, 4 GB                          | 5 GB                      |
| Refusals for limits yesterday | 100 (someone may be abusing it)             | none                      |

Each line is crossed once, and the issue says what was crossed and what to do (look, raise a
limit, move to the paid plan).

## Part 2. People and access

### Principles

1. **The server is the only judge** (ASVS: authorization). The site hides what a person may
   not do; only the server decides. Every rule is enforced on the server and has a test that
   it refuses.
2. **Deny by default; least privilege** (NIST RBAC). An action states which roles may do it;
   anything not stated is refused.
3. **One table of capabilities** (role × action), in `shared/`. The Worker checks it, the
   site reads it to hide buttons, and a test walks every cell, allowed and refused.
4. **Least knowledge** (GDPR article 5). Store a display name and what the game needs. Store
   an email only if a feature needs it and the owner agreed. Delete what is no longer needed.
5. **Secrets never stored or logged in clear** (ASVS: session management, cryptography). Only
   their hashes are kept. They never go in an address's path or query, or in an error message.
6. **Every limit written down,** in `shared/` and tested.
7. **Proportionate.** Each control below is marked with the level that needs it, so a game
   among friends does not carry a bank's machinery.

### Roles

| Role       | Who                                    | May                                                                                                       |
| ---------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Owner**  | Whoever created the group; exactly one | Everything an admin may; name and remove admins; hand the group over; rotate the invite; delete the group |
| **Admin**  | Named by the owner                     | The game's settings and results; drive live moments; release a member's name                              |
| **Member** | Joined with the invite                 | Their own entries; read what the phase allows                                                             |

Rules:

- The owner can never be removed or demoted by anyone else.
- Handing the group over is two steps: the owner offers it, and the new owner accepts.

### Three levels of who is who

| Level | Who signs in                                             | Fits                                                                  |
| ----- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| **1** | Nobody: an invite link, a name, the phone remembers      | One small trusted group, nothing to lose (family-bingo today)         |
| **2** | **Owners and admins with Google; players with the link** | Anyone may open groups; players join in a tap (**recommended start**) |
| **3** | Everyone with Google                                     | Personal history across years and devices; groups of strangers        |

**Why level 2 to start.** Most of the hard parts of level 1 exist only to protect the people who
manage a group when nobody signs in:

- **The recovery code:** a lost owner phone means a lost group.
- **Move links:** the only way to bring a protected name to a new phone.
- **Protected names:** so nobody can take over a manager's name.
- **Limits per internet address:** the only way to stop one person from opening many groups.

Signing in with Google, for managers only, removes all four:

- A lost phone is a new sign-in.
- The owner role belongs to an account, not a name.
- The limit on new groups counts per account.

Players keep a tap-to-join experience with no account. A player who wants their name on more
than one phone, or their history across years, can link Google later (level 3, per person, not
per group).

**What each level needs:**

| Control                                                                       | Level 1 | Level 2            | Level 3     |
| ----------------------------------------------------------------------------- | ------- | ------------------ | ----------- |
| Invite link with a secret after `#`, revocable, optional expiry and use count | Yes     | Yes                | Yes         |
| Device token for players (256-bit, hashed, in a header)                       | Yes     | Players            | No          |
| Google sign-in, code flow with PKCE through the Worker                        | No      | Managers           | Everyone    |
| Capability table and its full test                                            | Yes     | Yes                | Yes         |
| An admin releases a stuck name                                                | Yes     | Yes                | Rarely      |
| Taking over a held name: "is this you?", allowed, logged, the owner told      | Yes     | Players            | No          |
| Protected names, move links, recovery code                                    | Yes     | No: Google does it | No          |
| Device list and revoke                                                        | Owner   | Owner (players)    | Each person |
| Approval of new members (off by default)                                      | Option  | Option             | Option      |
| Audit log                                                                     | Yes     | Yes                | Yes         |
| Limits and usage warnings                                                     | Yes     | Yes                | Yes         |

**Google sign-in without a third-party script.** The Worker runs OpenID Connect's
authorization code flow with PKCE (RFC 7636, as RFC 9700 recommends). It keeps `state` and
`nonce` and checks the ID token: the signature against Google's keys, the issuer, the
audience and the expiry. Then it returns to the site with a one-time code in the address after
`#`, which the site swaps for a session token. No Google script runs on our pages, so the CSP
stays closed.

What the owner sets up once, in a browser: an OAuth client in Google Cloud, with the site's
return address. The client secret goes into the Worker's secrets.

### Sessions and tokens (ASVS: session management; NIST SP 800-63B)

- Sessions are random 256-bit tokens, sent in the `Authorization` header, stored as SHA-256
  hashes, and compared in constant time.
- A manager's session expires after 30 days of no use, and always after 180 days; signing out
  revokes it at once.
- A player's device token lasts while the device plays: 400 days of no use expires it.
- Tokens are bound to one group, or to one account for Google sessions.
- Revoking a member, rotating the invite or handing the group over takes effect on the next
  request, since every request is checked against the database.

### Invites

Like WhatsApp or Discord:

- The secret goes after `#`, so it never reaches a server log, and the site sends it in a
  header.
- An invite can expire and can have a maximum number of uses.
- The owner can revoke the link and make a new one; the devices already in stay in.
- An optional "an admin approves each new member" is off by default for friends.

### Phases and secrecy (ASVS: validation and business logic)

- What a member may read depends on the game's phase, decided on the server. Hidden entries are
  not sent at all, not merely hidden on the screen.
- Times come from the server's clock, never the client's. A lock time (the start of a show) is
  stored with the season and checked on every write.

### Requests (ASVS: API and web service)

- CORS allows the site's own origin only.
- Request bodies are JSON only, with a size cap, parsed by `shared/`.
- An unknown field is refused, not ignored (OWASP: mass assignment).
- Every id and country is checked against a closed list, and every length and number is capped.
- Errors say what was wrong in general terms: no stack, no data, no hint that a secret was
  close.
- Rate limits, counted in the database or in a Durable Object, answer with `429` and a
  `Retry-After` header.

### Limits (defaults; a project may lower them, and raises one only with a reason)

| What                                      | Limit                                                      |
| ----------------------------------------- | ---------------------------------------------------------- |
| Request body                              | 32 KB                                                      |
| Names (member, group)                     | 1 to 40 characters, cleaned of control and direction marks |
| Members in a group                        | 40                                                         |
| Groups one account owns                   | 10 (level 2 and 3)                                         |
| Groups created from one address           | 5 a day (level 1 only)                                     |
| Groups in all                             | 2,000, with the warnings of part 1                         |
| Devices per player                        | 5                                                          |
| Writes from one device or account         | 60 a minute                                                |
| Joins and failed secrets from one address | 10 an hour, then a pause of an hour                        |
| Live room connections                     | 50 per group                                               |
| Audit log                                 | 1,000 entries per group, or 1 year                         |

### The audit log (OWASP: logging)

- **What is appended:** joins, name takeovers, role changes, revocations, invite changes,
  handovers, deletions and every admin action. Each entry records who, what, when, and from
  which device or account.
- **What is never recorded:** a secret, a token, or the content of a hidden entry.
- The owner and admins read it; nobody edits it.

### Leaving, deleting, exporting

- A member can leave. Their entries go with them, or stay under "a former player" if a
  finished season needs them.
- The owner can delete the group after typing its name. Everything goes, at once.
- The owner can export the group as JSON at any time: their data is theirs.

### Testing

- **The capability matrix:** every role × every action, allowed and refused, run in the
  Workers runtime.
- **Every refusal:**
  - no token, a wrong token, another group's token, a revoked device, an expired session;
  - not the admin or not the owner;
  - a body too big, an unknown field, an unknown country;
  - a write after the lock, any request over a limit;
  - an invite revoked, expired or used up;
  - a Google token with the wrong audience, a wrong issuer, or expired.
- **Secrecy:** hidden entries are absent from every response.
- **The browser test** runs against a local Worker with two devices. One opens a group, the
  other joins with the link and picks a name. A takeover is logged, a hidden entry is revealed
  at its time, and a live room is followed by the second device. Google sign-in is tested with a
  stub of Google's endpoints, never the real one.
