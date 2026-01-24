import { describe, it, expect } from 'vitest';
import { 
  generateYouTubeChapters, 
  generateZoomFromMarkers,
  applyMarkerTemplate,
  MarkerType 
} from '../../src/v2/markers.js';

describe('Markers', () => {
  describe('generateYouTubeChapters', () => {
    it('should format markers as YouTube chapters', () => {
      const markers = [
        { time: 0, label: 'Intro', type: MarkerType.CHAPTER },
        { time: 30, label: 'Features', type: MarkerType.CHAPTER },
        { time: 90, label: 'Pricing', type: MarkerType.CHAPTER }
      ];
      
      const result = generateYouTubeChapters(markers);
      
      expect(result).toBe('0:00 Intro\n0:30 Features\n1:30 Pricing');
    });
    
    it('should add intro at 0:00 if missing', () => {
      const markers = [
        { time: 10, label: 'First Section', type: MarkerType.CHAPTER }
      ];
      
      const result = generateYouTubeChapters(markers);
      
      expect(result).toContain('0:00 Intro');
    });
    
    it('should filter non-chapter markers', () => {
      const markers = [
        { time: 0, label: 'Start', type: MarkerType.CHAPTER },
        { time: 15, label: 'Zoom Here', type: MarkerType.ZOOM },
        { time: 30, label: 'End', type: MarkerType.CHAPTER }
      ];
      
      const result = generateYouTubeChapters(markers);
      
      expect(result).not.toContain('Zoom Here');
    });
  });
  
  describe('generateZoomFromMarkers', () => {
    it('should create zoom keyframes from zoom markers', () => {
      const markers = [
        { time: 5, type: MarkerType.ZOOM, metadata: { zoom: 1.5 } },
        { time: 10, type: MarkerType.ZOOM, metadata: { zoom: 1.8 } }
      ];
      
      const result = generateZoomFromMarkers(markers);
      
      expect(result).toHaveLength(2);
      expect(result[0].time).toBe(5000);
      expect(result[0].zoom).toBe(1.5);
    });
  });
  
  describe('applyMarkerTemplate', () => {
    it('should apply SaaS demo template', () => {
      const markers = applyMarkerTemplate('saas_demo', 60);
      
      expect(markers.length).toBeGreaterThan(0);
      expect(markers[0].time).toBe(0);
      expect(markers[0].label).toBe('Introduction');
    });
    
    it('should return empty array for unknown template', () => {
      const markers = applyMarkerTemplate('unknown', 60);
      
      expect(markers).toEqual([]);
    });
  });
});
