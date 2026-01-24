// electron/services/keystrokeService.ts

import type { InputEvent } from '../../src/types/keystrokeEvents';
import type { UiohookKeyboardEvent, UiohookMouseEvent } from 'uiohook-napi';

// Lazy-loaded uiohook module to avoid ES module issues
let uIOhookModule: typeof import('uiohook-napi') | null = null;

/**
 * Dynamically load uiohook-napi module
 * This avoids ES module __dirname issues by deferring the import
 */
async function getUIOhook(): Promise<typeof import('uiohook-napi')> {
  if (!uIOhookModule) {
    try {
      uIOhookModule = await import('uiohook-napi');
    } catch (error) {
      console.error('[KeystrokeService] Failed to load uiohook-napi:', error);
      throw error;
    }
  }
  return uIOhookModule;
}

/**
 * Error information for keystroke service failures
 */
export interface KeystrokeServiceError {
  code: 'INIT_FAILED' | 'LIBRARY_LOAD_FAILED' | 'UNKNOWN';
  message: string;
  originalError?: Error;
}

/**
 * Interface for the Keystroke Service
 * Provides methods to control global keyboard and mouse event capture
 */
export interface KeystrokeServiceInterface {
  start(): Promise<void>;
  stop(): void;
  isRunning(): boolean;
  onEvent(callback: (event: InputEvent) => void): void;
  onError(callback: (error: KeystrokeServiceError) => void): void;
  removeEventListener(): void;
  removeErrorListener(): void;
}

/**
 * Keystroke Service Implementation
 * 
 * Captures global keyboard and mouse events using uiohook-napi.
 * Runs in the Electron main process and provides events via callback.
 * 
 * Requirements:
 * - 6.1: Uses uiohook-napi to capture global keyboard events
 * - 6.2: Uses uiohook-napi to capture global mouse click events
 * - 6.3: Runs in the Electron main process
 * - 6.5: Initializes uiohook listener on start
 * - 6.6: Properly cleans up and releases uiohook listener on stop
 */
class KeystrokeService implements KeystrokeServiceInterface {
  private running: boolean = false;
  private eventCallback: ((event: InputEvent) => void) | null = null;
  private errorCallback: ((error: KeystrokeServiceError) => void) | null = null;
  private keydownHandler: ((e: UiohookKeyboardEvent) => void) | null = null;
  private clickHandler: ((e: UiohookMouseEvent) => void) | null = null;
  private uiohook: typeof import('uiohook-napi') | null = null;

  /**
   * Start the keystroke capture service
   * Initializes uiohook and begins listening for keyboard and mouse events
   * 
   * Requirements:
   * - 6.7: Logs error and notifies user if initialization fails
   * - 10.1: Emits error event so UI can disable toggle and show error message
   * 
   * @throws Error if uiohook fails to initialize
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    try {
      // Load uiohook module dynamically
      this.uiohook = await getUIOhook();
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Start the uiohook listener
      this.uiohook.uIOhook.start();
      
      this.running = true;
    } catch (error) {
      // Ensure state is reset on failure
      this.running = false;
      
      // Clean up any partially initialized handlers
      this.removeEventHandlers();
      
      // Determine error type and create structured error
      const serviceError = this.createServiceError(error);
      
      // Log detailed error information for debugging
      // Requirement 6.7: Log the error
      console.error('[KeystrokeService] Failed to initialize uiohook:', {
        code: serviceError.code,
        message: serviceError.message,
        originalError: error instanceof Error ? error.stack : error,
      });
      
      // Notify listeners of the failure
      // Requirement 6.7: Notify the user (via callback to UI)
      // Requirement 10.1: Enable UI to disable toggle and show error
      this.emitError(serviceError);
      
      throw error;
    }
  }

  /**
   * Create a structured error object from a caught error
   * 
   * @param error The caught error
   * @returns Structured KeystrokeServiceError
   */
  private createServiceError(error: unknown): KeystrokeServiceError {
    const originalError = error instanceof Error ? error : undefined;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for library load failures (common with native modules)
    if (
      errorMessage.includes('Cannot find module') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('failed to load') ||
      errorMessage.includes('ENOENT') ||
      errorMessage.includes('MODULE_NOT_FOUND')
    ) {
      return {
        code: 'LIBRARY_LOAD_FAILED',
        message: 'Failed to load uiohook native library. The keystroke overlay feature is unavailable.',
        originalError,
      };
    }
    
    // Check for initialization failures
    if (
      errorMessage.includes('init') ||
      errorMessage.includes('start') ||
      errorMessage.includes('permission') ||
      errorMessage.includes('access')
    ) {
      return {
        code: 'INIT_FAILED',
        message: 'Failed to initialize keystroke capture. Please check system permissions.',
        originalError,
      };
    }
    
    // Unknown error type
    return {
      code: 'UNKNOWN',
      message: `Keystroke capture failed: ${errorMessage}`,
      originalError,
    };
  }

  /**
   * Emit an error to the registered error callback
   * 
   * @param error The error to emit
   */
  private emitError(error: KeystrokeServiceError): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  /**
   * Stop the keystroke capture service
   * Cleans up uiohook listener and removes event handlers
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    try {
      // Stop the uiohook listener
      if (this.uiohook) {
        this.uiohook.uIOhook.stop();
      }
      
      // Remove event handlers
      this.removeEventHandlers();
      
      this.running = false;
    } catch (error) {
      // Even if stop fails, mark as not running
      this.running = false;
      console.error('Error stopping keystroke service:', error);
    }
  }

  /**
   * Check if the service is currently running
   * 
   * @returns true if the service is capturing events, false otherwise
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Register a callback to receive input events
   * Only one callback can be registered at a time
   * 
   * @param callback Function to call when an input event is captured
   */
  onEvent(callback: (event: InputEvent) => void): void {
    this.eventCallback = callback;
  }

  /**
   * Register a callback to receive error notifications
   * Only one callback can be registered at a time
   * 
   * Requirements:
   * - 6.7: Enables notification to user on initialization failure
   * - 10.1: Enables UI to disable toggle and show error message
   * 
   * @param callback Function to call when an error occurs
   */
  onError(callback: (error: KeystrokeServiceError) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Remove the registered event callback
   */
  removeEventListener(): void {
    this.eventCallback = null;
  }

  /**
   * Remove the registered error callback
   */
  removeErrorListener(): void {
    this.errorCallback = null;
  }

  /**
   * Setup uiohook event handlers for keyboard and mouse events
   * Event handling logic will be implemented in tasks 2.2 and 2.3
   */
  private setupEventHandlers(): void {
    if (!this.uiohook) {
      throw new Error('uiohook module not loaded');
    }
    
    const { uIOhook } = this.uiohook;
    
    // Keyboard event handler (task 2.2)
    // Captures keydown events and transforms them into KeystrokeEvent objects
    // Requirements: 3.1 (display key name), 3.2 (display modifier key combinations)
    this.keydownHandler = (e: UiohookKeyboardEvent) => {
      if (this.eventCallback) {
        const keystrokeEvent: InputEvent = {
          type: 'keystroke',
          timestamp: Date.now(),
          key: String(e.keycode), // Use keycode as string for now; proper mapping in task 6
          keyCode: e.keycode,
          modifiers: {
            ctrl: e.ctrlKey ?? false,
            alt: e.altKey ?? false,
            shift: e.shiftKey ?? false,
            meta: e.metaKey ?? false,
          },
        };
        this.eventCallback(keystrokeEvent);
      }
    };

    // Mouse click event handler
    // Captures mouse click events and transforms them into MouseActionEvent objects
    // Requirements: 4.1 (left click), 4.2 (right click), 4.3 (middle click), 4.4 (modifiers)
    this.clickHandler = (e: UiohookMouseEvent) => {
      if (this.eventCallback) {
        // Map button number to button name
        // uiohook: 1=left, 2=right, 3=middle
        const buttonMap: Record<number, 'left' | 'right' | 'middle'> = {
          1: 'left',
          2: 'right',
          3: 'middle',
        };
        
        // e.button is typed as unknown in uiohook-napi, cast to number
        const buttonNumber = e.button as number;
        const button = buttonMap[buttonNumber];
        
        // Only process known button types
        if (button) {
          const mouseEvent: InputEvent = {
            type: 'mouse',
            timestamp: Date.now(),
            button: button,
            modifiers: {
              ctrl: e.ctrlKey ?? false,
              alt: e.altKey ?? false,
              shift: e.shiftKey ?? false,
              meta: e.metaKey ?? false,
            },
          };
          this.eventCallback(mouseEvent);
        }
      }
    };

    // Register handlers with uiohook
    uIOhook.on('keydown', this.keydownHandler);
    uIOhook.on('click', this.clickHandler);
  }

  /**
   * Remove uiohook event handlers
   */
  private removeEventHandlers(): void {
    if (!this.uiohook) {
      return;
    }
    
    const { uIOhook } = this.uiohook;
    
    if (this.keydownHandler) {
      uIOhook.off('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    
    if (this.clickHandler) {
      uIOhook.off('click', this.clickHandler);
      this.clickHandler = null;
    }
  }
}

// Export singleton instance
export const keystrokeService = new KeystrokeService();

// Export class for testing purposes
export { KeystrokeService };
