/**
 * Custom Cursor Implementation Example
 * 
 * Demonstrates how to use LooK's cursor rendering API
 * to create custom cursor styles and effects.
 * 
 * Usage: node demo.js
 */

import { CursorRenderer, getCursorPreset, CURSOR_PRESETS } from 'look-demo/v2/cursor-renderer.js';
import { ClickEffectRenderer } from 'look-demo/v2/click-effects.js';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const OUTPUT_DIR = './output';

async function main() {
  console.log('🎨 LooK Custom Cursor Demo\n');
  
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  // -------------------------------------------------------------------------
  // Example 1: Basic cursor with custom colors
  // -------------------------------------------------------------------------
  console.log('1. Creating basic custom cursor...');
  
  const basicCursor = new CursorRenderer({
    style: 'arrow-modern',
    size: 40,
    color: '#FF5500',           // Orange cursor
    outlineColor: '#FFFFFF',    // White outline
    outlineWidth: 2,
    shadowBlur: 8,
    shadowOpacity: 0.5
  });
  
  const basicPath = await basicCursor.generateCursorImage(OUTPUT_DIR);
  console.log(`   ✓ Saved to ${basicPath}\n`);
  
  // -------------------------------------------------------------------------
  // Example 2: Cursor with glow effect
  // -------------------------------------------------------------------------
  console.log('2. Creating cursor with glow effect...');
  
  const glowCursor = new CursorRenderer({
    style: 'dot',
    size: 32,
    color: '#3B82F6',           // Blue
    glow: true,                 // Enable glow
    glowColor: '#3B82F6',
    glowIntensity: 0.7
  });
  
  const glowPath = await glowCursor.generateCursorImage(OUTPUT_DIR);
  console.log(`   ✓ Saved to ${glowPath}\n`);
  
  // -------------------------------------------------------------------------
  // Example 3: Using a preset
  // -------------------------------------------------------------------------
  console.log('3. Creating cursor from preset...');
  
  // Get preset configuration
  const githubPreset = getCursorPreset('github');
  console.log('   GitHub preset:', githubPreset);
  
  const presetCursor = new CursorRenderer({
    style: 'arrow-modern',
    size: 32,
    ...githubPreset,            // Apply preset colors
    glow: true                  // Add glow
  });
  
  const presetPath = await presetCursor.generateCursorImage(OUTPUT_DIR);
  console.log(`   ✓ Saved to ${presetPath}\n`);
  
  // -------------------------------------------------------------------------
  // Example 4: Spotlight cursor
  // -------------------------------------------------------------------------
  console.log('4. Creating spotlight cursor...');
  
  const spotlightCursor = new CursorRenderer({
    style: 'spotlight',
    size: 48,
    color: '#FFFFFF',
    shadowBlur: 20,
    shadowOpacity: 0.8
  });
  
  const spotlightPath = await spotlightCursor.generateCursorImage(OUTPUT_DIR);
  console.log(`   ✓ Saved to ${spotlightPath}\n`);
  
  // -------------------------------------------------------------------------
  // Example 5: Click effects
  // -------------------------------------------------------------------------
  console.log('5. Creating click effect renderer...');
  
  const clickRenderer = new ClickEffectRenderer({
    effect: 'ripple',
    color: '#FF5500',
    size: 80,
    duration: 500,
    opacity: 0.6
  });
  
  // Generate FFmpeg filter for click effects
  const clicks = [
    { x: 500, y: 300, t: 1000 },
    { x: 800, y: 450, t: 3500 },
    { x: 600, y: 600, t: 6000 }
  ];
  
  const filter = clickRenderer.generateSimpleFilter(clicks, 60);
  console.log('   FFmpeg filter preview:');
  console.log(`   ${filter.slice(0, 100)}...`);
  console.log();
  
  // -------------------------------------------------------------------------
  // Example 6: List all available presets
  // -------------------------------------------------------------------------
  console.log('6. Available cursor presets:');
  
  for (const [name, preset] of Object.entries(CURSOR_PRESETS)) {
    console.log(`   • ${name}: ${preset.color}`);
  }
  console.log();
  
  // -------------------------------------------------------------------------
  // Example 7: Generate all cursor styles
  // -------------------------------------------------------------------------
  console.log('7. Generating all cursor styles...');
  
  const styles = ['default', 'arrow-modern', 'pointer', 'dot', 'circle', 'crosshair'];
  
  for (const style of styles) {
    const cursor = new CursorRenderer({
      style,
      size: 32,
      color: '#000000'
    });
    
    const path = await cursor.generateCursorImage(OUTPUT_DIR);
    console.log(`   ✓ ${style}: ${path}`);
  }
  console.log();
  
  // -------------------------------------------------------------------------
  // Example 8: Brand-colored cursor set
  // -------------------------------------------------------------------------
  console.log('8. Creating brand-colored cursor set...');
  
  const brandColor = '#6366F1';  // Indigo
  
  // Normal cursor
  const brandNormal = new CursorRenderer({
    style: 'arrow-modern',
    size: 32,
    color: brandColor,
    outlineColor: '#FFFFFF',
    glow: false
  });
  
  // Click state cursor (slightly smaller)
  const brandClick = new CursorRenderer({
    style: 'arrow-modern',
    size: 28,
    color: brandColor,
    outlineColor: '#FFFFFF',
    glow: true
  });
  
  const normalPath = await brandNormal.generateCursorImage(OUTPUT_DIR, false);
  const clickPath = await brandClick.generateCursorImage(OUTPUT_DIR, true);
  
  console.log(`   ✓ Normal: ${normalPath}`);
  console.log(`   ✓ Click: ${clickPath}`);
  console.log();
  
  console.log('✅ All examples complete!');
  console.log(`   Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
