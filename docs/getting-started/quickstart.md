# Quick Start

Create your first professional demo video in under 5 minutes.

## The Fastest Way

```bash
look quick https://your-app.com
```

This single command will:

1. ✅ Capture your website
2. ✅ Analyze the UI with AI
3. ✅ Generate a professional script
4. ✅ Record smooth cursor animations
5. ✅ Add AI voiceover
6. ✅ Export a polished video

Your video is saved as `demo.mp4`.

## Step-by-Step Example

Let's create a demo for a real website:

### 1. Choose a URL

```bash
look demo https://stripe.com -o stripe-demo.mp4
```

### 2. Watch the Progress

```
✓ Checking dependencies...
✓ Analyzing website with AI vision...
✓ Generating script...
✓ Recording browser...
✓ Rendering cursor and effects...
✓ Generating voiceover...
✓ Composing final video...
```

### 3. View Your Demo

=== "macOS"

    ```bash
    open stripe-demo.mp4
    ```

=== "Linux"

    ```bash
    xdg-open stripe-demo.mp4
    ```

=== "Windows"

    ```bash
    start stripe-demo.mp4
    ```

## Preview Before Recording

Want to see what LooK will do before recording?

```bash
look demo https://your-app.com --dry-run
```

This shows you:

- The AI analysis results
- The generated script
- Planned recording actions

No credits used, no video recorded.

## Customize Your Demo

### Duration

```bash
# Short Twitter clip (15 seconds)
look demo https://your-app.com -d 15

# Detailed walkthrough (60 seconds)
look demo https://your-app.com -d 60
```

### Voice

```bash
# Deep, authoritative
look demo https://your-app.com -v onyx

# Bright, energetic
look demo https://your-app.com -v shimmer
```

| Voice | Description |
|-------|-------------|
| `nova` | Warm, professional (default) |
| `alloy` | Neutral, balanced |
| `echo` | Smooth, narrative |
| `fable` | Expressive, storytelling |
| `onyx` | Deep, authoritative |
| `shimmer` | Clear, upbeat |

### Style

```bash
# Casual, friendly
look demo https://your-app.com -s casual

# High-energy launch video
look demo https://your-app.com -s energetic
```

### Export Format

```bash
# Twitter-optimized
look demo https://your-app.com -p twitter

# Instagram square
look demo https://your-app.com -p instagram

# TikTok vertical
look demo https://your-app.com -p tiktok
```

## Using the Web Editor

For a visual experience:

```bash
look serve
```

This opens `http://localhost:3847` where you can:

1. Enter your URL
2. Click **Generate Demo** or **Live Record**
3. Edit the timeline and script
4. Export your video

See the [Web Editor Guide](../guide/web-editor.md) for details.

## Multi-Page Demos

Want to showcase your entire site?

```bash
look walkthrough https://your-app.com --max-pages 5
```

LooK will:

1. Discover all pages
2. Prioritize the most important ones
3. Create a cohesive narrative across pages

## Silent Demo (No Voice)

```bash
look demo https://your-app.com --skip-voice
```

## Common Patterns

### Product Launch

```bash
look demo https://myapp.com \
  -d 30 \
  -v nova \
  -s energetic \
  -p youtube
```

### Quick Social Share

```bash
look demo https://myapp.com \
  -d 15 \
  -p twitter \
  --skip-analysis
```

### Full Feature Tour

```bash
look walkthrough https://myapp.com \
  --max-pages 5 \
  -d 90 \
  -v echo
```

## What's Next?

- [Configure API keys and preferences](configuration.md)
- [Learn about the Web Editor](../guide/web-editor.md)
- [Customize cursors and effects](../guide/customization.md)
- [Explore all CLI options](../reference/cli.md)
