# Web Editor Guide

The LooK web editor provides a visual interface for fine-tuning your demo videos before export.

## Starting the Editor

```bash
look serve
```

By default, this opens `http://localhost:3847` in your browser.

### Options

```bash
# Use a different port
look serve -p 8080

# Don't open browser automatically
look serve --no-open
```

## Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│  L👀K Editor                                     [Export]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     Preview Canvas                          │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ◀ ▶ ⏸  [0:00 / 0:25]  ━━━━━━━●━━━━━━━━━━━━━━━━  🔊      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Timeline Track                                             │
│  [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Main Sections

1. **Preview Canvas** - Real-time preview of your demo
2. **Playback Controls** - Play, pause, scrub through video
3. **Timeline** - Visual editing of clips, effects, and zoom

## Creating a New Project

### From URL

1. Click **New Project**
2. Enter your website URL
3. Configure initial settings:
   - Duration
   - Voice
   - Style
4. Click **Record**

### From Existing Recording

1. Drag & drop a recording file into the editor
2. Or use File → Open Recording

## Timeline Editing

### Playback Controls

| Control | Shortcut | Action |
|---------|----------|--------|
| Play/Pause | `Space` | Toggle playback |
| Forward | `→` | Skip 1 second |
| Backward | `←` | Go back 1 second |
| Frame Forward | `Shift + →` | Next frame |
| Frame Backward | `Shift + ←` | Previous frame |
| Beginning | `Home` | Jump to start |
| End | `End` | Jump to end |

### Zoom Keyframes

Zoom keyframes control when and where the camera zooms in.

**Adding a Zoom Keyframe:**
1. Scrub to the desired time
2. Click the **+ Zoom** button
3. Adjust zoom level (1.0 - 3.0)
4. Set focus point by clicking on preview

**Editing Zoom:**
- Drag keyframes on timeline to reposition
- Double-click to edit properties
- Right-click to delete

### Cursor Trail

The timeline shows cursor movement as a path. You can:
- Adjust cursor smoothing
- Modify click effect timing
- Hide cursor for specific sections

## Settings Panel

### Video Settings

| Setting | Description |
|---------|-------------|
| Resolution | Output video resolution |
| Frame Rate | 30 or 60 FPS |
| Quality | Bitrate/quality level |
| Format | MP4, WebM, GIF |

### Cursor Settings

| Setting | Description |
|---------|-------------|
| Style | Arrow, dot, circle, etc. |
| Size | Cursor size in pixels |
| Color | Cursor color |
| Glow | Enable/disable glow effect |

### Click Effects

| Setting | Description |
|---------|-------------|
| Effect | Ripple, pulse, ring, spotlight |
| Color | Effect color |
| Size | Effect radius |
| Duration | Animation duration |

### Voice Settings

| Setting | Description |
|---------|-------------|
| Voice | TTS voice selection |
| Speed | Speech rate |
| Script | Edit generated script |

## Keyboard Shortcuts

### Playback

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `←` / `→` | Seek 1 second |
| `Shift + ←/→` | Seek 1 frame |
| `Home` | Go to start |
| `End` | Go to end |
| `L` | Speed up playback |
| `J` | Slow down playback |

### Editing

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + S` | Save project |
| `Delete` | Delete selected keyframe |
| `Ctrl/Cmd + C` | Copy keyframe |
| `Ctrl/Cmd + V` | Paste keyframe |

### Zoom

| Shortcut | Action |
|----------|--------|
| `+` | Zoom in timeline |
| `-` | Zoom out timeline |
| `0` | Fit timeline to view |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Tab` | Next section |
| `Shift + Tab` | Previous section |
| `Esc` | Close panel/Cancel |

## Exporting

### Quick Export

1. Click **Export** button
2. Choose preset (YouTube, Twitter, etc.)
3. Click **Export**

### Custom Export

1. Click **Export** → **Custom**
2. Configure:
   - Resolution
   - Bitrate
   - Format
   - Audio settings
3. Choose output location
4. Click **Export**

### Export Presets

| Preset | Resolution | Notes |
|--------|------------|-------|
| YouTube | 1920×1080 | H.264, AAC audio |
| Twitter | 1280×720 | Optimized for timeline |
| Instagram | 1080×1080 | Square format |
| TikTok | 1080×1920 | Vertical format |
| GIF | 640×360 | Animated GIF |

## Project Management

### Saving Projects

Projects auto-save to:
```
~/.look-demo/projects/<project-id>/
```

Manual save: `Ctrl/Cmd + S`

### Opening Projects

```bash
# List all projects
look projects

# Open specific project
look edit abc12345
```

### Project Files

Each project contains:
```
<project-id>/
├── project.json     # Project metadata
├── recording.mp4    # Raw recording
├── cursor.json      # Cursor data
├── analysis.json    # AI analysis
├── script.txt       # Voiceover script
└── exports/         # Exported videos
```

## Tips & Best Practices

### Smooth Zoom Transitions

- Use 800-1000ms transition duration
- Don't zoom more than 2x in one transition
- Match zoom to voiceover emphasis

### Cursor Visibility

- Use contrasting cursor color
- Enable glow on busy backgrounds
- Increase size for mobile-focused demos

### Click Effects

- Keep duration short (300-500ms)
- Match color to your brand
- Use consistent effect throughout

### Script Editing

- Keep sentences short
- Match pacing to video
- Emphasize key features

## Troubleshooting

### Video Won't Play

- Check browser console for errors
- Ensure FFmpeg processed video correctly
- Try a different browser

### Timeline Lag

- Reduce preview quality
- Close other applications
- Use a shorter preview section

### Export Fails

- Check disk space
- Verify FFmpeg is installed
- Check console for error details

## API Access

The editor runs on a local API server. For programmatic access:

```bash
# Base URL
http://localhost:3847/api

# Endpoints
GET  /api/projects          # List projects
GET  /api/projects/:id      # Get project
POST /api/projects          # Create project
PUT  /api/projects/:id      # Update project
DELETE /api/projects/:id    # Delete project
POST /api/render            # Start render
GET  /api/render/:id/status # Check render status
```

See [API.md](./API.md) for full documentation.
