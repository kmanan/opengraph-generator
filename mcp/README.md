# @krytonlabs/opengraph-mcp

MCP server for the [OpenGraph Resizer](https://github.com/kmanan/opengraph-generator). By default it uses the KrytonLabs hosted backend; set `OPENGRAPH_BACKEND` to use your own self-hosted backend.

## Hosted install

```bash
curl -fsSL https://raw.githubusercontent.com/kmanan/opengraph-generator/main/scripts/install-mcp.sh | bash
```

## Self-hosted backend install

```bash
curl -fsSL https://raw.githubusercontent.com/kmanan/opengraph-generator/main/scripts/install-mcp.sh | OPENGRAPH_BACKEND=http://localhost:6736 bash
```

## Tools

### `generate_og_assets`

Generate the full asset bundle from one source image. Writes files to disk, returns the recommended meta-tag block.

| Arg | Required | Description |
|---|---|---|
| `image_path` | yes | Absolute path to source image |
| `output_dir` | yes | Where to write the unpacked assets (e.g., `./public`) |
| `svg_color` | no | Hex color for the SVG favicon (default `#000000`) |

### `analyze_url`

Fetch a URL and extract its OpenGraph + Twitter Card + meta tags. SSRF-protected on the backend.

| Arg | Required | Description |
|---|---|---|
| `url` | yes | URL to analyze (must include `http://` or `https://`) |

### `inject_meta_tags`

Insert or replace a managed block of meta tags in an HTML file's `<head>`. Idempotent — uses comment markers (`<!-- BEGIN opengraph-mcp meta -->` … `<!-- END opengraph-mcp meta -->`) so re-running updates in place.

| Arg | Required | Description |
|---|---|---|
| `html_path` | yes | Absolute path to the HTML file |
| `meta_tags` | yes | The HTML snippet to insert (typically from `generate_og_assets`) |

## License

MIT
