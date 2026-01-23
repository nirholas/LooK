/**
 * Project-related type definitions
 */

import type { WebsiteAnalysis } from './ai.js';

/**
 * Zoom settings for the video
 */
export interface ZoomSettings {
  /** Zoom mode: none, basic, smart, or follow cursor */
  mode: 'none' | 'basic' | 'smart' | 'follow';
  /** How closely camera follows cursor (0-1) */
  intensity: number;
  /** Maximum zoom level */
  maxZoom: number;
  /** Minimum zoom level */
  minZoom: number;
  /** Zoom in on click events */
  onClicks: boolean;
  /** Zoom in on hover pauses */
  onHover: boolean;
  /** Zoom animation speed */
  speed: 'slow' | 'medium' | 'fast';
}

/**
 * Cursor appearance settings
 */
export interface CursorSettings {
  /** Cursor visual style */
  style: 'default' | 'arrow-modern' | 'pointer' | 'dot' | 'circle' | 'crosshair' | 'spotlight' | 'none';
  /** Cursor size in pixels */
  size: number;
  /** Cursor color (hex) */
  color: string;
}

/**
 * Click effect appearance settings
 */
export interface ClickEffectSettings {
  /** Click effect type */
  type: 'ripple' | 'pulse' | 'ring' | 'spotlight' | 'none';
  /** Effect color (hex) */
  color: string;
  /** Effect size in pixels */
  size: number;
  /** Effect duration in milliseconds */
  duration: number;
  /** Effect opacity (0-1) */
  opacity: number;
}

/**
 * Complete project settings
 */
export interface ProjectSettings {
  /** Target video duration in seconds */
  duration: number;
  /** Voice for TTS */
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  /** Script/voiceover style */
  style: 'professional' | 'casual' | 'energetic' | 'minimal';
  /** Export preset */
  preset: 'youtube' | 'twitter' | 'instagram' | 'tiktok' | 'gif';
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Frames per second */
  fps: number;
  /** Zoom settings */
  zoom: ZoomSettings;
  /** Cursor settings */
  cursor: CursorSettings;
  /** Click effect settings */
  clickEffect: ClickEffectSettings;
}

/**
 * Timeline marker for section annotations
 */
export interface TimelineMarker {
  /** Time position in seconds */
  time: number;
  /** Marker label */
  label: string;
}

/**
 * Timeline state for video editing
 */
export interface Timeline {
  /** Start trim point in seconds */
  trimStart: number;
  /** End trim point in seconds (null = full length) */
  trimEnd: number | null;
  /** Section markers */
  markers: TimelineMarker[];
  /** Actual video duration in seconds */
  duration: number;
}

/**
 * Cursor position data point
 */
export interface CursorPosition {
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
  /** Timestamp in milliseconds */
  timestamp: number;
}

/**
 * Click event data
 */
export interface ClickEvent {
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
  /** Timestamp in milliseconds */
  timestamp: number;
}

/**
 * Complete cursor tracking data
 */
export interface CursorData {
  /** Array of cursor positions over time */
  positions: CursorPosition[];
  /** Array of click events */
  clicks: ClickEvent[];
}

/**
 * Zoom keyframe for animation
 */
export interface ZoomKeyframe {
  /** Time in milliseconds */
  time: number;
  /** Zoom level (1.0 = no zoom) */
  zoom: number;
  /** Center X position (0-1 normalized) */
  centerX: number;
  /** Center Y position (0-1 normalized) */
  centerY: number;
  /** Easing function */
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

/**
 * Project metadata for listing/summaries
 */
export interface ProjectMetadata {
  /** Unique project ID */
  id: string;
  /** Source URL */
  url: string | null;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Project display name */
  name: string;
}

/**
 * Project JSON representation for API responses
 */
export interface ProjectJSON {
  /** Unique project ID */
  id: string;
  /** Source URL */
  url: string | null;
  /** AI analysis results */
  analysis: WebsiteAnalysis | null;
  /** Voiceover script */
  script: string | null;
  /** Project settings */
  settings: ProjectSettings;
  /** Timeline state */
  timeline: Timeline;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Whether raw video exists */
  hasRawVideo: boolean;
  /** Whether voiceover exists */
  hasVoiceover: boolean;
  /** Whether cursor data exists */
  hasCursorData: boolean;
}

/**
 * Progress callback event
 */
export interface ProgressEvent {
  /** Current processing stage */
  stage: 'processing' | 'exporting' | 'complete';
  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Export options for final video
 */
export interface ProjectExportOptions {
  /** Progress callback */
  onProgress?: ProgressCallback | null;
}
