# Help & Support

Get help with LooK, find answers to common questions, and learn how to troubleshoot issues.

## Help Resources

<div class="grid cards" markdown>

-   :material-frequently-asked-questions:{ .lg .middle } __FAQ__

    ---

    Answers to frequently asked questions about LooK.

    [:octicons-arrow-right-24: FAQ](faq.md)

-   :material-wrench:{ .lg .middle } __Troubleshooting__

    ---

    Solutions to common problems and error messages.

    [:octicons-arrow-right-24: Troubleshooting](troubleshooting.md)

-   :material-lifebuoy:{ .lg .middle } __Support__

    ---

    How to get additional help and report issues.

    [:octicons-arrow-right-24: Support](support.md)

</div>

## Quick Help

### Installation Issues

```bash
# Verify Node.js version
node --version  # Should be 18+

# Verify FFmpeg
ffmpeg -version

# Reinstall Playwright browsers
npx playwright install chromium
```

### API Key Issues

```bash
# Check if key is set
echo $OPENAI_API_KEY

# Test the key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Run Diagnostics

```bash
# Basic test
look test

# Full pipeline test
look test --full

# Debug mode
DEBUG=1 look demo https://example.com
```

## Getting Help

### 1. Search Documentation

Use the search bar at the top to find answers in our documentation.

### 2. Check FAQ

Many common questions are answered in the [FAQ](faq.md).

### 3. Troubleshooting Guide

For error messages and issues, see [Troubleshooting](troubleshooting.md).

### 4. GitHub Issues

If you can't find an answer:

1. Search [existing issues](https://github.com/nirholas/LooK/issues)
2. Open a [new issue](https://github.com/nirholas/LooK/issues/new)

Include:

- LooK version (`look --version`)
- Node.js version (`node --version`)
- Operating system
- Full error message
- Steps to reproduce

### 5. Community

- GitHub Discussions (coming soon)
- Discord (coming soon)
