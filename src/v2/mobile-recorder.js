import { remote } from 'webdriverio';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * MobileRecorder - Appium-based mobile app recording
 * Supports iOS Simulator and Android Emulator
 */
export class MobileRecorder {
  constructor(options = {}) {
    this.platform = options.platform || 'ios';  // ios, android
    this.device = options.device || 'iPhone 15 Pro';
    this.app = options.app;                      // Path to .app/.apk or bundle ID
    this.orientation = options.orientation || 'portrait';
    this.driver = null;
    this.isRecording = false;
  }

  /**
   * Connect to Appium server and initialize driver
   */
  async connect() {
    const capabilities = this.platform === 'ios' 
      ? this.getIOSCapabilities()
      : this.getAndroidCapabilities();

    try {
      this.driver = await remote({
        hostname: 'localhost',
        port: 4723,
        path: '/',
        capabilities,
        logLevel: 'warn',
        connectionRetryTimeout: 120000,
        connectionRetryCount: 3
      });

      // Set orientation if specified
      if (this.orientation) {
        await this.driver.setOrientation(this.orientation.toUpperCase());
      }

      return this.driver;
    } catch (error) {
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error(
          'Cannot connect to Appium server. Make sure Appium is running:\n' +
          '  npm install -g appium\n' +
          '  appium --port 4723'
        );
      }
      throw error;
    }
  }

  /**
   * iOS capabilities for XCUITest automation
   */
  getIOSCapabilities() {
    const caps = {
      platformName: 'iOS',
      'appium:deviceName': this.device,
      'appium:automationName': 'XCUITest',
      'appium:orientation': this.orientation.toUpperCase(),
      'appium:newCommandTimeout': 300,
      'appium:noReset': false
    };

    // Handle app path or bundle ID
    if (this.app) {
      if (this.app.endsWith('.app') || this.app.endsWith('.ipa')) {
        caps['appium:app'] = this.app;
      } else {
        // Assume it's a bundle ID for an installed app
        caps['appium:bundleId'] = this.app;
      }
    }

    return caps;
  }

  /**
   * Android capabilities for UiAutomator2 automation
   */
  getAndroidCapabilities() {
    const caps = {
      platformName: 'Android',
      'appium:deviceName': this.device,
      'appium:automationName': 'UiAutomator2',
      'appium:orientation': this.orientation.toUpperCase(),
      'appium:newCommandTimeout': 300,
      'appium:noReset': false
    };

    // Handle app path or package name
    if (this.app) {
      if (this.app.endsWith('.apk')) {
        caps['appium:app'] = this.app;
      } else if (this.app.includes('.')) {
        // Assume it's a package name
        caps['appium:appPackage'] = this.app;
        caps['appium:appActivity'] = '.MainActivity'; // Default activity
      }
    }

    return caps;
  }

  /**
   * Start screen recording
   */
  async startRecording(options = {}) {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    const recordingOptions = this.platform === 'ios'
      ? {
          videoType: 'h264',
          videoQuality: options.quality || 'high',
          videoFps: options.fps || 60,
          forceRestart: true
        }
      : {
          videoSize: options.videoSize || '1280x720',
          bitRate: options.bitRate || 8000000,
          forceRestart: true
        };

    await this.driver.startRecordingScreen(recordingOptions);
    this.isRecording = true;
  }

  /**
   * Stop screen recording and save to file
   */
  async stopRecording(outputPath) {
    if (!this.isRecording) {
      console.warn('No recording in progress');
      return null;
    }

    const video = await this.driver.stopRecordingScreen();
    this.isRecording = false;

    // Decode base64 video and write to file
    const buffer = Buffer.from(video, 'base64');
    
    // Ensure directory exists
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buffer);
    
    return outputPath;
  }

  /**
   * Take a screenshot (base64 encoded)
   */
  async screenshot() {
    return await this.driver.takeScreenshot();
  }

  /**
   * Save screenshot to file
   */
  async saveScreenshot(outputPath) {
    const screenshot = await this.screenshot();
    const buffer = Buffer.from(screenshot, 'base64');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buffer);
    return outputPath;
  }

  /**
   * Get window/screen size
   */
  async getWindowSize() {
    return await this.driver.getWindowRect();
  }

  /**
   * Perform a tap action
   */
  async tap(x, y) {
    await this.driver.action('pointer')
      .move({ x, y, duration: 0 })
      .down()
      .pause(50)
      .up()
      .perform();
  }

  /**
   * Perform a swipe action
   */
  async swipe(startX, startY, endX, endY, duration = 500) {
    await this.driver.action('pointer')
      .move({ x: startX, y: startY, duration: 0 })
      .down()
      .pause(100)
      .move({ x: endX, y: endY, duration })
      .up()
      .perform();
  }

  /**
   * Perform a long press
   */
  async longPress(x, y, duration = 1000) {
    await this.driver.action('pointer')
      .move({ x, y, duration: 0 })
      .down()
      .pause(duration)
      .up()
      .perform();
  }

  /**
   * Find elements using platform-specific selectors
   */
  async findElements(type = 'button') {
    const selectors = this.platform === 'ios' 
      ? {
          button: '//XCUIElementTypeButton',
          text: '//XCUIElementTypeStaticText',
          textField: '//XCUIElementTypeTextField',
          scrollView: '//XCUIElementTypeScrollView',
          table: '//XCUIElementTypeTable',
          cell: '//XCUIElementTypeCell',
          image: '//XCUIElementTypeImage',
          any: '//*'
        }
      : {
          button: '//android.widget.Button',
          text: '//android.widget.TextView',
          textField: '//android.widget.EditText',
          scrollView: '//android.widget.ScrollView',
          table: '//android.widget.ListView | //androidx.recyclerview.widget.RecyclerView',
          cell: '//android.widget.FrameLayout',
          image: '//android.widget.ImageView',
          any: '//*'
        };

    const selector = selectors[type] || selectors.any;
    return await this.driver.$$(selector);
  }

  /**
   * Get all interactive elements
   */
  async getInteractiveElements() {
    const buttons = await this.findElements('button');
    const textFields = await this.findElements('textField');
    const cells = await this.findElements('cell');

    const elements = [];

    for (const btn of buttons) {
      try {
        const location = await btn.getLocation();
        const size = await btn.getSize();
        const text = await btn.getText();
        elements.push({
          type: 'button',
          x: location.x + size.width / 2,
          y: location.y + size.height / 2,
          width: size.width,
          height: size.height,
          text: text || ''
        });
      } catch (e) {
        // Element may have gone stale
      }
    }

    return elements;
  }

  /**
   * Disconnect from device
   */
  async disconnect() {
    if (this.isRecording) {
      try {
        await this.driver.stopRecordingScreen();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }

    if (this.driver) {
      await this.driver.deleteSession();
      this.driver = null;
    }
  }
}

/**
 * Get list of available simulators/emulators
 */
export async function getAvailableDevices(platform = 'ios') {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    if (platform === 'ios') {
      // List iOS simulators
      const { stdout } = await execAsync('xcrun simctl list devices available --json');
      const devices = JSON.parse(stdout);
      const available = [];
      
      for (const runtime in devices.devices) {
        for (const device of devices.devices[runtime]) {
          if (device.isAvailable) {
            available.push({
              name: device.name,
              udid: device.udid,
              state: device.state,
              runtime: runtime.split('.').pop()
            });
          }
        }
      }
      
      return available;
    } else {
      // List Android emulators
      const { stdout } = await execAsync('emulator -list-avds');
      return stdout.trim().split('\n').filter(Boolean).map(name => ({
        name,
        type: 'emulator'
      }));
    }
  } catch (error) {
    return [];
  }
}

export default MobileRecorder;
