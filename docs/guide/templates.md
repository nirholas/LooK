# Templates

LooK provides pre-built templates to help you create demos faster for common use cases.

## Available Templates

### SaaS Landing Page

<div class="grid" markdown>

:material-rocket-launch:{ .lg } **Best For:** Product pages, feature tours, conversion-focused demos

**Optimized Settings:**

- Auto-scroll through hero and features
- CTA button highlighting
- Pricing section zoom
- 25-30 second duration

</div>

```bash
# CLI equivalent
look demo https://your-saas.com \
  --zoom-mode smart \
  --click-effect ripple \
  -d 30
```

---

### E-commerce Store

<div class="grid" markdown>

:material-shopping:{ .lg } **Best For:** Product catalogs, cart flows, checkout processes

**Optimized Settings:**

- Product card interactions
- Add-to-cart animations
- Filter and search demos
- 30-45 second duration

</div>

```bash
look demo https://your-store.com \
  --zoom-mode follow \
  --click-effect pulse \
  -d 45
```

---

### Portfolio / Agency

<div class="grid" markdown>

:material-palette:{ .lg } **Best For:** Creative work, case studies, team showcases

**Optimized Settings:**

- Gallery navigation
- Project detail views
- Smooth scrolling
- 20-30 second duration

</div>

---

### Documentation Site

<div class="grid" markdown>

:material-book-open-page-variant:{ .lg } **Best For:** API docs, developer guides, tutorials

**Optimized Settings:**

- Sidebar navigation
- Code block highlighting
- Section jumping
- 30-60 second duration

</div>

---

### Mobile App Demo

<div class="grid" markdown>

:material-cellphone:{ .lg } **Best For:** iOS/Android app showcases with device frames

**Optimized Settings:**

- Device frame overlay
- Touch indicators
- Swipe trail effects
- Portrait orientation

</div>

```bash
look mobile ./app.apk \
  --device-frame \
  --touch-indicator circle \
  --platform android
```

---

### Dashboard / Analytics

<div class="grid" markdown>

:material-chart-bar:{ .lg } **Best For:** Data visualizations, charts, admin interfaces

**Optimized Settings:**

- Chart zoom focus
- Data point highlighting
- Tab navigation
- 45-60 second duration

</div>

## Using Templates in the Web Editor

1. Open the web editor: `look serve`
2. Click **Templates** in the header navigation
3. Select a template that matches your use case
4. The template settings are applied automatically
5. Enter your URL and click **Generate Demo**

## Custom Templates

You can create custom templates by saving configuration files:

```json
{
  "name": "My Custom Template",
  "description": "Optimized for my specific use case",
  "settings": {
    "duration": 30,
    "voice": "nova",
    "style": "professional",
    "zoomMode": "smart",
    "maxZoom": 1.8,
    "cursorStyle": "default",
    "clickEffect": "ripple"
  }
}
```

Save to `~/.look-demo/templates/my-template.json`.

## Template Recommendations

| Your Content | Recommended Template | Duration |
|--------------|---------------------|----------|
| Product landing page | SaaS Landing | 25-30s |
| Online store | E-commerce | 30-45s |
| Developer docs | Documentation | 30-60s |
| Design portfolio | Portfolio | 20-30s |
| Mobile app | Mobile App | 15-25s |
| Admin dashboard | Dashboard | 45-60s |

## Platform-Specific Templates

### YouTube Demo

```bash
look demo https://your-app.com \
  -p youtube \
  -d 60 \
  --zoom-mode smart
```

### Twitter/X Clip

```bash
look demo https://your-app.com \
  -p twitter \
  -d 15 \
  -s energetic
```

### Instagram Reel

```bash
look demo https://your-app.com \
  -p instagram \
  -d 30 \
  --zoom-intensity 0.7
```

### TikTok Video

```bash
look demo https://your-app.com \
  -p tiktok \
  -d 30 \
  -s energetic
```
