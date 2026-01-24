/**
 * Mouse Event Detector Service
 * Captures mouse click and drag events during screen recording using Windows API polling
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4
 * 
 * This service uses 'koffi' to call Windows API functions directly.
 * Koffi has prebuilt binaries and does NOT require Visual Studio Build Tools.
 * 
 * Approach: Poll GetAsyncKeyState and GetCursorPos at high frequency to detect
 * mouse button state changes and cursor position.
 */

import type { MouseClickEvent, MouseDragEvent, MouseEvent, MouseEventData } from '../../src/types/mouseEvents';

// Minimum drag duration in ms to be considered a text selection (not a click)
const MIN_DRAG_DURATION_MS = 100;
// Minimum distance in pixels to be considered a drag
const MIN_DRAG_DISTANCE = 5;
// Polling interval in ms (16ms ≈ 60fps)
const POLL_INTERVAL_MS = 16;

// Windows Virtual Key codes for mouse buttons
const VK_LBUTTON = 0x01;
const VK_RBUTTON = 0x02;
const VK_MBUTTON = 0x04;

interface ScreenBounds {
  width: number;
  height: number;
}

interface PendingDrag {
  startTimestamp: number;
  startX: number;
  startY: number;
  button: 'left' | 'right' | 'middle';
}

interface ButtonState {
  left: boolean;
  right: boolean;
  middle: boolean;
}

interface WindowsApi {
  GetAsyncKeyState: (vKey: number) => number;
  GetCursorPos: (point: number[]) => boolean;
}

/**
 * Mouse Event Detector Service
 * Captures global mouse events during screen recording using Windows API polling
 */
class MouseEventDetectorService {
  private running = false;
  private recordingId = '';
  private screenBounds: ScreenBounds = { width: 1920, height: 1080 };
  private recordingStartTime = 0;
  private events: MouseEvent[] = [];
  private pendingDrag: PendingDrag | null = null;
  private mouseHookAvailable = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private windowsApi: WindowsApi | null = null;
  private lastButtonState: ButtonState = { left: false, right: false, middle: false };

  constructor() {
    this.initializeWindowsApi();
  }

  /**
   * Initialize Windows API bindings using koffi
   */
  private initializeWindowsApi(): void {
    try {
      // Dynamic import to handle cases where koffi isn't available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const koffi = require('koffi');
      
      // Load user32.dll
      const user32 = koffi.load('user32.dll');
      
      // Define POINT struct for GetCursorPos
      // Note: We use an object directly instead of the struct type for simplicity
      koffi.struct('POINT', {
        x: 'long',
        y: 'long'
      });
      
      // Define Windows API functions
      // GetAsyncKeyState returns SHORT (16-bit signed int)
      // If the high-order bit is 1, the key is down
      const GetAsyncKeyState = user32.func('short __stdcall GetAsyncKeyState(int vKey)');
      
      // GetCursorPos takes a pointer to POINT struct
      const GetCursorPos = user32.func('bool __stdcall GetCursorPos(_Out_ POINT *lpPoint)');
      
      this.windowsApi = {
        GetAsyncKeyState: (vKey: number) => GetAsyncKeyState(vKey),
        GetCursorPos: (point: number[]) => {
          const p = { x: 0, y: 0 };
          const result = GetCursorPos(p);
          point[0] = p.x;
          point[1] = p.y;
          return result;
        }
      };
      
      this.mouseHookAvailable = true;
      console.log('MouseEventDetector: Windows API initialized via koffi (no native compilation required)');
    } catch (error) {
      console.warn('MouseEventDetector: koffi not available, trying global-mouse-events fallback');
      this.tryGlobalMouseEventsFallback();
    }
  }

  /**
   * Try to use global-mouse-events as fallback (requires native compilation)
   */
  private tryGlobalMouseEventsFallback(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('global-mouse-events');
      this.mouseHookAvailable = true;
      console.log('MouseEventDetector: Using global-mouse-events fallback');
    } catch (error) {
      console.warn('MouseEventDetector: No mouse detection available');
      console.warn('MouseEventDetector: Install koffi (npm install koffi) for mouse detection without Visual Studio Build Tools');
      this.mouseHookAvailable = false;
    }
  }

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
    this.lastButtonState = { left: false, right: false, middle: false };

    if (this.windowsApi) {
      this.startPolling();
    } else {
      this.initializeGlobalMouseEventsHook();
    }
  }

  /**
   * Start polling Windows API for mouse state
   */
  private startPolling(): void {
    if (!this.windowsApi) return;

    this.pollInterval = setInterval(() => {
      if (!this.running || !this.windowsApi) return;

      // Get current cursor position
      const point = [0, 0];
      this.windowsApi.GetCursorPos(point);
      const x = point[0];
      const y = point[1];

      // Check button states (high-order bit indicates key is down)
      const leftDown = (this.windowsApi.GetAsyncKeyState(VK_LBUTTON) & 0x8000) !== 0;
      const rightDown = (this.windowsApi.GetAsyncKeyState(VK_RBUTTON) & 0x8000) !== 0;
      const middleDown = (this.windowsApi.GetAsyncKeyState(VK_MBUTTON) & 0x8000) !== 0;

      // Detect button press (transition from up to down)
      if (leftDown && !this.lastButtonState.left) {
        this.onMouseDown(x, y, 'left');
      }
      if (rightDown && !this.lastButtonState.right) {
        this.onMouseDown(x, y, 'right');
      }
      if (middleDown && !this.lastButtonState.middle) {
        this.onMouseDown(x, y, 'middle');
      }

      // Detect button release (transition from down to up)
      if (!leftDown && this.lastButtonState.left) {
        this.onMouseUp(x, y, 'left');
      }
      if (!rightDown && this.lastButtonState.right) {
        this.onMouseUp(x, y, 'right');
      }
      if (!middleDown && this.lastButtonState.middle) {
        this.onMouseUp(x, y, 'middle');
      }

      // Update last state
      this.lastButtonState = { left: leftDown, right: rightDown, middle: middleDown };
    }, POLL_INTERVAL_MS);

    console.log('MouseEventDetector: Polling started');
  }

  /**
   * Handle mouse button down event
   */
  private onMouseDown(x: number, y: number, button: 'left' | 'right' | 'middle'): void {
    if (!this.running) return;

    // Only track one pending drag at a time (prioritize left button)
    if (this.pendingDrag && this.pendingDrag.button !== button) {
      // Complete the previous pending drag as a click
      this.completePendingAsClick();
    }

    this.pendingDrag = {
      startTimestamp: this.getRelativeTimestamp(),
      startX: x,
      startY: y,
      button,
    };
  }

  /**
   * Handle mouse button up event
   */
  private onMouseUp(x: number, y: number, button: 'left' | 'right' | 'middle'): void {
    if (!this.running || !this.pendingDrag) return;

    // Only process if this is the same button that started the drag
    if (this.pendingDrag.button !== button) return;

    const endTimestamp = this.getRelativeTimestamp();
    const duration = endTimestamp - this.pendingDrag.startTimestamp;

    // Check if this is a drag (duration > threshold and position changed)
    const positionChanged = 
      Math.abs(x - this.pendingDrag.startX) > MIN_DRAG_DISTANCE ||
      Math.abs(y - this.pendingDrag.startY) > MIN_DRAG_DISTANCE;

    if (duration > MIN_DRAG_DURATION_MS && positionChanged) {
      // This is a drag event (text selection)
      const dragEvent: MouseDragEvent = {
        type: 'drag',
        startTimestamp: this.pendingDrag.startTimestamp,
        endTimestamp,
        startX: this.pendingDrag.startX,
        startY: this.pendingDrag.startY,
        endX: x,
        endY: y,
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
  }

  /**
   * Complete pending drag as a click (used when another button is pressed)
   */
  private completePendingAsClick(): void {
    if (!this.pendingDrag) return;

    const clickEvent: MouseClickEvent = {
      type: 'click',
      timestamp: this.pendingDrag.startTimestamp,
      x: this.pendingDrag.startX,
      y: this.pendingDrag.startY,
      button: this.pendingDrag.button,
    };
    this.events.push(clickEvent);
    this.pendingDrag = null;
  }

  /**
   * Initialize global-mouse-events hook (fallback for non-koffi systems)
   */
  private initializeGlobalMouseEventsHook(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mouseEvents = require('global-mouse-events');

      mouseEvents.on('mousedown', (event: { x: number; y: number; button: number }) => {
        if (!this.running) return;
        const button = this.mapButton(event.button);
        this.onMouseDown(event.x, event.y, button);
      });

      mouseEvents.on('mouseup', (event: { x: number; y: number; button: number }) => {
        if (!this.running) return;
        const button = this.mapButton(event.button);
        this.onMouseUp(event.x, event.y, button);
      });

      console.log('MouseEventDetector: global-mouse-events hook initialized');
    } catch (error) {
      console.warn('MouseEventDetector: Failed to initialize global-mouse-events');
    }
  }

  /**
   * Stop capturing and return collected events
   */
  stop(): MouseEventData {
    if (!this.running) {
      console.warn('MouseEventDetector: Not running');
      return this.createEmptyEventData();
    }

    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Cleanup global-mouse-events if used
    this.cleanupGlobalMouseEvents();

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

    console.log(`MouseEventDetector: Stopped, captured ${eventData.events.length} events`);
    return eventData;
  }

  /**
   * Cleanup global-mouse-events listeners
   */
  private cleanupGlobalMouseEvents(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mouseEvents = require('global-mouse-events');
      mouseEvents.removeAllListeners('mousedown');
      mouseEvents.removeAllListeners('mouseup');
    } catch {
      // Ignore if not available
    }
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
