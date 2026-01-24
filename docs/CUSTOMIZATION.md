# Customization Guide

This guide covers all customization options in LooK: cursor styles, click effects, zoom modes, and more.

## Table of Contents

- [Cursor Styles](#cursor-styles)
- [Cursor Presets](#cursor-presets)
- [Click Effects](#click-effects)
- [Zoom Modes](#zoom-modes)
- [Export Presets](#export-presets)
- [Voice & Style](#voice--style)

---

## Cursor Styles

LooK offers multiple cursor styles to match your demo's aesthetic.

### Available Styles

| Style | Description | Best For |
|-------|-------------|----------|
| `default` | Standard arrow cursor | General use |
| `arrow-modern` | Clean, modern arrow | SaaS, tech products |
| `pointer` | Hand pointer | Link-heavy demos |
| `dot` | Simple dot | Minimalist designs |
| `circle` | Circular cursor | Drawing attention |
| `crosshair` | Precision crosshair | Design tools, editors |
| `spotlight` | Spotlight effect | Presentations |
| `none` | No cursor | Automated sequences |

### Usage

```bash
# Command line
look demo https://myapp.com --cursor pointer

# With size adjustment
look demo https://myapp.com --cursor dot --cursor-size 48

# With custom color
look demo https://myapp.com --cursor circle --cursor-color "#FF5500"
```

### Visual Examples

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   default        arrow-modern      pointer               │
│      ↖               ↖               👆                  │
│                                                          │
│   dot            circle           crosshair              │
│      ●               ◯               ╋                   │
│                                                          │
│   spotlight                                              │
│      💡                                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Cursor Size

Control cursor size in pixels:

```bash
# Small (for high-density UIs)
look demo https://myapp.com --cursor-size 20

# Default
look demo https://myapp.com --cursor-size 32

# Large (for presentations)
look demo https://myapp.com --cursor-size 48
```

### Cursor Color

Set cursor color using hex values:

```bash
# Black (default)
look demo https://myapp.com --cursor-color "#000000"

# White (for dark UIs)
look demo https://myapp.com --cursor-color "#FFFFFF"

# Brand color
look demo https://myapp.com --cursor-color "#3B82F6"
```

### Cursor Glow

Add a glow effect for better visibility:

```bash
look demo https://myapp.com --cursor-glow
```

---

## Cursor Presets

Pre-configured color schemes for quick setup.

### Available Presets

| Preset | Color | Outline | Use Case |
|--------|-------|---------|----------|
| `light` | White | Dark gray | Dark backgrounds |
| `dark` | Black | White | Light backgrounds |
| `blue` | Blue | White | Professional look |
| `green` | Green | White | Success, eco themes |
| `red` | Red | White | Alerts, warnings |
| `purple` | Purple | White | Creative, design |
| `orange` | Orange | White | Energetic, CTAs |
| `github` | GitHub dark | White | Developer tools |
| `figma` | Figma purple | White | Design tools |
| `notion` | Notion dark | White | Productivity |

### Usage

```bash
# Use a preset
look demo https://myapp.com --cursor-preset github

# Preset with glow
look demo https://myapp.com --cursor-preset figma --cursor-glow
```

### Preset Details

```javascript
// GitHub preset
{
  color: '#24292f',
  outlineColor: '#ffffff',
  shadowBlur: 6,
  shadowOpacity: 0.4
}

// Figma preset
{
  color: '#9747ff',
  outlineColor: '#ffffff',
  shadowBlur: 6,
  shadowOpacity: 0.4
}

// Notion preset
{
  color: '#37352f',
  outlineColor: '#ffffff',
  shadowBlur: 6,
  shadowOpacity: 0.4
}
```

---

## Click Effects

Visual feedback when the cursor clicks.

### Available Effects

| Effect | Description | Feel |
|--------|-------------|------|
| `ripple` | Expanding ripple (default) | Smooth, material |
| `pulse` | Pulsing circle | Attention-grabbing |
| `ring` | Expanding ring | Subtle, clean |
| `spotlight` | Brief spotlight flash | Dramatic |
| `none` | No effect | Minimal |

### Usage

```bash
# Set click effect
look demo https://myapp.com --click-effect ripple

# Custom color
look demo https://myapp.com --click-effect pulse --click-color "#FF0000"

# Custom size and duration
look demo https://myapp.com --click-effect ring --click-size 80 --click-duration 500
```

### Click Effect Options

| Option | Description | Default |
|--------|-------------|---------|
| `--click-effect` | Effect type | `ripple` |
| `--click-color` | Effect color (hex) | `#3B82F6` |
| `--click-size` | Maximum size in pixels | `60` |
| `--click-duration` | Animation duration in ms | `400` |

### Effect Comparison

```
ripple       pulse        ring         spotlight
   ○            ●           ○              ✦
  ╱ ╲          ◉           ◯              
 ○   ○         ●           ○              
  ╲ ╱                                      
   ○                                       

Smooth       Attention    Subtle       Dramatic
expanding    grabbing     rings        flash
```

### Combining Effects

```bash
# Brand-colored ripple with glow cursor
look demo https://myapp.com \
  --cursor dot \
  --cursor-color "#3B82F6" \
  --cursor-glow \
  --click-effect ripple \
  --click-color "#3B82F6"
```

---

## Zoom Modes

Control how the camera moves during recording.

### Available Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `none` | No zoom, static view | Simple demos |
| `basic` | Zoom on clicks only | Basic interactions |
| `smart` | Intelligent zoom based on activity | General use (default) |
| `follow` | Camera follows cursor continuously | Detailed workflows |

### Mode Details

#### None
```bash
look demo https://myapp.com --zoom-mode none
```
- Static full-page view
- No camera movement
- Best for: Simple landing pages, overview shots

#### Basic
```bash
look demo https://myapp.com --zoom-mode basic
```
- Zooms in when clicking
- Zooms out between clicks
- Best for: Button-focused interactions

#### Smart (Default)
```bash
look demo https://myapp.com --zoom-mode smart
```
- Zooms on clicks
- Detects hover pauses
- Anticipates important areas
- Best for: Most demos

#### Follow
```bash
look demo https://myapp.com --zoom-mode follow --zoom-intensity 0.7
```
- Continuous camera tracking
- Smooth, cinematic movement
- Best for: Detailed walkthroughs, form filling

### Zoom Options

| Option | Description | Default |
|--------|-------------|---------|
| `--zoom-mode` | Zoom behavior mode | `smart` |
| `--zoom-intensity` | Follow intensity (0-1) | `0.5` |
| `--max-zoom` | Maximum zoom level | `1.8` |
| `--min-zoom` | Minimum zoom level | `1.0` |

### Zoom Level Guidelines

| Zoom Level | Effect |
|------------|--------|
| `1.0` | Full view, no zoom |
| `1.3` | Slight emphasis |
| `1.5` | Moderate zoom |
| `1.8` | Strong focus (default max) |
| `2.0` | Very close |
| `2.5+` | Extreme close-up |

### Examples

```bash
# Subtle zoom for professional look
look demo https://myapp.com --zoom-mode smart --max-zoom 1.4

# Dynamic follow-cam
look demo https://myapp.com --zoom-mode follow --zoom-intensity 0.8 --max-zoom 2.0

# Static with occasional zoom on clicks
look demo https://myapp.com --zoom-mode basic --max-zoom 1.3

# No zoom at all
look demo https://myapp.com --zoom-mode none
```

---

## Export Presets

Platform-optimized video formats.

### Available Presets

| Preset | Resolution | Aspect Ratio | Notes |
|--------|------------|--------------|-------|
| `youtube` | 1920×1080 | 16:9 | Default, HD quality |
| `twitter` | 1280×720 | 16:9 | Optimized for timeline |
| `instagram` | 1080×1080 | 1:1 | Square format |
| `tiktok` | 1080×1920 | 9:16 | Vertical format |
| `gif` | 640×360 | 16:9 | Animated GIF |

### Usage

```bash
# YouTube (default)
look demo https://myapp.com -p youtube

# Twitter-ready
look demo https://myapp.com -p twitter -d 15

# Instagram square
look demo https://myapp.com -p instagram

# TikTok vertical
look demo https://myapp.com -p tiktok

# Animated GIF
look demo https://myapp.com -p gif -d 10
```

### Custom Resolution

Override preset with custom dimensions:

```bash
look demo https://myapp.com --width 2560 --height 1440
```

---

## Voice & Style

### Voice Options

| Voice | Character | Best For |
|-------|-----------|----------|
| `nova` | Warm, professional | Business, SaaS (default) |
| `alloy` | Neutral, balanced | General use |
| `echo` | Smooth, narrative | Storytelling |
| `fable` | Expressive | Creative products |
| `onyx` | Deep, authoritative | Enterprise |
| `shimmer` | Clear, upbeat | Consumer apps |

```bash
look demo https://myapp.com -v onyx
```

### Style Options

| Style | Tone | Use Case |
|-------|------|----------|
| `professional` | Formal, feature-focused | B2B, enterprise |
| `casual` | Friendly, conversational | Consumer apps |
| `energetic` | Exciting, dynamic | Product launches |

```bash
look demo https://myapp.com -s energetic
```

### Combined Examples

```bash
# Enterprise demo
look demo https://myapp.com \
  -v onyx \
  -s professional \
  --cursor default \
  --click-effect ring \
  --zoom-mode smart \
  --max-zoom 1.5

# Startup launch video
look demo https://myapp.com \
  -v shimmer \
  -s energetic \
  --cursor dot \
  --cursor-color "#FF6B35" \
  --cursor-glow \
  --click-effect pulse \
  --zoom-mode follow \
  --zoom-intensity 0.7

# Minimal, clean demo
look demo https://myapp.com \
  -v alloy \
  -s casual \
  --cursor circle \
  --cursor-preset light \
  --click-effect none \
  --zoom-mode basic
```

---

## Complete Examples

### SaaS Product Demo

```bash
look demo https://mysaas.com \
  -o saas-demo.mp4 \
  -d 45 \
  -v nova \
  -s professional \
  -p youtube \
  --cursor arrow-modern \
  --cursor-preset dark \
  --click-effect ripple \
  --click-color "#3B82F6" \
  --zoom-mode smart \
  --max-zoom 1.6
```

### Mobile App Showcase

```bash
look mobile ./app.app \
  -o mobile-demo.mp4 \
  -d 30 \
  --platform ios \
  --device "iPhone 15 Pro" \
  --orientation portrait \
  --touch-indicator circle \
  --device-frame \
  -v shimmer \
  -s casual
```

### Quick Social Media Clip

```bash
look demo https://myapp.com \
  -o twitter-clip.mp4 \
  -d 12 \
  -p twitter \
  -s energetic \
  --cursor dot \
  --cursor-glow \
  --click-effect pulse \
  --zoom-mode follow
```

### Minimal Documentation Style

```bash
look demo https://docs.myapp.com \
  -o docs-walkthrough.mp4 \
  -d 60 \
  --skip-voice \
  --cursor crosshair \
  --cursor-preset github \
  --click-effect ring \
  --zoom-mode none
```

---

## Advanced Overlays & Effects

For enterprise-grade polish, LooK offers additional overlay systems. See the dedicated guides:

- **[Overlays & Effects Guide](./OVERLAYS_EFFECTS.md)** - Animated captions, lower thirds, spotlights, callouts, transitions
- **[Export Formats Guide](./EXPORT_FORMATS.md)** - GIF export, thumbnail generation, platform presets
- **[Intelligent Pipeline Guide](./INTELLIGENT_PIPELINE.md)** - AI orchestration, story arcs, quality scoring

### Quick Reference

```bash
# Add animated captions (karaoke style)
look captions video.mp4 --style karaoke --apply output.mp4

# Add lower third overlay
look overlay video.mp4 --lower-third "Name:Title" --lower-third-style modern -o output.mp4

# Add scene transitions
look overlay video.mp4 --transition blur --transition-duration 0.5 -o output.mp4

# Export as GIF
look gif video.mp4 --width 480 --fps 12 --quality medium -o demo.gif

# Generate auto thumbnail
look thumbnail video.mp4 --auto --preset youtube -o thumb.png

# Full intelligent demo with story arc
look demo https://myapp.com --intelligent --story-arc problem-solution --quality-threshold 80
```
