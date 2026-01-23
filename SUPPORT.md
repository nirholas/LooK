# How to Get Support

## Documentation

Start with the docs:

- [Getting Started](./docs/GETTING_STARTED.md) - Installation and first demo
- [CLI Reference](./docs/CLI_REFERENCE.md) - Command options
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues
- [API Documentation](./docs/API.md) - Programmatic usage

## Quick Answers

### Installation Issues

```bash
# Check dependencies
look test

# Reinstall Playwright
npx playwright install chromium

# Check FFmpeg
ffmpeg -version
```

### Common Errors

| Error | Solution |
|-------|----------|
| FFmpeg not found | Install FFmpeg for your OS |
| OpenAI API error | Check `$OPENAI_API_KEY` is set |
| Browser not found | Run `npx playwright install` |
| Timeout | Try `--reliable` flag |

## Getting Help

### 1. Search Existing Issues

Many questions have already been answered:
[GitHub Issues](https://github.com/nirholas/LooK/issues?q=is%3Aissue)

### 2. Ask a Question

For general questions and discussions:
[GitHub Discussions](https://github.com/nirholas/LooK/discussions)

### 3. Report a Bug

Found a bug? Open an issue:
[Bug Report](https://github.com/nirholas/LooK/issues/new?template=bug_report.md)

Include:
- LooK version (`look --version`)
- Node.js version (`node --version`)
- OS and version
- Full error message
- Steps to reproduce

### 4. Request a Feature

Have an idea? We'd love to hear it:
[Feature Request](https://github.com/nirholas/LooK/issues/new?template=feature_request.md)

## Response Times

- **Bug reports**: Usually within 48 hours
- **Feature requests**: Reviewed weekly
- **Questions**: Community + maintainers respond

## Commercial Support

For enterprise support, custom development, or consulting:
- Email: support@look-demo.dev
- Priority response times
- Custom feature development
- Integration assistance
