/**
 * Enhanced AI Module Type Definitions
 * Advanced AI capabilities for LooK
 */

import type { Page } from 'playwright';

/**
 * Available AI providers
 */
export interface AvailableProviders {
  openai: boolean;
  groq: boolean;
  anthropic: boolean;
}

/**
 * Interactive element extracted from the page
 */
export interface PageElement {
  type: 'interactive' | 'heading' | 'media';
  tag: string;
  text: string;
  selector: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  importance?: 'high' | 'medium' | 'low';
  isButton?: boolean;
  isLink?: boolean;
  href?: string | null;
  level?: number;
  alt?: string;
}

/**
 * Page metadata extracted from DOM
 */
export interface PageMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string;
  h1: string;
  favicon: string;
}

/**
 * Navigation item
 */
export interface NavigationItem {
  text: string;
  href: string;
}

/**
 * Page dimensions
 */
export interface PageDimensions {
  viewportWidth: number;
  viewportHeight: number;
  pageWidth: number;
  pageHeight: number;
  scrollX: number;
  scrollY: number;
}

/**
 * Page section for scroll targets
 */
export interface PageSection {
  id: string | null;
  className: string | null;
  y: number;
  height: number;
}

/**
 * Complete page information from DOM extraction
 */
export interface PageInfo {
  elements: PageElement[];
  meta: PageMeta;
  navigation: NavigationItem[];
  dimensions: PageDimensions;
  sections: PageSection[];
  url: string;
}

/**
 * Screenshot capture result
 */
export interface ScreenshotCapture {
  base64: string;
  scrollY: number;
  index: number;
}

/**
 * Options for full-page capture
 */
export interface CaptureOptions {
  maxScreenshots?: number;
  overlap?: number;
}

/**
 * Focus point in enhanced analysis
 */
export interface EnhancedFocusPoint {
  element: string;
  selector?: string;
  x: number;
  y: number;
  importance: 'high' | 'medium';
  reason: string;
}

/**
 * Demo journey step
 */
export interface DemoJourneyStep {
  step: number;
  action: 'scroll' | 'click' | 'hover' | 'wait' | 'moveTo';
  target: string;
  x: number;
  y: number;
  scrollY?: number;
  duration: number;
  narration: string;
}

/**
 * Enhanced website analysis result
 */
export interface EnhancedWebsiteAnalysis {
  name: string;
  tagline: string;
  description: string;
  targetAudience: string;
  painPoint: string;
  keyFeatures: string[];
  uniqueValue: string;
  tone: 'professional' | 'casual' | 'technical' | 'playful' | 'enterprise';
  visualStyle: 'minimal' | 'colorful' | 'dark' | 'light' | 'corporate';
  focusPoints: EnhancedFocusPoint[];
  demoJourney: DemoJourneyStep[];
  suggestedHook: string;
  callToAction: string;
  _pageInfo?: PageInfo;
}

/**
 * Options for enhanced website analysis
 */
export interface AnalysisOptions {
  detail?: 'low' | 'high';
  includeDOM?: boolean;
  multiScreenshot?: boolean;
}

/**
 * Chain-of-thought journey step
 */
export interface CoTJourneyStep {
  goal: string;
  element: string;
  emotion: string;
}

/**
 * Chain-of-thought action
 */
export interface CoTAction {
  step: number;
  action: 'scroll' | 'moveTo' | 'click' | 'hover' | 'wait';
  selector?: string;
  x?: number;
  y?: number;
  scrollY?: number;
  duration: number;
  description: string;
}

/**
 * Timed script entry
 */
export interface TimedScriptEntry {
  time: number;
  endTime: number;
  action: string;
  params: Record<string, any>;
  narration: string;
}

/**
 * Complete chain-of-thought demo plan
 */
export interface DemoPlan {
  journey: CoTJourneyStep[];
  actions: CoTAction[];
  script: TimedScriptEntry[];
  analysis: EnhancedWebsiteAnalysis;
}

/**
 * Options for demo planning
 */
export interface PlanOptions {
  duration?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

/**
 * Options for script generation
 */
export interface ScriptOptions {
  duration?: number;
  style?: 'professional' | 'casual' | 'energetic' | 'minimal' | 'storytelling';
  includeCallToAction?: boolean;
  preferClaude?: boolean;
}

/**
 * Smart action for demo
 */
export interface SmartAction {
  time: number;
  action: 'scroll' | 'moveTo' | 'click' | 'hover' | 'wait';
  x?: number;
  y?: number;
  scrollY?: number;
  selector?: string;
  duration: number;
  description: string;
}

/**
 * Options for action generation
 */
export interface ActionOptions {
  duration?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

/**
 * Check available AI providers
 */
export function getAvailableProviders(): AvailableProviders;

/**
 * Extract interactive elements from page with precise selectors
 */
export function extractPageElements(page: Page): Promise<PageInfo>;

/**
 * Capture multiple screenshots of the full page
 */
export function captureFullPage(page: Page, options?: CaptureOptions): Promise<ScreenshotCapture[]>;

/**
 * Analyze website with multi-screenshot full-page understanding
 */
export function analyzeWebsiteEnhanced(page: Page, options?: AnalysisOptions): Promise<EnhancedWebsiteAnalysis>;

/**
 * Generate demo script using chain-of-thought reasoning
 */
export function planDemoWithCoT(analysis: EnhancedWebsiteAnalysis, options?: PlanOptions): Promise<DemoPlan>;

/**
 * Generate voiceover script using best available model
 */
export function generateScriptEnhanced(analysis: EnhancedWebsiteAnalysis, options?: ScriptOptions): Promise<string>;

/**
 * Generate demo actions from analysis with real element selectors
 */
export function generateSmartActions(analysis: EnhancedWebsiteAnalysis, options?: ActionOptions): SmartAction[];
