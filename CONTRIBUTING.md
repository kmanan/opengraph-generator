# Contributing

Thanks for the interest. This project stays small on purpose, but we welcome bug fixes, security improvements, and small UX wins.

## Local dev

Requires Node.js 18.17+ (or use the Docker image).

```bash
git clone https://github.com/kmanan/opengraph
cd opengraph
npm ci                 # use ci (not install) to honor the lockfile exactly
cp .env.example .env   # edit if you want, but defaults work
npm run dev            # auto-restart on file changes
```

> **Why `npm ci`?** `npm install` may fetch newer minor versions of transitive deps, which can break on older Node versions (e.g. newer undici needs Node 20). `npm ci` installs exactly what's in `package-lock.json`.

Open http://localhost:6736.

## Filing issues

- **Bugs**: include the version (`git rev-parse HEAD`), your runtime (Docker / bare Node), and steps to reproduce.
- **Feature requests**: describe the use case. We're conservative about new features — the smaller the API surface, the easier this is to keep secure and self-hostable.
- **Security issues**: see [SECURITY.md](SECURITY.md). Don't file publicly.

## Pull requests

- Keep PRs focused. One concern per PR.
- No new top-level dependencies without a strong reason — Sharp + Archiver + Express are already the heaviest things in here.
- Don't break the env-var contract documented in `.env.example`. If you add a new env var, document it there and in the README.
- For changes that touch the SSRF protection (`server.js` `isBlockedIPv4`, `resolveAndValidate`, `safeFetch`), add a smoke test in the PR description showing the new code rejects whatever it should.

## Architecture in one paragraph

Single Express server. Sharp resizes images in memory, Archiver streams the result as a ZIP. `/api/analyze` is a thin cheerio-backed scraper with SSRF protection on every redirect hop. The landing page is `public/index.html`, rendered once at startup with env-var substitution (no template engine — just `replaceAll`). The MCP package in `mcp/` is a thin client over the HTTP API.
