# Custom Cursor Examples

Programmatic cursor and click effect customization.

## Usage

```bash
cd examples/custom-cursor
node demo.js
```

This generates custom cursor images in the `./output` directory.

## What's Demonstrated

1. **Basic Custom Cursor** - Custom colors and shadow
2. **Glow Effect** - Cursor with ambient glow
3. **Using Presets** - Apply pre-defined color schemes
4. **Spotlight Cursor** - Large spotlight style
5. **Click Effects** - Generate FFmpeg filters for clicks
6. **All Presets** - List available presets
7. **All Styles** - Generate every cursor style
8. **Brand Cursors** - Create brand-colored cursor set

## Cursor Styles

```javascript
import { CursorRenderer } from 'look-demo/v2/cursor-renderer.js';

const cursor = new CursorRenderer({
  // Style options
  style: 'arrow-modern',  // default, arrow-modern, pointer, dot, circle, crosshair, spotlight
  size: 32,               // Size in pixels
  
  // Colors
  color: '#000000',       // Main color
  outlineColor: '#FFFFFF', // Outline color
  outlineWidth: 2,        // Outline width
  
  // Shadow
  shadowBlur: 6,
  shadowOpacity: 0.4,
  
  // Glow effect
  glow: true,
  glowColor: '#3B82F6',
  glowIntensity: 0.5,
  
  // Trail (for motion)
  trail: false,
  trailLength: 5,
  trailOpacity: 0.3
});

// Generate cursor image
const imagePath = await cursor.generateCursorImage('./output');
const clickImagePath = await cursor.generateCursorImage('./output', true);
```

## Click Effects

```javascript
import { ClickEffectRenderer } from 'look-demo/v2/click-effects.js';

const clickEffect = new ClickEffectRenderer({
  effect: 'ripple',      // ripple, pulse, ring, spotlight
  color: '#3B82F6',      // Effect color
  size: 60,              // Maximum size
  duration: 400,         // Duration in ms
  opacity: 0.6           // Opacity
});

// Generate FFmpeg filter string
const clicks = [
  { x: 500, y: 300, t: 1000 },  // x, y, time in ms
  { x: 800, y: 450, t: 3500 }
];

const filter = clickEffect.generateSimpleFilter(clicks, 60);
```

## Available Presets

```javascript
import { getCursorPreset, CURSOR_PRESETS } from 'look-demo/v2/cursor-renderer.js';

// Get a specific preset
const github = getCursorPreset('github');
// { color: '#24292f', outlineColor: '#ffffff', ... }

// All presets
console.log(Object.keys(CURSOR_PRESETS));
// ['light', 'dark', 'blue', 'green', 'red', 'purple', 'orange', 'github', 'figma', 'notion']
```

## Using with generateDemo

```javascript
import { generateDemoV2 } from 'look-demo';

await generateDemoV2('https://myapp.com', {
  output: './demo.mp4',
  
  // Cursor settings
  cursorStyle: 'arrow-modern',
  cursorSize: 36,
  cursorColor: '#6366F1',
  cursorGlow: true,
  
  // Click effects
  clickEffect: 'ripple',
  clickEffectColor: '#6366F1',
  clickEffectSize: 80,
  clickEffectDuration: 500
});
```

## Creating Animated Cursors

For more advanced use cases, you can generate frame sequences:

```javascript
import { CursorRenderer } from 'look-demo/v2/cursor-renderer.js';

async function generateClickAnimation(frames = 10) {
  const images = [];
  
  for (let i = 0; i < frames; i++) {
    const progress = i / (frames - 1);
    const scale = 1 - (progress * 0.15);  // Shrink during click
    
    const cursor = new CursorRenderer({
      style: 'dot',
      size: Math.round(32 * scale),
      color: '#3B82F6',
      glow: true,
      glowIntensity: 0.5 + (progress * 0.3)  // Increase glow
    });
    
    const path = await cursor.generateCursorImage(`./frames/frame-${i}`);
    images.push(path);
  }
  
  return images;
}
```
