# Frequently Asked Questions

## General

### What is LooK?

LooK is an AI-powered tool that automatically generates professional product demo videos from any website. It captures your site, analyzes the UI with GPT-4 Vision, writes a compelling script, adds smooth cursor animations, and produces a polished video with AI voiceover.

### How much does it cost?

LooK itself is free and open source. However, it uses OpenAI's API for AI features:
- **GPT-4 Vision** - For analyzing your website (~$0.01-0.03 per analysis)
- **TTS** - For voiceover generation (~$0.015 per 1K characters)

A typical 30-second demo costs approximately $0.05-0.10 in API fees.

### Do I need an OpenAI API key?

Yes, for AI-powered features (analysis, voiceover). Without an API key, you can still:
- Use live recording with manual control
- Record without AI analysis (`--skip-analysis`)
- Generate silent videos (`--skip-voice`)

### What browsers are supported?

LooK uses Playwright with Chromium for recording. The web editor works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

---

## Web Editor

### How do I configure API keys in the web editor?

1. Click the ⚙️ Settings button (top right)
2. Go to the **API Keys** tab
3. Enter your OpenAI API key
4. Optionally add a Groq API key
5. Click **Save Settings**

Your keys are stored in browser localStorage and sent securely with each request.

### What do the API status indicators mean?

| Status | Meaning |
|--------|---------|
| 🟢 Green | API connected and working |
| 🟡 Yellow (pulsing) | Checking connection... |
| 🔴 Red | Connection error |
| ⚫ Gray | Not configured |

### How do I restart the onboarding tour?

Open browser developer tools (F12) and run:
```javascript
localStorage.removeItem('look-onboarding-complete');
location.reload();
```

### Can I use the web editor offline?

The editor UI works offline, but you need an internet connection for:
- AI analysis (requires OpenAI API)
- Voiceover generation
- Recording external websites

### What templates are available?

| Template | Best For |
|----------|----------|
| SaaS Landing | Product pages, feature showcases |
| E-commerce | Product catalogs, checkout flows |
| Portfolio | Creative work, case studies |
| Documentation | API docs, developer guides |
| Mobile App | iOS/Android app demos |
| Dashboard | Analytics, admin interfaces |

---

## Recording

### How long can my demo be?

Technically unlimited, but we recommend:
- **15-30 seconds** for social media
- **30-60 seconds** for product pages
- **1-3 minutes** for detailed walkthroughs

### Can I record password-protected pages?

Yes, use live recording mode:
1. Start live recording
2. Manually log in during the recording
3. Continue with your demo

### Why is my recording blank/black?

Common causes:
- Page uses WebGL/Canvas that doesn't capture well
- Content loads after recording starts
- Page requires authentication

Solutions:
- Use `--reliable` flag for robust recording
- Use live recording for interactive pages
- Add delays with `--dry-run` to test first

### Can I record multiple pages?

Yes! Use the walkthrough command:
```bash
look walkthrough https://myapp.com --max-pages 5
```

This automatically navigates through your site and creates a cohesive demo.

---

## Export

### What export formats are supported?

| Format | Resolution | Use Case |
|--------|------------|----------|
| YouTube | 1920×1080 | Standard HD videos |
| Twitter | 1280×720 | Timeline videos |
| Instagram | 1080×1080 | Square feed posts |
| TikTok | 1080×1920 | Vertical shorts |
| GIF | 640×360 | Embeds, previews |

### Can I export without voiceover?

Yes:
```bash
look demo https://myapp.com --skip-voice
```

Or in the web editor, you can delete the voiceover track before exporting.

### Why is my export failing?

Common causes:
- FFmpeg not installed
- Insufficient disk space
- Invalid project state

Check the browser console (F12) for detailed error messages.

---

## Voice & Script

### What voices are available?

| Voice | Description |
|-------|-------------|
| `nova` | Warm, professional (default) |
| `alloy` | Neutral, balanced |
| `echo` | Smooth, narrative |
| `fable` | Expressive, storytelling |
| `onyx` | Deep, authoritative |
| `shimmer` | Clear, upbeat |

### Can I edit the AI-generated script?

Yes! After recording:
1. Open the **Script** tab in the sidebar
2. Edit the text directly
3. Click **Regenerate Voice** to create new audio

### Can I use my own voice?

Not directly in LooK, but you can:
1. Export video without voice (`--skip-voice`)
2. Record your own voiceover
3. Combine using video editing software

---

## Mobile Recording

### What mobile devices are supported?

- **Android**: Via Docker emulator (no setup required)
- **iOS**: Requires macOS with Xcode and iOS Simulator

### Do I need Android Studio?

No! LooK uses Docker to run an Android emulator:
```bash
look mobile-start   # Start emulator
look mobile app.apk # Record your app
look mobile-stop    # Stop emulator
```

### Can I record real devices?

Not currently. LooK uses emulators/simulators for consistent recording quality.

---

## Troubleshooting

### Where are projects saved?

Projects are saved to:
```
~/.look-demo/projects/<project-id>/
```

### How do I clear the cache?

```bash
rm -rf ~/.look-demo/cache/*
```

### How do I reset all settings?

In browser console:
```javascript
localStorage.clear();
location.reload();
```

Or delete the config file:
```bash
rm ~/.look-demo/config.json
```

### Still need help?

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Search [GitHub Issues](https://github.com/nirholas/LooK/issues)
3. Open a [new issue](https://github.com/nirholas/LooK/issues/new)
