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
