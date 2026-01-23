# Mobile App Demo Examples

Example configurations for recording mobile app demos using LooK with Appium.

## Prerequisites

Before recording mobile demos:

### For iOS
```bash
# Install Appium
npm install -g appium

# Install iOS driver
appium driver install xcuitest

# Start Xcode simulator
open -a Simulator

# Start Appium server
appium --port 4723
```

### For Android
```bash
# Install Appium
npm install -g appium

# Install Android driver
appium driver install uiautomator2

# Start Android emulator (from Android Studio or CLI)
emulator -avd Pixel_7_API_34

# Start Appium server
appium --port 4723
```

## Files

- `android-demo.json` - Android app demo actions script
- `ios-demo.json` - iOS app demo actions script

## Usage

### Command Line

```bash
# Android demo
look mobile ./app.apk \
  --platform android \
  --device "Pixel 7" \
  --actions ./android-demo.json \
  --device-frame \
  -o android-demo.mp4

# iOS demo
look mobile ./MyApp.app \
  --platform ios \
  --device "iPhone 15 Pro" \
  --actions ./ios-demo.json \
  --device-frame \
  -o ios-demo.mp4
```

### Programmatic Usage

```javascript
import { generateMobileDemo } from 'look-demo';
import actions from './android-demo.json' assert { type: 'json' };

await generateMobileDemo('./app.apk', {
  output: './output/android-demo.mp4',
  platform: 'android',
  device: 'Pixel 7',
  actionsScript: './android-demo.json',
  addDeviceFrame: true,
  frameStyle: 'modern',
  touchIndicator: 'circle',
  showSwipeTrail: true,
  voice: 'nova',
  style: 'casual'
});
```

## Action Types

### `launch`
Launch the app.
```json
{ "type": "launch" }
```

### `wait`
Wait for specified duration.
```json
{ "type": "wait", "duration": 2000 }
```

### `tap`
Tap at coordinates or element.
```json
{ "type": "tap", "x": 540, "y": 800 }
{ "type": "tap", "selector": "~button_id" }
{ "type": "tap", "accessibilityId": "loginButton" }
```

### `swipe`
Swipe gesture.
```json
{
  "type": "swipe",
  "from": { "x": 900, "y": 600 },
  "to": { "x": 180, "y": 600 },
  "duration": 300
}
```

Or using direction:
```json
{ "type": "swipe", "direction": "left" }
```

### `scroll`
Scroll the view.
```json
{ "type": "scroll", "direction": "down", "amount": 500 }
```

### `type`
Enter text.
```json
{ "type": "type", "text": "hello@example.com" }
{ "type": "type", "selector": "~email_input", "text": "hello@example.com" }
```

## Element Selectors

### Android (UiAutomator2)
- `~accessibility_id` - Accessibility ID
- `//android.widget.Button[@text='Login']` - XPath
- `android=new UiSelector().text("Login")` - UiSelector

### iOS (XCUITest)
- `~accessibilityId` - Accessibility ID
- `name == 'Login'` - Predicate string
- `label == 'Submit'` - Predicate by label
- `-ios class chain:**/XCUIElementTypeButton[`name == "Login"`]` - Class chain

## Touch Effects

Configure how touch interactions appear in the video:

```json
{
  "touchEffects": {
    "indicator": "circle",
    "color": "rgba(255, 255, 255, 0.8)",
    "size": 80,
    "showSwipeTrail": true
  }
}
```

**Indicator styles:**
- `circle` - White circle indicator
- `finger` - Finger icon
- `ripple` - Expanding ripple
- `dot` - Simple dot

## Device Frames

Add device frames to make demos look more professional:

```bash
look mobile ./app.apk --device-frame --frame-style modern
```

**Frame styles:**
- `modern` - Realistic device frame with bezels
- `minimal` - Thin border only

**Supported devices:**
```bash
look devices
```

## Tips

1. **Use accessibility IDs** - Most reliable way to find elements
2. **Add waits** - Give the app time to load and animate
3. **Script key flows** - Focus on 1-2 core user journeys
4. **Test actions first** - Use `--dry-run` to verify
5. **Match real usage** - Use realistic demo data
