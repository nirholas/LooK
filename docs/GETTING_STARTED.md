# Getting Started with LooK

Welcome to LooK! This guide will walk you through creating your first professional product demo video in minutes.

## Prerequisites

Before you begin, make sure you have the following installed:

### 1. Node.js 18+

```bash
# Check your version
node --version  # Should be 18.0.0 or higher

# Install via nvm (recommended)
nvm install 18
nvm use 18
```

### 2. FFmpeg

FFmpeg is required for video processing.

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.

### 3. OpenAI API Key

LooK uses GPT-4 Vision for analysis and OpenAI TTS for voiceover.

**Option A: Environment Variable (CLI)**
```bash
# Set your API key
export OPENAI_API_KEY=sk-your-key-here

# Or add to your ~/.bashrc or ~/.zshrc
echo 'export OPENAI_API_KEY=sk-your-key-here' >> ~/.zshrc
```

**Option B: Web UI Settings**

When using the web editor, you can configure API keys directly in the Settings panel:
1. Open the web editor with `look serve`
2. Click the ⚙️ Settings button (or click the API status indicator)
3. Enter your OpenAI API key
4. Optionally add a Groq API key for alternative script generation
5. Click Save Settings

Get your API key at [platform.openai.com](https://platform.openai.com/api-keys).

## Installation

Install LooK globally:

```bash
npm install -g look-demo
```

Verify installation:

```bash
look --version  # Should show 2.0.0
```

## Your First Demo

### Quick Start (Recommended)

The fastest way to create a demo:

```bash
look quick https://your-app.com
```

This command will:
1. ✅ Capture your website
2. ✅ Analyze the UI with AI vision
3. ✅ Generate a professional script
4. ✅ Record smooth cursor animations
5. ✅ Add AI voiceover
6. ✅ Export polished video

Output: `./demo.mp4`

### Step-by-Step Example

Let's create a demo for a real website:

```bash
# 1. Create a demo of Stripe's landing page
look demo https://stripe.com -o stripe-demo.mp4

# 2. Watch the progress...
#    ✓ Checking dependencies...
#    ✓ Analyzing website with AI vision...
#    ✓ Generating script...
#    ✓ Recording browser...
#    ✓ Rendering cursor and effects...
#    ✓ Generating voiceover...
#    ✓ Composing final video...

# 3. Your video is ready!
open stripe-demo.mp4  # macOS
xdg-open stripe-demo.mp4  # Linux
```

### Preview Without Recording

Want to see the AI analysis and script before recording?

```bash
look demo https://your-app.com --dry-run
```

This shows you exactly what LooK plans to do, without using credits or time.

## Customizing Your Demo

### Change Duration

```bash
# 15-second Twitter-ready clip
look demo https://your-app.com -d 15

# 60-second detailed walkthrough
look demo https://your-app.com -d 60
```

### Change Voice

LooK supports multiple AI voices:

| Voice | Description |
|-------|-------------|
| `nova` | Warm, professional (default) |
| `alloy` | Neutral, balanced |
| `echo` | Smooth, narrative |
| `fable` | Expressive, storytelling |
| `onyx` | Deep, authoritative |
| `shimmer` | Clear, upbeat |

```bash
look demo https://your-app.com -v onyx
```

### Change Style

Script styles affect tone and language:

```bash
# Professional (default) - formal, feature-focused
look demo https://your-app.com -s professional

# Casual - friendly, conversational
look demo https://your-app.com -s casual

# Energetic - exciting, launch-ready
look demo https://your-app.com -s energetic
```

### Export for Different Platforms

```bash
# YouTube (default) - 1920x1080
look demo https://your-app.com -p youtube

# Twitter - optimized for timeline
look demo https://your-app.com -p twitter

# Instagram - square format
look demo https://your-app.com -p instagram

# TikTok - vertical format
look demo https://your-app.com -p tiktok
```

## Silent Mode

Don't want voiceover? Skip it:

```bash
look demo https://your-app.com --skip-voice
```

## Using the Web Editor

For more control, use the visual editor:

```bash
look serve
```

This opens a web interface where you can:
- Preview recordings before export
- Edit timeline and cuts
- Adjust zoom keyframes
- Fine-tune cursor effects
- Add custom voiceover
- Configure API keys in Settings
- Use pre-built templates for common use cases
- Access built-in documentation

### First-Time Setup in Web Editor

1. **Onboarding Tour** - A guided tour highlights key features on first visit
2. **Configure API Keys** - Click Settings → API Keys to add your OpenAI key
3. **Choose a Template** - Navigate to Templates for pre-configured setups
4. **Enter URL** - Paste your website URL and click Generate Demo

See [WEB_EDITOR.md](./WEB_EDITOR.md) for full documentation.

## Verify Your Setup

Run the built-in test:

```bash
look test
```

This checks:
- ✓ FFmpeg installation
- ✓ Sharp (image processing)
- ✓ Playwright browser
- ✓ OpenAI API key

For a full pipeline test:

```bash
look test --full
```

## Troubleshooting

### "FFmpeg not found"

Install FFmpeg for your platform (see Prerequisites).

### "OpenAI API error"

1. Check your API key is set: `echo $OPENAI_API_KEY`
2. Verify the key is valid at [platform.openai.com](https://platform.openai.com)
3. Check you have API credits

### "Playwright browser not found"

```bash
npx playwright install chromium
```

### Video looks choppy

- Ensure sufficient disk space
- Reduce duration: `-d 15`
- Close other applications

## Next Steps

- 📖 [CLI Reference](./CLI_REFERENCE.md) - All commands and options
- 🎨 [Customization Guide](./CUSTOMIZATION.md) - Cursors, effects, zoom
- 🌐 [Web Editor Guide](./WEB_EDITOR.md) - Visual editing interface
- 🔧 [API Documentation](./API.md) - Programmatic usage
- 🧠 [Intelligent Pipeline](./INTELLIGENT_PIPELINE.md) - AI orchestration & story arcs
- 🎬 [Overlays & Effects](./OVERLAYS_EFFECTS.md) - Captions, spotlights, callouts
- 📤 [Export Formats](./EXPORT_FORMATS.md) - GIF, thumbnails, platform presets

## Quick Feature Reference

### Export as GIF
```bash
look gif video.mp4 --width 480 --fps 12 -o demo.gif
```

### Generate Thumbnail
```bash
look thumbnail video.mp4 --auto --preset youtube -o thumb.png
```

### Add Captions
```bash
look captions video.mp4 --style karaoke --apply output.mp4
```

### Apply Overlays
```bash
look overlay video.mp4 --lower-third "John:Designer" -o output.mp4
```

### Intelligent Demo
```bash
look demo https://your-app.com --intelligent --story-arc problem-solution
```

---

Need help? [Open an issue](https://github.com/nirholas/LooK/issues) on GitHub.
