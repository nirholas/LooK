# API Integration

Integrate LooK into your applications, CI/CD pipelines, and automated workflows.

## Node.js SDK

### Installation

```bash
npm install look-demo
```

### Basic Usage

```javascript
import { generateDemo, generateDemoV2 } from 'look-demo';

// Generate a demo video
const result = await generateDemo('https://myapp.com', {
  output: './demo.mp4',
  duration: 30,
  voice: 'nova',
  style: 'professional'
});

console.log(`Video saved to: ${result.output}`);
console.log(`Script: ${result.script}`);
```

### Advanced Options

```javascript
const result = await generateDemo('https://myapp.com', {
  // Output
  output: './output/demo.mp4',
  duration: 30,
  width: 1920,
  height: 1080,
  
  // AI Settings
  voice: 'nova',
  style: 'professional',
  skipVoice: false,
  skipAnalysis: false,
  
  // Zoom
  zoomMode: 'smart',
  zoomIntensity: 0.5,
  maxZoom: 1.8,
  
  // Cursor
  cursorStyle: 'default',
  cursorSize: 32,
  cursorColor: '#000000',
  cursorGlow: false,
  
  // Click Effects
  clickEffect: 'ripple',
  clickColor: '#3B82F6',
  clickSize: 60,
  
  // Export
  preset: 'youtube'
});
```

### V2 Engine (Recommended)

```javascript
import { generateDemoV2 } from 'look-demo';

const result = await generateDemoV2('https://myapp.com', {
  output: './demo.mp4',
  maxPages: 5,  // Multi-page support
  explorationStrategy: 'ai'
});
```

### Mobile Demos

```javascript
import { generateMobileDemo } from 'look-demo';

const result = await generateMobileDemo('./app.apk', {
  platform: 'android',
  device: 'Pixel 7',
  duration: 25,
  touchIndicator: 'circle',
  deviceFrame: true
});
```

## REST API

When running `look serve`, a REST API is available.

### Base URL

```
http://localhost:3847/api
```

### Authentication

Include API keys in headers:

```http
X-OpenAI-Key: sk-your-key
X-Groq-Key: gsk-your-key (optional)
```

### Endpoints

#### Health Check

```http
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "version": "2.0.0",
  "services": {
    "openai": "connected",
    "groq": "not_configured",
    "playwright": "ready"
  }
}
```

#### Analyze URL

```http
POST /api/analyze
Content-Type: application/json

{
  "url": "https://example.com",
  "duration": 25,
  "style": "professional"
}
```

#### Start Recording

```http
POST /api/record
Content-Type: application/json

{
  "projectId": "uuid",
  "options": {
    "width": 1920,
    "height": 1080
  }
}
```

#### Render Video

```http
POST /api/render
Content-Type: application/json

{
  "projectId": "uuid",
  "preset": "youtube"
}
```

#### Download Video

```http
GET /api/download/:projectId
```

### WebSocket Events

Connect for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3847');

ws.send(JSON.stringify({
  action: 'subscribe',
  payload: { projectId: 'uuid' }
}));

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'status') {
    console.log(`Stage: ${msg.data.stage}, Progress: ${msg.data.progress}%`);
  }
};
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Generate Demo

on:
  push:
    branches: [main]

jobs:
  demo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install FFmpeg
        run: sudo apt-get install -y ffmpeg
      
      - name: Install LooK
        run: npm install -g look-demo
      
      - name: Generate Demo
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          look demo https://myapp.com \
            -o demo.mp4 \
            -d 30 \
            -p youtube
      
      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: demo-video
          path: demo.mp4
```

### GitLab CI

```yaml
generate-demo:
  image: node:18
  before_script:
    - apt-get update && apt-get install -y ffmpeg
    - npm install -g look-demo
  script:
    - look demo https://myapp.com -o demo.mp4
  artifacts:
    paths:
      - demo.mp4
  variables:
    OPENAI_API_KEY: $OPENAI_API_KEY
```

### Docker

```dockerfile
FROM node:18-slim

RUN apt-get update && apt-get install -y ffmpeg
RUN npm install -g look-demo
RUN npx playwright install chromium --with-deps

WORKDIR /app

CMD ["look", "serve"]
```

```bash
docker build -t look-demo .
docker run -p 3847:3847 -e OPENAI_API_KEY=sk-... look-demo
```

## Error Handling

```javascript
import { generateDemo } from 'look-demo';

try {
  const result = await generateDemo(url, options);
} catch (error) {
  if (error.code === 'OPENAI_ERROR') {
    console.error('API key issue:', error.message);
  } else if (error.code === 'FFMPEG_ERROR') {
    console.error('FFmpeg issue:', error.message);
  } else if (error.code === 'TIMEOUT') {
    console.error('Recording timed out');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Rate Limiting

When using the REST API in production:

- Implement request queuing
- Add retry logic with exponential backoff
- Monitor OpenAI API usage

```javascript
import pRetry from 'p-retry';

const result = await pRetry(
  () => generateDemo(url, options),
  {
    retries: 3,
    onFailedAttempt: error => {
      console.log(`Attempt ${error.attemptNumber} failed`);
    }
  }
);
```
