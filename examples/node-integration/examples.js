/**
 * LooK Node.js Integration Examples
 * 
 * Complete examples of using LooK programmatically
 */

import { generateDemoV2 } from 'look-demo';
import { Project } from 'look-demo/v2/project.js';

// =============================================================================
// Example 1: Basic Demo Generation
// =============================================================================

async function basicDemo() {
  console.log('📹 Generating basic demo...');
  
  const result = await generateDemoV2('https://stripe.com', {
    output: './output/basic-demo.mp4',
    duration: 25
  });
  
  console.log('✅ Done:', result.output);
}

// =============================================================================
// Example 2: Fully Customized Demo
// =============================================================================

async function customDemo() {
  console.log('🎨 Generating customized demo...');
  
  const result = await generateDemoV2('https://linear.app', {
    // Output settings
    output: './output/custom-demo.mp4',
    duration: 45,
    preset: 'youtube',
    width: 1920,
    height: 1080,
    
    // Voice & style
    voice: 'nova',
    style: 'professional',
    
    // Cursor
    cursorStyle: 'arrow-modern',
    cursorSize: 36,
    cursorPreset: 'dark',
    cursorGlow: true,
    
    // Click effects
    clickEffect: 'ripple',
    clickEffectColor: '#5E6AD2',
    clickEffectSize: 70,
    clickEffectDuration: 450,
    
    // Zoom
    zoomMode: 'smart',
    maxZoom: 1.7,
    minZoom: 1.0,
    followIntensity: 0.5
  });
  
  console.log('✅ Done:', result.output);
}

// =============================================================================
// Example 3: Batch Processing
// =============================================================================

async function batchDemo() {
  const sites = [
    { name: 'homepage', url: 'https://myapp.com' },
    { name: 'features', url: 'https://myapp.com/features' },
    { name: 'pricing', url: 'https://myapp.com/pricing' }
  ];
  
  console.log(`📦 Processing ${sites.length} sites...`);
  
  for (const site of sites) {
    console.log(`  Processing ${site.name}...`);
    
    try {
      await generateDemoV2(site.url, {
        output: `./output/${site.name}-demo.mp4`,
        duration: 25,
        voice: 'nova',
        style: 'professional'
      });
      console.log(`  ✅ ${site.name} complete`);
    } catch (error) {
      console.error(`  ❌ ${site.name} failed:`, error.message);
    }
  }
  
  console.log('📦 Batch complete!');
}

// =============================================================================
// Example 4: Multi-Platform Export
// =============================================================================

async function multiPlatformExport() {
  const url = 'https://myapp.com';
  
  const platforms = [
    { name: 'youtube', duration: 30, preset: 'youtube' },
    { name: 'twitter', duration: 15, preset: 'twitter', style: 'energetic' },
    { name: 'instagram', duration: 30, preset: 'instagram' },
    { name: 'tiktok', duration: 15, preset: 'tiktok', style: 'energetic' }
  ];
  
  console.log(`🌐 Exporting for ${platforms.length} platforms...`);
  
  for (const platform of platforms) {
    console.log(`  Generating ${platform.name}...`);
    
    await generateDemoV2(url, {
      output: `./output/demo-${platform.name}.mp4`,
      duration: platform.duration,
      preset: platform.preset,
      style: platform.style || 'professional',
      voice: 'nova'
    });
    
    console.log(`  ✅ ${platform.name} done`);
  }
}

// =============================================================================
// Example 5: Project Management
// =============================================================================

async function projectManagement() {
  // List all projects
  const projects = await Project.list();
  console.log('📁 Existing projects:', projects.length);
  
  // Create a new project
  const project = await Project.create({
    name: 'My Demo Project',
    url: 'https://myapp.com',
    settings: {
      duration: 30,
      voice: 'nova',
      style: 'professional'
    }
  });
  
  console.log('📁 Created project:', project.id);
  
  // Load and update
  const loaded = await Project.load(project.id);
  loaded.name = 'Updated Project Name';
  await loaded.save();
  
  console.log('📁 Updated project:', loaded.name);
}

// =============================================================================
// Example 6: Silent Demo (No Voice)
// =============================================================================

async function silentDemo() {
  console.log('🔇 Generating silent demo...');
  
  await generateDemoV2('https://example.com', {
    output: './output/silent-demo.mp4',
    duration: 20,
    skipVoice: true,
    skipAnalysis: true,  // Faster without AI
    zoomMode: 'basic',
    cursorStyle: 'dot',
    cursorGlow: true,
    clickEffect: 'pulse'
  });
  
  console.log('✅ Silent demo complete');
}

// =============================================================================
// Example 7: Dry Run (Preview Only)
// =============================================================================

async function dryRunDemo() {
  console.log('🔍 Preview mode (dry run)...');
  
  await generateDemoV2('https://stripe.com', {
    duration: 25,
    dryRun: true  // Only shows analysis and script
  });
  
  console.log('🔍 Dry run complete - no video generated');
}

// =============================================================================
// Example 8: Error Handling
// =============================================================================

async function withErrorHandling() {
  try {
    await generateDemoV2('https://myapp.com', {
      output: './output/demo.mp4',
      duration: 30
    });
  } catch (error) {
    if (error.message.includes('FFmpeg')) {
      console.error('❌ FFmpeg not installed');
      console.log('   Install with: apt install ffmpeg');
    } else if (error.message.includes('OpenAI')) {
      console.error('❌ OpenAI API error');
      console.log('   Check your OPENAI_API_KEY');
    } else if (error.message.includes('Playwright')) {
      console.error('❌ Browser error');
      console.log('   Run: npx playwright install chromium');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
    process.exit(1);
  }
}

// =============================================================================
// Run Examples
// =============================================================================

async function main() {
  const example = process.argv[2] || 'basic';
  
  const examples = {
    basic: basicDemo,
    custom: customDemo,
    batch: batchDemo,
    multiplatform: multiPlatformExport,
    projects: projectManagement,
    silent: silentDemo,
    dryrun: dryRunDemo,
    errors: withErrorHandling
  };
  
  if (!examples[example]) {
    console.log('Available examples:', Object.keys(examples).join(', '));
    process.exit(1);
  }
  
  await examples[example]();
}

main().catch(console.error);
