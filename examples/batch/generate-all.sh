#!/bin/bash
# =============================================================================
# LooK Batch Processing Example
# =============================================================================
# Generate multiple demo videos in sequence
#
# Usage: chmod +x generate-all.sh && ./generate-all.sh

set -e

echo "🎬 LooK Batch Demo Generator"
echo "============================"
echo ""

# Configuration
OUTPUT_DIR="./output"
VOICE="nova"
STYLE="professional"
DURATION=25

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Define sites to demo
declare -A SITES=(
  ["stripe"]="https://stripe.com"
  ["github"]="https://github.com"
  ["vercel"]="https://vercel.com"
  ["linear"]="https://linear.app"
  ["notion"]="https://notion.so"
)

# Counter for progress
TOTAL=${#SITES[@]}
CURRENT=0
FAILED=0

echo "Processing $TOTAL sites..."
echo ""

# Process each site
for name in "${!SITES[@]}"; do
  url="${SITES[$name]}"
  output="$OUTPUT_DIR/${name}-demo.mp4"
  CURRENT=$((CURRENT + 1))
  
  echo "[$CURRENT/$TOTAL] Processing $name..."
  echo "  URL: $url"
  echo "  Output: $output"
  
  # Generate demo
  if look demo "$url" \
    -o "$output" \
    -d "$DURATION" \
    -v "$VOICE" \
    -s "$STYLE" \
    --reliable \
    2>&1; then
    echo "  ✅ Success: $output"
  else
    echo "  ❌ Failed: $name"
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
done

# Summary
echo "============================"
echo "📊 Batch Processing Complete"
echo "============================"
echo "  Total: $TOTAL"
echo "  Success: $((TOTAL - FAILED))"
echo "  Failed: $FAILED"
echo "  Output: $OUTPUT_DIR/"
echo ""

# List generated files
echo "Generated files:"
ls -lh "$OUTPUT_DIR"/*.mp4 2>/dev/null || echo "  (no files generated)"
echo ""

# Exit with error if any failed
if [ $FAILED -gt 0 ]; then
  exit 1
fi
