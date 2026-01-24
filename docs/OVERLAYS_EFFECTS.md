# Enterprise Overlays & Effects Guide

L👀K provides a comprehensive suite of professional overlay and effects modules for creating stunning, broadcast-quality demo videos.

## Table of Contents

- [Animated Captions](#animated-captions)
- [Lower Thirds](#lower-thirds)
- [Keyboard Visualizer](#keyboard-visualizer)
- [Callouts & Annotations](#callouts--annotations)
- [Spotlight Effects](#spotlight-effects)
- [Scene Transitions](#scene-transitions)
- [GIF Export](#gif-export)
- [Auto Thumbnail](#auto-thumbnail)

---

## Animated Captions

Create Remotion-style animated subtitles with word-by-word highlighting effects.

### Styles

| Style | Description |
|-------|-------------|
| `standard` | Traditional subtitles |
| `karaoke` | Word-by-word highlighting |
| `pop` | Words pop in sequentially |
| `typewriter` | Character-by-character reveal |
| `fade` | Smooth fade transitions |

### Usage

```javascript
import { AnimatedCaptionsRenderer, CaptionStyle } from 'look/v2';

const captions = new AnimatedCaptionsRenderer({
  style: CaptionStyle.KARAOKE,
  position: 'bottom',
  fontSize: 48,
  fontFamily: 'Inter'
});

// Parse SRT file
const subtitles = captions.parseSRT(srtContent);

// Apply to video
await captions.applyToVideo('input.mp4', 'output.mp4', subtitles);
```

### CLI

```bash
# Generate captions from video audio
repovideo captions video.mp4 --style karaoke --output captions.srt

# Apply captions to video
repovideo captions video.mp4 --style pop --apply output.mp4
```

---

## Lower Thirds

Professional name/title overlays with broadcast-quality animations.

### Styles

| Style | Description |
|-------|-------------|
| `modern` | Clean, minimal with accent bar |
| `classic` | Traditional news-style |
| `minimal` | Text-only, subtle |
| `gradient` | Colorful gradient background |
| `broadcast` | Full broadcast graphics |

### Usage

```javascript
import { LowerThirdsRenderer, LowerThirdsStyle } from 'look/v2';

const lowerThird = new LowerThirdsRenderer({
  name: 'John Smith',
  title: 'Product Designer',
  style: LowerThirdsStyle.MODERN,
  position: 'bottom-left'
});

// Set display timing
lowerThird.setDisplayTime(2, 7); // Show from 2s to 7s

// Apply to video
await lowerThird.applyToVideo('input.mp4', 'output.mp4');
```

### CLI

```bash
repovideo overlay video.mp4 \
  --lower-third "John Smith:Product Designer" \
  --lower-third-style modern \
  --lower-third-start 2 \
  --lower-third-duration 5 \
  -o output.mp4
```

---

## Keyboard Visualizer

Display keyboard shortcuts on screen during demos.

### Styles

| Style | Description |
|-------|-------------|
| `mac` | macOS-style with ⌘⌥⇧⌃ symbols |
| `windows` | Windows-style with Ctrl/Alt/Win |
| `minimal` | Simple, clean design |
| `dark` | Dark theme for light videos |

### Usage

```javascript
import { KeyboardVisualizer, KeyStyle } from 'look/v2';

const keyboard = new KeyboardVisualizer({
  style: KeyStyle.MAC,
  position: 'bottom-center',
  size: 'medium'
});

// Record key presses during demo
keyboard.recordKeyPress('cmd+s', 5000);
keyboard.recordKeyPress('cmd+shift+p', 8000);

// Generate SVG for specific shortcut
const svg = keyboard.renderSVG('cmd+s');
```

### Supported Keys

- **Mac**: `cmd`, `alt`/`option`, `ctrl`, `shift`, `fn`
- **Windows**: `ctrl`, `alt`, `shift`, `win`
- **Special**: `enter`, `tab`, `space`, `backspace`, `esc`, arrows

---

## Callouts & Annotations

Draw attention to specific UI elements with arrows, boxes, badges, and more.

### Types

| Type | Description |
|------|-------------|
| `arrow` | Pointing arrow with customizable style |
| `box` | Highlight rectangle |
| `circle` | Circle highlight |
| `badge` | Numbered badge (①②③) |
| `spotlight` | Dim everything except target |
| `blur` | Blur sensitive content |

### Animations

- `none` - Instant appearance
- `fade` - Smooth fade in/out
- `draw` - Animated drawing effect
- `bounce` - Bounce entrance
- `scale` - Scale up from center

### Usage

```javascript
import { CalloutRenderer, CalloutType, AnimationStyle } from 'look/v2';

const callouts = new CalloutRenderer({
  color: '#EF4444',
  animation: AnimationStyle.DRAW
});

// Add arrow callout
callouts.addCallout({
  type: CalloutType.ARROW,
  from: { x: 100, y: 100 },
  to: { x: 300, y: 200 },
  startTime: 5,
  endTime: 10
});

// Add numbered badge
callouts.addCallout({
  type: CalloutType.BADGE,
  x: 500,
  y: 300,
  number: 1,
  startTime: 5,
  endTime: 15
});
```

---

## Spotlight Effects

Focus viewer attention by dimming surrounding areas.

### Presets

| Preset | Overlay Opacity | Use Case |
|--------|-----------------|----------|
| `subtle` | 50% | Gentle focus |
| `focus` | 70% | Standard highlighting |
| `dramatic` | 85% | Maximum attention |

### Shapes

- `circle` - Circular cutout
- `rectangle` - Rectangular cutout
- `rounded-rect` - Rounded rectangle
- `ellipse` - Elliptical cutout

### Usage

```javascript
import { SpotlightRenderer, SpotlightShape } from 'look/v2';

const spotlight = new SpotlightRenderer({
  overlayOpacity: 0.7,
  shape: SpotlightShape.ROUNDED_RECT
});

// Add spotlight on element
spotlight.addSpotlight({
  x: 500,
  y: 400,
  width: 200,
  height: 50,
  borderRadius: 8,
  startTime: 5,
  endTime: 10,
  fadeIn: 0.3,
  fadeOut: 0.3
});

// Or create from element bounds
const elementSpotlight = spotlight.fromElement(buttonBounds, {
  padding: 20,
  startTime: 5,
  endTime: 10
});
```

---

## Scene Transitions

Professional transitions between scenes or clips.

### Types

| Type | Description |
|------|-------------|
| `fade` | Cross-fade between scenes |
| `blur` | Blur transition |
| `slide-left` | Slide from right to left |
| `slide-right` | Slide from left to right |
| `zoom` | Zoom in/out transition |
| `wipe` | Horizontal wipe |

### Usage

```javascript
import { SceneTransitionRenderer, TransitionType } from 'look/v2';

const transitions = new SceneTransitionRenderer({
  type: TransitionType.BLUR,
  duration: 0.5
});

// Add intro transition
await transitions.addIntroTransition('video.mp4', 'output.mp4');

// Join multiple clips with transitions
await transitions.joinWithTransitions(
  ['clip1.mp4', 'clip2.mp4', 'clip3.mp4'],
  'output.mp4'
);
```

### CLI

```bash
repovideo overlay video.mp4 \
  --transition blur \
  --transition-duration 0.5 \
  -o output.mp4
```

---

## GIF Export

High-quality GIF export with palette optimization.

### Quality Levels

| Level | Colors | Dithering | File Size |
|-------|--------|-----------|-----------|
| `high` | 256 | Floyd-Steinberg | Large |
| `medium` | 256 | Bayer | Medium |
| `low` | 128 | None | Small |

### Usage

```javascript
import { GifExporter, GifQuality } from 'look/v2';

const gif = new GifExporter({
  width: 640,
  fps: 15,
  quality: GifQuality.MEDIUM,
  loop: true
});

await gif.export('video.mp4', 'output.gif', {
  startTime: 5,
  endTime: 15
});
```

### CLI

```bash
repovideo gif video.mp4 \
  --width 640 \
  --fps 15 \
  --quality medium \
  --start 5 \
  --end 15 \
  -o output.gif
```

### Tips for Smaller GIFs

1. Reduce width (480px or 320px)
2. Lower FPS (10-12 fps)
3. Use shorter duration
4. Use `low` quality for previews

---

## Auto Thumbnail

AI-powered best frame selection for video thumbnails.

### Presets

| Platform | Dimensions |
|----------|------------|
| `youtube` | 1280×720 |
| `twitter` | 1200×675 |
| `linkedin` | 1200×627 |
| `instagram` | 1080×1080 |

### Usage

```javascript
import { AutoThumbnailGenerator } from 'look/v2';

const thumbnail = new AutoThumbnailGenerator({
  sampleCount: 20 // Analyze 20 frames
});

// Auto-select best frame
const analysis = await thumbnail.analyzeVideo('video.mp4');
console.log(`Best frame at ${analysis.bestTimestamp}s (score: ${analysis.score})`);

// Generate thumbnail
await thumbnail.generate('video.mp4', 'thumbnail.png', {
  timestamp: analysis.bestTimestamp,
  preset: 'youtube',
  title: 'My Product Demo',
  titlePosition: 'center'
});
```

### CLI

```bash
# Auto-select best frame
repovideo thumbnail video.mp4 --auto --preset youtube -o thumb.png

# Manual timestamp with title overlay
repovideo thumbnail video.mp4 \
  --timestamp 12.5 \
  --title "Amazing Product Demo" \
  --preset youtube \
  -o thumb.png
```

### Frame Analysis

The auto-thumbnail analyzer scores frames based on:
- **Brightness** - Avoids too dark/bright frames
- **Contrast** - Prefers visually interesting frames
- **Sharpness** - Avoids blurry transition frames
- **Position** - Skips intro/outro (first/last 10%)

---

## Web UI Integration

All these features are available in the L👀K Studio web editor:

1. **Export Modal** - Access GIF export and thumbnail generation
2. **Settings Panel** - Configure lower thirds, keyboard visualizer, callouts
3. **Timeline** - Add callouts and spotlights at specific timestamps
4. **Preview** - See overlays in real-time

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `K` | Toggle keyboard visualizer |
| `L` | Add lower third |
| `C` | Add callout mode |
| `S` | Add spotlight |
| `G` | Export as GIF |
| `T` | Generate thumbnail |

---

## Best Practices

1. **Don't overuse** - One or two overlays at a time
2. **Time properly** - Give viewers 2-3 seconds to read text
3. **Match branding** - Use consistent colors across overlays
4. **Test on mobile** - Ensure text is readable on small screens
5. **Use subtle animations** - Smooth fades over jarring bounces
