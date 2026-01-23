#!/bin/bash
# =============================================================================
# LooK Social Media Export Script
# =============================================================================
# Generate demos optimized for different social platforms from a single URL
#
# Usage: ./social-media-export.sh https://mysite.com "my-product"

set -e

URL="${1:?Please provide a URL}"
NAME="${2:-demo}"
OUTPUT_DIR="./social-exports"

echo "🎬 LooK Social Media Export"
echo "============================"
echo "URL: $URL"
echo "Name: $NAME"
echo ""

mkdir -p "$OUTPUT_DIR"

# Platform configurations
declare -A PLATFORMS
PLATFORMS["youtube"]="30:youtube:professional:nova"
PLATFORMS["twitter"]="15:twitter:energetic:shimmer"
PLATFORMS["instagram-feed"]="30:instagram:casual:nova"
PLATFORMS["instagram-reels"]="15:tiktok:energetic:shimmer"
PLATFORMS["tiktok"]="15:tiktok:energetic:shimmer"
PLATFORMS["linkedin"]="45:youtube:professional:onyx"

for platform in "${!PLATFORMS[@]}"; do
  IFS=':' read -r duration preset style voice <<< "${PLATFORMS[$platform]}"
  output="$OUTPUT_DIR/${NAME}-${platform}.mp4"
  
  echo "📹 Generating $platform version..."
  echo "   Duration: ${duration}s | Style: $style | Voice: $voice"
  
  look demo "$URL" \
    -o "$output" \
    -d "$duration" \
    -p "$preset" \
    -s "$style" \
    -v "$voice" \
    --reliable \
    2>&1 | sed 's/^/   /'
  
  echo "   ✅ Saved: $output"
  echo ""
done

echo "============================"
echo "✅ All platforms exported!"
echo ""
echo "Files generated:"
ls -lh "$OUTPUT_DIR"/${NAME}-*.mp4

echo ""
echo "Upload tips:"
echo "  YouTube:    Upload as-is, add chapters in description"
echo "  Twitter:    Keep under 2:20 for better engagement"
echo "  Instagram:  Feed (square), Reels (vertical)"
echo "  TikTok:     Add trending audio for better reach"
echo "  LinkedIn:   Add text overlay with key points"
