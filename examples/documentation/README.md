# Documentation Site Demo Example

Example configuration for creating developer documentation walkthrough videos.

## Usage

### CLI

```bash
look demo https://docs.your-api.com \
  -o docs-demo.mp4 \
  -d 60 \
  -v echo \
  -s professional \
  --cursor crosshair \
  --cursor-preset github \
  --click-effect ring \
  --click-color "#238636" \
  --zoom-mode basic \
  --max-zoom 1.5
```

### Programmatic

```javascript
import { generateDemoV2 } from 'look-demo';

await generateDemoV2('https://docs.your-api.com', {
  output: './docs-demo.mp4',
  duration: 60,
  voice: 'echo',
  style: 'professional',
  cursorStyle: 'crosshair',
  cursorPreset: 'github',
  clickEffect: 'ring',
  clickEffectColor: '#238636',
  zoomMode: 'basic',
  maxZoom: 1.5
});
```

## Key Features to Showcase

1. **Search** - Finding information quickly
2. **Navigation** - Site structure
3. **Code Examples** - Copy-paste ready
4. **API Reference** - Endpoint details
5. **Interactive Playground** - Try it live

## Theme Rationale

- **Crosshair cursor** - Precision/technical feel
- **GitHub preset** - Developer familiarity
- **Ring effect** - Subtle, non-distracting
- **Basic zoom** - Less movement for readability
- **Echo voice** - Clear, narrative tone
