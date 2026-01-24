# Troubleshooting Guide

Common issues and solutions when using LooK.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Recording Issues](#recording-issues)
- [Video Quality Issues](#video-quality-issues)
- [AI/Voice Issues](#aivoice-issues)
- [Mobile Recording Issues](#mobile-recording-issues)
- [Web Editor Issues](#web-editor-issues)
- [Performance Issues](#performance-issues)

---

## Installation Issues

### FFmpeg Not Found

**Error:**
```
Error: FFmpeg is required. Please install FFmpeg
```

**Solution:**

macOS:
```bash
brew install ffmpeg
```

Ubuntu/Debian:
```bash
sudo apt update
sudo apt install ffmpeg
```

Windows:
1. Download from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your PATH

Verify:
```bash
ffmpeg -version
```

### Playwright Browser Not Found

**Error:**
```
Error: Executable doesn't exist at /path/to/chromium
```

**Solution:**
```bash
npx playwright install chromium
```

For all browsers:
```bash
npx playwright install
```

### Sharp Installation Failed

**Error:**
```
Error: Something went wrong installing the "sharp" module
```

**Solution:**

Try rebuilding:
```bash
npm rebuild sharp
```

On Linux, install dependencies:
```bash
sudo apt install libvips-dev
npm install sharp
```

On macOS:
```bash
brew install vips
npm install sharp
```

### Node.js Version Too Old

**Error:**
```
Error: Node.js 18+ is required
```

**Solution:**
```bash
# Using nvm
nvm install 18
nvm use 18

# Verify
node --version
```

---

## Recording Issues

### Website Not Loading

**Error:**
```
Error: page.goto: Timeout 30000ms exceeded
```

**Possible Causes:**
1. Website is slow to load
2. Website blocks automated browsers
3. Network issues

**Solutions:**

Increase timeout:
```bash
# The recording will wait longer for the page
look demo https://slow-site.com --reliable
```

Check if site blocks bots:
```bash
# Some sites detect Playwright - try with different settings
look demo https://site.com --reliable
```

### Blank or Black Recording

**Possible Causes:**
1. Page uses canvas/WebGL that doesn't capture
2. Content loads after recording starts
3. Page requires authentication

**Solutions:**

Add delay before recording:
```javascript
// In custom scripts, add a wait
await page.waitForTimeout(3000);
```

Use `--dry-run` to check if analysis works:
```bash
look demo https://site.com --dry-run
```

### Recording Stops Early

**Possible Causes:**
1. Page navigation/redirect
2. JavaScript error on page
3. Out of memory

**Solutions:**

Try the reliable V2 engine:
```bash
look demo https://site.com --reliable
```

Reduce duration:
```bash
look demo https://site.com -d 15
```

---

## Video Quality Issues

### Video Looks Choppy/Laggy

**Possible Causes:**
1. System under heavy load during recording
2. Insufficient disk space
3. Complex page with heavy animations

**Solutions:**

Close other applications during recording.

Check disk space:
```bash
df -h
```

Use a shorter duration:
```bash
look demo https://site.com -d 15
```

Lower resolution:
```bash
look demo https://site.com --width 1280 --height 720
```

### Cursor Not Visible

**Solutions:**

Use a larger cursor:
```bash
look demo https://site.com --cursor-size 48
```

Use a contrasting color:
```bash
look demo https://site.com --cursor-color "#FF0000"
```

Add glow effect:
```bash
look demo https://site.com --cursor-glow
```

Use a preset for the background:
```bash
# For dark sites
look demo https://site.com --cursor-preset light

# For light sites  
look demo https://site.com --cursor-preset dark
```

### Click Effects Not Showing

**Possible Causes:**
1. Click effect disabled
2. Effect too small or transparent
3. Effect color matches background

**Solutions:**

Verify click effect is enabled:
```bash
look demo https://site.com --click-effect ripple
```

Increase size and duration:
```bash
look demo https://site.com --click-size 100 --click-duration 600
```

Use contrasting color:
```bash
look demo https://site.com --click-color "#FF0000"
```

### Zoom Too Aggressive/Subtle

**Solutions:**

For subtle zoom:
```bash
look demo https://site.com --zoom-mode basic --max-zoom 1.3
```

For more dynamic zoom:
```bash
look demo https://site.com --zoom-mode follow --zoom-intensity 0.8 --max-zoom 2.0
```

To disable zoom:
```bash
look demo https://site.com --zoom-mode none
```

---

## AI/Voice Issues

### OpenAI API Error

**Error:**
```
Error: OpenAI API error: 401 Unauthorized
```

**Solutions:**

Check API key is set:
```bash
echo $OPENAI_API_KEY
```

Set the key:
```bash
export OPENAI_API_KEY=sk-your-key-here
```

Verify key is valid at [platform.openai.com](https://platform.openai.com/api-keys).

### Rate Limit Exceeded

**Error:**
```
Error: OpenAI API error: 429 Rate limit exceeded
```

**Solutions:**

Wait a few minutes and try again.

Skip AI features for now:
```bash
look demo https://site.com --skip-analysis
```

Check your OpenAI usage at [platform.openai.com/usage](https://platform.openai.com/usage).

### Voice Sounds Robotic/Unnatural

**Solutions:**

Try a different voice:
```bash
# Available: nova, alloy, echo, fable, onyx, shimmer
look demo https://site.com -v echo
```

Recommended voices:
- `nova` - Best for professional demos
- `shimmer` - Good for casual/friendly tone
- `onyx` - Good for authoritative tone

### Script Quality Poor

**Possible Causes:**
1. Website has minimal content
2. AI couldn't understand the UI

**Solutions:**

Try a different style:
```bash
look demo https://site.com -s casual
```

Use dry run to preview script:
```bash
look demo https://site.com --dry-run
```

Skip voice and add your own:
```bash
look demo https://site.com --skip-voice
```

---

## Mobile Recording Issues

### Appium Connection Failed

**Error:**
```
Error: ECONNREFUSED - Could not connect to Appium
```

**Solutions:**

Start Appium server:
```bash
appium --port 4723
```

Check Appium is running:
```bash
curl http://localhost:4723/status
```

### iOS Simulator Not Found

**Error:**
```
Error: Could not find iOS simulator
```

**Solutions:**

List available simulators:
```bash
xcrun simctl list devices
```

Start a simulator:
```bash
open -a Simulator
```

Or specify device:
```bash
look mobile ./app.app --device "iPhone 15"
```

### Android Emulator Not Connecting

**Error:**
```
Error: Could not connect to Android emulator
```

**Solutions:**

Start emulator:
```bash
emulator -avd Pixel_7_API_34
```

Check ADB:
```bash
adb devices
```

Install UiAutomator2 driver:
```bash
appium driver install uiautomator2
```

### Check All Mobile Prerequisites

```bash
look mobile-test --platform ios --list-devices
look mobile-test --platform android --list-devices
```

---

## Web Editor Issues

### Editor Won't Start

**Error:**
```
Error: Port 3847 already in use
```

**Solutions:**

Use a different port:
```bash
look serve -p 8080
```

Find and kill the process using the port:
```bash
lsof -i :3847
kill -9 <PID>
```

### Editor Loads But Video Won't Play

**Possible Causes:**
1. Browser codec issues
2. Video file corrupted
3. File still processing

**Solutions:**

Try a different browser (Chrome recommended).

Check video file:
```bash
ffprobe demo.mp4
```

Re-export the video.

### Timeline Not Responding

**Solutions:**

Refresh the page (Ctrl/Cmd + R).

Clear browser cache.

Check console for JavaScript errors (F12).

---

## Performance Issues

### Recording Very Slow

**Possible Causes:**
1. Complex website with heavy JavaScript
2. System resources limited
3. Anti-virus scanning

**Solutions:**

Reduce recording quality:
```bash
look demo https://site.com --width 1280 --height 720
```

Close other applications.

Try the reliable engine:
```bash
look demo https://site.com --reliable
```

### Out of Memory

**Error:**
```
FATAL ERROR: Reached heap limit Allocation failed
```

**Solutions:**

Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=8192" look demo https://site.com
```

Reduce duration:
```bash
look demo https://site.com -d 15
```

### Disk Space Full

**Error:**
```
Error: ENOSPC: no space left on device
```

**Solutions:**

Check disk space:
```bash
df -h
```

Clean up temporary files:
```bash
rm -rf /tmp/look-*
rm -rf ~/.look-demo/cache/*
```

Use a different output directory:
```bash
look demo https://site.com -o /path/with/space/demo.mp4
```

---

## Web Editor Issues

### API Status Shows "Not Configured"

**Cause:** No API keys have been set up.

**Solution:**
1. Click the ⚙️ Settings button or the API status indicator
2. Go to the API Keys tab
3. Enter your OpenAI API key
4. Click Save Settings

### API Status Shows "Error"

**Possible Causes:**
1. Invalid API key
2. Backend server not running
3. Network connectivity issues

**Solutions:**

Verify your API key is valid:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

Check if the backend is running:
```bash
curl http://localhost:3847/api/health
```

### Settings Not Saving

**Possible Causes:**
1. Browser localStorage is disabled
2. Private/incognito browsing mode

**Solutions:**
- Enable localStorage in browser settings
- Use a regular (non-private) browser window
- Check browser console for errors (F12 → Console)

### Onboarding Tour Not Showing

**Cause:** Tour has already been completed.

**Solution:**
Clear the onboarding flag:
```javascript
// In browser console (F12)
localStorage.removeItem('look-onboarding-complete');
location.reload();
```

### Templates Page Is Blank

**Possible Causes:**
1. JavaScript error
2. CSS not loading

**Solutions:**
- Check browser console for errors
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache

### Keyboard Shortcuts Not Working

**Possible Causes:**
1. Focus is in an input field
2. Modal is open

**Solutions:**
- Click outside of any input fields
- Close any open modals
- Press `Escape` first, then try the shortcut

### Export Fails in Web Editor

**Possible Causes:**
1. No project loaded
2. Backend render failed
3. FFmpeg not installed on server

**Solutions:**

Check browser console for error details.

Verify backend is processing:
```bash
curl http://localhost:3847/api/health
```

Check server logs for FFmpeg errors.

### Live Recording Preview Not Showing

**Possible Causes:**
1. WebSocket connection failed
2. Browser blocking WebSocket

**Solutions:**

Check WebSocket connection in browser console:
```javascript
// Should show 'open' or connected state
console.log(window.ws?.readyState);
```

Try a different browser or disable extensions.

---

## Still Having Issues?

### Debug Mode

Run with debug output:
```bash
DEBUG=1 look demo https://site.com
```

### Browser Console Debugging

Open browser developer tools (F12) and check:
1. **Console** tab for JavaScript errors
2. **Network** tab for failed API requests
3. **Application** tab → Local Storage for saved settings

### Full Test

Run the pipeline test:
```bash
look test --full
```

### Get Help

1. Search [existing issues](https://github.com/nirholas/LooK/issues)
2. Open a [new issue](https://github.com/nirholas/LooK/issues/new) with:
   - LooK version (`look --version`)
   - Node.js version (`node --version`)
   - OS and version
   - Browser version (for web editor issues)
   - Full error message
   - Browser console output (for web editor issues)
   - Steps to reproduce
