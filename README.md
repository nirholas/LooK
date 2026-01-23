# L👀K

**One command. Professional product demo videos.**

Turn any website into a polished demo video with AI-generated voiceover. No editing required.

```bash
npx look-demo quick https://your-app.com
```

That's it. You get a professional demo video in minutes.

## What It Does

1. **Records** your site with smooth cursor animations
2. **Analyzes** the UI using GPT-4 Vision
3. **Writes** a compelling voiceover script  
4. **Narrates** with natural AI voice
5. **Exports** a polished video ready for YouTube, Twitter, etc.

## Installation

```bash
npm install -g look-demo
```

**Requirements:**
- Node.js 18+
- FFmpeg: `brew install ffmpeg` (Mac) or `apt install ffmpeg` (Linux)
- OpenAI API key: `export OPENAI_API_KEY=sk-...`

## Quick Start

### Fastest Way (Recommended)

```bash
look quick https://your-app.com
```

This uses smart defaults to create a great demo automatically.

### Full Control

```bash
look demo https://your-app.com \
  --output demo.mp4 \
  --duration 30 \
  --voice nova \
  --style professional \
  --zoom-mode smart
```

### Just Preview (No Recording)

```bash
look demo https://your-app.com --dry-run
```

See the AI analysis and script before recording.

## Features

- **🎬 Smart Zoom** - Camera follows cursor with smooth, professional movement
- **🖱️ Cursor Effects** - Beautiful cursor with click ripple animations
- **🤖 AI Vision** - GPT-4V understands your UI and writes the script
- **🗣️ AI Voice** - Natural voiceover with OpenAI TTS
- **📹 60fps Recording** - Silky smooth browser capture
- **🎨 Pro Polish** - Color grading, vignette, motion blur
- **📱 Multi-Platform** - Export for YouTube, Twitter, Instagram, TikTok

## Options

### Demo Command

```bash
look demo <url> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output` | Output file path | `./demo.mp4` |
| `-d, --duration` | Video duration (seconds) | `25` |
| `-v, --voice` | TTS voice (nova, alloy, echo, fable, onyx, shimmer) | `nova` |
| `-s, --style` | Script style (professional, casual, energetic) | `professional` |
| `-p, --preset` | Export preset (youtube, twitter, instagram, tiktok) | `youtube` |
| `--zoom-mode` | Zoom behavior (none, basic, smart, follow) | `smart` |
| `--zoom-intensity` | Follow camera intensity (0-1) | `0.5` |
| `--max-zoom` | Maximum zoom level | `1.8` |
| `--skip-voice` | Generate video without voiceover | `false` |
| `--skip-analysis` | Skip AI analysis (faster) | `false` |
| `--reliable` | Use robust V2 engine | `false` |
| `--dry-run` | Preview script without recording | `false` |

### Cursor & Click Effects

| Option | Description | Default |
|--------|-------------|---------|
| `--cursor` | Cursor style (default, pointer, dot, circle, none) | `default` |
| `--cursor-size` | Cursor size in pixels | `24` |
| `--cursor-color` | Cursor color (hex) | `#000000` |
| `--click-effect` | Click effect (ripple, pulse, ring, spotlight, none) | `ripple` |
| `--click-color` | Click effect color (hex) | `#3B82F6` |

## Examples

```bash
# Quick demo - just works
look quick https://stripe.com

# Twitter-ready short video
look demo https://myapp.com -d 15 -p twitter

# Energetic style for launch
look demo https://myapp.com -s energetic -v alloy

# Silent demo (no voiceover)
look demo https://myapp.com --skip-voice

# Maximum zoom follow-cam
look demo https://myapp.com --zoom-mode follow --zoom-intensity 0.8

# Subtle, professional look
look demo https://myapp.com --zoom-mode basic --max-zoom 1.3
```

## How It Works

```
URL → Screenshot → GPT-4V Analysis → Script → Record Browser → 
    → Add Cursor → Apply Zoom → Add Click Effects → 
    → Color Grade → Generate Voice → Combine → Export
```

The magic is in the orchestration. LooK handles dozens of steps automatically to produce professional results.

## Troubleshooting

### "FFmpeg not found"
Install FFmpeg:
- **Mac:** `brew install ffmpeg`
- **Linux:** `sudo apt install ffmpeg`
- **Windows:** Download from ffmpeg.org

### "OpenAI API error"
Set your API key:
```bash
export OPENAI_API_KEY=sk-your-key-here
```

### Video looks choppy
- Ensure you have enough disk space
- Try reducing duration: `-d 15`
- Use a faster preset: `--preset twitter`

### Cursor not visible
- Check cursor style: `--cursor default`
- Increase size: `--cursor-size 32`

## License

MIT

---

Built with ❤️ by [nichbot](https://github.com/nichbot)

