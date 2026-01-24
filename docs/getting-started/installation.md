# Installation

This guide covers installing LooK and all required dependencies.

## Quick Install

```bash
npm install -g look-demo
```

Verify the installation:

```bash
look --version  # Should show 2.0.0
```

## System Requirements

### Node.js 18+

LooK requires Node.js 18 or higher.

=== "macOS"

    ```bash
    # Using Homebrew
    brew install node

    # Using nvm (recommended)
    nvm install 18
    nvm use 18
    ```

=== "Linux"

    ```bash
    # Using nvm (recommended)
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    nvm install 18
    nvm use 18

    # Or using apt (Ubuntu/Debian)
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    ```

=== "Windows"

    Download and install from [nodejs.org](https://nodejs.org/)

Verify:

```bash
node --version  # Should be 18.0.0 or higher
```

### FFmpeg

FFmpeg is required for video processing.

=== "macOS"

    ```bash
    brew install ffmpeg
    ```

=== "Linux"

    ```bash
    # Ubuntu/Debian
    sudo apt update
    sudo apt install ffmpeg

    # Fedora
    sudo dnf install ffmpeg

    # Arch
    sudo pacman -S ffmpeg
    ```

=== "Windows"

    1. Download from [ffmpeg.org](https://ffmpeg.org/download.html)
    2. Extract to `C:\ffmpeg`
    3. Add `C:\ffmpeg\bin` to your PATH

Verify:

```bash
ffmpeg -version
```

### Playwright Browsers

LooK uses Playwright for browser automation. Install the browsers:

```bash
npx playwright install chromium
```

!!! tip "First Run"
    LooK will automatically install Playwright browsers on first run if they're missing.

## API Keys

### OpenAI API Key (Required for AI features)

LooK uses OpenAI for:

- **GPT-4 Vision** - Website analysis
- **TTS** - Voiceover generation

Get your API key at [platform.openai.com](https://platform.openai.com/api-keys).

=== "Environment Variable"

    ```bash
    # Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
    export OPENAI_API_KEY=sk-your-key-here
    ```

=== "Web Editor"

    1. Run `look serve`
    2. Click ⚙️ Settings
    3. Enter your API key in the API Keys tab
    4. Click Save

### Groq API Key (Optional)

For faster script generation, you can use Groq's API:

```bash
export GROQ_API_KEY=gsk-your-key-here
```

Get your key at [console.groq.com](https://console.groq.com).

## Verify Installation

Run the built-in test:

```bash
look test
```

Expected output:

```
  FFmpeg installed: ✓
  Sharp working: ✓
  Playwright browser: ✓
  OpenAI API key: ✓

✅ All basic tests passed!
```

For a complete pipeline test:

```bash
look test --full
```

## Docker Installation

You can also run LooK in Docker:

```bash
docker run -p 3847:3847 \
  -e OPENAI_API_KEY=sk-your-key \
  ghcr.io/nirholas/look:latest serve
```

## Troubleshooting

### "FFmpeg not found"

Ensure FFmpeg is in your PATH:

```bash
which ffmpeg  # Should show the path
```

If not found, reinstall using the instructions above.

### "Playwright browser not found"

```bash
npx playwright install chromium
```

### Permission Denied

On Linux/macOS, you may need to fix npm permissions:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### More Help

See the [Troubleshooting Guide](../help/troubleshooting.md) for more solutions.

## Next Steps

Now that LooK is installed, let's [create your first demo](quickstart.md)!
