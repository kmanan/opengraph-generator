# Open Graph & Favicon Requirements for Modern Websites

## Complete List of Images for Modern Open Graph & Favicon Implementation

### **Essential Open Graph Images**

1. **Primary Open Graph Image: 1200x630px** (PNG/JPG)
   - Most important - works across Facebook, LinkedIn, Twitter/X
   - Aspect ratio: 1.91:1
   - File size: Under 8MB (ideally under 1MB)
   - This is your main social sharing image

2. **Square Open Graph Image: 1200x1200px** (PNG/JPG)
   - For platforms like WhatsApp, Quora that crop to square
   - Keep important content in center 630x630px area
   - Alternative sizes: 1080x1080px or 1024x1024px

### **Favicon Set (Essential)**

3. **favicon.ico** - 32x32px (ICO format)
   - Universal browser compatibility
   - Must be in root directory as `/favicon.ico`

4. **SVG Favicon** - Scalable (SVG format)
   - For modern browsers
   - Can include light/dark mode CSS

5. **Apple Touch Icon: 180x180px** (PNG)
   - iOS "Add to Home Screen" functionality
   - Should have solid background (no transparency)

6. **Android Chrome Icons:**
   - **192x192px** (PNG) - Home screen icon
   - **512x512px** (PNG) - PWA splash screen

### **Additional Favicon Sizes (Recommended)**

7. **16x16px** (PNG) - Legacy browser support
8. **32x32px** (PNG) - High-res browser tabs  
9. **48x48px** (PNG) - Windows desktop shortcuts
10. **96x96px** (PNG) - Some Android versions
11. **144x144px** (PNG) - Windows Metro tiles
12. **152x152px** (PNG) - Older iPad devices

### **PWA (Progressive Web App) Specific**

13. **Maskable Icon: 512x512px** (PNG)
    - For adaptive launchers on Android
    - Important content within 409x409px safe zone
    - Extra padding around edges for cropping

### **Platform-Specific (Optional but Recommended)**

14. **Twitter Card Image: 1200x675px** (PNG/JPG)
    - Optimized for Twitter's summary_large_image card
    - Aspect ratio: 1.78:1

15. **LinkedIn Specific: 1200x627px** (PNG/JPG)
    - Slightly different from standard OG image

### **File Format Recommendations**

- **Open Graph Images**: PNG or JPG (PNG preferred for logos/text)
- **Favicons**: ICO for legacy, PNG for modern, SVG for scalable
- **Apple Touch Icons**: PNG with solid background
- **Android Icons**: PNG with transparency support

### **Key Technical Requirements**

- **File Size**: Keep OG images under 8MB, favicons under 1KB-10KB
- **Color Space**: sRGB recommended
- **Compression**: Optimize for web without losing quality
- **Text**: Keep text large and readable (72px+ for titles)
- **Contrast**: Ensure good contrast ratios (4.5:1 minimum)

### **Summary: Minimum Viable Set**

If you want to start minimal, these 5 files cover most needs:
1. **favicon.ico** (32x32px)
2. **icon.svg** (scalable)
3. **apple-touch-icon.png** (180x180px) 
4. **og-image.png** (1200x630px)
5. **android-chrome-192.png** (192x192px)

### **HTML Implementation Example**

```html
<!-- Essential Open Graph -->
<meta property="og:image" content="https://example.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Description of your content" />

<!-- Favicons -->
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.webmanifest">
```

### **Web App Manifest Example**

```json
{
  "name": "Your App Name",
  "icons": [
    { "src": "/android-chrome-192.png", "type": "image/png", "sizes": "192x192" },
    { "src": "/icon-mask.png", "type": "image/png", "sizes": "512x512", "purpose": "maskable" },
    { "src": "/android-chrome-512.png", "type": "image/png", "sizes": "512x512" }
  ]
}
```

## Research Notes

This research shows that while older guides suggest 20+ images, modern implementations can work effectively with just 5-8 well-chosen images that cover the major platforms and use cases. The key is prioritizing the most commonly used sizes and ensuring compatibility across major social media platforms and mobile devices. 