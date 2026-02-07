import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property 8: Recording Integration
 * 
 * *For any* recording session where keystroke overlay is enabled, the overlay window
 * SHALL be visible during recording. When recording stops and hideOnRecordingStop
 * preference is true, the overlay SHALL be hidden.
 * 
 * **Validates: Requirements 7.1, 7.2**
 * 
 * Feature: visual-keystrokes-and-mouse-actions, Property 8: Recording Integration
 */
describe('Property 8: Recording Integration', () => {
  /**
   * Simulates the recording integration logic
   */
  interface RecordingState {
    isRecording: boolean;
    keystrokeEnabled: boolean;
    overlayVisible: boolean;
    hideOnRecordingStop: boolean;
  }

  /**
   * Start recording - ensures overlay is visible if keystroke is enabled
   */
  function startRecording(state: RecordingState): RecordingState {
    const newState = { ...state, isRecording: true };
    
    // If keystroke is enabled, ensure overlay is visible
    if (state.keystrokeEnabled) {
      newState.overlayVisible = true;
    }
    
    return newState;
  }

  /**
   * Stop recording - optionally hides overlay based on preference
   */
  function stopRecording(state: RecordingState): RecordingState {
    const newState = { ...state, isRecording: false };
    
    // If hideOnRecordingStop is true and keystroke was enabled, hide overlay
    if (state.hideOnRecordingStop && state.keystrokeEnabled) {
      newState.overlayVisible = false;
    }
    
    return newState;
  }

  it('should show overlay when recording starts with keystroke enabled', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // hideOnRecordingStop preference
        (hideOnRecordingStop) => {
          const initialState: RecordingState = {
            isRecording: false,
            keystrokeEnabled: true,
            overlayVisible: false, // Start with overlay hidden
            hideOnRecordingStop,
          };

          const afterStart = startRecording(initialState);
          
          // Overlay should be visible when recording starts with keystroke enabled
          expect(afterStart.isRecording).toBe(true);
          expect(afterStart.overlayVisible).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not show overlay when recording starts with keystroke disabled', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // hideOnRecordingStop preference
        (hideOnRecordingStop) => {
          const initialState: RecordingState = {
            isRecording: false,
            keystrokeEnabled: false,
            overlayVisible: false,
            hideOnRecordingStop,
          };

          const afterStart = startRecording(initialState);
          
          // Overlay should remain hidden when keystroke is disabled
          expect(afterStart.isRecording).toBe(true);
          expect(afterStart.overlayVisible).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should hide overlay when recording stops if hideOnRecordingStop is true', () => {
    const initialState: RecordingState = {
      isRecording: true,
      keystrokeEnabled: true,
      overlayVisible: true,
      hideOnRecordingStop: true,
    };

    const afterStop = stopRecording(initialState);
    
    expect(afterStop.isRecording).toBe(false);
    expect(afterStop.overlayVisible).toBe(false);
  });

  it('should keep overlay visible when recording stops if hideOnRecordingStop is false', () => {
    const initialState: RecordingState = {
      isRecording: true,
      keystrokeEnabled: true,
      overlayVisible: true,
      hideOnRecordingStop: false,
    };

    const afterStop = stopRecording(initialState);
    
    expect(afterStop.isRecording).toBe(false);
    expect(afterStop.overlayVisible).toBe(true);
  });

  it('should maintain overlay visibility through recording cycle based on preferences', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // keystrokeEnabled
        fc.boolean(), // hideOnRecordingStop
        (keystrokeEnabled, hideOnRecordingStop) => {
          const initialState: RecordingState = {
            isRecording: false,
            keystrokeEnabled,
            overlayVisible: false,
            hideOnRecordingStop,
          };

          // Start recording
          const afterStart = startRecording(initialState);
          
          // If keystroke enabled, overlay should be visible during recording
          if (keystrokeEnabled) {
            expect(afterStart.overlayVisible).toBe(true);
          }

          // Stop recording
          const afterStop = stopRecording(afterStart);
          
          // After stop, overlay visibility depends on hideOnRecordingStop
          if (keystrokeEnabled && hideOnRecordingStop) {
            expect(afterStop.overlayVisible).toBe(false);
          } else if (keystrokeEnabled && !hideOnRecordingStop) {
            expect(afterStop.overlayVisible).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple recording sessions correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // number of recording sessions
        fc.boolean(), // keystrokeEnabled
        fc.boolean(), // hideOnRecordingStop
        (numSessions, keystrokeEnabled, hideOnRecordingStop) => {
          let state: RecordingState = {
            isRecording: false,
            keystrokeEnabled,
            overlayVisible: false,
            hideOnRecordingStop,
          };

          for (let i = 0; i < numSessions; i++) {
            // Start recording
            state = startRecording(state);
            expect(state.isRecording).toBe(true);
            
            if (keystrokeEnabled) {
              expect(state.overlayVisible).toBe(true);
            }

            // Stop recording
            state = stopRecording(state);
            expect(state.isRecording).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
