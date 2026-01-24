# Live Recording & Real-Time Preview

L👀K now supports **live recording with real-time preview**, allowing you to see exactly what's being recorded as it happens. You can pause, resume, and even take manual control of the recording at any time.

## Features

- 📺 **Real-time Preview**: Watch the recording as it happens via WebSocket frame streaming
- ⏸️ **Pause/Resume**: Pause the recording at any moment to make adjustments
- 🖱️ **Manual Control**: Take over cursor control to guide the demo yourself
- 🎯 **Click Anywhere**: In manual mode, click on the preview to interact with the page
- 📡 **WebSocket Streaming**: Low-latency frame delivery (~10 fps preview)
- 🔄 **Live Status**: Real-time updates on recording state and elapsed time

## Quick Start

### Using the CLI

```bash
# Start a live recording session
npx look live https://example.com

# With options
npx look live https://example.com --duration 30 --visible
```

### Using the API

```javascript
import { API } from './api.js';

// Start live recording
const { sessionId, projectId } = await API.startLiveRecording('https://example.com', {
  duration: 30,        // seconds
  headless: false,     // show browser window (default)
  previewFps: 10,      // preview frame rate
  autoDemo: true       // run automatic demo
});

// Pause recording
await API.pauseLiveRecording(sessionId);

// Resume recording
await API.resumeLiveRecording(sessionId);

// Enable manual control
await API.enableManualMode(sessionId);

// Perform manual actions
await API.liveAction(sessionId, { type: 'move', x: 500, y: 300 });
await API.liveAction(sessionId, { type: 'click' });
await API.liveAction(sessionId, { type: 'scroll', amount: 500 });

// Stop recording
await API.stopLiveRecording(sessionId);
```

### Using WebSocket (Low Latency)

For real-time control, use WebSocket commands:

```javascript
const ws = new WebSocket('ws://localhost:3847');

// Subscribe to live frames
ws.send(JSON.stringify({
  action: 'subscribe-live',
  payload: { sessionId }
}));

// Listen for frames
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'live-frame') {
    // msg.data contains: { image, timestamp, width, height, cursor }
    renderFrame(msg.data);
  }
  
  if (msg.type === 'live-state') {
    // msg.data contains: { state, elapsed }
    updateUI(msg.data);
  }
};

// Control via WebSocket
ws.send(JSON.stringify({ action: 'live-pause', payload: { sessionId } }));
ws.send(JSON.stringify({ action: 'live-resume', payload: { sessionId } }));
ws.send(JSON.stringify({ action: 'live-stop', payload: { sessionId } }));

// Manual actions via WebSocket
ws.send(JSON.stringify({
  action: 'live-action',
  payload: {
    sessionId,
    type: 'click',
    x: 500,
    y: 300
  }
}));
```

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/live/start` | Start a new live recording session |
| POST | `/api/live/:sessionId/pause` | Pause the recording |
| POST | `/api/live/:sessionId/resume` | Resume a paused recording |
| POST | `/api/live/:sessionId/stop` | Stop and finalize the recording |
| POST | `/api/live/:sessionId/manual` | Enable manual control mode |
| POST | `/api/live/:sessionId/action` | Perform a manual action |
| GET | `/api/live/:sessionId/status` | Get current session status |
| GET | `/api/live/sessions` | List all active sessions |

### WebSocket Actions

| Action | Payload | Description |
|--------|---------|-------------|
| `subscribe-live` | `{ sessionId }` | Subscribe to live frame stream |
| `unsubscribe-live` | `{ sessionId }` | Unsubscribe from frames |
| `live-pause` | `{ sessionId }` | Pause recording |
| `live-resume` | `{ sessionId }` | Resume recording |
| `live-stop` | `{ sessionId }` | Stop recording |
| `live-action` | `{ sessionId, type, ... }` | Perform manual action |

### Action Types

| Type | Parameters | Description |
|------|------------|-------------|
| `move` | `x, y, duration` | Move cursor to position |
| `click` | `x?, y?` | Click at position (or current) |
| `scroll` | `amount` | Scroll page (positive = down) |
| `type` | `text` | Type text |

### WebSocket Events

| Event | Data | Description |
|-------|------|-------------|
| `live-frame` | `{ image, timestamp, width, height, cursor }` | Preview frame (base64 JPEG) |
| `live-state` | `{ state, elapsed }` | Recording state change |
| `live-click` | `{ x, y, timestamp }` | Click detected |
| `live-complete` | `{ projectId, duration }` | Recording completed |
| `live-subscribed` | `{ sessionId, state, elapsed }` | Subscription confirmed |

## Using the LivePreview Component

The UI includes a ready-to-use LivePreview component:

```javascript
import { LivePreview } from './live-preview.js';

// Create preview
const preview = new LivePreview({
  container: document.getElementById('preview-container'),
  ws: websocketConnection,
  onStateChange: (state) => console.log('State:', state),
  onClick: (coords) => console.log('Clicked:', coords)
});

// Subscribe to a session
preview.subscribe(sessionId);

// The preview will automatically:
// - Display live frames
// - Show pause/resume/stop controls
// - Enable manual mode with click-through

// Cleanup
preview.destroy();
```

## Recording States

```
idle -> recording <-> paused -> stopped -> idle
            |                      ^
            +----------------------+
```

- **idle**: No active recording
- **recording**: Actively capturing frames
- **paused**: Recording suspended, can resume
- **stopped**: Recording finalized, video saved

## Best Practices

1. **Preview FPS**: Default 10 fps is good for monitoring. Higher fps uses more bandwidth.

2. **Visible Browser**: Set `headless: false` (default) to see the actual browser window alongside the preview.

3. **Pause for Adjustments**: If something unexpected happens, pause immediately, take manual control, and fix it.

4. **Manual Takeover**: Use manual mode when you want precise control over what's shown in the demo.

5. **Early Stop**: You can stop early if you've captured everything you need.

## Example: Interactive Demo Recording

```javascript
import { API } from './api.js';
import { LivePreview } from './live-preview.js';

async function interactiveDemo(url) {
  // Connect WebSocket
  const ws = new WebSocket('ws://localhost:3847');
  await new Promise(r => ws.onopen = r);
  
  // Setup preview
  const preview = new LivePreview({
    container: document.getElementById('live'),
    ws,
    onStateChange: ({ state, projectId }) => {
      if (state === 'complete') {
        console.log('Recording saved to project:', projectId);
        // Navigate to editor
        window.location.href = `/editor/${projectId}`;
      }
    }
  });
  
  // Start recording
  const { sessionId } = await API.startLiveRecording(url, {
    duration: 25,
    autoDemo: true
  });
  
  // Subscribe to frames
  preview.subscribe(sessionId);
  
  // Preview will show controls for pause/resume/stop/manual
}
```

## Troubleshooting

### No frames appearing
- Check that WebSocket is connected
- Verify sessionId matches
- Ensure browser isn't blocked by firewall

### Low frame rate
- Reduce `previewFps` option
- Check network bandwidth
- Use wired connection if possible

### Manual mode not working
- Call `enableManualMode(sessionId)` first
- Check that recording isn't paused
- Verify session is still active

## Web Editor Integration

The web editor provides a visual interface for live recording:

### Starting a Live Recording

1. Enter your URL in the input field
2. Click **Live Record** (instead of Generate Demo)
3. The live preview panel opens automatically

### Live Preview Panel

The live preview panel shows:
- **Real-time video feed** - See exactly what's being recorded
- **Recording status** - Current state (Recording, Paused, etc.)
- **Elapsed time** - How long you've been recording
- **Control buttons** - Pause, Resume, Stop, Take Screenshot

### Recording Controls

| Button | Action | Keyboard |
|--------|--------|----------|
| ⏸️ Pause | Pause recording | `P` |
| ▶️ Resume | Resume after pause | `P` |
| ⏹️ Stop | End recording | `S` |
| 📷 Screenshot | Capture current frame | `C` |
| 🖱️ Manual | Take manual control | `M` |

### Manual Control Mode

When you enable manual control:
1. Click on the preview to interact with the page
2. Your mouse movements are captured
3. Clicks and scrolls are recorded
4. Press `M` again to return to auto mode

### After Recording

When you stop the recording:
1. The video is automatically saved to the project
2. The editor timeline loads your recording
3. You can trim, add markers, and edit the voiceover script
4. Export when ready

### Tips for Live Recording

1. **Plan your demo** - Know what you want to show before starting
2. **Use pause wisely** - Pause to collect your thoughts or fix mistakes
3. **Slow movements** - Move the cursor slowly and deliberately
4. **Take screenshots** - Capture key moments for thumbnails
5. **Watch the timer** - Keep an eye on duration for platform limits

### Platform Duration Limits

| Platform | Max Duration | Recommended |
|----------|--------------|-------------|
| Twitter | 2:20 | 0:30 - 1:00 |
| Instagram Reels | 1:30 | 0:15 - 0:30 |
| TikTok | 3:00 | 0:15 - 0:60 |
| YouTube Shorts | 1:00 | 0:30 - 0:60 |
| YouTube | Unlimited | 1:00 - 5:00 |
