# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/).

## [0.1.0] - 2026-05-18

First public release.

### Added
- Self-hostable web app: drop an image → get the full social/favicon/PWA asset bundle as a ZIP.
- URL analyzer (`/api/analyze`) with platform previews for Facebook, X/Twitter, LinkedIn, WhatsApp, Discord. SSRF-protected.
- Versioned HTTP API (`/api/v1/generate`, `/api/v1/analyze`) plus unversioned aliases for the bundled UI.
- MCP package (`@krytonlabs/opengraph-mcp`) exposing three tools to Claude Code / Cursor / any MCP client:
  - `generate_og_assets` — generate the asset bundle from a source image
  - `analyze_url` — extract OG/Twitter/meta tags from any URL
  - `inject_meta_tags` — idempotent insertion of meta tags into HTML
- Docker image (multi-arch amd64 + arm64) published to GHCR on tag push.
- `docker-compose.yml` for Portainer / one-command self-host.
- Env-driven configuration: `PUBLIC_URL`, `SITE_NAME`, `BRAND_NAME`, `BRAND_URL`, `GA_MEASUREMENT_ID`, `MAX_UPLOAD_MB`, `RATE_LIMIT_GENERATE`, `RATE_LIMIT_ANALYZE`, `TRUST_PROXY`, `ALLOWED_ORIGINS`.
- Default port is **6736** (spells "OPEN" on a phone keypad). Override with `PORT` env var.
- Graceful shutdown (SIGTERM/SIGINT) for clean Docker stops.

### Security
- Multer hard limits on upload size + image-only MIME filter.
- SSRF protection on URL fetching: IPv4-only DNS resolution, rejection of private/loopback/link-local/cloud-metadata ranges, re-validated on every redirect hop. Response size capped at 5MB, content-type validated.
- Per-route rate limiting via `express-rate-limit`. `trust proxy` enabled so limits work behind nginx/Cloudflare/Caddy.
- CSP via `helmet`. Google Analytics hosts only allowed when `GA_MEASUREMENT_ID` is set.
