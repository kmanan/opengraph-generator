# OpenGraph Resizer

Self-hostable tool that turns a single image into the full set of OpenGraph + favicon + PWA assets every modern site needs. Plus a URL analyzer that previews how a page will look on Facebook, X/Twitter, LinkedIn, WhatsApp, and Discord.

**Live instance:** https://opengraph.krytonlabs.com — same code as this repo, just one of many possible deployments.

---

## Quick Start

Pick one path.

### Use the hosted web app

Open https://opengraph.krytonlabs.com, upload an image, and download the generated assets.

### Use it from Claude Code

Install the MCP runner:

```bash
curl -fsSL https://raw.githubusercontent.com/kmanan/opengraph-generator/main/scripts/install-mcp.sh | bash
```

Restart Claude Code, then ask it to generate assets from an image in your project. The MCP runner is installed locally; processing uses the KrytonLabs hosted backend by default.

### Self-host with Docker

```bash
docker run -d --name opengraph -p 6736:6736 \
  -e PUBLIC_URL=http://localhost:6736 \
  ghcr.io/kmanan/opengraph:latest
```

Open http://localhost:6736.

### Use Claude Code with your self-hosted backend

Start the Docker container above, then install MCP pointed at it:

```bash
curl -fsSL https://raw.githubusercontent.com/kmanan/opengraph-generator/main/scripts/install-mcp.sh | OPENGRAPH_BACKEND=http://localhost:6736 bash
```

Restart Claude Code. The same MCP runner now sends processing to your backend instead of the hosted KrytonLabs backend.

### Self-host without Docker

```bash
git clone https://github.com/kmanan/opengraph-generator
cd opengraph-generator
npm ci
cp .env.example .env
npm start
```

Open http://localhost:6736. Requires Node.js 20+ for fresh installs. The Docker image uses Node 20 by default.

### Portainer

Paste `docker-compose.yml` as a stack, fill in env vars on the form, and deploy.

### Logs

- **Docker:** `docker logs opengraph -f`
- **PM2:** `pm2 logs opengraph` (or `tail -f ~/.pm2/logs/opengraph-out.log ~/.pm2/logs/opengraph-error.log`)
- **Bare Node:** stdout/stderr go wherever you redirected them

Startup logs include the resolved config (PUBLIC_URL, GA_MEASUREMENT_ID present/absent, SITE_NAME). Every error path on `/api/analyze` and `/generate` logs the underlying reason.

---

## What you get from `/generate`

A ZIP with:

| File | Purpose |
|---|---|
| `og-image.png` | 1200×630 — Facebook, X, LinkedIn share image |
| `og-square.png` | 1200×1200 — Instagram, WhatsApp, Pinterest |
| `favicon.ico` | Multi-size ICO for browser tabs |
| `icon.svg` | Scalable SVG favicon (auto dark/light) |
| `favicon-16x16.png` / `favicon-32x32.png` | Legacy browser sizes |
| `apple-touch-icon.png` | 180×180 iOS home screen |
| `android-chrome-192x192.png` / `android-chrome-512x512.png` | Android |
| `manifest.webmanifest` | PWA manifest |
| `implementation.html` | Drop-in HTML template with all meta tags |

All processing happens in-memory. No image is ever written to disk.

---

## Configuration

Every behavior-affecting setting is an env var. See `.env.example` for the full list with defaults. Highlights:

| Var | Default | What it does |
|---|---|---|
| `PORT` | `6736` | HTTP port to listen on |
| `PUBLIC_URL` | `http://localhost:6736` | Used in meta tags, canonical, OG image URLs on the landing page |
| `SITE_NAME` | `OpenGraph Resizer` | Title + h1 + branding |
| `BRAND_NAME` | (empty) | "A Product by …" footer line. Empty = hidden. |
| `BRAND_URL` | (empty) | Link target for `BRAND_NAME` |
| `GA_MEASUREMENT_ID` | (empty) | GA4 ID. Unset = no analytics scripts, no GA hosts in CSP. |
| `MAX_UPLOAD_MB` | `10` | Reject uploads larger than this |
| `RATE_LIMIT_GENERATE` | `20` | `/generate` requests per IP per 15 min |
| `RATE_LIMIT_ANALYZE` | `30` | `/api/analyze` requests per IP per 15 min |
| `TRUST_PROXY` | `1` | Pass through to Express `trust proxy`. Required behind nginx/Cloudflare/Caddy. |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS allowlist |

---

## HTTP API

Versioned endpoints (use these from external code):

### `POST /api/v1/generate`

Multipart form: `image` (required, file), `svgColor` (optional, hex string).
Returns: `application/zip`.

### `GET /api/v1/analyze?url=...`

Returns JSON with OpenGraph + Twitter Card + meta tags extracted from the page, plus resolved absolute URLs for image / favicon. SSRF-protected (private/loopback/link-local/cloud-metadata IPs are rejected, including via redirects).

Unversioned aliases (`/generate`, `/api/analyze`) exist for the bundled landing page. External integrators should use the `/api/v1/*` paths.

### `GET /health`

Returns `{"status":"ok",...}`. Used by Docker's healthcheck.

---

## Security

- Multer file size + MIME-type limits.
- SSRF protection on URL fetching: DNS lookup + private/loopback/link-local/multicast IP rejection, re-checked on every redirect hop. Response size capped at 5MB, content-type validated.
- `helmet` + CSP. GA hosts only allowed when `GA_MEASUREMENT_ID` is set.
- Per-route rate limiting via `express-rate-limit`. `trust proxy` enabled so limits work behind a reverse proxy.

Vulnerability reports: see [SECURITY.md](SECURITY.md).

---

## License

MIT — see [LICENSE](LICENSE).

Built on [Sharp](https://github.com/lovell/sharp), [Archiver](https://github.com/archiverjs/node-archiver), [Express](https://github.com/expressjs/express), [Multer](https://github.com/expressjs/multer), [helmet](https://github.com/helmetjs/helmet), [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit), [cheerio](https://github.com/cheeriojs/cheerio), [axios](https://github.com/axios/axios).
