# OutClever Logo Assets

This directory contains logo and image assets for OutClever branding and social sharing.

## Required Assets

### 1. Open Graph Image (`logo-og.png`)

**Dimensions:** 1200x630px  
**Format:** PNG  
**Purpose:** Social media previews (WhatsApp, Facebook, Twitter, LinkedIn)  
**Content:**

- OutClever logo/wordmark in Montserrat Extra Bold (900)
- "OUTCLEVER" in uppercase
- Tagline: "Smarter. Sharper. Faster."
- Clean background (white or black, theme-adaptive)
- High contrast for visibility across platforms

**Design Guidelines:**

- Minimal, bold typography
- Black text on white background (light mode variant)
- White text on black background (dark mode variant)
- Centered composition
- Safe area: Keep critical text/branding within 1000x560px center zone

---

### 2. Favicon (`favicon.ico`)

**Dimensions:** 16x16, 32x32, 48x48 (multi-resolution ICO)  
**Format:** ICO  
**Purpose:** Browser tab icon  
**Content:**

- Simplified "O" or "OC" monogram
- High contrast for small sizes
- Works in both light and dark themes

---

### 3. Standard Icon (`icon.png`)

**Dimensions:** 32x32px  
**Format:** PNG  
**Purpose:** Progressive Web App icon  
**Content:**

- Same as favicon but PNG format
- Clean, recognizable at small sizes

---

### 4. Apple Touch Icon (`apple-icon.png`)

**Dimensions:** 180x180px  
**Format:** PNG  
**Purpose:** iOS home screen icon  
**Content:**

- OutClever logo or "O" symbol
- No transparency (iOS adds rounded corners automatically)
- Solid background color (white or brand color)

---

### 5. Web Manifest (`manifest.json`)

**Purpose:** PWA configuration  
**Content:**

```json
{
  "name": "OutClever",
  "short_name": "OutClever",
  "description": "Smarter. Sharper. Faster. — AI-powered book insights",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "/apple-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    },
    {
      "src": "/logo-og.png",
      "sizes": "1200x630",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

---

## How to Generate Assets

### Option 1: Using Figma/Design Tool

1. Create artboard with exact dimensions
2. Use Montserrat Extra Bold (900) font
3. Export as PNG (high quality, 2x resolution for crisp results)
4. Optimize with ImageOptim or similar tool

### Option 2: Using Code (React Component to Image)

1. Use the existing `Logo.tsx` component
2. Render at large size in a headless browser
3. Screenshot and crop to exact dimensions
4. Save as PNG

### Option 3: Using Online Tools

- Canva: Create custom dimensions, export PNG
- Figma: Free design tool with export options
- Photopea: Free Photoshop alternative

---

## Current Status

- ✅ Logo component created (`src/components/shared/Logo.tsx`)
- ⏳ `logo-og.png` - **NEEDS CREATION** (1200x630px)
- ⏳ `favicon.ico` - **NEEDS CREATION** (16x16, 32x32, 48x48)
- ⏳ `icon.png` - **NEEDS CREATION** (32x32px)
- ⏳ `apple-icon.png` - **NEEDS CREATION** (180x180px)
- ⏳ `manifest.json` - **NEEDS CREATION**

---

## Testing Social Previews

After creating assets, test across platforms:

### WhatsApp

1. Share link in WhatsApp
2. Verify image, title, and description appear
3. Test on mobile and desktop

### Twitter/X

- Use [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### Facebook

- Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

### LinkedIn

- Share link and verify preview

### Google

- Use [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## Optimization Tips

1. **Compression:** Use TinyPNG or ImageOptim to reduce file size without quality loss
2. **Formats:** Provide WebP alternatives for modern browsers
3. **Caching:** Set long cache headers for logo assets
4. **Preload:** Consider preloading critical logos in `<head>`
5. **Accessibility:** Always include alt text in metadata

---

## Brand Consistency

Every shared link should immediately communicate:  
**"This is OutClever — Smarter. Sharper. Faster."**

The logo assets are the first impression. Make them count.
