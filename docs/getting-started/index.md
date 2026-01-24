# Getting Started

Welcome to LooK! This section will help you get up and running with LooK in just a few minutes.

## What You'll Learn

<div class="grid cards" markdown>

-   :material-download:{ .lg .middle } __Installation__

    ---

    Install LooK and its dependencies on your system.

    [:octicons-arrow-right-24: Install now](installation.md)

-   :material-rocket-launch:{ .lg .middle } __Quick Start__

    ---

    Create your first demo video in under 5 minutes.

    [:octicons-arrow-right-24: Quick start](quickstart.md)

-   :material-cog:{ .lg .middle } __Configuration__

    ---

    Configure API keys, voices, and customize defaults.

    [:octicons-arrow-right-24: Configure](configuration.md)

</div>

## Prerequisites

Before installing LooK, ensure you have:

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | [Download](https://nodejs.org/) |
| FFmpeg | Latest | Video processing |
| OpenAI API Key | - | For AI features |

## Fastest Path

If you want to get started immediately:

```bash
# Install LooK
npm install -g look-demo

# Set your API key
export OPENAI_API_KEY=sk-your-key-here

# Create your first demo
look quick https://your-app.com
```

That's it! Your video will be saved as `demo.mp4`.

## Choose Your Path

### CLI User

If you prefer the command line, start with the [Quick Start](quickstart.md) guide and then explore the [CLI Reference](../reference/cli.md).

### Visual Editor User

If you prefer a graphical interface, check out the [Web Editor Guide](../guide/web-editor.md):

```bash
look serve
```

### Developer / Integration

If you want to integrate LooK into your build pipeline or application, see the [API Reference](../reference/api.md).

## Next Steps

1. [Install LooK](installation.md)
2. [Create your first demo](quickstart.md)
3. [Configure API keys](configuration.md)
