# Batch Processing Examples

Generate multiple demo videos efficiently.

## Files

- `generate-all.sh` - Process multiple URLs in sequence
- `multi-export.sh` - Export one demo for multiple platforms

## Usage

### Generate Multiple Demos

Edit `generate-all.sh` to add your sites:

```bash
declare -A SITES=(
  ["my-product"]="https://myproduct.com"
  ["landing-page"]="https://landing.myproduct.com"
  ["docs"]="https://docs.myproduct.com"
)
```

Run:
```bash
chmod +x generate-all.sh
./generate-all.sh
```

### Multi-Platform Export

Generate one demo optimized for multiple social platforms:

```bash
chmod +x multi-export.sh
./multi-export.sh https://myproduct.com my-product
```

This creates:
- `my-product-youtube.mp4` (30s, 1920x1080)
- `my-product-twitter.mp4` (15s, 1280x720)
- `my-product-instagram.mp4` (30s, 1080x1080)
- `my-product-tiktok.mp4` (15s, 1080x1920)

## Programmatic Batch Processing

```javascript
import { generateDemoV2 } from 'look-demo';

const sites = [
  { name: 'homepage', url: 'https://myapp.com' },
  { name: 'features', url: 'https://myapp.com/features' },
  { name: 'pricing', url: 'https://myapp.com/pricing' },
];

for (const site of sites) {
  console.log(`Processing ${site.name}...`);
  
  await generateDemoV2(site.url, {
    output: `./output/${site.name}-demo.mp4`,
    duration: 25,
    voice: 'nova',
    style: 'professional'
  });
  
  console.log(`✓ ${site.name} complete`);
}
```

## Parallel Processing

For faster processing, run demos in parallel (be mindful of system resources):

```javascript
import { generateDemoV2 } from 'look-demo';

const sites = [/* ... */];

// Process 2 at a time
const batchSize = 2;
for (let i = 0; i < sites.length; i += batchSize) {
  const batch = sites.slice(i, i + batchSize);
  await Promise.all(batch.map(site => 
    generateDemoV2(site.url, {
      output: `./output/${site.name}.mp4`,
      duration: 25
    })
  ));
}
```

## Tips

1. **Use `--reliable`** - More stable for batch processing
2. **Check disk space** - Videos can be large
3. **Handle errors** - Wrap in try/catch for resilience
4. **Log progress** - Track what succeeded/failed
5. **Rate limiting** - Don't overload the OpenAI API
