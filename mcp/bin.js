#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";

const rawBackend = process.env.OPENGRAPH_BACKEND;
if (!rawBackend) {
  console.error("OPENGRAPH_BACKEND is required. Start a self-hosted OpenGraph backend and set OPENGRAPH_BACKEND=http://localhost:6736.");
  process.exit(1);
}
const BACKEND = rawBackend.replace(/\/$/, "");
const VERSION = "0.1.0";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

function guessImageMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXT[ext] || "image/png";
}

const server = new Server(
  { name: "opengraph", version: VERSION },
  { capabilities: { tools: {} } }
);

// ---------- Tool: list ----------
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_og_assets",
      description:
        "Generate the full OpenGraph + favicon + PWA asset bundle from a single source image. Writes the unpacked files into the specified output directory and returns the recommended HTML meta tag block.",
      inputSchema: {
        type: "object",
        properties: {
          image_path: {
            type: "string",
            description: "Absolute path to the source image (PNG, JPG, etc.).",
          },
          output_dir: {
            type: "string",
            description:
              "Absolute path to the directory where assets should be written (typically the project's /public or /static directory).",
          },
          svg_color: {
            type: "string",
            description: "Hex color for the generated SVG favicon. Default: #000000",
          },
        },
        required: ["image_path", "output_dir"],
      },
    },
    {
      name: "analyze_url",
      description:
        "Fetch a public URL and extract its OpenGraph, Twitter Card, and meta tags. Useful for auditing a deployed site or checking how a link will appear on social platforms.",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to analyze. Must include http:// or https://.",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "inject_meta_tags",
      description:
        "Insert or replace a block of OpenGraph/favicon meta tags inside an HTML file's <head>. Idempotent — uses comment markers so repeated calls update the block in place.",
      inputSchema: {
        type: "object",
        properties: {
          html_path: {
            type: "string",
            description: "Absolute path to the HTML file to modify.",
          },
          meta_tags: {
            type: "string",
            description:
              "The HTML snippet of meta tags to insert (typically the output of generate_og_assets).",
          },
        },
        required: ["html_path", "meta_tags"],
      },
    },
  ],
}));

// ---------- Tool: call ----------
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === "generate_og_assets") return await generateOgAssets(args);
    if (name === "analyze_url") return await analyzeUrl(args);
    if (name === "inject_meta_tags") return await injectMetaTags(args);
    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ---------- generate_og_assets ----------
async function generateOgAssets({ image_path, output_dir, svg_color }) {
  if (!image_path || !output_dir) {
    throw new Error("image_path and output_dir are required");
  }

  const buffer = await readFile(image_path);
  const filename = path.basename(image_path);
  const mimeType = guessImageMimeType(filename);

  const form = new FormData();
  form.append("image", new Blob([buffer], { type: mimeType }), filename);
  if (svg_color) form.append("svgColor", svg_color);

  const res = await fetch(`${BACKEND}/api/v1/generate`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Backend ${BACKEND} returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const zipBuffer = Buffer.from(await res.arrayBuffer());
  const outputRoot = path.resolve(output_dir);
  await mkdir(outputRoot, { recursive: true });

  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const written = [];
  let implementationHtml = "";

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const outPath = path.resolve(outputRoot, entry.entryName);
    if (outPath !== outputRoot && !outPath.startsWith(outputRoot + path.sep)) {
      throw new Error("Refusing to write ZIP entry outside output_dir: " + entry.entryName);
    }
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, entry.getData());
    written.push(entry.entryName);
    if (entry.entryName === "implementation.html") {
      implementationHtml = entry.getData().toString("utf-8");
    }
  }

  // Pull out just the <meta> + <link> lines from implementation.html's <head>
  let metaBlock = "";
  const headMatch = implementationHtml.match(/<head>([\s\S]*?)<\/head>/);
  if (headMatch) {
    metaBlock = headMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("<meta") || l.startsWith("<link"))
      .join("\n");
  }

  return {
    content: [
      {
        type: "text",
        text:
          `Wrote ${written.length} files to ${output_dir}:\n` +
          written.map((f) => `  - ${f}`).join("\n") +
          `\n\nRecommended <meta> tag block (pass as meta_tags to inject_meta_tags, ` +
          `or paste into your <head>; replace yoursite.com with your real domain):\n\n` +
          metaBlock,
      },
    ],
  };
}

// ---------- analyze_url ----------
async function analyzeUrl({ url }) {
  if (!url) throw new Error("url is required");
  const res = await fetch(`${BACKEND}/api/v1/analyze?url=${encodeURIComponent(url)}`);
  const data = await res.json().catch(() => ({ error: "Non-JSON response" }));
  if (!res.ok) {
    throw new Error(data.error || `Backend returned ${res.status}`);
  }
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

// ---------- inject_meta_tags ----------
const MARKER_START = "<!-- BEGIN opengraph-mcp meta -->";
const MARKER_END = "<!-- END opengraph-mcp meta -->";

async function injectMetaTags({ html_path, meta_tags }) {
  if (!html_path || !meta_tags) {
    throw new Error("html_path and meta_tags are required");
  }
  let html = await readFile(html_path, "utf-8");
  const block = `${MARKER_START}\n${meta_tags}\n${MARKER_END}`;

  const existingPattern = new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`);

  let action;
  if (existingPattern.test(html)) {
    html = html.replace(existingPattern, block);
    action = "replaced existing managed block";
  } else if (html.includes("</head>")) {
    html = html.replace("</head>", `  ${block}\n</head>`);
    action = "inserted before </head>";
  } else {
    throw new Error("HTML file has no </head> tag — cannot inject");
  }

  await writeFile(html_path, html);
  return {
    content: [{ type: "text", text: `Updated ${html_path} (${action}).` }],
  };
}

// ---------- start ----------
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`opengraph-mcp v${VERSION} connected (backend: ${BACKEND})`);
