import { exec } from 'child_process';
import { promisify } from 'util';
import { access, readFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * Mobile utilities for app detection, validation, and setup
 */

/**
 * Detect platform from app file extension
 */
export function detectPlatform(appPath) {
  const lower = appPath.toLowerCase();
  
  if (lower.endsWith('.app') || lower.endsWith('.ipa')) {
    return 'ios';
  }
  if (lower.endsWith('.apk') || lower.endsWith('.aab')) {
    return 'android';
  }
  
  // Check if it looks like a bundle ID (com.company.app format)
  if (/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(appPath)) {
    // Could be either, but iOS bundle IDs are more common in this format
    return 'ios';
  }
  
  return null;
}

/**
 * Validate app path exists and is correct type
 */
export async function validateAppPath(appPath, platform) {
  // Check if it's a bundle ID (already installed app)
  if (/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(appPath)) {
    return { type: 'bundleId', path: appPath, valid: true };
  }
  
  // Check if file exists
  try {
    await access(appPath);
  } catch (e) {
    return { type: 'file', path: appPath, valid: false, error: 'File not found' };
  }
  
  const lower = appPath.toLowerCase();
  
  if (platform === 'ios') {
    if (!lower.endsWith('.app') && !lower.endsWith('.ipa')) {
      return { 
        type: 'file', 
        path: appPath, 
        valid: false, 
        error: 'iOS apps must be .app or .ipa files' 
      };
    }
  } else if (platform === 'android') {
    if (!lower.endsWith('.apk') && !lower.endsWith('.aab')) {
      return { 
        type: 'file', 
        path: appPath, 
        valid: false, 
        error: 'Android apps must be .apk or .aab files' 
      };
    }
  }
  
  return { type: 'file', path: appPath, valid: true };
}

/**
 * Check if Appium server is running
 */
export async function checkAppiumServer(port = 4723) {
  try {
    const response = await fetch(`http://localhost:${port}/status`);
    const data = await response.json();
    return { running: true, version: data.value?.build?.version || 'unknown' };
  } catch (e) {
    return { running: false, error: 'Appium server not responding' };
  }
}

/**
 * Check if required Appium driver is installed
 */
export async function checkAppiumDriver(platform) {
  const driver = platform === 'ios' ? 'xcuitest' : 'uiautomator2';
  
  try {
    const { stdout } = await execAsync('appium driver list --installed --json');
    const drivers = JSON.parse(stdout);
    
    if (drivers[driver]) {
      return { installed: true, version: drivers[driver].version };
    }
    
    return { 
      installed: false, 
      error: `Driver not installed. Run: appium driver install ${driver}` 
    };
  } catch (e) {
    // Appium might not be installed
    return { installed: false, error: 'Appium not installed or not in PATH' };
  }
}

/**
 * Get list of available iOS simulators
 */
export async function getIOSSimulators() {
  try {
    const { stdout } = await execAsync('xcrun simctl list devices available --json');
    const data = JSON.parse(stdout);
    const simulators = [];
    
    for (const [runtime, devices] of Object.entries(data.devices)) {
      const runtimeVersion = runtime.split('.').pop()?.replace(/-/g, '.') || runtime;
      
      for (const device of devices) {
        if (device.isAvailable) {
          simulators.push({
            name: device.name,
            udid: device.udid,
            state: device.state,
            runtime: runtimeVersion,
            platform: 'ios'
          });
        }
      }
    }
    
    return simulators;
  } catch (e) {
    return [];
  }
}

/**
 * Get list of available Android emulators
 */
export async function getAndroidEmulators() {
  try {
    const { stdout } = await execAsync('emulator -list-avds 2>/dev/null || adb devices -l');
    const lines = stdout.trim().split('\n').filter(Boolean);
    
    const emulators = lines
      .filter(line => !line.includes('List of devices'))
      .map(line => {
        const name = line.trim().split(/\s+/)[0];
        return {
          name,
          platform: 'android',
          type: line.includes('emulator') ? 'emulator' : 'device'
        };
      });
    
    return emulators;
  } catch (e) {
    return [];
  }
}

/**
 * Get all available devices (iOS + Android)
 */
export async function getAllDevices() {
  const [ios, android] = await Promise.all([
    getIOSSimulators(),
    getAndroidEmulators()
  ]);
  
  return { ios, android };
}

/**
 * Boot an iOS simulator if not already running
 */
export async function bootIOSSimulator(deviceName) {
  const simulators = await getIOSSimulators();
  const device = simulators.find(s => 
    s.name.toLowerCase() === deviceName.toLowerCase() ||
    s.name.toLowerCase().includes(deviceName.toLowerCase())
  );
  
  if (!device) {
    throw new Error(`Simulator not found: ${deviceName}`);
  }
  
  if (device.state !== 'Booted') {
    await execAsync(`xcrun simctl boot "${device.udid}"`);
    // Wait for boot
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  return device;
}

/**
 * Start an Android emulator
 */
export async function startAndroidEmulator(emulatorName) {
  try {
    // Check if already running
    const { stdout } = await execAsync('adb devices');
    if (stdout.includes('emulator')) {
      return { started: true, alreadyRunning: true };
    }
    
    // Start emulator in background
    exec(`emulator -avd "${emulatorName}" &`);
    
    // Wait for device to be ready
    await execAsync('adb wait-for-device', { timeout: 60000 });
    
    return { started: true, alreadyRunning: false };
  } catch (e) {
    throw new Error(`Failed to start emulator: ${e.message}`);
  }
}

/**
 * Check all prerequisites for mobile recording
 */
export async function checkPrerequisites(platform) {
  const results = {
    platform,
    checks: [],
    allPassed: true
  };
  
  // Check Appium
  const appium = await checkAppiumServer();
  results.checks.push({
    name: 'Appium Server',
    passed: appium.running,
    message: appium.running ? `Running (v${appium.version})` : 'Not running',
    fix: 'Run: appium --port 4723'
  });
  if (!appium.running) results.allPassed = false;
  
  // Check driver
  const driver = await checkAppiumDriver(platform);
  results.checks.push({
    name: `${platform === 'ios' ? 'XCUITest' : 'UiAutomator2'} Driver`,
    passed: driver.installed,
    message: driver.installed ? `Installed (v${driver.version})` : 'Not installed',
    fix: `Run: appium driver install ${platform === 'ios' ? 'xcuitest' : 'uiautomator2'}`
  });
  if (!driver.installed) results.allPassed = false;
  
  // Platform-specific checks
  if (platform === 'ios') {
    // Check Xcode
    try {
      const { stdout } = await execAsync('xcodebuild -version');
      const version = stdout.split('\n')[0];
      results.checks.push({
        name: 'Xcode',
        passed: true,
        message: version
      });
    } catch (e) {
      results.checks.push({
        name: 'Xcode',
        passed: false,
        message: 'Not installed',
        fix: 'Install Xcode from the App Store'
      });
      results.allPassed = false;
    }
    
    // Check for simulators
    const simulators = await getIOSSimulators();
    results.checks.push({
      name: 'iOS Simulators',
      passed: simulators.length > 0,
      message: simulators.length > 0 ? `${simulators.length} available` : 'None found',
      fix: 'Open Xcode > Settings > Platforms to download simulators'
    });
    if (simulators.length === 0) results.allPassed = false;
    
  } else {
    // Check Android SDK
    try {
      await execAsync('adb version');
      results.checks.push({
        name: 'Android SDK (adb)',
        passed: true,
        message: 'Available'
      });
    } catch (e) {
      results.checks.push({
        name: 'Android SDK (adb)',
        passed: false,
        message: 'Not found',
        fix: 'Install Android Studio and add platform-tools to PATH'
      });
      results.allPassed = false;
    }
    
    // Check for emulators
    const emulators = await getAndroidEmulators();
    results.checks.push({
      name: 'Android Emulators',
      passed: emulators.length > 0,
      message: emulators.length > 0 ? `${emulators.length} available` : 'None found',
      fix: 'Open Android Studio > Device Manager to create an emulator'
    });
  }
  
  // Check FFmpeg
  try {
    await execAsync('ffmpeg -version');
    results.checks.push({
      name: 'FFmpeg',
      passed: true,
      message: 'Available'
    });
  } catch (e) {
    results.checks.push({
      name: 'FFmpeg',
      passed: false,
      message: 'Not found',
      fix: 'Install with: apt install ffmpeg (Linux) or brew install ffmpeg (macOS)'
    });
    results.allPassed = false;
  }
  
  return results;
}

/**
 * Parse actions script from JSON file
 */
export async function parseActionsScript(scriptPath) {
  try {
    const content = await readFile(scriptPath, 'utf-8');
    const script = JSON.parse(content);
    
    if (!Array.isArray(script.actions)) {
      throw new Error('Actions script must have an "actions" array');
    }
    
    // Validate actions
    const validTypes = ['tap', 'swipe', 'longPress', 'wait', 'scroll', 'type', 'back'];
    for (const action of script.actions) {
      if (!validTypes.includes(action.type)) {
        throw new Error(`Invalid action type: ${action.type}`);
      }
    }
    
    return script;
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error(`Actions script not found: ${scriptPath}`);
    }
    throw e;
  }
}

/**
 * Generate a sample actions script
 */
export function generateSampleActionsScript() {
  return {
    name: "Sample Demo Script",
    description: "A sample script demonstrating available actions",
    actions: [
      { type: "wait", duration: 2000, comment: "Wait for app to load" },
      { type: "tap", xPercent: 0.5, yPercent: 0.3, pause: 1000, comment: "Tap center-top" },
      { type: "scroll", direction: "down", duration: 500, pause: 1500, comment: "Scroll down" },
      { type: "tap", xPercent: 0.5, yPercent: 0.5, pause: 2000, comment: "Tap center" },
      { type: "swipe", startX: 300, startY: 800, endX: 300, endY: 300, duration: 400, pause: 1000 },
      { type: "longPress", xPercent: 0.5, yPercent: 0.5, duration: 1000, pause: 1500 },
      { type: "scroll", direction: "up", duration: 500, pause: 1000, comment: "Scroll back up" },
      { type: "wait", duration: 1500, comment: "Final pause" }
    ]
  };
}

export default {
  detectPlatform,
  validateAppPath,
  checkAppiumServer,
  checkAppiumDriver,
  getIOSSimulators,
  getAndroidEmulators,
  getAllDevices,
  bootIOSSimulator,
  startAndroidEmulator,
  checkPrerequisites,
  parseActionsScript,
  generateSampleActionsScript
};
