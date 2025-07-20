# 📷 OpenGraph Generator

**Free tool to create perfect social media cards, favicons, and PWA icons for all platforms.**

🌐 **Live Demo:** [https://opengraph.krytonlabs.com/](https://opengraph.krytonlabs.com/)

## ✨ Features

- 🎯 **Perfect OpenGraph Images** - 1200×630px for Facebook, Twitter, LinkedIn
- 📱 **Square Social Images** - 1200×1200px for Instagram, WhatsApp, Quora  
- 🔗 **Complete Favicon Set** - ICO, SVG, PNG (all sizes)
- 📲 **PWA Ready** - Manifest files and app icons
- 🎨 **Drag & Drop Interface** - Modern, responsive UI
- ⚡ **Instant ZIP Download** - All files generated in seconds
- 🛡️ **Production Ready** - Security middleware, rate limiting
- 🚀 **Zero Dependencies** - Pure in-memory processing

## 🎯 What You Get

When you upload an image, you instantly get:

### **Social Media Images**
- `og-image.png` - 1200×630px (Facebook, Twitter, LinkedIn)
- `og-square.png` - 1200×1200px (Instagram, WhatsApp)

### **Complete Favicon Set**
- `favicon.ico` - Multi-size ICO file
- `icon.svg` - Scalable SVG favicon with dark/light mode
- `favicon-16x16.png` - Browser tab icon
- `favicon-32x32.png` - High-res browser icon
- `apple-touch-icon.png` - 180×180px iOS icon

### **PWA & App Icons**
- `android-chrome-192x192.png` - Android home screen
- `android-chrome-512x512.png` - PWA splash screen
- `manifest.webmanifest` - Progressive Web App manifest
- `browserconfig.xml` - Windows tile configuration

### **Implementation Files**
- `implementation.html` - Ready-to-use HTML template with all meta tags
- Complete OpenGraph, Twitter Cards, and social media meta tags

## 🚀 Quick Start

### **Using the Live Tool**
1. Visit [https://opengraph.krytonlabs.com/](https://opengraph.krytonlabs.com/)
2. Upload any image (PNG, JPG, GIF)
3. Choose SVG favicon color
4. Download your complete social media kit as ZIP

### **Self-Hosting**

```bash
# Clone the repository
git clone https://github.com/kmanan/opengraph-generator.git
cd opengraph-generator

# Install dependencies
npm install

# Start the server
npm start

# Visit http://localhost:6001
```

## 🛠️ Tech Stack

- **Backend:** Node.js + Express.js
- **Image Processing:** Sharp (fastest, most efficient)
- **ZIP Generation:** Archiver
- **File Uploads:** Multer
- **Security:** Helmet, CORS, Rate Limiting
- **Frontend:** Vanilla HTML/CSS/JavaScript with modern UI

## 📦 Dependencies

```json
{
  "sharp": "^0.33.5",
  "archiver": "^7.0.1", 
  "express": "^4.21.1",
  "multer": "^2.0.2",
  "to-ico": "^1.1.5",
  "helmet": "^8.0.0",
  "cors": "^2.8.5",
  "express-rate-limit": "^7.4.1"
}
```

## 🏗️ Architecture

### **Zero Server Storage Design**
- All processing happens in memory buffers
- No files stored on server disk
- Automatic cleanup after download
- Perfect for scalable deployments

### **Processing Flow**
```
Upload Image → Sharp Processing → Generate All Sizes → 
Create ZIP Archive → Stream Download → Memory Cleanup
```

## 🔧 Configuration

### **Environment Variables**
```bash
PORT=6001                    # Server port (default: 6001)
NODE_ENV=production         # Environment mode
```

### **Production Deployment**

**With PM2:**
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name "opengraph-generator"

# Auto-start on server boot
pm2 startup
pm2 save
```

**With Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 6001
CMD ["node", "server.js"]
```

## 🎨 Customization

### **Modify Image Sizes**
Edit the `sizes` array in `server.js`:
```javascript
const sizes = [
  { name: 'og-image.png', width: 1200, height: 630 },
  { name: 'custom-size.png', width: 800, height: 400 },
  // Add your custom sizes
];
```

### **Change UI Theme**
Modify `public/style.css` to customize colors, fonts, and layout.

### **Add New File Formats**
Extend the Sharp processing pipeline in `server.js` to generate WebP, AVIF, or other formats.

## 🛡️ Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection  
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **File Validation** - Image type and size limits
- **Memory Limits** - Prevents memory exhaustion attacks

## 📊 Performance

- **Processing Speed:** 100-500ms per image set
- **Memory Usage:** ~50-100MB per concurrent request  
- **Supported Formats:** PNG, JPG, GIF, WebP, TIFF
- **Max File Size:** 10MB
- **Concurrent Users:** 10-50 on basic VPS

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Sharp** - Incredible image processing performance
- **Archiver** - Reliable ZIP generation
- **Express.js** - Solid web framework foundation

## 🔗 Links

- **Live Demo:** [https://opengraph.krytonlabs.com/](https://opengraph.krytonlabs.com/)
- **GitHub:** [https://github.com/kmanan/opengraph-generator](https://github.com/kmanan/opengraph-generator)
- **Documentation:** See `/docs` folder for detailed guides

---

**Made with ❤️ by [KrytonLabs](https://krytonlabs.com)**

*Generate perfect social media cards in seconds!* 