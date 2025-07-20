const express = require('express');
const sharp = require('sharp');
const archiver = require('archiver');
const multer = require('multer');
const toIco = require('to-ico');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Security middleware
app.use(helmet());
app.use(cors());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Serve static files
app.use(express.static('public'));

// SVG favicon generator
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

// HTML implementation template
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

// Web manifest generator
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

// Main image generation endpoint
app.post('/generate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const inputBuffer = req.file.buffer;
    const svgColor = req.body.svgColor || '#000000';
    
    console.log('Processing image...', { originalSize: inputBuffer.length });
    
    // Generate all required sizes in memory
    const sizes = [
      { name: 'og-image.png', width: 1200, height: 630 },
      { name: 'og-square.png', width: 1200, height: 1200 },
      { name: 'favicon-32x32.png', width: 32, height: 32 },
      { name: 'favicon-16x16.png', width: 16, height: 16 },
      { name: 'apple-touch-icon.png', width: 180, height: 180 },
      { name: 'android-chrome-192x192.png', width: 192, height: 192 },
      { name: 'android-chrome-512x512.png', width: 512, height: 512 }
    ];
    
    const images = await Promise.all(
      sizes.map(async (size) => ({
        name: size.name,
        buffer: await sharp(inputBuffer)
          .resize(size.width, size.height, { fit: 'cover' })
          .png()
          .toBuffer()
      }))
    );
    
    // Generate ICO file
    const ico16 = await sharp(inputBuffer).resize(16, 16).png().toBuffer();
    const ico32 = await sharp(inputBuffer).resize(32, 32).png().toBuffer();
    const icoBuffer = await toIco([ico16, ico32]);
    
    // Generate SVG favicon
    const svgFavicon = generateSVG(svgColor);
    
    // Create ZIP in memory
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('opengraph-favicons.zip');
    archive.pipe(res);
    
    // Add images to ZIP
    images.forEach(img => {
      archive.append(img.buffer, { name: img.name });
    });
    
    // Add ICO and SVG
    archive.append(icoBuffer, { name: 'favicon.ico' });
    archive.append(Buffer.from(svgFavicon), { name: 'icon.svg' });
    
    // Add HTML implementation template
    archive.append(generateHTML(), { name: 'implementation.html' });
    
    // Add web manifest
    archive.append(generateManifest(), { name: 'manifest.webmanifest' });
    
    await archive.finalize();
    
    console.log('ZIP generation completed');
    
    // Memory automatically cleaned up after response
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 6001;

app.listen(PORT, () => {
  console.log(`🚀 Open Graph Generator running on port ${PORT}`);
  console.log(`📁 Visit http://localhost:${PORT} to upload images`);
}); 