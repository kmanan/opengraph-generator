# OpenGraph Resizer — Open Source & Distribution Plan

## Goal

Take the tool currently running at opengraph.krytonlabs.com and turn it into an open-source, self-hostable project that:

1. People can read, audit, and trust.
2. People can self-host in a few minutes (Docker + Portainer, ideally point-and-click).
3. Tools and agents (Claude Code, Cursor, CI pipelines, scaffolders) can call programmatically via an MCP server — using our hosted instance or their own.

---

## The model — one repo, same code everywhere

**One repository.** Our production deployment at opengraph.krytonlabs.com is just one deployment of this code. Self-hosters run the same code on their own boxes. The MCP package talks to whatever backend it's pointed at — ours by default, theirs if they set an env var.

The differences between "our production" and "someone's self-hosted copy" all live in env vars, not code:

| Env var | Our deploy | Self-host default |
|---|---|---|
| `PUBLIC_URL` | `https://opengraph.krytonlabs.com` | their domain |
| `GA_MEASUREMENT_ID` | `G-22X852JLRD` | unset (no analytics) |
| `SITE_NAME` | `OpenGraph Resizer by KrytonLabs` | `OpenGraph Resizer` |
| `MAX_UPLOAD_MB` | 10 | 10 |
| `RATE_LIMIT_GENERATE` | 20 / 15min | 20 / 15min |

No fork. No branding-mode templating logic. The code is the code; the deployment is the variable.

---

## Sequence of work

1. **Security + env config** — fix the things that block going public.
2. **Test + verify production** — run locally, deploy, confirm nothing broke.
3. **Landing page redesign** — clean up the page, make it templated so the same HTML serves both our deploy and self-hosters.
4. **Docker + LICENSE + README** — make "self-hostable" real.
5. **MCP package** — added as a subfolder in this repo.
6. **Flip repo public** — your call when ready.

---

## Step 1 — Security + env config

### Security fixes

- **SSRF protection on `/api/analyze`**. Right now anyone can pass `http://169.254.169.254/...` (cloud metadata) or `http://localhost:6736/health` or any internal IP, and we'll fetch it and return the body. Fix: resolve the hostname, reject private/loopback/link-local/metadata IPs, re-validate on every redirect, cap response size at 5MB, validate Content-Type is HTML.
- **Multer limits** — currently no file size or type cap server-side. The 10MB number in the UI is just a hint. Add `limits: { fileSize: 10*1024*1024, files: 1 }` and reject non-image MIME types.
- **Per-route rate limits** — `/generate` and `/api/analyze` get tighter buckets (20 / 15min) than the global limiter.
- **Trust proxy** — `app.set('trust proxy', 1)` so rate limits work behind nginx/Cloudflare/Caddy. Today, behind any proxy, every visitor looks like one IP.
- **CSP conditional on GA** — only allow `googletagmanager.com` and `google-analytics.com` in the CSP when `GA_MEASUREMENT_ID` is set.

### Env config

- `PORT` (already exists)
- `PUBLIC_URL` — used in meta tags, canonical URL, OG images on the landing page
- `GA_MEASUREMENT_ID` — when unset, no GA scripts get injected
- `SITE_NAME` — branding string for the page title and headings
- `MAX_UPLOAD_MB`, `RATE_LIMIT_GENERATE`, `RATE_LIMIT_ANALYZE`, `ALLOWED_ORIGINS`

### Landing page templating

The current `public/index.html` has `opengraph.krytonlabs.com` hardcoded in ~12 places. To make env vars actually take effect, the server has to render the HTML with substitutions at startup instead of serving it as a static file. Tiny change: read the file once, replace `{{PUBLIC_URL}}` / `{{GA_MEASUREMENT_ID}}` / `{{SITE_NAME}}`, serve the rendered string from `GET /`. No template engine needed.

### Hygiene

- Add `npm start` and `npm run dev` scripts to `package.json` (currently no scripts field — `npm start` fails today).
- Add `.claude/` and `.specstory/` to `.gitignore`.
- Add `"engines": { "node": ">=20" }`.
- Add graceful shutdown (SIGTERM → drain → exit) for clean Docker stops.

---

## Step 2 — Test + verify production

- Run `npm start` locally, verify all endpoints work.
- Hit `/api/analyze` with a private IP, confirm it's rejected.
- Hit `/generate` with an oversized file, confirm it's rejected.
- Deploy to opengraph.krytonlabs.com (set env vars in PM2 config), verify the live site still works exactly as before.

---

## Step 3 — Landing page redesign

The current page is functional but messy (inline styles, ad-hoc layout). One nicely-designed page with:

1. **Hero** — title, drag-and-drop zone, color picker, generate button. Front and center.
2. **URL analyzer** — paste any URL, see platform previews (FB, X, LinkedIn, WhatsApp, Discord). Same functionality as today, tighter visual.
3. **Footer with context** — what it is, GitHub link, MCP install one-liner.

Same features as today, better execution. Mobile-friendly. Clean separation of HTML/CSS, no inline styles. Branding strings come from env vars (so a self-hoster's instance doesn't say "by KrytonLabs").

Cap: 1–2 days of work. Not a 2-week design project.

---

## Step 4 — Docker + LICENSE + README

This is what makes "self-hostable" real.

### Files to add

- **`Dockerfile`** — multi-stage, `node:20-alpine` base, handles Sharp's native deps (`libvips`).
- **`docker-compose.yml`** — defines the service, env vars, port mapping, healthcheck.
- **`.env.example`** — every env var documented with defaults.
- **`LICENSE`** — MIT.
- **`SECURITY.md`** — vuln disclosure address.
- **`CONTRIBUTING.md`** — how to run locally, file issues.
- **`README.md`** — rewrite from scratch. Current one claims features that don't exist (file validation, memory limits) and tells people to run `npm start` which doesn't currently work.

### How a self-hoster uses it

**With Portainer** (the recommended UX):
1. Open Portainer → Add Stack
2. Paste our `docker-compose.yml` (or point at the repo)
3. Fill in env vars (PUBLIC_URL, GA optional) in the form
4. Click Deploy
5. Running on their server, configured to their settings

**With terminal**:
```bash
git clone https://github.com/kmanan/opengraph
cd opengraph
cp .env.example .env
# edit .env with your values
docker compose up -d
```

Either way: env vars live outside the code, same image works for everyone.

### Distribution

GitHub Actions builds and pushes multi-arch (amd64 + arm64) images to GHCR on tag push. Self-hosters pull `ghcr.io/kmanan/opengraph:latest`.

---

## Step 5 — MCP package

Lives in this repo as a subfolder (`mcp/`), published to npm as `@krytonlabs/opengraph-mcp`. Monorepo via npm workspaces keeps API and MCP in lockstep.

### Tools exposed

- **`generate_og_assets`** — takes an image path + output directory, calls `POST /api/v1/generate`, unpacks the ZIP into the output dir, returns file list + the recommended `<meta>` tag block.
- **`analyze_url`** — wraps `GET /api/v1/analyze`. "Check what's deployed at staging.foo.com and tell me what's missing."
- **`inject_meta_tags`** — given an HTML file and the meta block, idempotently inserts tags into `<head>`.

### Install UX — three tiers

#### Tier 1 — Use our hosted backend (~30 seconds)
```bash
claude mcp add opengraph -- npx -y @krytonlabs/opengraph-mcp
# restart Claude Code
```
Default backend is `https://opengraph.krytonlabs.com`. Zero infrastructure on user's side.

#### Tier 2 — Self-hosted backend + MCP (~5 min, needs Docker)
```bash
docker run -d --name opengraph -p 6736:6736 ghcr.io/kmanan/opengraph:latest
claude mcp add opengraph -- npx -y @krytonlabs/opengraph-mcp \
  --env OPENGRAPH_BACKEND=http://localhost:6736
# restart Claude Code
```

#### Tier 3 — Contributor install (clone the repo)
For people hacking on the project, not the main path. Lives in CONTRIBUTING.md.

### The restart gotcha — call out loudly

MCP servers register at Claude Code startup. **Claude cannot use an MCP it just installed in the same session.** When a user tells Claude "install opengraph and use it":

1. Claude runs the install commands. ✅
2. Claude says: *"installed — quit and relaunch Claude Code, then ask me to generate the assets."*
3. User restarts → new session → MCP tools visible → Claude generates assets. ✅

Two sessions. Frame it as expected, not as failure.

### API versioning

Promote `/generate` → `/api/v1/generate` and `/api/analyze` → `/api/v1/analyze`. Keep old paths as aliases for the SPA's current calls (we'll update the SPA in the same PR but keep aliases for any external callers). MCP only ever calls `/api/v1/*`.

---

## Step 6 — Flip repo public

Once steps 1–5 are done and tested:
- Verify `.gitignore` covers everything sensitive
- Tag `v0.1.0`
- Change repo visibility to public
- Push first GHCR image
- Publish MCP package to npm
- Post to r/selfhosted, awesome-self-hosted PR, Claude Code community

---

## Stretch / future (not v1)

- Scaffolder integration — `create-next-app` / `create-vite` post-install hook that calls the MCP. Every new web project gets OG assets without thinking about it.
- Custom platform sizes via API param (today the size list is hardcoded server-side).
- Hosted remote MCP endpoint for users on platforms that can't spawn local processes.

## Explicitly out of scope

- User accounts, auth, billing on our hosted instance (IP rate limits only)
- A separate marketing site (the product page is the marketing)
- Telemetry / phone-home from self-hosted instances
- Cloudflare in front of our hosted instance (add when traffic warrants, not preemptively)
