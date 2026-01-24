# Changelog

All notable changes to LooK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Enterprise Web Editor UI**: Complete redesign with professional SaaS polish
  - First-run onboarding tour with 4-step guided walkthrough
  - Settings modal with API key management and validation
  - Real-time API connection status indicators
  - Header navigation with Editor, Templates, and Docs tabs
  - Templates page with 6 pre-built demo configurations
  - Built-in documentation accessible from the editor
  - Loading overlay with status messages
  - Keyboard shortcuts help modal (`Shift + ?`)
- Enhanced keyboard shortcuts:
  - `K` - Alternative play/pause
  - `J/L` - Seek 10 seconds backward/forward
  - `M` - Add marker at current time
  - `[/]` - Jump between markers
  - `1/2/3` - Switch sidebar tabs
  - `Ctrl+E` - Export video
  - `Ctrl+N` - New project
- Accessibility improvements:
  - Skip to content link
  - ARIA labels and roles
  - Screen reader announcements
  - Focus management
- Comprehensive documentation in `docs/` folder
- Example configurations in `examples/` folder
- ROADMAP.md with future plans
- CONTRIBUTING.md with contribution guidelines

### Changed
- Updated README with web editor features and setup instructions
- Improved WEB_EDITOR.md with new UI documentation
- Enhanced GETTING_STARTED.md with web UI API key setup instructions

## [2.0.0] - 2025-12-15

### Added
- **V2 Engine**: Complete rewrite for web-based demos
- **AI Vision Analysis**: GPT-4V powered UI understanding
- **Smart Zoom**: Intelligent camera movement following cursor
- **Cursor Styles**: Multiple cursor styles (arrow, dot, circle, crosshair, spotlight)
- **Cursor Presets**: Pre-configured color schemes (github, figma, notion, etc.)
- **Cursor Glow**: Optional glow effect for better visibility
- **Click Effects**: Ripple, pulse, ring, and spotlight animations
- **Web Editor UI**: Visual timeline editing interface
- **Project Management**: Save and load projects
- **Export Presets**: YouTube, Twitter, Instagram, TikTok, GIF
- **Mobile Recording**: iOS and Android app demos via Appium
- **Touch Effects**: Touch indicators and swipe trails
- **Device Frames**: Overlay device frames on mobile demos
- **Zoom Modes**: None, basic, smart, and follow-cam modes
- **Multi-voice Support**: 6 OpenAI TTS voices
- **Script Styles**: Professional, casual, and energetic tones
- **`look quick`**: Simplified command with smart defaults
- **`look serve`**: Start web editor server
- **`look edit`**: Open existing projects
- **`look projects`**: List saved projects
- **`look test`**: Verify installation

### Changed
- Default zoom mode changed to `smart`
- Default cursor size increased to 32px
- Improved FFmpeg filter generation for click effects
- Better error messages and recovery

### Fixed
- Cursor jitter on rapid movements
- Memory leaks in long recordings
- FFmpeg path detection on Windows
- Zoom flickering at video edges

## [1.0.0] - 2025-06-01

### Added
- Initial release
- GitHub repository terminal demos
- VHS-based terminal recording
- AI script generation with GPT-4
- OpenAI TTS voiceover
- Basic video composition
- `repovideo repo` command

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 2.0.0 | Dec 2025 | V2 engine, web demos, smart zoom |
| 1.0.0 | Jun 2025 | Initial release, terminal demos |

## Upgrade Guide

### 1.x to 2.x

The V2 release is a major update with new commands:

```bash
# Old (still works for GitHub repos)
repovideo repo https://github.com/user/repo

# New (recommended for websites)
look demo https://myapp.com

# Quickest way
look quick https://myapp.com
```

**Breaking Changes:**
- Default output path changed from `./output/demo.mp4` to `./demo.mp4`
- Default duration changed from 30s to 25s
- New dependency: Playwright (for browser recording)

**New Dependencies:**
```bash
# Install Playwright browsers
npx playwright install chromium
```

## Links

- [Full Documentation](./docs/)
- [Roadmap](./ROADMAP.md)
- [Contributing](./CONTRIBUTING.md)
