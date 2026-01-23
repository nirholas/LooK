#!/bin/bash
# =============================================================================
# LooK Multi-Platform Export
# =============================================================================
# Generate one demo and export for multiple platforms
#
# Usage: chmod +x multi-export.sh && ./multi-export.sh https://mysite.com

set -e

URL="${1:-https://stripe.com}"
BASE_NAME="${2:-demo}"
OUTPUT_DIR="./output"

echo "🎬 LooK Multi-Platform Export"
echo "=============================="
echo ""
echo "URL: $URL"
echo "Base name: $BASE_NAME"
echo ""

mkdir -p "$OUTPUT_DIR"

# Define platform presets
PLATFORMS=("youtube" "twitter" "instagram" "tiktok")
DURATIONS=(30 15 30 15)

for i in "${!PLATFORMS[@]}"; do
  platform="${PLATFORMS[$i]}"
  duration="${DURATIONS[$i]}"
  output="$OUTPUT_DIR/${BASE_NAME}-${platform}.mp4"
  
  echo "[$((i+1))/${#PLATFORMS[@]}] Generating $platform version..."
  echo "  Duration: ${duration}s"
  echo "  Output: $output"
  
  look demo "$URL" \
    -o "$output" \
    -d "$duration" \
    -p "$platform" \
    --reliable
  
  echo "  ✅ Done"
  echo ""
done

echo "=============================="
echo "✅ All platforms exported!"
echo ""
echo "Generated files:"
ls -lh "$OUTPUT_DIR"/${BASE_NAME}-*.mp4
