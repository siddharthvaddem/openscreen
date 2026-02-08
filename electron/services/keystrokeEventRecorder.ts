// electron/services/keystrokeEventRecorder.ts

import fs from 'node:fs/promises';
import type { InputEvent } from '../../src/types/keystrokeEvents';
import type {
  RecordedInputEvent,
  RecordedKeystrokeEvent,
  RecordedMouseClickEvent,
  KeystrokeEventData,
} from '../../src/types/keystrokeEditorEvents';
import { keystrokeService } from './keystrokeService';
import { getKeyDisplayName } from '../../src/utils/keyNameMapping';

/**
 * Interface for the Keystroke Event Recorder
 * Provides methods to record keystroke and mouse events during screen recording
 * 
 * Requirements:
 * - 2.1: Capture all keyboard keydown events using existing keystroke service
 * - 2.2: Capture all mouse click events (left, right, middle)
 * - 2.3: Record timestamp in milliseconds relative to recording start
 */
export interface KeystrokeEventRecorderInterface {
  start(recordingId: string): void;
  stop(): KeystrokeEventData;
  isRunning(): boolean;
  getEvents(): RecordedInputEvent[];
}

/**
 * Keystroke Event Recorder Implementation
 * 
 * Records keystroke and mouse click events during screen recording.
 * Uses the existing keystrokeService for event capture and stores events
 * in memory with timestamps relative to recording start.
 * 
 * Requirements:
 * - 2.1: Capture all keyboard keydown events using existing keystroke service
 * - 2.2: Capture all mouse click events (left, right, middle)
 * - 2.3: Record timestamp in milliseconds relative to recording start
 * - 2.4: Record key code, key name, and modifier state for keyboard events
 * - 2.5: Record button type and modifier state for mouse events
 * - 2.6: Use key name mapping from src/utils/keyNameMapping.ts
 */
class KeystrokeEventRecorder implements KeystrokeEventRecorderInterface {
  private running: boolean = false;
  private recordingId: string = '';
  private recordingStartTime: number = 0;
  private events: RecordedInputEvent[] = [];
  private eventHandler: ((event: InputEvent) => void) | null = null;

  /**
   * Start recording keystroke and mouse events
   * 
   * @param recordingId Unique identifier for this recording session
   * 
   * Requirements:
   * - 2.1: Start capturing keyboard events
   * - 2.2: Start capturing mouse events
   * - 2.3: Initialize recording start time for relative timestamps
   */
  start(recordingId: string): void {
    if (this.running) {
      console.warn('[KeystrokeEventRecorder] Already recording, ignoring start call');
      return;
    }

    // Initialize recording state
    this.recordingId = recordingId;
    this.recordingStartTime = Date.now();
    this.events = [];
    this.running = true;

    // Create event handler that transforms InputEvent to RecordedInputEvent
    this.eventHandler = (event: InputEvent) => {
      this.handleEvent(event);
    };

    // Register event handler with keystroke service
    keystrokeService.onEvent(this.eventHandler);

    // Start the keystroke service if not already running
    if (!keystrokeService.isRunning()) {
      keystrokeService.start().catch((error) => {
        console.error('[KeystrokeEventRecorder] Failed to start keystroke service:', error);
        // Reset state on failure
        this.running = false;
        this.eventHandler = null;
      });
    }

    console.log(`[KeystrokeEventRecorder] Started recording: ${recordingId}`);
  }

  /**
   * Stop recording and return the captured event data
   * 
   * @returns KeystrokeEventData containing all captured events
   * 
   * Requirements:
   * - 3.3: Return data with version metadata
   */
  stop(): KeystrokeEventData {
    if (!this.running) {
      console.warn('[KeystrokeEventRecorder] Not recording, returning empty data');
      return {
        version: 1,
        recordingId: '',
        events: [],
      };
    }

    // Remove event handler from keystroke service
    keystrokeService.removeEventListener();
    keystrokeService.stop();
    this.eventHandler = null;

    // Create the event data object
    const eventData: KeystrokeEventData = {
      version: 1,
      recordingId: this.recordingId,
      events: [...this.events],
    };

    // Reset state
    this.running = false;
    this.recordingId = '';
    this.recordingStartTime = 0;
    this.events = [];

    console.log(`[KeystrokeEventRecorder] Stopped recording, captured ${eventData.events.length} events`);

    return eventData;
  }

  /**
   * Check if the recorder is currently running
   * 
   * @returns true if recording is in progress
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the current list of recorded events
   * 
   * @returns Copy of the recorded events array
   */
  getEvents(): RecordedInputEvent[] {
    return [...this.events];
  }

  /**
   * Handle an incoming input event from the keystroke service
   * Transforms the event to RecordedInputEvent format with relative timestamp
   * 
   * @param event The input event from keystroke service
   * 
   * Requirements:
   * - 2.3: Calculate timestamp relative to recording start
   * - 2.4: Record key code, key name, and modifier state for keyboard events
   * - 2.5: Record button type and modifier state for mouse events
   * - 2.6: Use key name mapping for display names
   */
  private handleEvent(event: InputEvent): void {
    if (!this.running) {
      return;
    }

    // Calculate relative timestamp
    const relativeTimestamp = event.timestamp - this.recordingStartTime;

    // Ensure timestamp is non-negative (in case of timing issues)
    const timestamp = Math.max(0, relativeTimestamp);

    if (event.type === 'keystroke') {
      // Transform keystroke event
      // Requirement 2.4: Record key code, key name, and modifier state
      // Requirement 2.6: Use key name mapping
      const recordedEvent: RecordedKeystrokeEvent = {
        type: 'keystroke',
        timestamp,
        keyCode: event.keyCode,
        keyName: getKeyDisplayName(event.keyCode),
        modifiers: {
          ctrl: event.modifiers.ctrl,
          alt: event.modifiers.alt,
          shift: event.modifiers.shift,
          meta: event.modifiers.meta,
        },
      };
      this.events.push(recordedEvent);
    } else if (event.type === 'mouse') {
      // Transform mouse event
      // Requirement 2.5: Record button type and modifier state
      const recordedEvent: RecordedMouseClickEvent = {
        type: 'mouse',
        timestamp,
        button: event.button,
        modifiers: {
          ctrl: event.modifiers.ctrl,
          alt: event.modifiers.alt,
          shift: event.modifiers.shift,
          meta: event.modifiers.meta,
        },
      };
      this.events.push(recordedEvent);
    }
  }
}

// Export singleton instance
export const keystrokeEventRecorder = new KeystrokeEventRecorder();

// Export class for testing purposes
export { KeystrokeEventRecorder };

/**
 * Generate keystroke event file name from timestamp
 * 
 * @param timestamp Recording timestamp (milliseconds since epoch)
 * @returns File name in format: recording-{timestamp}.keystroke.json
 * 
 * Requirements:
 * - 3.2: File naming convention matches video file (recording-{timestamp}.keystroke.json)
 */
export function generateKeystrokeFileName(timestamp: number): string {
  return `recording-${timestamp}.keystroke.json`;
}

/**
 * Get keystroke event file path from video path
 * 
 * @param videoPath Path to the video file
 * @returns Path to the corresponding keystroke event file
 * 
 * Requirements:
 * - 3.2: File naming convention matches video file
 */
export function getKeystrokeFilePathFromVideo(videoPath: string): string {
  return videoPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.keystroke.json');
}

/**
 * Save keystroke event data to a JSON file
 * 
 * @param eventData The keystroke event data to save
 * @param filePath Full path to save the file
 * @returns Promise resolving to success status and path or error
 * 
 * Requirements:
 * - 3.1: Save all events to JSON file when recording completes
 * - 3.2: File naming convention matches video file
 * - 3.3: Include version metadata for forward compatibility
 * - 10.2: Log errors and continue gracefully, don't interrupt recording
 */
export async function saveKeystrokeEvents(
  eventData: KeystrokeEventData,
  filePath: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Validate event data has required fields
    if (!eventData || typeof eventData.version !== 'number' || !Array.isArray(eventData.events)) {
      // Requirement 10.2: Log error and return gracefully
      console.error('[KeystrokeEventRecorder] Invalid event data: missing required fields');
      return {
        success: false,
        error: 'Invalid event data: missing required fields',
      };
    }

    // Serialize with pretty printing for readability
    const jsonContent = JSON.stringify(eventData, null, 2);
    
    await fs.writeFile(filePath, jsonContent, 'utf-8');
    
    console.log(`[KeystrokeEventRecorder] Saved ${eventData.events.length} events to ${filePath}`);
    
    return {
      success: true,
      path: filePath,
    };
  } catch (error) {
    // Requirement 10.2: Log error and continue gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[KeystrokeEventRecorder] Failed to save events to ${filePath}:`, errorMessage);
    
    // Return gracefully - recording completes normally, but no keystroke data is saved
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Load keystroke event data from a JSON file
 * 
 * @param filePath Full path to the keystroke event file
 * @returns Promise resolving to event data or error status
 * 
 * Requirements:
 * - 4.1: Search for .keystroke.json file when video is loaded
 * - 4.2: Read and parse events from file
 * - 4.4: Handle missing/corrupt file gracefully
 * - 10.3: Log errors and continue gracefully, don't interrupt video loading
 */
export async function loadKeystrokeEvents(
  filePath: string
): Promise<{ success: boolean; data?: KeystrokeEventData; notFound?: boolean; error?: string }> {
  try {
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Parse JSON - wrap in try-catch for corrupt JSON
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      // Requirement 10.3: Log error for corrupt JSON and continue gracefully
      const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error(`[KeystrokeEventRecorder] Corrupt JSON in ${filePath}:`, parseErrorMessage);
      return {
        success: false,
        error: 'Invalid JSON format in keystroke event file',
      };
    }
    
    // Validate structure
    if (!isValidKeystrokeEventData(data)) {
      // Requirement 10.3: Log error for invalid structure and continue gracefully
      console.error(`[KeystrokeEventRecorder] Invalid keystroke event file format in ${filePath}`);
      return {
        success: false,
        error: 'Invalid keystroke event file format',
      };
    }
    
    console.log(`[KeystrokeEventRecorder] Loaded ${data.events.length} events from ${filePath}`);
    
    return {
      success: true,
      data: data as KeystrokeEventData,
    };
  } catch (error: unknown) {
    // Handle file not found - this is expected and not an error
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File not found is a normal case - video loads without keystroke overlay
      return {
        success: false,
        notFound: true,
      };
    }
    
    // Requirement 10.3: Log error and continue gracefully for other errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[KeystrokeEventRecorder] Failed to load events from ${filePath}:`, errorMessage);
    
    // Return gracefully - video loads normally without keystroke overlay
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Validate that an object conforms to KeystrokeEventData structure
 * 
 * @param data Object to validate
 * @returns true if valid KeystrokeEventData
 */
function isValidKeystrokeEventData(data: unknown): data is KeystrokeEventData {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const obj = data as Record<string, unknown>;
  
  // Check version (must be 1 for now)
  if (obj.version !== 1) {
    return false;
  }
  
  // Check recordingId
  if (typeof obj.recordingId !== 'string') {
    return false;
  }
  
  // Check events array
  if (!Array.isArray(obj.events)) {
    return false;
  }
  
  // Validate each event
  for (const event of obj.events) {
    if (!isValidRecordedInputEvent(event)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate that an object conforms to RecordedInputEvent structure
 * 
 * @param event Object to validate
 * @returns true if valid RecordedInputEvent
 */
function isValidRecordedInputEvent(event: unknown): event is RecordedInputEvent {
  if (!event || typeof event !== 'object') {
    return false;
  }
  
  const obj = event as Record<string, unknown>;
  
  // Check timestamp
  if (typeof obj.timestamp !== 'number' || obj.timestamp < 0) {
    return false;
  }
  
  // Check modifiers
  if (!isValidModifiers(obj.modifiers)) {
    return false;
  }
  
  // Check type-specific fields
  if (obj.type === 'keystroke') {
    return (
      typeof obj.keyCode === 'number' &&
      typeof obj.keyName === 'string' &&
      obj.keyName.length > 0
    );
  } else if (obj.type === 'mouse') {
    return (
      obj.button === 'left' ||
      obj.button === 'right' ||
      obj.button === 'middle'
    );
  }
  
  return false;
}

/**
 * Validate modifiers object structure
 * 
 * @param modifiers Object to validate
 * @returns true if valid modifiers object
 */
function isValidModifiers(modifiers: unknown): modifiers is RecordedInputEvent['modifiers'] {
  if (!modifiers || typeof modifiers !== 'object') {
    return false;
  }
  
  const obj = modifiers as Record<string, unknown>;
  
  return (
    typeof obj.ctrl === 'boolean' &&
    typeof obj.alt === 'boolean' &&
    typeof obj.shift === 'boolean' &&
    typeof obj.meta === 'boolean'
  );
}
