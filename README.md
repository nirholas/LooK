# 🎬 RepoVideo

AI-powered demo video generator. Give it a URL, get a polished demo video with voiceover.

## Features

- **🌐 Web Demo Mode** - Record any website with AI-generated script and voiceover
- **💻 Terminal Mode** - Record GitHub repos with terminal commands (requires VHS)
- **🤖 AI Vision** - GPT-4V analyzes your site and writes the script
- **�� AI Voice** - OpenAI TTS generates professional voiceover
- **📹 60fps Recording** - Smooth browser recording with Playwright
- **🎨 Pro Effects** - Color grading, vignette, zoom effects
- **📦 Multi-platform Export** - YouTube, Twitter, Instagram, TikTok, GIF

## Installation

```bash
npm install -g repovideo
# or
npx repovideo <url>
```

**Requirements:**
- Node.js 18+
- FFmpeg installed (`brew install ffmpeg` or `apt install ffmpeg`)
- OpenAI API key: `export OPENAI_API_KEY=sk-...`

## Usage

### Quick Start

```bash
# Auto-detect mode based on URL
repovideo https://myapp.com

# Explicit web demo mode (recommended)
repovideo demo https://myapp.com

# GitHub repo terminal demo
repovideo repo https://github.com/user/repo
```

### Web Demo Mode (v2)

```bash
repovideo demo https://free-crypto-news.vercel.app \
  --output demo.mp4 \
  --duration 30 \
  --voice nova \
  --style professional \
  --preset youtube
```

**Options:**
- `-o, --output <path>` - Output file (default: `./demo.mp4`)
- `-d, --duration <sec>` - Video duration (default: 25)
- `-v, --voice <voice>` - TTS voice: nova, alloy, echo, fable, onyx, shimmer
- `-s, --style <style>` - Script style: professional, casual, energetic
- `-p, --preset <preset>` - Export: youtube, twitter, instagram, tiktok, gif
- `--width <px>` - Recording width (default: 1920)
- `--height <px>` - Recording height (default: 1080)
- `--skip-voice` - Skip voiceover generation
- `--dry-run` - Show AI analysis and script without recording

### Terminal Mode (v1)

Requires [VHS](https://github.com/charmbracelet/vhs) installed.

```bash
repovideo repo https://github.com/user/repo \
  --output demo.mp4 \
  --duration 30
```

## How It Works

1. **Capture** - Screenshots your site/app
2. **Analyze** - GPT-4V understands the UI and purpose
3. **Script** - AI writes a voiceover script
4. **Record** - Playwright records the browser at 60fps
5. **Voice** - OpenAI TTS generates narration
6. **Polish** - FFmpeg applies color grading and effects
7. **Export** - Output optimized for your platform

## Examples

```bash
# Quick demo with defaults
repovideo demo https://myapp.com

# Dry run to preview script
repovideo demo https://myapp.com --dry-run

# Custom voice and style
repovideo demo https://myapp.com -v alloy -s energetic

# Twitter-optimized short video
repovideo demo https://myapp.com -d 15 -p twitter

# No voiceover (visuals only)
repovideo demo https://myapp.com --skip-voice
```

## Environment Variables

```bash
export OPENAI_API_KEY=sk-proj-...  # Required for AI features
```

## Roadmap

- [ ] Visible cursor rendering on video
- [ ] Smart zoom that follows cursor
- [ ] Click effects (ripple, pulse)
- [ ] Background music with auto-ducking
- [ ] Custom cursor styles
- [ ] Web UI for editing
- [ ] Mobile app recording (Appium)

## License

MIT
