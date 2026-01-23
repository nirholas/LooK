# LooK Basic Examples

Simple examples to get started with LooK.

## Quick Start

```bash
# Make the script executable
chmod +x demo.sh

# Run to see all examples
./demo.sh
```

## Examples Included

1. **Quick Demo** - Fastest way to create a demo
2. **Custom Output** - Specify output file path
3. **Short Clip** - 15-second Twitter-ready video
4. **Energetic Style** - Different voice and tone
5. **Dry Run** - Preview script before recording
6. **Silent Demo** - No voiceover
7. **Custom Cursor** - Styled cursor with glow
8. **Follow-Cam** - Dynamic camera tracking
9. **Minimal Style** - Clean, professional look
10. **Full Control** - All options combined

## One-Liners

### Simplest Demo
```bash
look quick https://your-site.com
```

### Custom Duration
```bash
look demo https://your-site.com -d 30 -o demo.mp4
```

### Social Media Ready
```bash
# Twitter
look demo https://your-site.com -d 15 -p twitter

# Instagram
look demo https://your-site.com -d 30 -p instagram

# TikTok
look demo https://your-site.com -d 15 -p tiktok
```

### Different Styles
```bash
# Professional (default)
look demo https://your-site.com -s professional

# Casual
look demo https://your-site.com -s casual -v echo

# Energetic
look demo https://your-site.com -s energetic -v shimmer
```

## Next Steps

See the other examples in this directory:
- [saas-landing/](../saas-landing/) - SaaS product configuration
- [mobile-app/](../mobile-app/) - Mobile demo with actions
- [batch/](../batch/) - Process multiple demos
- [custom-cursor/](../custom-cursor/) - Programmatic cursor control
