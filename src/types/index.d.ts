/**
 * LooK - Type Definitions
 * 
 * Main type exports for the LooK demo video generator.
 * Import types from this module for full TypeScript support.
 */

// Re-export all types
export * from './project';
export * from './options';
export * from './ai';

// Convenience type for importing all
import type { ProjectJSON, ProjectMetadata, ProjectSettings, Timeline } from './project';
import type { 
  DemoOptions, 
  ZoomOptions, 
  CursorOptions, 
  ClickEffectOptions,
  RecordingOptions,
  ExportOptions,
  MobileDemoOptions
} from './options';
import type { 
  AIProviders, 
  WebsiteAnalysis, 
  FocusPoint, 
  SuggestedAction,
  ScriptOptions,
  VoiceoverOptions
} from './ai';

export {
  // Project types
  ProjectJSON,
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
