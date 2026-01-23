#!/bin/bash
# =============================================================================
# LooK Basic Demo Examples
# =============================================================================
# Simple examples to get started with LooK
# 
# Usage: chmod +x demo.sh && ./demo.sh

set -e

echo "🎬 LooK Basic Demo Examples"
echo "============================"
echo ""

# -----------------------------------------------------------------------------
# Example 1: Quickest way to create a demo
# -----------------------------------------------------------------------------
echo "Example 1: Quick Demo"
echo "---------------------"
echo "Command: look quick https://stripe.com"
echo ""
# Uncomment to run:
# look quick https://stripe.com

# -----------------------------------------------------------------------------
# Example 2: Custom output file
# -----------------------------------------------------------------------------
echo "Example 2: Custom Output"
echo "------------------------"
echo "Command: look demo https://github.com -o github-demo.mp4"
echo ""
# Uncomment to run:
# look demo https://github.com -o github-demo.mp4

# -----------------------------------------------------------------------------
# Example 3: Shorter duration for social media
# -----------------------------------------------------------------------------
echo "Example 3: Short Clip (15 seconds)"
echo "----------------------------------"
echo "Command: look demo https://vercel.com -d 15 -p twitter"
echo ""
# Uncomment to run:
# look demo https://vercel.com -d 15 -p twitter

# -----------------------------------------------------------------------------
# Example 4: Different voice and style
# -----------------------------------------------------------------------------
echo "Example 4: Energetic Style"
echo "--------------------------"
echo "Command: look demo https://linear.app -v shimmer -s energetic"
echo ""
# Uncomment to run:
# look demo https://linear.app -v shimmer -s energetic

# -----------------------------------------------------------------------------
# Example 5: Preview script without recording (dry run)
# -----------------------------------------------------------------------------
echo "Example 5: Preview Only (Dry Run)"
echo "----------------------------------"
echo "Command: look demo https://notion.so --dry-run"
echo ""
# Uncomment to run:
# look demo https://notion.so --dry-run

# -----------------------------------------------------------------------------
# Example 6: Silent demo (no voiceover)
# -----------------------------------------------------------------------------
echo "Example 6: Silent Demo"
echo "----------------------"
echo "Command: look demo https://figma.com --skip-voice"
echo ""
# Uncomment to run:
# look demo https://figma.com --skip-voice

# -----------------------------------------------------------------------------
# Example 7: Custom cursor styling
# -----------------------------------------------------------------------------
echo "Example 7: Custom Cursor"
echo "------------------------"
echo "Command: look demo https://tailwindcss.com --cursor dot --cursor-size 40 --cursor-glow"
echo ""
# Uncomment to run:
# look demo https://tailwindcss.com --cursor dot --cursor-size 40 --cursor-glow

# -----------------------------------------------------------------------------
# Example 8: Maximum follow-cam effect
# -----------------------------------------------------------------------------
echo "Example 8: Follow-Cam Mode"
echo "--------------------------"
echo "Command: look demo https://supabase.com --zoom-mode follow --zoom-intensity 0.8"
echo ""
# Uncomment to run:
# look demo https://supabase.com --zoom-mode follow --zoom-intensity 0.8

# -----------------------------------------------------------------------------
# Example 9: Minimal, professional look
# -----------------------------------------------------------------------------
echo "Example 9: Minimal Style"
echo "------------------------"
echo "Command: look demo https://stripe.com --zoom-mode basic --max-zoom 1.3 --click-effect ring"
echo ""
# Uncomment to run:
# look demo https://stripe.com --zoom-mode basic --max-zoom 1.3 --click-effect ring

# -----------------------------------------------------------------------------
# Example 10: Full control
# -----------------------------------------------------------------------------
echo "Example 10: Full Control"
echo "------------------------"
cat << 'EOF'
Command:
look demo https://myapp.com \
  -o my-product-demo.mp4 \
  -d 30 \
  -v nova \
  -s professional \
  -p youtube \
  --zoom-mode smart \
  --max-zoom 1.6 \
  --cursor arrow-modern \
  --cursor-preset github \
  --click-effect ripple \
  --click-color "#3B82F6"
EOF
echo ""

echo "============================"
echo "✅ Examples complete!"
echo ""
echo "To run an example, uncomment the 'look' command in this script"
echo "or copy/paste directly into your terminal."
echo ""
echo "See docs/CLI_REFERENCE.md for all available options."
