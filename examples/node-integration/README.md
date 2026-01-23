# Node.js Integration Examples

Complete examples of using LooK programmatically in Node.js applications.

## Usage

```bash
cd examples/node-integration

# Run specific example
node examples.js basic
node examples.js custom
node examples.js batch
node examples.js multiplatform
node examples.js projects
node examples.js silent
node examples.js dryrun
node examples.js errors
```

## Available Examples

### 1. Basic Demo
Simplest usage with minimal options.

```javascript
import { generateDemoV2 } from 'look-demo';

await generateDemoV2('https://stripe.com', {
  output: './demo.mp4',
  duration: 25
});
```

### 2. Fully Customized
All options configured.

### 3. Batch Processing
Process multiple URLs in sequence.

### 4. Multi-Platform Export
Generate for YouTube, Twitter, Instagram, TikTok.

### 5. Project Management
Create, load, update, and list projects.

### 6. Silent Demo
Video without AI voice (faster, no API costs).

### 7. Dry Run
Preview AI analysis without generating video.

### 8. Error Handling
Proper error handling patterns.

## Integration Patterns

### Express.js API

```javascript
import express from 'express';
import { generateDemoV2 } from 'look-demo';

const app = express();
app.use(express.json());

app.post('/api/demos', async (req, res) => {
  const { url, options } = req.body;
  
  try {
    const result = await generateDemoV2(url, options);
    res.json({ success: true, output: result.output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Queue Processing

```javascript
import { Queue } from 'bullmq';
import { generateDemoV2 } from 'look-demo';

const demoQueue = new Queue('demos');

// Add job
await demoQueue.add('generate', {
  url: 'https://myapp.com',
  output: './output/demo.mp4'
});

// Process jobs
new Worker('demos', async (job) => {
  await generateDemoV2(job.data.url, job.data);
});
```

### Webhook Callback

```javascript
import { generateDemoV2 } from 'look-demo';

async function generateWithCallback(url, webhookUrl) {
  try {
    const result = await generateDemoV2(url, { duration: 25 });
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'complete',
        output: result.output
      })
    });
  } catch (error) {
    await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({
        status: 'failed',
        error: error.message
      })
    });
  }
}
```
