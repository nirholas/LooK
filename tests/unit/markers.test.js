import { describe, it, expect } from 'vitest';
import { 
  generateYouTubeChapters, 
  generateZoomFromMarkers,
  applyMarkerTemplate,
  MarkerType,
  MarkerTemplates
} from '../../src/v2/markers.js';

describe('Markers', () => {
  describe('MarkerType', () => {
    it('should have all expected types', () => {
      expect(MarkerType.CHAPTER).toBe('chapter');
      expect(MarkerType.ZOOM).toBe('zoom');
      expect(MarkerType.HIGHLIGHT).toBe('highlight');
      expect(MarkerType.CUT).toBe('cut');
      expect(MarkerType.CUSTOM).toBe('custom');
    });
  });

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
      expect(result).toContain('0:10 First Section');
    });
    
    it('should filter non-chapter markers', () => {
      const markers = [
        { time: 0, label: 'Start', type: MarkerType.CHAPTER },
        { time: 15, label: 'Zoom Here', type: MarkerType.ZOOM },
        { time: 30, label: 'End', type: MarkerType.CHAPTER }
      ];
      
      const result = generateYouTubeChapters(markers);
      
      expect(result).not.toContain('Zoom Here');
      expect(result).toContain('Start');
      expect(result).toContain('End');
    });
    
    it('should include highlight markers', () => {
      const markers = [
        { time: 0, label: 'Start', type: MarkerType.CHAPTER },
        { time: 20, label: 'Key Feature', type: MarkerType.HIGHLIGHT }
      ];
      
      const result = generateYouTubeChapters(markers);
      
      expect(result).toContain('Key Feature');
    });
    
    it('should return empty string for no chapter markers', () => {
      const markers = [
        { time: 5, label: 'Zoom', type: MarkerType.ZOOM },
        { time: 10, label: 'Cut', type: MarkerType.CUT }
      ];
      
      expect(generateYouTubeChapters(markers)).toBe('');
    });
    
    it('should sort markers by time', () => {
      const markers = [
        { time: 60, label: 'End', type: MarkerType.CHAPTER },
        { time: 0, label: 'Start', type: MarkerType.CHAPTER },
        { time: 30, label: 'Middle', type: MarkerType.CHAPTER }
      ];
      
      const result = generateYouTubeChapters(markers);
      const lines = result.split('\n');
      
      expect(lines[0]).toContain('Start');
      expect(lines[1]).toContain('Middle');
      expect(lines[2]).toContain('End');
    });
    
    it('should format hours correctly', () => {
      const markers = [
        { time: 0, label: 'Start', type: MarkerType.CHAPTER },
        { time: 3665, label: 'After an hour', type: MarkerType.CHAPTER }
      ];
      
      const result = generateYouTubeChapters(markers);
      
      expect(result).toContain('1:01:05 After an hour');
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
      expect(result[1].time).toBe(10000);
      expect(result[1].zoom).toBe(1.8);
    });
    
    it('should use default zoom if not specified in metadata', () => {
      const markers = [
        { time: 5, type: MarkerType.ZOOM }
      ];
      
      const result = generateZoomFromMarkers(markers);
      
      expect(result[0].zoom).toBe(1.4); // default
    });
    
    it('should allow custom default zoom', () => {
      const markers = [
        { time: 5, type: MarkerType.ZOOM }
      ];
      
      const result = generateZoomFromMarkers(markers, { defaultZoom: 2.0 });
      
      expect(result[0].zoom).toBe(2.0);
    });
    
    it('should use default position if not in metadata', () => {
      const markers = [
        { time: 5, type: MarkerType.ZOOM }
      ];
      
      const result = generateZoomFromMarkers(markers);
      
      expect(result[0].x).toBe(0.5);
      expect(result[0].y).toBe(0.5);
    });
    
    it('should use custom position from metadata', () => {
      const markers = [
        { time: 5, type: MarkerType.ZOOM, metadata: { x: 0.3, y: 0.7 } }
      ];
      
      const result = generateZoomFromMarkers(markers);
      
      expect(result[0].x).toBe(0.3);
      expect(result[0].y).toBe(0.7);
    });
    
    it('should filter out non-zoom markers', () => {
      const markers = [
        { time: 5, type: MarkerType.ZOOM },
        { time: 10, type: MarkerType.CHAPTER },
        { time: 15, type: MarkerType.ZOOM }
      ];
      
      const result = generateZoomFromMarkers(markers);
      
      expect(result).toHaveLength(2);
    });
    
    it('should apply custom duration', () => {
      const markers = [
        { time: 5, type: MarkerType.ZOOM }
      ];
      
      const result = generateZoomFromMarkers(markers, { duration: 2000 });
      
      expect(result[0].duration).toBe(2000);
    });
  });
  
  describe('MarkerTemplates', () => {
    it('should have saas_demo template', () => {
      expect(MarkerTemplates.saas_demo).toBeDefined();
      expect(MarkerTemplates.saas_demo.length).toBeGreaterThan(0);
    });
    
    it('should have product_tour template', () => {
      expect(MarkerTemplates.product_tour).toBeDefined();
      expect(MarkerTemplates.product_tour.length).toBeGreaterThan(0);
    });
    
    it('should have tutorial template', () => {
      expect(MarkerTemplates.tutorial).toBeDefined();
      expect(MarkerTemplates.tutorial.length).toBeGreaterThan(0);
    });
  });
  
  describe('applyMarkerTemplate', () => {
    it('should apply SaaS demo template', () => {
      const markers = applyMarkerTemplate('saas_demo', 60);
      
      expect(markers.length).toBeGreaterThan(0);
      expect(markers[0].time).toBe(0);
      expect(markers[0].label).toBe('Introduction');
      expect(markers[0].type).toBe(MarkerType.CHAPTER);
    });
    
    it('should apply product_tour template', () => {
      const markers = applyMarkerTemplate('product_tour', 100);
      
      expect(markers[0].label).toBe('Welcome');
      expect(markers[0].time).toBe(0);
    });
    
    it('should apply tutorial template', () => {
      const markers = applyMarkerTemplate('tutorial', 120);
      
      expect(markers[0].label).toBe('Overview');
      expect(markers.some(m => m.label === 'Step 1')).toBe(true);
    });
    
    it('should return empty array for unknown template', () => {
      const markers = applyMarkerTemplate('unknown', 60);
      
      expect(markers).toEqual([]);
    });
    
    it('should calculate times based on duration', () => {
      const markers = applyMarkerTemplate('saas_demo', 100);
      
      // saas_demo has offset 0.1 for Dashboard Overview
      const dashboardMarker = markers.find(m => m.label === 'Dashboard Overview');
      expect(dashboardMarker.time).toBe(10); // 0.1 * 100
    });
    
    it('should assign unique IDs to markers', () => {
      const markers = applyMarkerTemplate('saas_demo', 60);
      const ids = markers.map(m => m.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
