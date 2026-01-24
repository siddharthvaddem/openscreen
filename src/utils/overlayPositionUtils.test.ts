// src/utils/overlayPositionUtils.test.ts

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateOverlayPosition,
  isValidOverlayPosition,
  isPositionWithinBounds,
  MARGIN,
  VALID_POSITIONS,
  type OverlayPosition,
  type DisplayBounds,
  type WindowDimensions,
} from './overlayPositionUtils';

describe('overlayPositionUtils', () => {
  // ============================================
  // Unit Tests
  // ============================================
  
  describe('calculateOverlayPosition', () => {
    const standardDisplay: DisplayBounds = { x: 0, y: 0, width: 1920, height: 1080 };
    const standardWindow: WindowDimensions = { width: 400, height: 100 };
    
    describe('bottom-center position', () => {
      it('should center horizontally and position at bottom with margin', () => {
        const result = calculateOverlayPosition('bottom-center', standardDisplay, standardWindow);
        
        // Horizontal center: (1920 - 400) / 2 = 760
        expect(result.x).toBe(760);
        // Bottom with margin: 1080 - 100 - 50 = 930
        expect(result.y).toBe(930);
      });
    });
    
    describe('bottom-left position', () => {
      it('should position at left edge with margin and bottom with margin', () => {
        const result = calculateOverlayPosition('bottom-left', standardDisplay, standardWindow);
        
        // Left with margin: 50
        expect(result.x).toBe(MARGIN);
        // Bottom with margin: 1080 - 100 - 50 = 930
        expect(result.y).toBe(930);
      });
    });
    
    describe('bottom-right position', () => {
      it('should position at right edge with margin and bottom with margin', () => {
        const result = calculateOverlayPosition('bottom-right', standardDisplay, standardWindow);
        
        // Right with margin: 1920 - 400 - 50 = 1470
        expect(result.x).toBe(1470);
        // Bottom with margin: 1080 - 100 - 50 = 930
        expect(result.y).toBe(930);
      });
    });
    
    describe('top-center position', () => {
      it('should center horizontally and position at top with margin', () => {
        const result = calculateOverlayPosition('top-center', standardDisplay, standardWindow);
        
        // Horizontal center: (1920 - 400) / 2 = 760
        expect(result.x).toBe(760);
        // Top with margin: 50
        expect(result.y).toBe(MARGIN);
      });
    });
    
    describe('multi-monitor support', () => {
      it('should handle secondary monitor with positive offset', () => {
        const secondaryDisplay: DisplayBounds = { x: 1920, y: 0, width: 1920, height: 1080 };
        const result = calculateOverlayPosition('bottom-center', secondaryDisplay, standardWindow);
        
        // Should be offset by display x position
        expect(result.x).toBe(1920 + 760);
        expect(result.y).toBe(930);
      });
      
      it('should handle monitor with negative offset (left of primary)', () => {
        const leftDisplay: DisplayBounds = { x: -1920, y: 0, width: 1920, height: 1080 };
        const result = calculateOverlayPosition('bottom-center', leftDisplay, standardWindow);
        
        expect(result.x).toBe(-1920 + 760);
        expect(result.y).toBe(930);
      });
      
      it('should handle monitor with vertical offset', () => {
        const topDisplay: DisplayBounds = { x: 0, y: -1080, width: 1920, height: 1080 };
        const result = calculateOverlayPosition('top-center', topDisplay, standardWindow);
        
        expect(result.x).toBe(760);
        expect(result.y).toBe(-1080 + MARGIN);
      });
    });
    
    describe('edge cases', () => {
      it('should clamp position when window is larger than display', () => {
        const smallDisplay: DisplayBounds = { x: 0, y: 0, width: 200, height: 100 };
        const largeWindow: WindowDimensions = { width: 400, height: 200 };
        
        const result = calculateOverlayPosition('bottom-center', smallDisplay, largeWindow);
        
        // Should clamp to display origin when window is larger
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
      });
      
      it('should handle zero-sized window', () => {
        const result = calculateOverlayPosition('bottom-center', standardDisplay, { width: 0, height: 0 });
        
        expect(result.x).toBe(960); // Center of 1920
        expect(result.y).toBe(1030); // 1080 - 0 - 50
      });
    });
  });
  
  describe('isValidOverlayPosition', () => {
    it('should return true for valid positions', () => {
      expect(isValidOverlayPosition('bottom-center')).toBe(true);
      expect(isValidOverlayPosition('bottom-left')).toBe(true);
      expect(isValidOverlayPosition('bottom-right')).toBe(true);
      expect(isValidOverlayPosition('top-center')).toBe(true);
    });
    
    it('should return false for invalid positions', () => {
      expect(isValidOverlayPosition('center')).toBe(false);
      expect(isValidOverlayPosition('top-left')).toBe(false);
      expect(isValidOverlayPosition('')).toBe(false);
      expect(isValidOverlayPosition(null)).toBe(false);
      expect(isValidOverlayPosition(undefined)).toBe(false);
      expect(isValidOverlayPosition(123)).toBe(false);
    });
  });
  
  describe('isPositionWithinBounds', () => {
    const display: DisplayBounds = { x: 0, y: 0, width: 1920, height: 1080 };
    const window: WindowDimensions = { width: 400, height: 100 };
    
    it('should return true when position is within bounds', () => {
      expect(isPositionWithinBounds({ x: 100, y: 100 }, display, window)).toBe(true);
      expect(isPositionWithinBounds({ x: 0, y: 0 }, display, window)).toBe(true);
      expect(isPositionWithinBounds({ x: 1520, y: 980 }, display, window)).toBe(true);
    });
    
    it('should return false when position is outside bounds', () => {
      expect(isPositionWithinBounds({ x: -1, y: 100 }, display, window)).toBe(false);
      expect(isPositionWithinBounds({ x: 100, y: -1 }, display, window)).toBe(false);
      expect(isPositionWithinBounds({ x: 1521, y: 100 }, display, window)).toBe(false);
      expect(isPositionWithinBounds({ x: 100, y: 981 }, display, window)).toBe(false);
    });
  });
  
  // ============================================
  // Property-Based Tests
  // ============================================
  
  describe('Property Tests', () => {
    /**
     * **Property 9: Overlay Position Calculation**
     * **Validates: Requirements 2.5**
     * 
     * For any position setting (bottom-center, bottom-left, bottom-right, top-center)
     * and any screen dimensions, the calculated window position SHALL place the
     * overlay fully within the screen bounds.
     */
    describe('Property 9: Overlay Position Calculation', () => {
      // Arbitrary for OverlayPosition
      const overlayPositionArb = fc.constantFrom(...VALID_POSITIONS);
      
      // Arbitrary for DisplayBounds with reasonable values
      // Display can be at any position (multi-monitor) but must have positive dimensions
      const displayBoundsArb = fc.record({
        x: fc.integer({ min: -10000, max: 10000 }),
        y: fc.integer({ min: -10000, max: 10000 }),
        width: fc.integer({ min: 100, max: 10000 }),
        height: fc.integer({ min: 100, max: 10000 }),
      });
      
      // Arbitrary for WindowDimensions - must be positive and reasonable
      const windowDimensionsArb = fc.record({
        width: fc.integer({ min: 1, max: 2000 }),
        height: fc.integer({ min: 1, max: 1000 }),
      });
      
      it('calculated position should always be within display bounds when window fits', () => {
        fc.assert(
          fc.property(
            overlayPositionArb,
            displayBoundsArb,
            windowDimensionsArb,
            (position, displayBounds, windowDimensions) => {
              // Only test when window can fit in display
              fc.pre(windowDimensions.width <= displayBounds.width);
              fc.pre(windowDimensions.height <= displayBounds.height);
              
              const result = calculateOverlayPosition(position, displayBounds, windowDimensions);
              
              // Window should be fully within display bounds
              expect(result.x).toBeGreaterThanOrEqual(displayBounds.x);
              expect(result.y).toBeGreaterThanOrEqual(displayBounds.y);
              expect(result.x + windowDimensions.width).toBeLessThanOrEqual(
                displayBounds.x + displayBounds.width
              );
              expect(result.y + windowDimensions.height).toBeLessThanOrEqual(
                displayBounds.y + displayBounds.height
              );
            }
          ),
          { numRuns: 100 }
        );
      });
      
      it('calculated position should be clamped to display origin when window is larger', () => {
        fc.assert(
          fc.property(
            overlayPositionArb,
            displayBoundsArb,
            windowDimensionsArb,
            (position, displayBounds, windowDimensions) => {
              // Test when window is larger than display
              fc.pre(
                windowDimensions.width > displayBounds.width ||
                windowDimensions.height > displayBounds.height
              );
              
              const result = calculateOverlayPosition(position, displayBounds, windowDimensions);
              
              // Position should be clamped to at least the display origin
              expect(result.x).toBeGreaterThanOrEqual(displayBounds.x);
              expect(result.y).toBeGreaterThanOrEqual(displayBounds.y);
            }
          ),
          { numRuns: 100 }
        );
      });
      
      it('bottom positions should have y greater than top positions for same display', () => {
        fc.assert(
          fc.property(
            displayBoundsArb,
            windowDimensionsArb,
            (displayBounds, windowDimensions) => {
              // Only test when window fits
              fc.pre(windowDimensions.width <= displayBounds.width);
              fc.pre(windowDimensions.height <= displayBounds.height);
              // Need enough height for margin difference to be meaningful
              fc.pre(displayBounds.height > windowDimensions.height + 2 * MARGIN);
              
              const bottomCenter = calculateOverlayPosition('bottom-center', displayBounds, windowDimensions);
              const topCenter = calculateOverlayPosition('top-center', displayBounds, windowDimensions);
              
              expect(bottomCenter.y).toBeGreaterThan(topCenter.y);
            }
          ),
          { numRuns: 100 }
        );
      });
      
      it('left positions should have x less than right positions for same display', () => {
        fc.assert(
          fc.property(
            displayBoundsArb,
            windowDimensionsArb,
            (displayBounds, windowDimensions) => {
              // Only test when window fits with room for margin difference
              fc.pre(windowDimensions.width <= displayBounds.width);
              fc.pre(windowDimensions.height <= displayBounds.height);
              fc.pre(displayBounds.width > windowDimensions.width + 2 * MARGIN);
              
              const bottomLeft = calculateOverlayPosition('bottom-left', displayBounds, windowDimensions);
              const bottomRight = calculateOverlayPosition('bottom-right', displayBounds, windowDimensions);
              
              expect(bottomLeft.x).toBeLessThan(bottomRight.x);
            }
          ),
          { numRuns: 100 }
        );
      });
      
      it('center positions should be horizontally centered', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('bottom-center', 'top-center') as fc.Arbitrary<OverlayPosition>,
            displayBoundsArb,
            windowDimensionsArb,
            (position, displayBounds, windowDimensions) => {
              // Only test when window fits
              fc.pre(windowDimensions.width <= displayBounds.width);
              fc.pre(windowDimensions.height <= displayBounds.height);
              
              const result = calculateOverlayPosition(position, displayBounds, windowDimensions);
              
              // Calculate expected center position
              const expectedX = displayBounds.x + Math.floor((displayBounds.width - windowDimensions.width) / 2);
              
              expect(result.x).toBe(expectedX);
            }
          ),
          { numRuns: 100 }
        );
      });
      
      it('all valid positions should produce valid results', () => {
        fc.assert(
          fc.property(
            overlayPositionArb,
            displayBoundsArb,
            windowDimensionsArb,
            (position, displayBounds, windowDimensions) => {
              const result = calculateOverlayPosition(position, displayBounds, windowDimensions);
              
              // Result should always be a valid object with numeric coordinates
              expect(typeof result.x).toBe('number');
              expect(typeof result.y).toBe('number');
              expect(Number.isFinite(result.x)).toBe(true);
              expect(Number.isFinite(result.y)).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
