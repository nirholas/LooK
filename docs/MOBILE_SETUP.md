# LooK Mobile App Recording Setup

Record professional demo videos of your iOS and Android apps with AI-generated voiceovers and smooth touch visualizations.

## Quick Start with Docker (Recommended)

The easiest way to get started with Android app recording is using our Docker setup. No need to install Android Studio, SDKs, or configure emulators manually.

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) installed and running
- At least 8GB RAM available for the emulator
- Your Android app as an `.apk` file

### One-Command Setup

```bash
# Start the Android emulator + Appium server
look mobile-start

# Wait for it to be ready (usually 2-3 minutes on first run)
look mobile-status

# Record your app demo
look mobile ./your-app.apk
```

### Docker Commands

| Command | Description |
|---------|-------------|
| `look mobile-start` | Start Android emulator and Appium server |
| `look mobile-stop` | Stop and remove the container |
| `look mobile-status` | Check if the environment is ready |
| `look mobile-logs` | View container logs |
| `look mobile-logs -f` | Follow logs in real-time |
| `look mobile-install <apk>` | Pre-install an APK to the emulator |

### System Requirements

- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: ~10GB for Docker image
- **OS**: Windows 10+, macOS 10.15+, or Linux

---

## Manual Setup (Without Docker)

If you prefer more control or need iOS support (requires macOS), follow these steps.

### Android Setup

#### 1. Install Android Studio

Download from [developer.android.com](https://developer.android.com/studio)

During installation, ensure you install:
- Android SDK
- Android SDK Platform-Tools
- Android Emulator
- Intel HAXM (for better emulator performance)

#### 2. Create an Android Virtual Device (AVD)

1. Open Android Studio → Tools → Device Manager
2. Click "Create Device"
3. Select "Pixel 7" (or similar)
4. Download and select a system image (API 34 recommended)
5. Name it "Pixel_7_API_34"
6. Click Finish

#### 3. Start the Emulator

```bash
# From command line
emulator -avd Pixel_7_API_34

# Or start from Android Studio → Device Manager
```

#### 4. Install Appium

```bash
# Install Appium globally
npm install -g appium

# Install the Android driver
appium driver install uiautomator2

# Start Appium server
appium --port 4723
```

#### 5. Record Your App

```bash
# With Appium running and emulator started
look mobile ./your-app.apk --platform android
```

### iOS Setup (macOS Only)

#### 1. Install Xcode

Download from the Mac App Store or [developer.apple.com](https://developer.apple.com/xcode/)

```bash
# Accept license and install command line tools
sudo xcodebuild -license accept
xcode-select --install
```

#### 2. Start iOS Simulator

```bash
# Open Simulator app
open -a Simulator

# Or from command line
xcrun simctl boot "iPhone 15 Pro"
```

#### 3. Install Appium with iOS Driver

```bash
# Install Appium
npm install -g appium

# Install the iOS driver
appium driver install xcuitest

# Start Appium
appium --port 4723
```

#### 4. Record Your App

```bash
look mobile ./YourApp.app --platform ios --device "iPhone 15 Pro"
```

---

## Recording Options

### Basic Usage

```bash
# Android APK
look mobile ./app.apk

# iOS App (macOS only)  
look mobile ./App.app --platform ios

# Specify device and duration
look mobile ./app.apk --device "Pixel 7" --duration 30
```

### Full Options

```bash
look mobile <app> [options]

Options:
  -o, --output <path>          Output file (default: "./mobile-demo.mp4")
  -d, --duration <seconds>     Duration (default: 25)
  -v, --voice <voice>          TTS voice (default: "nova")
  -s, --style <style>          Script style: professional, casual, energetic
  -p, --preset <preset>        Export preset: youtube, twitter, instagram, tiktok
  --platform <platform>        ios or android (auto-detected from extension)
  --device <device>            Device name (default: "iPhone 15 Pro" or "Pixel 7")
  --orientation <orientation>  portrait or landscape (default: portrait)
  --touch-indicator <style>    circle, finger, ripple, dot (default: circle)
  --touch-color <color>        Touch indicator color
  --show-swipe-trail           Show swipe gesture trails
  --device-frame               Add device frame overlay
  --skip-voice                 Skip voiceover generation
  --dry-run                    Preview without recording
```

### Examples

```bash
# Quick demo with defaults
look mobile ./myapp.apk

# Social media optimized
look mobile ./myapp.apk --preset tiktok --orientation portrait

# Professional product demo
look mobile ./myapp.apk \
  --duration 45 \
  --voice nova \
  --style professional \
  --device-frame \
  --touch-indicator ripple

# YouTube landscape demo
look mobile ./myapp.apk \
  --preset youtube \
  --orientation landscape \
  --device "Pixel Fold"
```

---

## Troubleshooting

### Docker Issues

#### Container won't start

```bash
# Check Docker is running
docker info

# Check for port conflicts
lsof -i :4723

# View startup logs
look mobile-logs -f
```

#### "Appium not ready" after long wait

The Android emulator can take 2-5 minutes to fully boot on first run.

```bash
# Check emulator boot status
docker exec look-appium-android adb shell getprop sys.boot_completed

# Should return "1" when ready
```

#### Out of memory

Increase Docker memory limit:
- Docker Desktop → Settings → Resources → Memory → 8GB+

### Manual Setup Issues

#### "Appium: ECONNREFUSED"

Appium server isn't running or is on a different port.

```bash
# Start Appium on the expected port
appium --port 4723

# Check if something else is using the port
lsof -i :4723
```

#### "Device not found" / "No emulators running"

```bash
# List connected devices
adb devices

# If empty, start your emulator:
# Android: Start from Android Studio or command line
# iOS: open -a Simulator
```

#### "UiAutomator2 driver not installed"

```bash
# List installed drivers
appium driver list --installed

# Install if missing
appium driver install uiautomator2
```

#### iOS: "xcuitest driver not found"

```bash
appium driver install xcuitest

# May also need
xcode-select --install
```

#### Android: "ANDROID_HOME not set"

Add to your shell profile (~/.bashrc or ~/.zshrc):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk          # Linux
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Recording Issues

#### Touch indicators not showing

Make sure you're using the touch indicator options:

```bash
look mobile ./app.apk --touch-indicator circle --touch-color "rgba(255,255,255,0.8)"
```

#### App not launching in demo

The app must be installed on the emulator first. Docker setup handles this automatically, but for manual setup:

```bash
# Android
adb install ./your-app.apk

# iOS Simulator
xcrun simctl install booted ./YourApp.app
```

---

## Architecture

### Docker Setup

```
┌─────────────────────────────────────────────┐
│  Host Machine                               │
│  ┌───────────────────────────────────────┐  │
│  │  Docker Container                     │  │
│  │  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │   Android   │  │    Appium      │  │  │
│  │  │   Emulator  │◄─┤    Server      │◄─┼──┼── Port 4723
│  │  │  (Pixel 7)  │  │  (WebDriver)   │  │  │
│  │  └─────────────┘  └────────────────┘  │  │
│  │         │                              │  │
│  │    /apks (volume mount)               │  │
│  └───────────────────────────────────────┘  │
│                     │                        │
│              look mobile ./app.apk           │
└─────────────────────────────────────────────┘
```

### Communication Flow

1. `look mobile` connects to Appium server (port 4723)
2. Appium installs and launches your app on the emulator
3. LooK sends touch/gesture commands via WebDriver protocol
4. Screenshots are captured at 30fps
5. AI generates script based on UI analysis
6. Video is rendered with touch visualizations and voiceover

---

## Tips for Better Demos

1. **Prepare your app state** - Clear data or set up demo accounts before recording
2. **Keep gestures slow** - Faster isn't better for demo videos; clear movements look more professional
3. **Use portrait for mobile-first** - Most social platforms favor vertical video
4. **Add device frames** - `--device-frame` adds polish and context
5. **Script key flows** - Use `--actions script.json` for precise, repeatable demos

---

## Getting Help

- **GitHub Issues**: [github.com/nirholas/LooK/issues](https://github.com/nirholas/LooK/issues)
- **Appium Docs**: [appium.io/docs](https://appium.io/docs/en/latest/)
- **Android Emulator**: [developer.android.com/studio/run/emulator](https://developer.android.com/studio/run/emulator)
