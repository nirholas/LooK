/**
 * AI-related type definitions
 */

/**
 * Available AI providers status
 */
export interface AIProviders {
  /** OpenAI API available */
  openai: boolean;
  /** Groq API available */
  groq: boolean;
}

/**
 * Focus point from website analysis
 */
export interface FocusPoint {
  /** Element description */
  element: string;
  /** X position as percentage (0-100) */
  x: number;
  /** Y position as percentage (0-100) */
  y: number;
  /** Importance level */
  importance: 'high' | 'medium' | 'low';
}

/**
 * Suggested action from website analysis
 */
export interface SuggestedAction {
  /** Action type */
  type: 'scroll' | 'click' | 'hover';
  /** Target element description */
  target: string;
  /** Reason for this action */
  reason: string;
}

/**
 * Website analysis result from GPT-4 Vision
 */
export interface WebsiteAnalysis {
  /** Product/site name */
  name?: string;
  /** One-line value proposition */
  tagline?: string;
  /** 2-3 sentence description */
  description?: string;
  /** Target audience description */
  targetAudience?: string;
  /** Key features list */
  keyFeatures?: string[];
  /** Focus points on the page */
  focusPoints?: FocusPoint[];
  /** Suggested demo actions */
  suggestedActions?: SuggestedAction[];
  /** Content tone */
  tone?: 'professional' | 'casual' | 'technical' | 'friendly';
}

/**
 * Website metadata for analysis
 */
export interface WebsiteMetadata {
  /** Page URL */
  url?: string;
  /** Page title */
  title?: string;
  /** Meta description */
  description?: string;
}

/**
 * Script generation options
 */
export interface ScriptOptions {
  /** Target duration in seconds */
  duration?: number;
  /** Script style */
  style?: 'professional' | 'casual' | 'energetic' | 'minimal';
  /** Include call-to-action */
  includeCallToAction?: boolean;
  /** Force specific AI provider */
  forceProvider?: 'groq' | 'openai' | null;
}

/**
 * Voiceover generation options
 */
export interface VoiceoverOptions {
  /** Voice selection */
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  /** Speech speed (0.25 to 4.0) */
  speed?: number;
  /** Output file path */
  outputPath?: string | null;
}

/**
 * Demo action for auto-navigation
 */
export interface DemoAction {
  /** Action type */
  type: 'scroll' | 'hover' | 'wait' | 'click';
  /** Scroll Y position */
  y?: number;
  /** CSS selector for target */
  selector?: string;
  /** Wait time after action in ms */
  wait?: number;
  /** Duration for wait action in ms */
  duration?: number;
}

/**
 * Compressed image result for vision API
 */
export interface CompressedImage {
  /** Base64-encoded image data */
  base64: string;
  /** Image MIME type */
  mimeType: 'image/jpeg' | 'image/png';
}

/**
 * Chat message for AI APIs
 */
export interface ChatMessage {
  /** Message role */
  role: 'system' | 'user' | 'assistant';
  /** Message content (string or multimodal) */
  content: string | ChatMessageContent[];
}

/**
 * Multimodal message content
 */
export type ChatMessageContent = TextContent | ImageContent;

/**
 * Text content in chat message
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Image content in chat message
 */
export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}
