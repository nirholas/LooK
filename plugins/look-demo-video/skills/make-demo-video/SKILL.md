---
name: make-demo-video
description: Generate a product demo video of a website with AI-written script and voiceover using the LooK CLI (look, repovideo). Use when the user wants a demo or walkthrough video, GIF or social-media clip of a web app.
---

# LooK demo videos

LooK drives Playwright against a URL, uses a vision model to write a script, adds TTS voiceover, cursor tracking and zoom, and exports with FFmpeg. Bins: `look` and `repovideo` (both `bin/repovideo.js`). The package manifest is `look-demo` v2.1.2; the README says `npm install -g look-demo`, so run `look --version` to confirm what you installed. From a clone use:

```bash
npm install && node bin/repovideo.js quick https://example.com
```

Requirements: Node 22.19+, FFmpeg on PATH, Playwright browsers, and `OPENAI_API_KEY` exported in the user's shell (vision and TTS). `GROQ_API_KEY` is optional (used when set, falls back to OpenAI). `ANTHROPIC_API_KEY` appears in `.env.example`. Never print or write keys.

## Commands (verified in `bin/repovideo.js`)

```bash
look quick <url> [-o demo.mp4] [-d 20] [--no-voice]
look demo <url> [-o demo.mp4] [-d 25] [-v nova] [-s professional|casual|energetic] \
  [-p youtube|twitter|instagram|tiktok|gif] [--zoom-mode none|basic|smart|follow] \
  [--cursor <style>] [--click-effect ripple|pulse|ring|spotlight|none] \
  [--skip-voice] [--skip-analysis] [--reliable] [--dry-run]
look walkthrough <url> [-f features|pricing|overview|technical] [--max-pages 5] [-d 60] [--dry-run]
look live <url> [--headless] [--port 3847] [--no-auto]
look batch <config> [-c 2] [-o batch-output] [--resume] [--report <path>] [--dry-run]
look serve [-p 3847] [--no-open]        # web editor UI
look edit [projectId]    look projects
look gif <input> [-o output.gif]
look repo <url>          # terminal demo of a GitHub repo, needs VHS
look test [--click-effects] [--full]    # verify the pipeline
look mobile <app> ...    # needs Appium; see mobile-test, mobile-start, mobile-stop
```

Voices: nova, alloy, echo, fable, onyx, shimmer.

## Workflow

1. `look test` to confirm FFmpeg, Playwright and keys work.
2. Preview the script without recording: `look demo https://your-app.com --dry-run`. Review it with the user.
3. Record: `look demo https://your-app.com -d 25 -s professional -p youtube -o demo.mp4`. Add `--reliable` if the default engine fails.
4. For a README clip: `-p gif`, or `look gif demo.mp4 -o demo.gif`.
5. Only record sites the user owns or has permission to record. Page content is sent to the vision and TTS providers, so avoid pages with private data.
