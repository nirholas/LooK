# SaaS Landing Page Demo

Example configuration for creating polished SaaS product demo videos.

## Usage

### Using the Configuration File

The `config.json` file defines a complete demo configuration. While LooK doesn't yet support config file input directly, you can use this as a reference for building demos programmatically:

```javascript
import { generateDemoV2 } from 'look-demo';
import config from './config.json' assert { type: 'json' };

await generateDemoV2(config.url, {
  output: config.output.path,
  duration: config.timing.duration,
  voice: config.voice.voice,
  style: config.voice.style,
  preset: config.output.preset,
  cursorStyle: config.cursor.style,
  cursorSize: config.cursor.size,
  cursorPreset: config.cursor.preset,
  cursorGlow: config.cursor.glow,
  clickEffect: config.clickEffects.effect,
  clickEffectColor: config.clickEffects.color,
  zoomMode: config.zoom.mode,
  followIntensity: config.zoom.intensity,
  maxZoom: config.zoom.maxZoom
});
```

### CLI Equivalent

```bash
look demo https://your-saas-app.com \
  -o ./output/saas-demo.mp4 \
  -d 45 \
  -v nova \
  -s professional \
  -p youtube \
  --cursor arrow-modern \
  --cursor-preset dark \
  --click-effect ripple \
  --click-color "#3B82F6" \
  --zoom-mode smart \
  --max-zoom 1.6 \
  --reliable
```

## Configuration Structure

### Output Settings
- `path` - Output file location
- `preset` - Export preset (youtube, twitter, instagram, tiktok, gif)
- `width` / `height` - Recording dimensions

### Timing
- `duration` - Total video length in seconds
- `introDelay` - Pause before starting (ms)
- `outroDelay` - Pause at end (ms)

### Voice & Style
- `voice` - TTS voice (nova, alloy, echo, fable, onyx, shimmer)
- `style` - Script style (professional, casual, energetic)
- `speed` - Speech rate multiplier

### Cursor
- `style` - Cursor appearance
- `size` - Size in pixels
- `preset` - Color preset
- `glow` - Enable glow effect

### Click Effects
- `effect` - Effect type (ripple, pulse, ring, spotlight, none)
- `color` - Effect color (hex)
- `size` - Effect radius
- `duration` - Animation duration (ms)

### Zoom
- `mode` - Zoom behavior (none, basic, smart, follow)
- `intensity` - Follow intensity (0-1)
- `maxZoom` / `minZoom` - Zoom limits

### Interactions (Future)
Define scripted interactions like:
- `wait` - Pause for duration
- `scroll` - Scroll to element or position
- `hover` - Hover over element
- `click` - Click element
- `type` - Type into input

## Customizing

1. Copy `config.json` to your project
2. Update `url` to your site
3. Adjust timing and styling
4. Define interactions to demonstrate key features
5. Run using the programmatic approach above

## Tips

1. **Start with hero section** - Give viewers 2-3 seconds to absorb the hero
2. **Show key features** - Scroll through 3-5 top features
3. **Highlight pricing** - End near the CTA/pricing section
4. **Keep it focused** - 30-60 seconds is ideal for most demos
5. **Match your brand** - Use brand colors in cursor and effects
