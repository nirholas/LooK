# E-commerce Demo Example

Example configuration for creating e-commerce product demo videos.

## Usage

### CLI

```bash
look demo https://your-store.com \
  -o ecommerce-demo.mp4 \
  -d 45 \
  -v nova \
  -s casual \
  --cursor pointer \
  --cursor-preset dark \
  --click-effect ripple \
  --click-color "#10B981" \
  --zoom-mode smart \
  --max-zoom 1.8
```

### Programmatic

```javascript
import { generateDemoV2 } from 'look-demo';

await generateDemoV2('https://your-store.com', {
  output: './ecommerce-demo.mp4',
  duration: 45,
  voice: 'nova',
  style: 'casual',
  cursorStyle: 'pointer',
  cursorPreset: 'dark',
  clickEffect: 'ripple',
  clickEffectColor: '#10B981',
  zoomMode: 'smart',
  maxZoom: 1.8
});
```

## Key Features to Showcase

1. **Homepage Hero** - First impression
2. **Product Grid** - Browse experience
3. **Product Details** - Images, description, pricing
4. **Add to Cart** - Core conversion action
5. **Cart** - Checkout preview

## Tips

- Use pointer cursor for clickable elements
- Green color suggests purchase/success
- Casual voice for consumer-friendly tone
- Show the complete purchase journey
