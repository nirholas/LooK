/**
 * CLI and API option type definitions
 */

/**
 * Zoom mode options
 */
export type ZoomMode = 'none' | 'basic' | 'smart' | 'follow';

/**
 * Zoom animation speed
 */
export type ZoomSpeed = 'slow' | 'medium' | 'fast';

/**
 * Cursor style options
 */
export type CursorStyle = 'default' | 'arrow-modern' | 'pointer' | 'dot' | 'circle' | 'crosshair' | 'spotlight' | 'none';

/**
 * Cursor preset options
 */
export type CursorPreset = 'light' | 'dark' | 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'github' | 'figma' | 'notion';

/**
 * Click effect type options
 */
export type ClickEffectType = 'ripple' | 'pulse' | 'ring' | 'spotlight' | 'none';

/**
 * Export preset options
 */
export type ExportPreset = 'youtube' | 'twitter' | 'instagram' | 'tiktok' | 'gif';

/**
 * Voice options for TTS
 */
export type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Script style options
 */
export type ScriptStyle = 'professional' | 'casual' | 'energetic' | 'minimal';

/**
 * Touch indicator type for mobile
 */
export type TouchIndicator = 'circle' | 'finger' | 'ripple' | 'dot';

/**
 * Mobile platform options
 */
export type MobilePlatform = 'ios' | 'android';

/**
 * Mobile orientation options
 */
export type MobileOrientation = 'portrait' | 'landscape';

/**
 * Zoom-related options
 */
export interface ZoomOptions {
  /** Zoom mode: none, basic, smart, or follow cursor */
  zoomMode?: ZoomMode;
  /** How closely camera follows cursor (0-1) */
  followIntensity?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Zoom in on click events */
  zoomOnClicks?: boolean;
  /** Zoom in on hover pauses */
  zoomOnHover?: boolean;
  /** Zoom animation speed */
  zoomSpeed?: ZoomSpeed;
}

/**
 * Cursor-related options
 */
export interface CursorOptions {
  /** Cursor visual style */
  cursorStyle?: CursorStyle;
  /** Cursor size in pixels */
  cursorSize?: number;
  /** Cursor color (hex) */
  cursorColor?: string;
  /** Cursor preset name */
  cursorPreset?: CursorPreset | null;
  /** Add glow effect to cursor */
  cursorGlow?: boolean;
}

/**
 * Click effect options
 */
export interface ClickEffectOptions {
  /** Click effect type */
  clickEffect?: ClickEffectType;
  /** Click effect color (hex) */
  clickEffectColor?: string;
  /** Click effect size in pixels */
  clickEffectSize?: number;
  /** Click effect duration in ms */
  clickEffectDuration?: number;
}

/**
 * Complete demo generation options
 */
export interface DemoOptions extends ZoomOptions, CursorOptions, ClickEffectOptions {
  /** Output file path */
  output?: string;
  /** Target duration in seconds */
  duration?: number;
  /** Voice for TTS */
  voice?: Voice;
  /** Script style */
  style?: ScriptStyle;
  /** Export preset */
  preset?: ExportPreset;
  /** Skip voiceover generation */
  skipVoice?: boolean;
  /** Skip AI analysis */
  skipAnalysis?: boolean;
  /** Dry run (don't generate video) */
  dryRun?: boolean;
  /** Video width in pixels */
  width?: number;
  /** Video height in pixels */
  height?: number;
}

/**
 * Browser recording options
 */
export interface RecordingOptions {
  /** Video width in pixels */
  width?: number;
  /** Video height in pixels */
  height?: number;
  /** Frames per second */
  fps?: number;
  /** Recording duration in milliseconds */
  duration?: number;
  /** Optional scripted actions */
  actions?: ScriptedAction[] | null;
}

/**
 * Scripted action types
 */
export type ScriptedActionType = 'click' | 'scroll' | 'hover' | 'type' | 'wait';

/**
 * Scripted action definition
 */
export interface ScriptedAction {
  /** Action type */
  type: ScriptedActionType;
  /** CSS selector for target element */
  selector?: string;
  /** Scroll Y position */
  y?: number;
  /** Text to type */
  text?: string;
  /** Wait duration in ms */
  duration?: number;
  /** Post-action wait time in ms */
  wait?: number;
}

/**
 * Export options for final video rendering
 */
export interface ExportOptions {
  /** Output file path */
  outputPath?: string;
  /** Add motion blur effect */
  addMotionBlur?: boolean;
  /** Add vignette effect */
  addVignette?: boolean;
  /** Add color grading */
  addColorGrade?: boolean;
  /** Render cursor overlay */
  renderCursor?: boolean;
}

/**
 * Post-processing options
 */
export interface PostProcessOptions extends ExportOptions, CursorOptions, ClickEffectOptions {
  /** Cursor tracking data */
  cursorData?: import('./project.js').CursorData | null;
  /** Zoom keyframes */
  zoomKeyframes?: import('./project.js').ZoomKeyframe[] | null;
  /** Video width */
  width?: number;
  /** Video height */
  height?: number;
  /** Frames per second */
  fps?: number;
}

/**
 * Mobile demo generation options
 */
export interface MobileDemoOptions extends Omit<DemoOptions, 'width' | 'height'> {
  /** Mobile platform */
  platform?: MobilePlatform;
  /** Device name */
  device?: string;
  /** Screen orientation */
  orientation?: MobileOrientation;
  /** Touch indicator style */
  touchIndicator?: TouchIndicator;
  /** Touch indicator color */
  touchIndicatorColor?: string;
  /** Touch indicator size */
  touchIndicatorSize?: number;
  /** Show touch trails */
  showTouchTrail?: boolean;
  /** Touch trail length */
  touchTrailLength?: number;
  /** Show device frame overlay */
  showDeviceFrame?: boolean;
  /** App bundle ID (iOS) or package name (Android) */
  appId?: string;
  /** Appium server URL */
  appiumUrl?: string;
}

/**
 * Demo result from generateDemo
 */
export interface DemoResult {
  /** Output file path */
  output: string;
  /** Generated script */
  script: string | null;
  /** Website analysis */
  analysis: import('./ai.js').WebsiteAnalysis | null;
  /** Cursor tracking data */
  cursorData: import('./project.js').CursorData | null;
  /** Zoom keyframes */
  zoomKeyframes: import('./project.js').ZoomKeyframe[] | null;
}
