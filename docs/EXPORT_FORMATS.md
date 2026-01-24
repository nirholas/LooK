# Export Formats Guide

L👀K supports multiple export formats optimized for different use cases.

## Table of Contents

- [Video Export](#video-export)
- [GIF Export](#gif-export)
- [Thumbnail Generation](#thumbnail-generation)
- [Platform Presets](#platform-presets)
- [Batch Export](#batch-export)

---

## Video Export

### Formats

| Format | Extension | Codec | Use Case |
|--------|-----------|-------|----------|
| MP4 | `.mp4` | H.264 | Universal playback |
| WebM | `.webm` | VP9 | Web embedding |
| MOV | `.mov` | ProRes | Professional editing |

### Quality Presets

| Preset | Resolution | Bitrate | File Size |
|--------|------------|---------|-----------|
| `web` | 720p | 2 Mbps | Small |
| `hd` | 1080p | 5 Mbps | Medium |
| `4k` | 2160p | 20 Mbps | Large |
| `raw` | Original | Lossless | Very Large |

### Usage

```javascript
import { exportVideo } from 'look/v2';

await exportVideo('input.mp4', 'output.mp4', {
  format: 'mp4',
  preset: 'hd',
  codec: 'h264',
  fps: 30
});
```

### CLI

```bash
# Web-optimized export
repovideo record https://example.com \
  --format mp4 \
  --preset web \
  -o output.mp4

# High quality export
repovideo record https://example.com \
  --format mp4 \
  --preset hd \
  --bitrate 8000k \
  -o output.mp4
```

---

## GIF Export

Create shareable GIFs from videos or recordings.

### Quality Settings

| Setting | Low | Medium | High |
|---------|-----|--------|------|
| Colors | 128 | 256 | 256 |
| Dithering | None | Bayer | Floyd-Steinberg |
| Optimization | Lossy | Balanced | Quality |
| Typical Size | ~40% smaller | Baseline | ~30% larger |

### Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `width` | 640 | 320-1920 | Output width (height scales) |
| `fps` | 15 | 5-30 | Frames per second |
| `quality` | `medium` | low/medium/high | Quality preset |
| `loop` | true | boolean | Infinite loop |
| `startTime` | 0 | seconds | Clip start |
| `endTime` | - | seconds | Clip end |

### Usage

```javascript
import { GifExporter, GifQuality } from 'look/v2';

const exporter = new GifExporter({
  width: 480,
  fps: 12,
  quality: GifQuality.MEDIUM
});

// Full video to GIF
await exporter.export('video.mp4', 'output.gif');

// Clip specific section
await exporter.export('video.mp4', 'clip.gif', {
  startTime: 5,
  endTime: 15
});
```

### CLI

```bash
# Basic GIF export
repovideo gif video.mp4 -o output.gif

# Optimized for smaller size
repovideo gif video.mp4 \
  --width 480 \
  --fps 10 \
  --quality low \
  -o output.gif

# Specific time range
repovideo gif video.mp4 \
  --start 5 \
  --end 15 \
  --width 640 \
  -o clip.gif
```

### Size Optimization Tips

1. **Reduce dimensions** - 480px width is often sufficient
2. **Lower FPS** - 10-12 fps still looks smooth
3. **Shorter duration** - Keep under 10 seconds
4. **Simple backgrounds** - Solid colors compress better
5. **Use `low` quality** - For previews and drafts

---

## Thumbnail Generation

Create attractive preview images for videos.

### Platform Presets

| Platform | Dimensions | Aspect Ratio |
|----------|------------|--------------|
| `youtube` | 1280×720 | 16:9 |
| `twitter` | 1200×675 | 16:9 |
| `linkedin` | 1200×627 | 1.91:1 |
| `instagram` | 1080×1080 | 1:1 |
| `facebook` | 1200×630 | 1.91:1 |
| `tiktok` | 1080×1920 | 9:16 |

### Auto-Selection Algorithm

The thumbnail generator analyzes frames using:

1. **Sharpness Score** - Laplacian variance calculation
2. **Brightness Score** - Optimal range detection
3. **Contrast Score** - Histogram analysis
4. **Position Weight** - Penalizes intro/outro frames

```javascript
import { AutoThumbnailGenerator } from 'look/v2';

const generator = new AutoThumbnailGenerator({
  sampleCount: 30 // Sample 30 frames
});

// Analyze video to find best frame
const analysis = await generator.analyzeVideo('video.mp4');
console.log(`Best frame: ${analysis.bestTimestamp}s`);
console.log(`Score: ${analysis.score}`);
console.log(`Top candidates:`, analysis.topFrames);
```

### Title Overlay

Add text overlays to thumbnails:

```javascript
await generator.generate('video.mp4', 'thumb.png', {
  timestamp: 12.5,
  title: 'Amazing Product Demo',
  titlePosition: 'center', // top, center, bottom
  titleStyle: {
    fontSize: 72,
    fontFamily: 'Inter Bold',
    color: '#FFFFFF',
    shadow: true
  }
});
```

### CLI

```bash
# Auto-select best frame
repovideo thumbnail video.mp4 \
  --auto \
  --preset youtube \
  -o thumbnail.png

# Manual timestamp selection
repovideo thumbnail video.mp4 \
  --timestamp 15.5 \
  --preset youtube \
  -o thumbnail.png

# With title overlay
repovideo thumbnail video.mp4 \
  --auto \
  --title "My Product Demo" \
  --preset youtube \
  -o thumbnail.png
```

---

## Platform Presets

Pre-configured export settings for popular platforms.

### Social Media

```bash
# YouTube (1080p, 30fps, 8Mbps)
repovideo record site.com --platform youtube -o output.mp4

# Twitter (720p, 30fps, 5Mbps, max 2:20)
repovideo record site.com --platform twitter -o output.mp4

# LinkedIn (1080p, 30fps, 5Mbps, max 10min)
repovideo record site.com --platform linkedin -o output.mp4

# Instagram Feed (1080×1080, 30fps, 3.5Mbps)
repovideo record site.com --platform instagram-feed -o output.mp4

# Instagram Reels (1080×1920, 30fps, 3.5Mbps)
repovideo record site.com --platform instagram-reels -o output.mp4

# TikTok (1080×1920, 30fps, 4Mbps)
repovideo record site.com --platform tiktok -o output.mp4
```

### Documentation

```bash
# GitHub README (720p, 15fps GIF, 640px width)
repovideo record site.com --platform github -o demo.gif

# Product Hunt (1200×675, 15fps GIF)
repovideo record site.com --platform producthunt -o demo.gif
```

---

## Batch Export

Export multiple formats at once.

### Shell Script Example

```bash
#!/bin/bash
INPUT="recording.mp4"

# Export all formats
repovideo gif "$INPUT" --width 480 --fps 10 -o demo-small.gif
repovideo gif "$INPUT" --width 640 --fps 15 -o demo-medium.gif
repovideo thumbnail "$INPUT" --auto --preset youtube -o thumb-yt.png
repovideo thumbnail "$INPUT" --auto --preset twitter -o thumb-tw.png
```

### Node.js Example

```javascript
import { GifExporter, AutoThumbnailGenerator, exportVideo } from 'look/v2';

const input = 'recording.mp4';

// Export in parallel
await Promise.all([
  // Multiple GIF sizes
  new GifExporter({ width: 480, fps: 10 }).export(input, 'demo-small.gif'),
  new GifExporter({ width: 640, fps: 15 }).export(input, 'demo-medium.gif'),
  
  // Multiple thumbnails
  new AutoThumbnailGenerator()
    .generate(input, 'thumb-yt.png', { preset: 'youtube' }),
  new AutoThumbnailGenerator()
    .generate(input, 'thumb-tw.png', { preset: 'twitter' }),
  
  // Multiple video formats
  exportVideo(input, 'output-web.mp4', { preset: 'web' }),
  exportVideo(input, 'output-hd.mp4', { preset: 'hd' })
]);
```

### Configuration File

Create `look.export.json`:

```json
{
  "input": "recording.mp4",
  "exports": [
    {
      "type": "gif",
      "output": "demo.gif",
      "width": 640,
      "fps": 15
    },
    {
      "type": "thumbnail",
      "output": "thumb-youtube.png",
      "preset": "youtube",
      "auto": true
    },
    {
      "type": "thumbnail",
      "output": "thumb-twitter.png",
      "preset": "twitter",
      "auto": true
    },
    {
      "type": "video",
      "output": "output-hd.mp4",
      "preset": "hd"
    }
  ]
}
```

Then run:

```bash
repovideo batch --config look.export.json
```

---

## Quality vs File Size

### Video

| Setting | 720p File Size | 1080p File Size |
|---------|----------------|-----------------|
| Low (2Mbps) | ~15 MB/min | ~25 MB/min |
| Medium (5Mbps) | ~37 MB/min | ~60 MB/min |
| High (10Mbps) | ~75 MB/min | ~120 MB/min |

### GIF

| Settings | 10s GIF Size |
|----------|--------------|
| 320px, 10fps, low | ~2-5 MB |
| 480px, 12fps, medium | ~5-10 MB |
| 640px, 15fps, high | ~10-20 MB |
| 800px, 20fps, high | ~20-40 MB |

### Recommendations

- **GitHub READMEs**: 480px, 10fps, medium (max 10MB)
- **Product Hunt**: 640px, 15fps, medium
- **Twitter**: 640px, 15fps, high (auto-converted)
- **Slack/Discord**: 480px, 12fps, low (faster load)
