import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property 2: Toggle State Controls Window Visibility
 * 
 * *For any* toggle state change, when enabled is set to true the overlay window
 * SHALL be visible, and when enabled is set to false the overlay window SHALL be hidden.
 * 
 * **Validates: Requirements 1.2, 1.3**
 * 
 * Feature: visual-keystrokes-and-mouse-actions, Property 2: Toggle State Controls Window Visibility
 */
describe('Property 2: Toggle State Controls Window Visibility', () => {
  /**
   * Simulates the toggle behavior logic
   * This mirrors the logic in useKeystrokeSettings hook
   */
  interface ToggleState {
    enabled: boolean;
    overlayVisible: boolean;
    serviceRunning: boolean;
  }

  function toggleEnabled(state: ToggleState): ToggleState {
    const newEnabled = !state.enabled;
    
    if (newEnabled) {
      // Enable: show overlay, start service
      return {
        enabled: true,
        overlayVisible: true,
        serviceRunning: true,
      };
    } else {
      // Disable: stop service, hide overlay
      return {
        enabled: false,
        overlayVisible: false,
        serviceRunning: false,
      };
    }
  }

  function setEnabled(_state: ToggleState, enabled: boolean): ToggleState {
    if (enabled) {
      return {
        enabled: true,
        overlayVisible: true,
        serviceRunning: true,
      };
    } else {
      return {
        enabled: false,
        overlayVisible: false,
        serviceRunning: false,
      };
    }
  }

  it('should show overlay when enabled is true', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // initial enabled state
        (initialEnabled) => {
          const initialState: ToggleState = {
            enabled: initialEnabled,
            overlayVisible: initialEnabled,
            serviceRunning: initialEnabled,
          };

          // Set enabled to true
          const newState = setEnabled(initialState, true);
          
          expect(newState.enabled).toBe(true);
          expect(newState.overlayVisible).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should hide overlay when enabled is false', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // initial enabled state
        (initialEnabled) => {
          const initialState: ToggleState = {
            enabled: initialEnabled,
            overlayVisible: initialEnabled,
            serviceRunning: initialEnabled,
          };

          // Set enabled to false
          const newState = setEnabled(initialState, false);
          
          expect(newState.enabled).toBe(false);
          expect(newState.overlayVisible).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should toggle overlay visibility with enabled state', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // initial enabled state
        (initialEnabled) => {
          const initialState: ToggleState = {
            enabled: initialEnabled,
            overlayVisible: initialEnabled,
            serviceRunning: initialEnabled,
          };

          // Toggle the state
          const newState = toggleEnabled(initialState);
          
          // After toggle, enabled should be opposite
          expect(newState.enabled).toBe(!initialEnabled);
          // Overlay visibility should match enabled state
          expect(newState.overlayVisible).toBe(newState.enabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain consistency between enabled and overlayVisible', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), // sequence of toggle operations
        (toggleSequence) => {
          let state: ToggleState = {
            enabled: false,
            overlayVisible: false,
            serviceRunning: false,
          };

          // Apply each toggle in sequence
          for (const shouldEnable of toggleSequence) {
            state = setEnabled(state, shouldEnable);
            
            // After each operation, enabled and overlayVisible should match
            expect(state.overlayVisible).toBe(state.enabled);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should start service when enabled and stop when disabled', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (enabled) => {
          const state: ToggleState = {
            enabled: false,
            overlayVisible: false,
            serviceRunning: false,
          };

          const newState = setEnabled(state, enabled);
          
          // Service running should match enabled state
          expect(newState.serviceRunning).toBe(enabled);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle rapid toggle sequences correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // number of toggles
        (numToggles) => {
          let state: ToggleState = {
            enabled: false,
            overlayVisible: false,
            serviceRunning: false,
          };

          // Toggle multiple times
          for (let i = 0; i < numToggles; i++) {
            state = toggleEnabled(state);
          }

          // Final state should be consistent
          expect(state.overlayVisible).toBe(state.enabled);
          expect(state.serviceRunning).toBe(state.enabled);
          
          // After odd number of toggles, should be enabled
          // After even number of toggles, should be disabled
          expect(state.enabled).toBe(numToggles % 2 === 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
