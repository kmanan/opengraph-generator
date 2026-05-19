# Security Policy

## Reporting a Vulnerability

If you believe you've found a security issue in OpenGraph Resizer, please **do not** open a public GitHub issue.

Email: **security@krytonlabs.com**

Include:
- A description of the issue and its impact.
- Steps to reproduce (or a proof-of-concept).
- The version / commit you tested against.

We aim to acknowledge reports within 72 hours and to ship a fix or mitigation within 14 days for high-severity issues.

## Scope

In scope:
- The `/generate` and `/api/v1/generate` upload endpoints.
- The `/api/analyze` and `/api/v1/analyze` URL-fetch endpoints (SSRF, response smuggling, etc.).
- Authentication / authorization bypasses on any endpoint.
- Container escape or filesystem write from the supplied Docker image.

Out of scope:
- DoS via raw bandwidth flooding (use Cloudflare or similar in front).
- Misconfigured self-hosted deployments (e.g., a self-hoster setting `ALLOWED_ORIGINS=*` and complaining about CORS).
- Third-party services we link to.
