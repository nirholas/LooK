# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in LooK, please report it by emailing security@nichbot.dev (or open a private security advisory on GitHub).

**Please do not report security vulnerabilities through public GitHub issues.**

### What to include

- Type of issue (e.g., command injection, path traversal, API key exposure)
- Full paths of source file(s) related to the issue
- Location of affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

## Security Best Practices

When using LooK:

1. **API Keys**: Never commit your `OPENAI_API_KEY` to version control
2. **Output Files**: Demo videos may contain sensitive UI data - review before sharing
3. **URLs**: Be cautious when recording URLs that require authentication
4. **Temp Files**: LooK cleans up temp files automatically, but verify in `/tmp`
