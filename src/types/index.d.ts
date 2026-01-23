/**
 * LooK - Type Definitions
 * 
 * Main type exports for the LooK demo video generator.
 * Import types from this module for full TypeScript support.
 */

// Re-export all types
export * from './project.js';
export * from './options.js';
export * from './ai.js';

// Convenience type for importing all
import type { Project, ProjectMetadata, ProjectSettings, Timeline } from './project.js';
import type { 
  DemoOptions, 
  ZoomOptions, 
  CursorOptions, 
  ClickEffectOptions,
  RecordingOptions,
  ExportOptions,
  MobileDemoOptions
} from './options.js';
import type { 
  AIProviders, 
  WebsiteAnalysis, 
  FocusPoint, 
  SuggestedAction,
  ScriptOptions,
  VoiceoverOptions
} from './ai.js';

export {
  // Project types
  Project,
  ProjectMetadata,
  ProjectSettings,
  Timeline,
  
  // Options types
  DemoOptions,
  ZoomOptions,
  CursorOptions,
  ClickEffectOptions,
  RecordingOptions,
  ExportOptions,
  MobileDemoOptions,
  
  // AI types
  AIProviders,
  WebsiteAnalysis,
  FocusPoint,
  SuggestedAction,
  ScriptOptions,
  VoiceoverOptions
};
