/**
 * Mobile Auto Demo - Automated exploration of mobile apps
 * Scrolls, taps, and navigates to showcase app features
 */

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run automated demo of a mobile app
 * @param {Object} driver - WebDriverIO driver instance
 * @param {TouchTracker} tracker - Touch tracker for recording positions
 * @param {number} duration - Total demo duration in milliseconds
 * @param {Object} options - Demo options
 */
export async function autoDemo(driver, tracker, duration, options = {}) {
  const {
    scrollPause = 1500,      // Pause between scrolls
    tapPause = 2000,         // Pause after taps
    initialPause = 2000,     // Initial pause to show app launch
    maxScrolls = 5,          // Maximum scroll actions
    maxTaps = 4,             // Maximum tap actions
    scrollSpeed = 500,       // Swipe duration in ms
    exploreNavigation = true // Try to navigate between screens
  } = options;

  const startTime = Date.now();
  const { width, height } = await driver.getWindowRect();

  // Initial pause - show app launch
  await sleep(initialPause);

  let scrollCount = 0;
  let tapCount = 0;

  // Helper to check remaining time
  const hasTime = (reserve = 3000) => Date.now() - startTime < duration - reserve;

  // Phase 1: Scroll through initial content
  while (hasTime() && scrollCount < maxScrolls) {
    await performScroll(driver, tracker, width, height, scrollSpeed);
    scrollCount++;
    await sleep(scrollPause);
    
    if (!hasTime()) break;
  }

  // Phase 2: Interact with visible elements
  const interactiveElements = await getInteractiveElements(driver, options.platform);
  
  for (const element of interactiveElements) {
    if (!hasTime() || tapCount >= maxTaps) break;

    // Skip elements that might trigger navigation away or popups
    const shouldSkip = await shouldSkipElement(element);
    if (shouldSkip) continue;

    try {
      const location = await element.getLocation();
      const size = await element.getSize();
      const centerX = Math.round(location.x + size.width / 2);
      const centerY = Math.round(location.y + size.height / 2);

      // Ensure element is visible on screen
      if (centerY < 0 || centerY > height || centerX < 0 || centerX > width) {
        continue;
      }

      // Record touch and tap
      tracker.recordTap(centerX, centerY, Date.now() - startTime);
      await element.click();
      tapCount++;
      
      await sleep(tapPause);

      // After tap, maybe scroll the new content
      if (hasTime() && scrollCount < maxScrolls) {
        await performScroll(driver, tracker, width, height, scrollSpeed);
        scrollCount++;
        await sleep(scrollPause);
      }
    } catch (e) {
      // Element may have become stale, continue
      continue;
    }
  }

  // Phase 3: Explore navigation if enabled
  if (exploreNavigation && hasTime(5000)) {
    await exploreNav(driver, tracker, width, height, startTime, duration);
  }

  // Final scroll back to top if time permits
  if (hasTime(2000)) {
    await performScroll(driver, tracker, width, height, scrollSpeed, 'up');
    await sleep(1500);
  }
}

/**
 * Perform a scroll gesture
 */
async function performScroll(driver, tracker, width, height, duration, direction = 'down') {
  const centerX = Math.round(width / 2);
  
  let startY, endY;
  if (direction === 'down') {
    startY = Math.round(height * 0.7);
    endY = Math.round(height * 0.3);
  } else {
    startY = Math.round(height * 0.3);
    endY = Math.round(height * 0.7);
  }

  // Record swipe in tracker
  const timestamp = Date.now();
  tracker.recordSwipe(centerX, startY, centerX, endY, duration, timestamp);

  // Execute swipe via driver
  await driver.action('pointer')
    .move({ x: centerX, y: startY, duration: 0 })
    .down()
    .pause(100)
    .move({ x: centerX, y: endY, duration })
    .up()
    .perform();
}

/**
 * Get interactive elements based on platform
 */
async function getInteractiveElements(driver, platform = 'ios') {
  const selectors = platform === 'ios'
    ? [
        '//XCUIElementTypeButton[@visible="true"]',
        '//XCUIElementTypeCell[@visible="true"]',
        '//XCUIElementTypeLink[@visible="true"]'
      ]
    : [
        '//android.widget.Button[@clickable="true"]',
        '//android.widget.TextView[@clickable="true"]',
        '//androidx.recyclerview.widget.RecyclerView//android.widget.FrameLayout'
      ];

  let elements = [];
  for (const selector of selectors) {
    try {
      const found = await driver.$$(selector);
      elements = elements.concat(found);
    } catch (e) {
      // Selector may not match, continue
    }
  }

  // Limit to first 10 elements
  return elements.slice(0, 10);
}

/**
 * Check if an element should be skipped (e.g., navigation away, close buttons)
 */
async function shouldSkipElement(element) {
  try {
    const text = (await element.getText() || '').toLowerCase();
    const skipKeywords = ['close', 'cancel', 'back', 'logout', 'sign out', 'delete', 'remove'];
    
    for (const keyword of skipKeywords) {
      if (text.includes(keyword)) return true;
    }

    // Skip very small elements (might be icons/close buttons)
    const size = await element.getSize();
    if (size.width < 30 || size.height < 30) return true;

    return false;
  } catch (e) {
    return true; // Skip if we can't check
  }
}

/**
 * Explore navigation elements (tab bars, menus)
 */
async function exploreNav(driver, tracker, width, height, startTime, duration) {
  // Look for tab bar items (usually at bottom)
  const tabSelectors = [
    '//XCUIElementTypeTabBar//XCUIElementTypeButton',
    '//android.widget.BottomNavigationView//android.widget.FrameLayout',
    '//XCUIElementTypeNavigationBar//XCUIElementTypeButton',
    '//android.widget.ActionBar//android.widget.ImageButton'
  ];

  for (const selector of tabSelectors) {
    try {
      const tabs = await driver.$$(selector);
      
      // Visit up to 2 tabs
      for (const tab of tabs.slice(1, 3)) {
        if (Date.now() - startTime > duration - 4000) break;

        const location = await tab.getLocation();
        const size = await tab.getSize();
        const centerX = Math.round(location.x + size.width / 2);
        const centerY = Math.round(location.y + size.height / 2);

        // Record and tap
        tracker.recordTap(centerX, centerY, Date.now() - startTime);
        await tab.click();
        
        await sleep(1500);
        
        // Quick scroll on new tab
        await performScroll(driver, tracker, width, height, 400, 'down');
        await sleep(1000);
      }
    } catch (e) {
      // Navigation element not found or stale
      continue;
    }
  }
}

/**
 * Run a scripted demo from actions file
 */
export async function scriptedDemo(driver, tracker, actions, options = {}) {
  const { pauseMultiplier = 1 } = options;
  const { width, height } = await driver.getWindowRect();

  for (const action of actions) {
    const timestamp = Date.now();

    switch (action.type) {
      case 'tap':
        const tapX = action.x ?? (action.xPercent ? width * action.xPercent : width / 2);
        const tapY = action.y ?? (action.yPercent ? height * action.yPercent : height / 2);
        tracker.recordTap(tapX, tapY, timestamp);
        await driver.action('pointer')
          .move({ x: tapX, y: tapY, duration: 0 })
          .down()
          .pause(50)
          .up()
          .perform();
        break;

      case 'swipe':
        const swipeStartX = action.startX ?? width / 2;
        const swipeStartY = action.startY ?? height * 0.7;
        const swipeEndX = action.endX ?? width / 2;
        const swipeEndY = action.endY ?? height * 0.3;
        const swipeDuration = action.duration ?? 500;
        
        tracker.recordSwipe(swipeStartX, swipeStartY, swipeEndX, swipeEndY, swipeDuration, timestamp);
        await driver.action('pointer')
          .move({ x: swipeStartX, y: swipeStartY, duration: 0 })
          .down()
          .pause(100)
          .move({ x: swipeEndX, y: swipeEndY, duration: swipeDuration })
          .up()
          .perform();
        break;

      case 'longPress':
        const lpX = action.x ?? width / 2;
        const lpY = action.y ?? height / 2;
        const lpDuration = action.duration ?? 1000;
        
        tracker.recordTouch(lpX, lpY, 'began', timestamp);
        tracker.recordTouch(lpX, lpY, 'ended', timestamp + lpDuration);
        
        await driver.action('pointer')
          .move({ x: lpX, y: lpY, duration: 0 })
          .down()
          .pause(lpDuration)
          .up()
          .perform();
        break;

      case 'wait':
        await sleep((action.duration ?? 1000) * pauseMultiplier);
        break;

      case 'scroll':
        const direction = action.direction ?? 'down';
        await performScroll(driver, tracker, width, height, action.duration ?? 500, direction);
        break;
    }

    // Pause after each action
    if (action.pause) {
      await sleep(action.pause * pauseMultiplier);
    }
  }
}

export default autoDemo;
