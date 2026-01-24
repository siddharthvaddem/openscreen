/**
 * Mouse Event Detector Service
 * Captures mouse click and drag events during screen recording using global mouse hooks
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4
 * 
 * NOTE: This service requires the 'global-mouse-events' native module for Windows.
 * The module requires Visual Studio Build Tools to compile.
 * If the module is not available, the service will operate in fallback mode
 * where no mouse events are captured but recording continues normally.
 */

import type { MouseClickEvent, MouseDragEvent, MouseEvent, MouseEventData } from '../../src/types/mouseEvents';

// Minimum drag duration in ms to be considered a text selection (not a click)
const MIN_DRAG_DURATION_MS = 100;
// Minimum distance in pixels to be considered a drag
const MIN_DRAG_DISTANCE = 5;

interface ScreenBounds {
  width: number;
  height: number;
}

interface PendingDrag {
  startTimestamp: number;
  startX: number;
  startY: number;
}

/**
 * Mouse Event Detector Service
 * Captures global mouse events during screen recording
 */
class MouseEventDetectorService {
  private running = false;
  private recordingId = '';
  private screenBounds: ScreenBounds = { width: 1920, height: 1080 };
  private recordingStartTime = 0;
  private events: MouseEvent[] = [];
  private pendingDrag: PendingDrag | null = null;
  private mouseHook: any = null;
  private mouseHookAvailable = false;

  /**
   * Start capturing mouse events
   * @param recordingId - Unique identifier for the recording
   * @param screenBounds - Screen dimensions for coordinate validation
   */
  start(recordingId: string, screenBounds: ScreenBounds): void {
    if (this.running) {
      console.warn('MouseEventDetector: Already running');
      return;
    }

    this.recordingId = recordingId;
    this.screenBounds = screenBounds;
    this.recordingStartTime = Date.now();
    this.events = [];
    this.pendingDrag = null;
    this.running = true;

    this.initializeMouseHook();
  }

  /**
   * Stop capturing and return collected events
   */
  stop(): MouseEventData {
    if (!this.running) {
      console.warn('MouseEventDetector: Not running');
      return this.createEmptyEventData();
    }

    this.cleanupMouseHook();
    this.running = false;

    // If there's a pending drag that wasn't completed, discard it
    this.pendingDrag = null;

    const eventData: MouseEventData = {
      version: 1,
      recordingId: this.recordingId,
      screenWidth: this.screenBounds.width,
      screenHeight: this.screenBounds.height,
      events: [...this.events],
    };

    // Clear internal state
    this.events = [];
    this.recordingId = '';

    return eventData;
  }

  /**
   * Check if detector is currently running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if mouse hook is available
   */
  isMouseHookAvailable(): boolean {
    return this.mouseHookAvailable;
  }

  /**
   * Get current timestamp relative to recording start
   */
  private getRelativeTimestamp(): number {
    return Date.now() - this.recordingStartTime;
  }

  /**
   * Initialize the global mouse hook
   * Uses global-mouse-events for Windows
   */
  private initializeMouseHook(): void {
    try {
      // Dynamic import to handle cases where the module isn't available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mouseEvents = require('global-mouse-events');
      this.mouseHook = mouseEvents;
      this.mouseHookAvailable = true;

      // Listen for mouse down (start of potential drag)
      mouseEvents.on('mousedown', (event: { x: number; y: number; button: number }) => {
        if (!this.running) return;
        
        this.pendingDrag = {
          startTimestamp: this.getRelativeTimestamp(),
          startX: event.x,
          startY: event.y,
        };
      });

      // Listen for mouse up (end of click or drag)
      mouseEvents.on('mouseup', (event: { x: number; y: number; button: number }) => {
        if (!this.running || !this.pendingDrag) return;

        const endTimestamp = this.getRelativeTimestamp();
        const duration = endTimestamp - this.pendingDrag.startTimestamp;
        const button = this.mapButton(event.button);

        // Check if this is a drag (duration > threshold and position changed)
        const positionChanged = 
          Math.abs(event.x - this.pendingDrag.startX) > MIN_DRAG_DISTANCE ||
          Math.abs(event.y - this.pendingDrag.startY) > MIN_DRAG_DISTANCE;

        if (duration > MIN_DRAG_DURATION_MS && positionChanged) {
          // This is a drag event (text selection)
          const dragEvent: MouseDragEvent = {
            type: 'drag',
            startTimestamp: this.pendingDrag.startTimestamp,
            endTimestamp,
            startX: this.pendingDrag.startX,
            startY: this.pendingDrag.startY,
            endX: event.x,
            endY: event.y,
          };
          this.events.push(dragEvent);
        } else {
          // This is a click event
          const clickEvent: MouseClickEvent = {
            type: 'click',
            timestamp: this.pendingDrag.startTimestamp,
            x: this.pendingDrag.startX,
            y: this.pendingDrag.startY,
            button,
          };
          this.events.push(clickEvent);
        }

        this.pendingDrag = null;
      });

      console.log('MouseEventDetector: Global mouse hook initialized');
    } catch (error) {
      console.warn('MouseEventDetector: global-mouse-events not available, running in fallback mode');
      console.warn('MouseEventDetector: To enable mouse detection, install global-mouse-events with Visual Studio Build Tools');
      this.mouseHookAvailable = false;
      // Continue without mouse detection - recording will still work
    }
  }

  /**
   * Cleanup the mouse hook
   */
  private cleanupMouseHook(): void {
    if (this.mouseHook) {
      try {
        this.mouseHook.removeAllListeners('mousedown');
        this.mouseHook.removeAllListeners('mouseup');
      } catch (error) {
        console.error('MouseEventDetector: Error cleaning up mouse hook:', error);
      }
      this.mouseHook = null;
    }
  }

  /**
   * Map button number to button name
   */
  private mapButton(button: number): 'left' | 'right' | 'middle' {
    switch (button) {
      case 1: return 'left';
      case 2: return 'right';
      case 3: return 'middle';
      default: return 'left';
    }
  }

  /**
   * Create empty event data structure
   */
  private createEmptyEventData(): MouseEventData {
    return {
      version: 1,
      recordingId: this.recordingId || 'unknown',
      screenWidth: this.screenBounds.width,
      screenHeight: this.screenBounds.height,
      events: [],
    };
  }

  /**
   * Manually add a click event (for testing or alternative input methods)
   */
  addClickEvent(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): void {
    if (!this.running) return;
    
    const clickEvent: MouseClickEvent = {
      type: 'click',
      timestamp: this.getRelativeTimestamp(),
      x,
      y,
      button,
    };
    this.events.push(clickEvent);
  }

  /**
   * Manually add a drag event (for testing or alternative input methods)
   */
  addDragEvent(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number = 200
  ): void {
    if (!this.running) return;
    
    const startTimestamp = this.getRelativeTimestamp();
    const dragEvent: MouseDragEvent = {
      type: 'drag',
      startTimestamp,
      endTimestamp: startTimestamp + durationMs,
      startX,
      startY,
      endX,
      endY,
    };
    this.events.push(dragEvent);
  }
}

// Export singleton instance
export const mouseEventDetector = new MouseEventDetectorService();

// Export types for testing
export type { MouseEventDetectorService };
