# LooK Theme Presets

Pre-configured themes for different use cases and industries.

## Usage

Apply a theme by using multiple options together:

```bash
look demo https://mysite.com \
  --cursor arrow-modern \
  --cursor-preset github \
  --click-effect ripple \
  --click-color "#3B82F6" \
  --zoom-mode smart
```

## Available Themes

### Professional SaaS

Clean, modern look for B2B products.

```bash
look demo https://mysite.com \
  -v nova \
  -s professional \
  --cursor arrow-modern \
  --cursor-preset dark \
  --click-effect ripple \
  --click-color "#3B82F6" \
  --zoom-mode smart \
  --max-zoom 1.5
```

### Startup Launch

Energetic, attention-grabbing for product launches.

```bash
look demo https://mysite.com \
  -v shimmer \
  -s energetic \
  --cursor dot \
  --cursor-color "#FF6B35" \
  --cursor-glow \
  --click-effect pulse \
  --click-color "#FF6B35" \
  --zoom-mode follow \
  --zoom-intensity 0.7 \
  --max-zoom 2.0
```

### Developer Tools

GitHub-inspired theme for dev products.

```bash
look demo https://mysite.com \
  -v echo \
  -s professional \
  --cursor arrow-modern \
  --cursor-preset github \
  --click-effect ring \
  --click-color "#238636" \
  --zoom-mode smart \
  --max-zoom 1.6
```

### Design Tools

Figma-inspired creative theme.

```bash
look demo https://mysite.com \
  -v alloy \
  -s casual \
  --cursor circle \
  --cursor-preset figma \
  --cursor-glow \
  --click-effect spotlight \
  --click-color "#9747FF" \
  --zoom-mode follow \
  --zoom-intensity 0.6
```

### E-commerce

Clean, conversion-focused theme.

```bash
look demo https://mysite.com \
  -v nova \
  -s professional \
  --cursor pointer \
  --cursor-preset dark \
  --click-effect ripple \
  --click-color "#10B981" \
  --zoom-mode smart \
  --max-zoom 1.8
```

### Documentation

Minimal theme for docs and tutorials.

```bash
look demo https://docs.mysite.com \
  -v echo \
  -s casual \
  --cursor crosshair \
  --cursor-preset notion \
  --click-effect ring \
  --click-color "#37352F" \
  --zoom-mode basic \
  --max-zoom 1.4
```

### Dark Mode

For sites with dark backgrounds.

```bash
look demo https://dark-site.com \
  -v onyx \
  -s professional \
  --cursor arrow-modern \
  --cursor-preset light \
  --cursor-glow \
  --click-effect ripple \
  --click-color "#FFFFFF" \
  --zoom-mode smart
```

### Minimal

Clean, distraction-free theme.

```bash
look demo https://mysite.com \
  -v alloy \
  -s professional \
  --cursor dot \
  --cursor-color "#666666" \
  --click-effect none \
  --zoom-mode none
```

### High Visibility

Maximum visibility for presentations.

```bash
look demo https://mysite.com \
  -v onyx \
  -s professional \
  --cursor spotlight \
  --cursor-size 48 \
  --cursor-color "#FF0000" \
  --cursor-glow \
  --click-effect pulse \
  --click-color "#FF0000" \
  --click-size 100 \
  --zoom-mode follow \
  --max-zoom 2.5
```

### Mobile-First

Optimized for mobile app showcases.

```bash
look mobile ./app.app \
  -v shimmer \
  -s casual \
  --touch-indicator circle \
  --touch-color "rgba(255,255,255,0.9)" \
  --touch-size 100 \
  --show-swipe-trail \
  --device-frame \
  --frame-style modern
```

## Platform-Specific Presets

### YouTube

Full HD, professional look.

```bash
look demo https://mysite.com \
  -p youtube \
  -d 60 \
  --width 1920 \
  --height 1080 \
  -v nova \
  -s professional
```

### Twitter/X

Short, punchy clips.

```bash
look demo https://mysite.com \
  -p twitter \
  -d 15 \
  -v shimmer \
  -s energetic \
  --zoom-mode follow \
  --zoom-intensity 0.8
```

### Instagram Feed

Square format.

```bash
look demo https://mysite.com \
  -p instagram \
  -d 30 \
  -v nova \
  -s casual
```

### TikTok

Vertical, fast-paced.

```bash
look demo https://mysite.com \
  -p tiktok \
  -d 15 \
  -v shimmer \
  -s energetic \
  --zoom-mode follow \
  --zoom-intensity 0.9
```

### LinkedIn

Professional, longer format.

```bash
look demo https://mysite.com \
  -p youtube \
  -d 90 \
  -v onyx \
  -s professional \
  --cursor arrow-modern \
  --cursor-preset dark \
  --zoom-mode smart \
  --max-zoom 1.4
```

## Brand Colors

### Blue Theme
```bash
--cursor-color "#3B82F6" --click-color "#3B82F6"
```

### Green Theme
```bash
--cursor-color "#10B981" --click-color "#10B981"
```

### Purple Theme
```bash
--cursor-color "#8B5CF6" --click-color "#8B5CF6"
```

### Orange Theme
```bash
--cursor-color "#F97316" --click-color "#F97316"
```

### Red Theme
```bash
--cursor-color "#EF4444" --click-color "#EF4444"
```

## Custom Theme Template

Create your own theme:

```bash
look demo https://mysite.com \
  # Voice & Style
  -v <voice> \              # nova, alloy, echo, fable, onyx, shimmer
  -s <style> \              # professional, casual, energetic
  
  # Cursor
  --cursor <style> \        # default, arrow-modern, pointer, dot, circle, crosshair, spotlight
  --cursor-size <px> \      # 20-64
  --cursor-color "<hex>" \  # Your brand color
  --cursor-glow \           # Optional glow
  
  # Click Effects
  --click-effect <type> \   # ripple, pulse, ring, spotlight, none
  --click-color "<hex>" \   # Match cursor or contrast
  --click-size <px> \       # 40-120
  
  # Zoom
  --zoom-mode <mode> \      # none, basic, smart, follow
  --zoom-intensity <0-1> \  # For follow mode
  --max-zoom <level>        # 1.0-3.0
```
