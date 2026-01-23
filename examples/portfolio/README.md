# Portfolio Demo Example

Example configuration for creating creative portfolio showcase videos.

## Usage

### CLI

```bash
look demo https://your-portfolio.com \
  -o portfolio-demo.mp4 \
  -d 30 \
  -p instagram \
  -v shimmer \
  -s casual \
  --cursor circle \
  --cursor-size 36 \
  --cursor-color "#8B5CF6" \
  --cursor-glow \
  --click-effect spotlight \
  --click-color "#8B5CF6" \
  --zoom-mode follow \
  --zoom-intensity 0.6 \
  --max-zoom 2.0
```

### Programmatic

```javascript
import { generateDemoV2 } from 'look-demo';

await generateDemoV2('https://your-portfolio.com', {
  output: './portfolio-demo.mp4',
  duration: 30,
  preset: 'instagram',
  voice: 'shimmer',
  style: 'casual',
  cursorStyle: 'circle',
  cursorSize: 36,
  cursorColor: '#8B5CF6',
  cursorGlow: true,
  clickEffect: 'spotlight',
  clickEffectColor: '#8B5CF6',
  zoomMode: 'follow',
  followIntensity: 0.6,
  maxZoom: 2.0
});
```

## Key Features to Showcase

1. **Hero/Introduction** - Who you are
2. **Work Gallery** - Project thumbnails
3. **Project Details** - Case study
4. **About Section** - Your story
5. **Contact** - How to reach you

## Theme Rationale

- **Circle cursor with glow** - Creative, modern feel
- **Purple color** - Creative/design association
- **Follow zoom** - Dynamic, engaging movement
- **Spotlight effect** - Dramatic click moments
- **Instagram preset** - Square format for social
- **Shimmer voice** - Upbeat, friendly tone
