# Contributing to LooK

Thank you for your interest in contributing to LooK! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [TypeScript Guidelines](#typescript-guidelines)
- [Making Changes](#making-changes)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please:

- Be welcoming and inclusive
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community

## Getting Started

### Prerequisites

- Node.js 18+
- FFmpeg
- Git
- OpenAI API key (for AI features)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/LooK.git
   cd LooK
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/nirholas/LooK.git
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Install Playwright Browsers

```bash
npx playwright install chromium
```

### Verify Setup

```bash
# Run tests
npm test

# Run full pipeline test
node bin/repovideo.js test --full

# Test a quick demo
node bin/repovideo.js quick https://example.com --dry-run
```

### Start Web UI Development

```bash
# Install UI dependencies and start dev server
npm run dev:ui
```

### Environment Variables

```bash
# Required for AI features
export OPENAI_API_KEY=sk-your-key

# Optional: Enable debug output
export DEBUG=1
```

## Project Structure

```
LooK/
├── bin/
│   └── repovideo.js      # CLI entry point
├── src/
│   ├── index.js          # V1 video generation (terminal demos)
│   ├── analyze.js        # Repository analysis
│   ├── script.js         # Script generation
│   ├── voice.js          # TTS voiceover
│   ├── record.js         # Terminal recording
│   ├── compose.js        # Video composition
│   └── v2/
│       ├── index.js      # V2 entry point (web demos)
│       ├── ai.js         # AI analysis & script generation
│       ├── recorder.js   # Browser recording
│       ├── auto-zoom.js  # Intelligent zoom system
│       ├── cursor-renderer.js  # Cursor styles
│       ├── click-effects.js    # Click animations
│       ├── post-process.js     # Video post-processing
│       ├── server.js     # Web editor API server
│       ├── project.js    # Project management
│       ├── mobile-recorder.js  # Mobile recording
│       ├── touch-effects.js    # Touch indicators
│       └── ...
├── ui/
│   ├── src/
│   │   ├── app.js        # Main UI application
│   │   ├── timeline.js   # Timeline component
│   │   └── ...
│   └── index.html
├── docs/                  # Documentation
├── examples/             # Example configurations
└── tests/                # Test files
```

## TypeScript Guidelines

LooK is transitioning from JavaScript to TypeScript. Follow these guidelines when contributing.

### TypeScript Setup

```bash
# Type check the codebase
npm run typecheck

# Build TypeScript files
npm run build

# Watch mode for development
npm run build:watch
```

### For New Files

**All new files should be written in TypeScript** (`.ts`):

```typescript
// src/v2/my-new-module.ts
import type { DemoOptions, DemoResult } from '../types/options.js';
import type { WebsiteAnalysis } from '../types/ai.js';

export async function myFunction(
  url: string, 
  options: DemoOptions = {}
): Promise<DemoResult> {
  const { duration = 25, voice = 'nova' } = options;
  // ...
}
```

### For Existing JavaScript Files

When modifying existing `.js` files, add JSDoc type annotations:

```javascript
/**
 * @typedef {import('../types/options.js').DemoOptions} DemoOptions
 * @typedef {import('../types/ai.js').WebsiteAnalysis} WebsiteAnalysis
 */

/**
 * Generate a demo video.
 * 
 * @param {string} url - The URL to record
 * @param {DemoOptions} [options={}] - Configuration options
 * @returns {Promise<{ output: string, script: string|null }>}
 */
export async function generateDemo(url, options = {}) {
  // ...
}
```

### Type Definition Files

Type definitions are in `src/types/`:

| File | Contents |
|------|----------|
| `index.d.ts` | Main type exports (re-exports all types) |
| `project.d.ts` | Project, Timeline, CursorData types |
| `options.d.ts` | CLI options, DemoOptions, RecordingOptions |
| `ai.d.ts` | WebsiteAnalysis, ScriptOptions, VoiceoverOptions |

When adding new types:

1. Add to the appropriate `.d.ts` file
2. Export from `src/types/index.d.ts`
3. Import in your code with `import type { ... }`

### TypeScript Best Practices

**1. Use interfaces for object shapes:**
```typescript
// ✅ Good
interface ProjectSettings {
  duration: number;
  voice: Voice;
  style: ScriptStyle;
}

// ❌ Avoid for complex objects
type ProjectSettings = { duration: number; voice: Voice };
```

**2. Use union types for finite options:**
```typescript
type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
type ZoomMode = 'none' | 'basic' | 'smart' | 'follow';
```

**3. Avoid `any` - use `unknown` with type guards:**
```typescript
// ✅ Good
function parseConfig(input: unknown): Config {
  if (isConfig(input)) {
    return input;
  }
  throw new Error('Invalid config');
}

// ❌ Avoid
function parseConfig(input: any): Config {
  return input;
}
```

**4. Use `readonly` for immutable properties:**
```typescript
interface Project {
  readonly id: string;
  readonly createdAt: string;
  updatedAt: string;
}
```

**5. Document with JSDoc for better IDE support:**
```typescript
/**
 * Generate voiceover audio.
 * 
 * @param script - The text to convert to speech
 * @param options - TTS configuration options
 * @returns Path to the generated MP3 file
 * @throws {Error} If OpenAI API key is not set
 * 
 * @example
 * const audioPath = await generateVoiceover('Hello world', {
 *   voice: 'nova',
 *   speed: 1.0
 * });
 */
export async function generateVoiceover(
  script: string,
  options: VoiceoverOptions = {}
): Promise<string> {
  // ...
}
```

### tsconfig.json Overview

Our TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "outDir": "./dist"
  }
}
```

Key settings:
- **ES2022 target**: Modern JavaScript features
- **NodeNext modules**: ES module compatibility
- **Strict mode**: Catch type errors early
- **Declaration files**: Generate `.d.ts` for consumers

## Making Changes

### Branch Naming

Use descriptive branch names:

```bash
# Features
git checkout -b feature/batch-processing
git checkout -b feature/custom-cursors

# Bug fixes
git checkout -b fix/ffmpeg-path-issue
git checkout -b fix/zoom-flicker

# Documentation
git checkout -b docs/api-examples
git checkout -b docs/mobile-setup
```

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(cursor): add spotlight cursor style
fix(zoom): prevent jitter on rapid clicks
docs(api): add programmatic usage examples
refactor(recorder): extract frame capture logic
```

### Keep Commits Focused

- One logical change per commit
- Avoid mixing refactoring with features
- Squash fixup commits before PR

## Code Style

### General Guidelines

- Use ES modules (`import`/`export`)
- Prefer `async`/`await` over callbacks
- Use descriptive variable names
- Keep functions small and focused
- Add JSDoc comments for public APIs

### JavaScript Style

```javascript
// ✅ Good
import { something } from './module.js';

export async function generateDemo(url, options = {}) {
  const { duration = 25, voice = 'nova' } = options;
  
  try {
    const result = await recordBrowser(url, { duration });
    return result;
  } catch (error) {
    console.error('Failed to generate demo:', error.message);
    throw error;
  }
}

// ❌ Avoid
var something = require('./module');

function generateDemo(url, options, callback) {
  recordBrowser(url, options, function(err, result) {
    if (err) callback(err);
    else callback(null, result);
  });
}
```

### File Organization

```javascript
// 1. Imports (external first, then internal)
import { chromium } from 'playwright';
import chalk from 'chalk';
import { AutoZoom } from './auto-zoom.js';

// 2. Constants
const DEFAULT_DURATION = 25;
const MAX_ZOOM = 2.0;

// 3. Main exports
export async function mainFunction() { }

// 4. Helper functions (private)
function helperFunction() { }

// 5. Classes
export class SomeClass { }
```

### JSDoc Comments

```javascript
/**
 * Generate a demo video from a URL
 * 
 * @param {string} url - The website URL to record
 * @param {Object} options - Configuration options
 * @param {number} [options.duration=25] - Duration in seconds
 * @param {string} [options.voice='nova'] - TTS voice to use
 * @param {string} [options.output='./demo.mp4'] - Output path
 * @returns {Promise<{output: string, duration: number}>}
 * @throws {Error} If recording fails
 * 
 * @example
 * const result = await generateDemo('https://example.com', {
 *   duration: 30,
 *   voice: 'alloy'
 * });
 */
export async function generateDemo(url, options = {}) {
  // ...
}
```

### Formatting

We use Prettier for formatting:

```bash
# Format all files
npx prettier --write .

# Check formatting
npx prettier --check .
```

Config is in `.prettierrc`.

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/cursor.test.js

# Run with coverage
npm test -- --coverage
```

### Writing Tests

```javascript
import { describe, it, expect } from 'vitest';
import { CursorRenderer } from '../src/v2/cursor-renderer.js';

describe('CursorRenderer', () => {
  it('should generate cursor image', async () => {
    const cursor = new CursorRenderer({
      style: 'default',
      size: 32
    });
    
    const path = await cursor.generateCursorImage('/tmp/test');
    expect(path).toContain('cursor-default.png');
  });

  it('should apply preset colors', () => {
    const cursor = new CursorRenderer({
      style: 'dot',
      ...getCursorPreset('github')
    });
    
    expect(cursor.color).toBe('#24292f');
  });
});
```

### Test Categories

- **Unit tests**: Individual functions/classes
- **Integration tests**: Component interactions
- **E2E tests**: Full pipeline tests

### Manual Testing

```bash
# Test CLI commands
node bin/repovideo.js demo https://example.com --dry-run
node bin/repovideo.js test --click-effects
node bin/repovideo.js test --full

# Test web UI
npm run dev:ui
# Open http://localhost:5173
```

## Pull Request Process

### Before Submitting

1. **Sync with upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Check formatting:**
   ```bash
   npx prettier --check .
   ```

4. **Test your changes manually**

### PR Description

Include:
- **What**: Clear description of changes
- **Why**: Motivation and context
- **How**: Implementation approach
- **Testing**: How you tested the changes
- **Screenshots**: For UI changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Testing
- [ ] Unit tests pass
- [ ] Manual testing done
- [ ] Tested on Linux/Mac/Windows

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed my code
- [ ] Added comments for complex logic
- [ ] Updated documentation
- [ ] No new warnings
```

### Review Process

1. Maintainer reviews within 48 hours
2. Address feedback with additional commits
3. Squash commits if requested
4. Maintainer merges when approved

## Release Process

Releases are managed by maintainers:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag
4. Push to npm

```bash
# Version bump
npm version patch|minor|major

# Publish
npm publish
```

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/nirholas/LooK/discussions)
- **Bugs**: Open an [Issue](https://github.com/nirholas/LooK/issues)
- **Chat**: Join our Discord (coming soon)

## Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes
- README acknowledgments

Thank you for contributing! 🎬
