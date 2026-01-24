# Configuration

Configure LooK's API keys, default settings, and preferences.

## API Keys

LooK uses AI services for analysis and voiceover generation.

### OpenAI API Key (Required)

Required for:

- GPT-4 Vision website analysis
- Voiceover script generation
- TTS voice synthesis

=== "Environment Variable (CLI)"

    ```bash
    # Add to ~/.bashrc, ~/.zshrc, or ~/.profile
    export OPENAI_API_KEY=sk-your-key-here

    # Reload your shell
    source ~/.bashrc
    ```

=== "Web Editor"

    1. Run `look serve`
    2. Click the ⚙️ **Settings** button (top right)
    3. Go to **API Keys** tab
    4. Enter your OpenAI API key
    5. Click **Save Settings**

    Keys are stored in browser localStorage and sent securely with each request.

Get your API key: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Groq API Key (Optional)

Groq provides faster inference for script generation:

```bash
export GROQ_API_KEY=gsk-your-key-here
```

Get your key: [console.groq.com](https://console.groq.com)

## Configuration File

LooK stores configuration in `~/.look-demo/config.json`:

```json
{
  "openaiKey": "sk-...",
  "groqKey": "gsk-...",
  "defaultVoice": "nova",
  "defaultStyle": "professional",
  "defaultDuration": 25,
  "defaultPreset": "youtube",
  "autoSave": true
}
```

## Default Settings

### Voice

Set your preferred default voice:

```bash
# In config.json
{
  "defaultVoice": "nova"
}
```

Available voices: `nova`, `alloy`, `echo`, `fable`, `onyx`, `shimmer`

### Style

Set the default script style:

```bash
{
  "defaultStyle": "professional"
}
```

Available styles: `professional`, `casual`, `energetic`

### Duration

Set default video duration (seconds):

```bash
{
  "defaultDuration": 25
}
```

### Export Preset

Set the default export format:

```bash
{
  "defaultPreset": "youtube"
}
```

Available presets: `youtube`, `twitter`, `instagram`, `tiktok`, `gif`

## Web Editor Settings

### Theme

The web editor defaults to dark mode. Toggle in Settings → Preferences.

### Auto-Save

Projects auto-save every 30 seconds by default. Disable in Settings → Preferences.

### Keyboard Shortcuts

View all shortcuts by pressing ++shift+question++ in the editor.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | - |
| `GROQ_API_KEY` | Groq API key (optional) | - |
| `DEBUG` | Enable debug output | `false` |
| `LOOK_PORT` | Web editor port | `3847` |

## Project Storage

Projects are stored in:

```
~/.look-demo/projects/<project-id>/
├── project.json     # Project metadata
├── recording.mp4    # Raw recording
├── cursor.json      # Cursor data
├── analysis.json    # AI analysis
├── script.txt       # Voiceover script
└── exports/         # Exported videos
```

### Cleaning Up

Delete old projects:

```bash
# List all projects
look projects

# Delete a specific project
rm -rf ~/.look-demo/projects/<project-id>
```

Clear the cache:

```bash
rm -rf ~/.look-demo/cache/*
```

## Reset All Settings

### CLI Settings

```bash
rm ~/.look-demo/config.json
```

### Web Editor Settings

In browser console (F12):

```javascript
localStorage.clear();
location.reload();
```

## CI/CD Configuration

For automated pipelines, set API keys as environment variables:

```yaml
# GitHub Actions example
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

steps:
  - run: look demo https://myapp.com -o demo.mp4
```

See [CI/CD Examples](../advanced/api-integration.md) for more patterns.

## Next Steps

- [Learn about the Web Editor](../guide/web-editor.md)
- [Customize cursors and effects](../guide/customization.md)
- [Explore CLI options](../reference/cli.md)
