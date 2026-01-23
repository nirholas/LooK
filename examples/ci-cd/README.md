# CI/CD Integration Examples

Automate demo video generation in your CI/CD pipeline.

## GitHub Actions

### Generate Demo on Pull Request

When a PR is opened, automatically generate a demo video of the preview deployment.

```yaml
# .github/workflows/demo-on-pr.yml
# See github-actions-pr-demo.yml for full example
```

**Setup:**
1. Add `OPENAI_API_KEY` to repository secrets
2. Copy the workflow file to `.github/workflows/`
3. Adjust the preview URL pattern

### Scheduled Demo Generation

Generate fresh demos weekly/daily for marketing.

```yaml
# .github/workflows/scheduled-demos.yml
# See github-actions-scheduled.yml for full example
```

**Features:**
- Runs on schedule (cron)
- Matrix strategy for multiple pages
- Uploads to S3
- Slack notification

## GitLab CI

```yaml
# .gitlab-ci.yml
generate-demo:
  image: node:18
  
  before_script:
    - apt-get update && apt-get install -y ffmpeg
    - npm ci
    - npx playwright install chromium
  
  script:
    - npx look-demo demo "$CI_ENVIRONMENT_URL" 
        -o ./demo.mp4 
        -d 25 
        --reliable
  
  artifacts:
    paths:
      - demo.mp4
    expire_in: 1 week
  
  only:
    - merge_requests
  
  variables:
    OPENAI_API_KEY: $OPENAI_API_KEY
```

## CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  generate-demo:
    docker:
      - image: cimg/node:18.0-browsers
    
    steps:
      - checkout
      
      - run:
          name: Install FFmpeg
          command: sudo apt-get update && sudo apt-get install -y ffmpeg
      
      - restore_cache:
          keys:
            - npm-deps-{{ checksum "package-lock.json" }}
      
      - run:
          name: Install dependencies
          command: npm ci
      
      - save_cache:
          paths:
            - node_modules
          key: npm-deps-{{ checksum "package-lock.json" }}
      
      - run:
          name: Install Playwright
          command: npx playwright install chromium
      
      - run:
          name: Generate demo
          command: |
            npx look-demo demo "https://myapp.com" \
              -o ./demo.mp4 \
              -d 25 \
              --reliable
      
      - store_artifacts:
          path: ./demo.mp4
          destination: demo-video

workflows:
  demo-workflow:
    jobs:
      - generate-demo
```

## Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent {
        docker {
            image 'node:18'
        }
    }
    
    environment {
        OPENAI_API_KEY = credentials('openai-api-key')
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'apt-get update && apt-get install -y ffmpeg'
                sh 'npm ci'
                sh 'npx playwright install chromium'
            }
        }
        
        stage('Generate Demo') {
            steps {
                sh '''
                    npx look-demo demo "https://myapp.com" \
                        -o ./demo.mp4 \
                        -d 25 \
                        --reliable
                '''
            }
        }
    }
    
    post {
        success {
            archiveArtifacts artifacts: 'demo.mp4'
        }
    }
}
```

## Docker

### Dockerfile

```dockerfile
FROM node:18-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Install LooK
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

ENTRYPOINT ["npx", "look-demo"]
```

### Usage

```bash
# Build
docker build -t look-demo .

# Run
docker run --rm \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -v $(pwd)/output:/app/output \
  look-demo demo https://myapp.com -o /app/output/demo.mp4
```

## Webhook Integration

Trigger demo generation via webhook:

```javascript
// webhook-handler.js
import express from 'express';
import { generateDemoV2 } from 'look-demo';

const app = express();
app.use(express.json());

app.post('/webhook/generate-demo', async (req, res) => {
  const { url, webhook_url } = req.body;
  
  // Start generation in background
  res.json({ status: 'started' });
  
  try {
    const result = await generateDemoV2(url, {
      output: `./demos/${Date.now()}.mp4`,
      duration: 25
    });
    
    // Notify completion via webhook
    await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'complete',
        video_url: result.output
      })
    });
  } catch (error) {
    await fetch(webhook_url, {
      method: 'POST',
      body: JSON.stringify({ status: 'failed', error: error.message })
    });
  }
});

app.listen(3000);
```

## Best Practices

1. **Use `--reliable`** - More stable in CI environments
2. **Skip voice in previews** - Save API costs for PR demos
3. **Cache dependencies** - Speed up builds
4. **Set timeouts** - Prevent hanging jobs
5. **Use artifacts** - Store generated videos
6. **Notify on completion** - Slack, email, or webhook
7. **Matrix builds** - Generate multiple demos in parallel
