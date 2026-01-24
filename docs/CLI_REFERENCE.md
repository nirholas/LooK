# CLI Reference

Complete command reference for LooK v2.0.

## Commands Overview

| Command | Description |
|---------|-------------|
| `look demo <url>` | Generate polished website demo with AI |
| `look quick <url>` | Fast demo with smart defaults |
| `look mobile <app>` | Mobile app demo with Appium |
| `look repo <url>` | Terminal demo from GitHub repo |
| `look serve` | Start web editor UI |
| `look edit [id]` | Open project in editor |
| `look projects` | List saved projects |
| `look test` | Verify installation |
| `look devices` | List supported device frames |
| `look gif <input>` | Convert video to GIF |
| `look thumbnail <input>` | Generate video thumbnail |
| `look overlay <input>` | Apply overlays to video |
| `look captions <input>` | Generate animated captions |

---

## `look demo <url>`

**Description:** Generate a polished website demo video with AI analysis, cursor tracking, zoom effects, and voiceover.

**Usage:**
```bash
look demo <url> [options]
```

**Example:**
```bash
look demo https://myapp.com -o output.mp4 -d 30 -v nova
```

### Options

#### Output & Duration

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path | `./demo.mp4` |
| `-d, --duration <seconds>` | Video duration in seconds | `25` |

#### Voice & Style

| Option | Description | Default |
|--------|-------------|---------|
| `-v, --voice <voice>` | TTS voice (nova, alloy, echo, fable, onyx, shimmer) | `nova` |
| `-s, --style <style>` | Script style (professional, casual, energetic) | `professional` |

#### Export

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --preset <preset>` | Export preset (youtube, twitter, instagram, tiktok, gif) | `youtube` |
| `--width <pixels>` | Recording width | `1920` |
| `--height <pixels>` | Recording height | `1080` |

#### Zoom Behavior

| Option | Description | Default |
|--------|-------------|---------|
| `--zoom-mode <mode>` | Zoom mode: none, basic, smart, follow | `smart` |
| `--zoom-intensity <0-1>` | How closely camera follows cursor | `0.5` |
| `--max-zoom <level>` | Maximum zoom level | `1.8` |
| `--min-zoom <level>` | Minimum zoom level | `1.0` |

**Zoom Modes Explained:**
- `none` - No zoom, static view
- `basic` - Simple zoom on clicks
- `smart` - Intelligent zoom based on activity (recommended)
- `follow` - Camera follows cursor continuously

#### Cursor Appearance

| Option | Description | Default |
|--------|-------------|---------|
| `--cursor <style>` | Cursor style | `default` |
| `--cursor-size <px>` | Cursor size in pixels | `32` |
| `--cursor-color <hex>` | Cursor color (hex) | `#000000` |
| `--cursor-preset <name>` | Color preset (see below) | - |
| `--cursor-glow` | Add glow effect | `false` |

**Cursor Styles:**
- `default` - Standard arrow
- `arrow-modern` - Clean modern arrow
- `pointer` - Hand pointer
- `dot` - Simple dot
- `circle` - Circular cursor
- `crosshair` - Precision crosshair
- `spotlight` - Spotlight effect
- `none` - No cursor

**Cursor Presets:**
- `light`, `dark` - Light/dark themes
- `blue`, `green`, `red`, `purple`, `orange` - Colors
- `github`, `figma`, `notion` - Brand-inspired

#### Click Effects

| Option | Description | Default |
|--------|-------------|---------|
| `--click-effect <type>` | Click effect style | `ripple` |
| `--click-color <hex>` | Click effect color | `#3B82F6` |
| `--click-size <px>` | Click effect size | `60` |
| `--click-duration <ms>` | Effect duration | `400` |

**Click Effect Types:**
- `ripple` - Expanding ripple (default)
- `pulse` - Pulsing circle
- `ring` - Expanding ring
- `spotlight` - Spotlight flash
- `none` - No effect

#### Control Flags

| Option | Description | Default |
|--------|-------------|---------|
| `--skip-voice` | Skip voiceover generation | `false` |
| `--skip-analysis` | Skip AI analysis (faster, no voice) | `false` |
| `--reliable` | Use V2 engine (more stable) | `false` |
| `--dry-run` | Preview script without recording | `false` |

#### Intelligent Pipeline Options

| Option | Description | Default |
|--------|-------------|---------|
| `--intelligent` | Enable full AI orchestration pipeline | `false` |
| `--story-arc <arc>` | Narrative template (see below) | `auto` |
| `--pacing <style>` | Pacing style | `standard` |
| `--quality-threshold <0-100>` | Minimum quality score | `70` |
| `--auto-optimize` | Re-optimize if below threshold | `true` |

**Story Arc Templates:**
- `auto` - AI selects best arc
- `problem-solution` - Pain → Discovery → Solution → Results
- `feature-showcase` - Feature 1 → Feature 2 → Feature 3
- `journey` - Start → Explore → Achieve → Delight
- `before-after` - Before state → Process → After state
- `quick-demo` - Hook → Core value → CTA

**Pacing Styles:**
- `relaxed` - 0.7x speed, for tutorials
- `standard` - 1.0x speed, general use
- `dynamic` - 1.3x speed, feature showcases
- `energetic` - 1.5x speed, social media

#### Video Enhancement Options

| Option | Description | Default |
|--------|-------------|---------|
| `--watermark <text>` | Add text watermark | - |
| `--watermark-image <path>` | Add logo watermark | - |
| `--watermark-position <pos>` | Watermark position | `bottom-right` |
| `--watermark-opacity <0-1>` | Watermark opacity | `0.7` |
| `--progress-bar` | Add progress bar overlay | `false` |
| `--progress-style <style>` | bar, line, dots, segments | `bar` |
| `--intro` | Add animated intro card | `false` |
| `--outro` | Add CTA outro card | `false` |
| `--brand-color <hex>` | Brand color for intro/outro | `#3B82F6` |

---

## `look quick <url>`

**Description:** Quick demo with sensible defaults. Just works!

**Usage:**
```bash
look quick <url> [options]
```

**Example:**
```bash
look quick https://stripe.com
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path | `./demo.mp4` |
| `-d, --duration <seconds>` | Duration in seconds | `20` |
| `--no-voice` | Skip voiceover | `false` |

**Defaults Applied:**
- Preset: `youtube`
- Zoom mode: `smart`
- Max zoom: `1.6`
- Style: `professional`

---

## `look mobile <app>`

**Description:** Generate mobile app demos using Appium for device automation.

**Usage:**
```bash
look mobile <app> [options]
```

**Example:**
```bash
look mobile ./MyApp.app --platform ios --device "iPhone 15 Pro"
look mobile ./app.apk --platform android --device "Pixel 7"
```

### Prerequisites

1. Appium server running:
   ```bash
   npm install -g appium
   appium --port 4723
   ```

2. Platform drivers:
   ```bash
   appium driver install xcuitest    # iOS
   appium driver install uiautomator2  # Android
   ```

3. Simulator/Emulator configured in Xcode or Android Studio

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path | `./mobile-demo.mp4` |
| `-d, --duration <seconds>` | Duration | `25` |
| `-v, --voice <voice>` | TTS voice | `nova` |
| `-s, --style <style>` | Script style | `professional` |
| `-p, --preset <preset>` | Export preset | `youtube` |
| `--platform <platform>` | Platform: ios, android | (auto-detect) |
| `--device <device>` | Device name | `iPhone 15 Pro` |
| `--orientation <orientation>` | portrait, landscape | `portrait` |
| `--touch-indicator <style>` | circle, finger, ripple, dot | `circle` |
| `--touch-color <color>` | Touch indicator color | `rgba(255,255,255,0.8)` |
| `--touch-size <px>` | Touch indicator size | `80` |
| `--show-swipe-trail` | Show swipe trails | `true` |
| `--device-frame` | Add device frame overlay | `false` |
| `--frame-style <style>` | modern, minimal | `modern` |
| `--actions <path>` | Path to actions script JSON | - |
| `--skip-voice` | Skip voiceover | `false` |
| `--dry-run` | Preview only | `false` |

---

## `look repo <url>`

**Description:** Generate terminal demo from GitHub repository. Uses VHS for terminal recording.

**Usage:**
```bash
look repo <url> [options]
```

**Example:**
```bash
look repo https://github.com/user/awesome-cli
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path | `./output/demo.mp4` |
| `-d, --duration <seconds>` | Duration | `30` |
| `-v, --voice <voice>` | TTS voice | `alloy` |
| `--skip-voice` | Skip voiceover | `false` |
| `--dry-run` | Preview only | `false` |

---

## `look serve`

**Description:** Start the LooK web editor UI for visual editing.

**Usage:**
```bash
look serve [options]
```

**Example:**
```bash
look serve -p 8080
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <port>` | Server port | `3847` |
| `--no-open` | Don't open browser | (opens by default) |

### Web Editor Features

When you run `look serve`, the web editor provides:

- **Visual Recording** - Enter a URL and click Generate Demo or Live Record
- **Templates** - Pre-configured demo settings for SaaS, E-commerce, Mobile, etc.
- **Settings Panel** - Configure API keys directly in the browser
- **Live Preview** - Real-time preview during live recording
- **Timeline Editor** - Edit markers, zoom, and effects visually
- **Script Editor** - Edit AI-generated voiceover scripts
- **Export Options** - Export for YouTube, Twitter, Instagram, TikTok

### First-Time Setup

1. Run `look serve`
2. Complete the onboarding tour
3. Click Settings → API Keys
4. Enter your OpenAI API key
5. Start creating demos!

### Keyboard Shortcuts

Press `Shift + ?` in the editor to see all shortcuts:

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `Ctrl+S` | Save project |
| `Ctrl+E` | Export video |
| `M` | Add marker |
| `F` | Fullscreen |

---

## `look edit [projectId]`

**Description:** Open an existing project in the web editor.

**Usage:**
```bash
look edit [projectId] [options]
```

**Example:**
```bash
look edit abc12345
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <port>` | Server port | `3847` |

---

## `look projects`

**Description:** List all saved projects.

**Usage:**
```bash
look projects
```

**Output:**
```
Saved Projects:

  abc12345 - Stripe Demo (1/15/2024)
  def67890 - My App (1/14/2024)
```

---

## `look test`

**Description:** Verify installation and dependencies.

**Usage:**
```bash
look test [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--click-effects` | Test click effects rendering |
| `--full` | Run complete pipeline test |

**Output:**
```
  FFmpeg installed: ✓
  Sharp working: ✓
  Playwright browser: ✓
  OpenAI API key: ✓

✅ All basic tests passed!
```

---

## `look mobile-test`

**Description:** Check mobile recording prerequisites.

**Usage:**
```bash
look mobile-test [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--platform <platform>` | ios, android, or both | `both` |
| `--list-devices` | List available simulators/emulators | `false` |

---

## `look devices`

**Description:** List supported device frames for mobile demos.

**Usage:**
```bash
look devices
```

**Output:**
```
Supported Device Frames:

iOS:
  - iPhone 15 Pro Max (1290×2796)
  - iPhone 15 Pro (1179×2556)
  - iPhone 15 (1179×2556)
  - iPhone SE (750×1334)
  - iPad Pro 12.9" (2048×2732)
  - iPad Pro 11" (1668×2388)

Android:
  - Pixel 8 Pro (1344×2992)
  - Pixel 8 (1080×2400)
  - Samsung Galaxy S24 Ultra (1440×3120)
  - Samsung Galaxy S24 (1080×2340)
```

---

## `look batch`

**Description:** Process multiple demos from a configuration file.

**Usage:**
```bash
look batch --config <path> [options]
```

**Example:**
```bash
look batch --config demos.yaml
look batch --config demos.json --concurrency 2
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--config <path>` | Path to YAML or JSON config | (required) |
| `--concurrency <n>` | Parallel jobs | `1` |
| `--resume` | Resume from last checkpoint | `false` |
| `--report <path>` | Output report path | `./batch-report.json` |

### Configuration Format

**YAML Example:**
```yaml
defaults:
  duration: 30
  voice: nova
  preset: youtube

jobs:
  - url: https://app1.com
    output: demos/app1.mp4
    
  - url: https://app2.com
    output: demos/app2.mp4
    duration: 45
    voice: alloy
    
  - url: https://app3.com
    output: demos/app3.mp4
    preset: twitter
```

**JSON Example:**
```json
{
  "defaults": {
    "duration": 30,
    "voice": "nova"
  },
  "jobs": [
    {"url": "https://app1.com", "output": "demos/app1.mp4"},
    {"url": "https://app2.com", "output": "demos/app2.mp4"}
  ]
}
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `DEBUG` | Show detailed error stacks |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error occurred |

---

## `look gif <input>`

**Description:** Convert video to high-quality GIF with palette optimization.

**Usage:**
```bash
look gif <input> [options]
```

**Examples:**
```bash
# Basic GIF export
look gif video.mp4 -o output.gif

# Optimized for smaller size
look gif video.mp4 --width 480 --fps 10 --quality low -o output.gif

# Extract specific section
look gif video.mp4 --start 5 --end 15 -o clip.gif
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output GIF path | `./output.gif` |
| `--width <pixels>` | Output width (height auto-scales) | `640` |
| `--fps <number>` | Frames per second | `15` |
| `--quality <level>` | Quality: low, medium, high | `medium` |
| `--start <seconds>` | Start time for clipping | `0` |
| `--end <seconds>` | End time for clipping | (full video) |
| `--no-loop` | Disable infinite loop | `false` |

### Quality Presets

| Quality | Colors | Dithering | Use Case |
|---------|--------|-----------|----------|
| `low` | 128 | None | Previews, small files |
| `medium` | 256 | Bayer | Balanced |
| `high` | 256 | Floyd-Steinberg | Best quality |

---

## `look thumbnail <input>`

**Description:** Generate video thumbnail with auto-selection or manual timestamp.

**Usage:**
```bash
look thumbnail <input> [options]
```

**Examples:**
```bash
# Auto-select best frame
look thumbnail video.mp4 --auto --preset youtube -o thumb.png

# Manual timestamp
look thumbnail video.mp4 --timestamp 12.5 -o thumb.png

# With title overlay
look thumbnail video.mp4 --auto --title "My Product Demo" -o thumb.png
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output image path | `./thumbnail.png` |
| `--auto` | Auto-select best frame | `false` |
| `--timestamp <seconds>` | Manual timestamp | - |
| `--preset <platform>` | Size preset | `youtube` |
| `--title <text>` | Title overlay text | - |

### Platform Presets

| Preset | Dimensions |
|--------|------------|
| `youtube` | 1280×720 |
| `twitter` | 1200×675 |
| `linkedin` | 1200×627 |
| `instagram` | 1080×1080 |
| `tiktok` | 1080×1920 |

---

## `look overlay <input>`

**Description:** Apply professional overlays to video (lower thirds, captions, transitions).

**Usage:**
```bash
look overlay <input> [options]
```

**Examples:**
```bash
# Add lower third
look overlay video.mp4 \
  --lower-third "John Smith:Product Designer" \
  --lower-third-style modern \
  -o output.mp4

# Add scene transitions
look overlay video.mp4 \
  --transition blur \
  --transition-duration 0.5 \
  -o output.mp4

# Apply captions
look overlay video.mp4 \
  --captions subtitles.srt \
  --captions-style karaoke \
  -o output.mp4
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output video path | `./output.mp4` |
| `--lower-third <text>` | Lower third (Name:Title format) | - |
| `--lower-third-style <style>` | modern, classic, minimal, gradient | `modern` |
| `--lower-third-start <s>` | Display start time | `2` |
| `--lower-third-duration <s>` | Display duration | `5` |
| `--captions <path>` | SRT captions file | - |
| `--captions-style <style>` | karaoke, pop, typewriter, fade | `karaoke` |
| `--transition <type>` | fade, blur, slide-left, slide-right, zoom | - |
| `--transition-duration <s>` | Transition duration | `0.5` |

---

## `look captions <input>`

**Description:** Generate animated captions from video audio or SRT file.

**Usage:**
```bash
look captions <input> [options]
```

**Examples:**
```bash
# Generate captions from video audio
look captions video.mp4 --output captions.srt

# Apply karaoke-style captions
look captions video.mp4 --style karaoke --apply output.mp4

# Apply pop-in word animation
look captions video.mp4 --style pop --apply output.mp4
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output SRT file | `./captions.srt` |
| `--style <style>` | Caption style | `karaoke` |
| `--apply <path>` | Apply to video (output path) | - |
| `--position <pos>` | top, center, bottom | `bottom` |
| `--font-size <px>` | Font size in pixels | `48` |

### Caption Styles

| Style | Description |
|-------|-------------|
| `standard` | Traditional subtitles |
| `karaoke` | Word-by-word highlighting |
| `pop` | Words pop in sequentially |
| `typewriter` | Character-by-character reveal |
| `fade` | Smooth fade transitions |

---

## Examples

```bash
# Quick demo
look quick https://myapp.com

# Custom output with specific duration
look demo https://myapp.com -o product-demo.mp4 -d 45

# Twitter-optimized short clip
look demo https://myapp.com -d 15 -p twitter -s energetic

# Silent demo with custom cursor
look demo https://myapp.com --skip-voice --cursor dot --cursor-color "#FF5500"

# Maximum zoom follow-cam
look demo https://myapp.com --zoom-mode follow --zoom-intensity 0.8 --max-zoom 2.5

# Mobile app demo
look mobile ./MyApp.app --platform ios --device "iPhone 15 Pro" --device-frame

# Preview script before recording
look demo https://myapp.com --dry-run

# Full control mode
look demo https://myapp.com \
  -o demo.mp4 \
  -d 30 \
  -v nova \
  -s professional \
  -p youtube \
  --zoom-mode smart \
  --cursor arrow-modern \
  --cursor-glow \
  --click-effect ripple \
  --click-color "#3B82F6"
```
