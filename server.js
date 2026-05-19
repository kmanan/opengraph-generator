const express = require('express');
const sharp = require('sharp');
const archiver = require('archiver');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dns = require('dns').promises;
const axios = require('axios');
const cheerio = require('cheerio');

// ---------- Config (env-driven) ----------
const PORT = parseInt(process.env.PORT || '6736', 10);
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || '';
const SITE_NAME = process.env.SITE_NAME || 'OpenGraph Resizer';
const SITE_TAGLINE = process.env.SITE_TAGLINE || 'Resize images for social media & analyze any URL\'s OpenGraph tags';
const BRAND_NAME = process.env.BRAND_NAME || '';
const BRAND_URL = process.env.BRAND_URL || '';
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '10', 10);
const RATE_LIMIT_GENERATE = parseInt(process.env.RATE_LIMIT_GENERATE || '20', 10);
const RATE_LIMIT_ANALYZE = parseInt(process.env.RATE_LIMIT_ANALYZE || '30', 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';
const TRUST_PROXY = process.env.TRUST_PROXY || '1';
const ANALYZE_MAX_BYTES = 5 * 1024 * 1024;
const ANALYZE_TIMEOUT_MS = 15000;

const app = express();

// Behind reverse proxy (Cloudflare, nginx, Caddy) — required for rate limiting to see real client IPs
app.set('trust proxy', TRUST_PROXY === 'false' ? false : (isNaN(parseInt(TRUST_PROXY, 10)) ? TRUST_PROXY : parseInt(TRUST_PROXY, 10)));

// ---------- Multer with hard limits ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// ---------- Security middleware ----------
const cspScriptSrc = ["'self'", "'unsafe-inline'"];
const cspConnectSrc = ["'self'"];
if (GA_MEASUREMENT_ID) {
  cspScriptSrc.push('https://www.googletagmanager.com');
  cspConnectSrc.push('https://www.google-analytics.com');
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: cspScriptSrc,
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: cspConnectSrc,
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(cors({
  origin: ALLOWED_ORIGINS === '*' ? true : ALLOWED_ORIGINS.split(',').map(s => s.trim()),
}));

// Global limiter (covers /health and anything not otherwise limited)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: RATE_LIMIT_GENERATE,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many generation requests, please try again later.' },
});

const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: RATE_LIMIT_ANALYZE,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many analyze requests, please try again later.' },
});

// ---------- Render index.html once at startup (env-driven branding) ----------
function buildGaTag() {
  if (!GA_MEASUREMENT_ID) return '';
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>`;
}

function buildBrandFooter() {
  if (!BRAND_NAME) return '';
  if (BRAND_URL) {
    return `<p>A Product by <a href="${BRAND_URL}" target="_blank" rel="noopener">${BRAND_NAME}</a></p>`;
  }
  return `<p>A Product by ${BRAND_NAME}</p>`;
}

function renderIndex() {
  const templatePath = path.join(__dirname, 'public', 'index.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  return template
    .replaceAll('{{PUBLIC_URL}}', PUBLIC_URL)
    .replaceAll('{{SITE_NAME}}', SITE_NAME)
    .replaceAll('{{SITE_TAGLINE}}', SITE_TAGLINE)
    .replaceAll('{{BRAND_NAME}}', BRAND_NAME || SITE_NAME)
    .replaceAll('{{GA_TAG}}', buildGaTag())
    .replaceAll('{{BRAND_FOOTER}}', buildBrandFooter());
}

let renderedIndex = '';
try {
  renderedIndex = renderIndex();
} catch (err) {
  console.error('Failed to render index.html template:', err.message);
  process.exit(1);
}

// ---------- Routes ----------

// Root: serve the templated index
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderedIndex);
});

// Static for everything else (CSS, JS, /og-og/* assets, robots.txt, sitemap.xml)
app.use(express.static('public', { index: false }));

// ---------- SVG / HTML / manifest generators ----------
const generateSVG = (color = '#000000') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    @media (prefers-color-scheme: dark) {
      .icon { fill: #ffffff; }
    }
    @media (prefers-color-scheme: light) {
      .icon { fill: ${color}; }
    }
  </style>
  <rect class="icon" width="32" height="32" rx="4"/>
</svg>`;

const generateHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your Website</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">

  <!-- Essential Open Graph -->
  <meta property="og:image" content="https://yoursite.com/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Your website description" />

  <!-- Favicons -->
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.webmanifest">
</head>
<body>
  <h1>Your Website</h1>
  <p>Replace the URLs in the meta tags with your actual domain and customize the content.</p>
</body>
</html>`;

const generateManifest = () => JSON.stringify({
  "name": "Your App Name",
  "short_name": "App",
  "icons": [
    { "src": "/android-chrome-192x192.png", "type": "image/png", "sizes": "192x192" },
    { "src": "/android-chrome-512x512.png", "type": "image/png", "sizes": "512x512" }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}, null, 2);

function createIco(pngImages) {
  const headerSize = 6;
  const entrySize = 16;
  const directorySize = headerSize + (entrySize * pngImages.length);
  const totalSize = directorySize + pngImages.reduce((sum, image) => sum + image.buffer.length, 0);
  const ico = Buffer.alloc(totalSize);

  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(pngImages.length, 4);

  let imageOffset = directorySize;
  pngImages.forEach((image, index) => {
    const entryOffset = headerSize + (entrySize * index);
    ico.writeUInt8(image.width >= 256 ? 0 : image.width, entryOffset);
    ico.writeUInt8(image.height >= 256 ? 0 : image.height, entryOffset + 1);
    ico.writeUInt8(0, entryOffset + 2);
    ico.writeUInt8(0, entryOffset + 3);
    ico.writeUInt16LE(1, entryOffset + 4);
    ico.writeUInt16LE(32, entryOffset + 6);
    ico.writeUInt32LE(image.buffer.length, entryOffset + 8);
    ico.writeUInt32LE(imageOffset, entryOffset + 12);
    image.buffer.copy(ico, imageOffset);
    imageOffset += image.buffer.length;
  });

  return ico;
}

// ---------- /generate handler (reused for v1 + alias) ----------
async function handleGenerate(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const inputBuffer = req.file.buffer;
    const svgColor = req.body.svgColor || '#000000';

    console.log('Processing image...', { originalSize: inputBuffer.length });

    const sizes = [
      { name: 'og-image.png', width: 1200, height: 630 },
      { name: 'og-square.png', width: 1200, height: 1200 },
      { name: 'favicon-32x32.png', width: 32, height: 32 },
      { name: 'favicon-16x16.png', width: 16, height: 16 },
      { name: 'apple-touch-icon.png', width: 180, height: 180 },
      { name: 'android-chrome-192x192.png', width: 192, height: 192 },
      { name: 'android-chrome-512x512.png', width: 512, height: 512 },
    ];

    const images = await Promise.all(
      sizes.map(async (size) => ({
        name: size.name,
        buffer: await sharp(inputBuffer)
          .resize(size.width, size.height, { fit: 'cover' })
          .png()
          .toBuffer(),
      }))
    );

    const ico16 = await sharp(inputBuffer).resize(16, 16).png().toBuffer();
    const ico32 = await sharp(inputBuffer).resize(32, 32).png().toBuffer();
    const icoBuffer = createIco([
      { width: 16, height: 16, buffer: ico16 },
      { width: 32, height: 32, buffer: ico32 },
    ]);

    const svgFavicon = generateSVG(svgColor);

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('opengraph-favicons.zip');
    archive.pipe(res);

    images.forEach(img => archive.append(img.buffer, { name: img.name }));
    archive.append(icoBuffer, { name: 'favicon.ico' });
    archive.append(Buffer.from(svgFavicon), { name: 'icon.svg' });
    archive.append(generateHTML(), { name: 'implementation.html' });
    archive.append(generateManifest(), { name: 'manifest.webmanifest' });

    await archive.finalize();
    console.log('ZIP generation completed');
  } catch (error) {
    console.error('Error processing image:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
}

app.post('/api/v1/generate', generateLimiter, upload.single('image'), handleGenerate);
// Alias for existing SPA + backward compat
app.post('/generate', generateLimiter, upload.single('image'), handleGenerate);

// ---------- SSRF protection ----------
// IPv4 ranges that must never be fetched (private, loopback, link-local, metadata, multicast, reserved)
function isBlockedIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 0) return true;                                 // 0.0.0.0/8
  if (a === 10) return true;                                // 10.0.0.0/8 private
  if (a === 100 && b >= 64 && b <= 127) return true;        // 100.64.0.0/10 CGNAT
  if (a === 127) return true;                               // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;                  // 169.254.0.0/16 link-local (AWS/GCP/Azure metadata)
  if (a === 172 && b >= 16 && b <= 31) return true;         // 172.16.0.0/12 private
  if (a === 192 && b === 0) return true;                    // 192.0.0.0/24 + 192.0.2.0/24 reserved
  if (a === 192 && b === 168) return true;                  // 192.168.0.0/16 private
  if (a === 198 && (b === 18 || b === 19)) return true;     // 198.18.0.0/15 benchmarking
  if (a >= 224 && a <= 239) return true;                    // 224.0.0.0/4 multicast
  if (a >= 240) return true;                                // 240.0.0.0/4 reserved
  return false;
}

async function resolveAndValidate(hostname) {
  // Request IPv4-only at the DNS layer. IPv6 SSRF surface is large (link-local
  // fe80::/10, ULA fc00::/7, IPv4-mapped, etc.) and most public sites still have
  // A records, so we resolve IPv4 only and let the lookup fail for IPv6-only hosts.
  let addrs;
  try {
    addrs = await dns.lookup(hostname, { all: true, family: 4 });
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      throw new Error('Could not resolve hostname (no IPv4 records)');
    }
    throw new Error('Could not resolve hostname');
  }
  if (!addrs.length) throw new Error('No IPv4 records found');
  for (const { address } of addrs) {
    if (isBlockedIPv4(address)) {
      throw new Error('Private or reserved IP addresses are not allowed');
    }
  }
}

// Fetch with redirect validation: every hop is independently checked for SSRF.
async function safeFetch(targetUrl, maxHops = 5) {
  let url = targetUrl;
  for (let hop = 0; hop <= maxHops; hop++) {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only http and https protocols are allowed');
    }
    await resolveAndValidate(parsed.hostname);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'OpenGraphResizer/1.0 (+https://github.com/kmanan/opengraph)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: ANALYZE_TIMEOUT_MS,
      maxRedirects: 0,                       // we handle redirects ourselves so we can re-validate
      maxContentLength: ANALYZE_MAX_BYTES,
      maxBodyLength: ANALYZE_MAX_BYTES,
      validateStatus: (status) => status < 500,
      decompress: true,
      responseType: 'text',
    });

    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      url = new URL(response.headers.location, url).href;
      continue;
    }

    const contentType = (response.headers['content-type'] || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('xhtml') && !contentType.includes('text/plain')) {
      throw new Error('Response is not HTML');
    }

    return { response, finalUrl: url };
  }
  throw new Error('Too many redirects');
}

// ---------- /api/analyze handler ----------
async function handleAnalyze(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      return res.status(400).json({ error: 'Invalid URL format. Please include http:// or https://' });
    }

    const { response, finalUrl } = await safeFetch(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const getMetaContent = (selectors) => {
      for (const selector of selectors) {
        const content = $(selector).attr('content');
        if (content) return content;
      }
      return null;
    };

    const ogData = {
      url: finalUrl,
      title: getMetaContent(['meta[property="og:title"]', 'meta[name="twitter:title"]']) || $('title').text() || null,
      description: getMetaContent(['meta[property="og:description"]', 'meta[name="twitter:description"]', 'meta[name="description"]']) || null,
      og: {
        title: $('meta[property="og:title"]').attr('content') || null,
        description: $('meta[property="og:description"]').attr('content') || null,
        image: $('meta[property="og:image"]').attr('content') || null,
        imageWidth: $('meta[property="og:image:width"]').attr('content') || null,
        imageHeight: $('meta[property="og:image:height"]').attr('content') || null,
        imageAlt: $('meta[property="og:image:alt"]').attr('content') || null,
        url: $('meta[property="og:url"]').attr('content') || finalUrl,
        type: $('meta[property="og:type"]').attr('content') || 'website',
        siteName: $('meta[property="og:site_name"]').attr('content') || null,
        locale: $('meta[property="og:locale"]').attr('content') || null,
      },
      twitter: {
        card: $('meta[name="twitter:card"]').attr('content') || null,
        site: $('meta[name="twitter:site"]').attr('content') || null,
        creator: $('meta[name="twitter:creator"]').attr('content') || null,
        title: $('meta[name="twitter:title"]').attr('content') || null,
        description: $('meta[name="twitter:description"]').attr('content') || null,
        image: $('meta[name="twitter:image"]').attr('content') || null,
        imageAlt: $('meta[name="twitter:image:alt"]').attr('content') || null,
      },
      meta: {
        canonical: $('link[rel="canonical"]').attr('href') || null,
        favicon: $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '/favicon.ico',
        themeColor: $('meta[name="theme-color"]').attr('content') || null,
        author: $('meta[name="author"]').attr('content') || null,
      },
      resolved: { image: null, favicon: null },
    };

    const resolveUrl = (relativeUrl, baseUrl) => {
      if (!relativeUrl) return null;
      try {
        return new URL(relativeUrl, baseUrl).href;
      } catch {
        return relativeUrl;
      }
    };

    ogData.resolved.image = resolveUrl(ogData.og.image || ogData.twitter.image, finalUrl);
    ogData.resolved.favicon = resolveUrl(ogData.meta.favicon, finalUrl);

    res.json(ogData);
  } catch (error) {
    console.error('Error analyzing URL:', error.message);

    const msg = error.message || '';
    if (msg.includes('Private') || msg.includes('IPv4') || msg.includes('resolve')) {
      return res.status(400).json({ error: msg });
    }
    if (msg.includes('redirects')) {
      return res.status(400).json({ error: 'Too many redirects' });
    }
    if (msg.includes('not HTML')) {
      return res.status(400).json({ error: 'URL did not return an HTML page' });
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(400).json({ error: 'Could not connect to the specified URL' });
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(400).json({ error: 'Request timed out' });
    }
    if (error.response && error.response.status) {
      return res.status(400).json({ error: `Website returned error: ${error.response.status}` });
    }
    res.status(500).json({ error: 'Failed to analyze URL. Please check the URL and try again.' });
  }
}

app.get('/api/v1/analyze', analyzeLimiter, handleAnalyze);
app.get('/api/analyze', analyzeLimiter, handleAnalyze);

// ---------- Health ----------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------- Multer error handler ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File too large. Max ${MAX_UPLOAD_MB}MB.` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err && err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// ---------- Start + graceful shutdown ----------
const server = app.listen(PORT, () => {
  console.log(`OpenGraph Resizer running on port ${PORT}`);
  console.log(`  PUBLIC_URL=${PUBLIC_URL}`);
  console.log(`  GA_MEASUREMENT_ID=${GA_MEASUREMENT_ID ? '[set]' : '[unset]'}`);
  console.log(`  SITE_NAME=${SITE_NAME}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
