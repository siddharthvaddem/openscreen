import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * TDD Tests for audioSettings Store
 * 
 * These tests are written FIRST following TDD methodology.
 * Tests will FAIL until the implementation is complete.
 */

// ============================================
// Mock Setup
// ============================================

const STORAGE_KEY = 'openscreen:audioSettings';

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  get length() { return Object.keys(localStorageMock.store).length; },
  key: vi.fn((index: number) => Object.keys(localStorageMock.store)[index] ?? null),
};

// Create window mock
const windowMock = {
  localStorage: localStorageMock,
};

// Setup global window and localStorage mock before tests
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorageMock.store = {};
  localStorageMock.getItem.mockImplementation((key: string) => localStorageMock.store[key] ?? null);
  localStorageMock.setItem.mockImplementation((key: string, value: string) => {
    localStorageMock.store[key] = value;
  });
  localStorageMock.removeItem.mockImplementation((key: string) => {
    delete localStorageMock.store[key];
  });
  localStorageMock.clear.mockImplementation(() => {
    localStorageMock.store = {};
  });

  // Define window globally for node environment
  (globalThis as any).window = windowMock;
  (globalThis as any).localStorage = localStorageMock;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as any).window;
  delete (globalThis as any).localStorage;
});

// ============================================
// Tests for audioSettings Store
// ============================================

describe('audioSettings Store', () => {
  describe('getAudioSettings', () => {
    it('should return default settings when localStorage is empty', async () => {
      const { getAudioSettings } = await import('./audioSettings');
      
      const settings = getAudioSettings();
      
      expect(settings).toEqual({
        deviceId: null,
        enabled: false,
        sampleRate: 48000,
        channelCount: 2,
        noiseSuppression: true,
        echoCancellation: false,
        autoGainControl: true,
        audioBitrate: 192,
      });
    });

    it('should return stored settings when localStorage has data', async () => {
      const storedSettings = {
        deviceId: 'mic-123',
        enabled: true,
        sampleRate: 44100,
        channelCount: 1,
        noiseSuppression: false,
        echoCancellation: true,
        autoGainControl: false,
        audioBitrate: 256,
      };
      localStorageMock.store[STORAGE_KEY] = JSON.stringify(storedSettings);

      const { getAudioSettings } = await import('./audioSettings');
      
      const settings = getAudioSettings();
      
      expect(settings).toEqual(storedSettings);
    });

    it('should return default settings on invalid JSON', async () => {
      localStorageMock.store[STORAGE_KEY] = 'not-valid-json{{{';

      const { getAudioSettings } = await import('./audioSettings');
      
      const settings = getAudioSettings();
      
      expect(settings).toEqual({
        deviceId: null,
        enabled: false,
        sampleRate: 48000,
        channelCount: 2,
        noiseSuppression: true,
        echoCancellation: false,
        autoGainControl: true,
        audioBitrate: 192,
      });
    });

    it('should return partial defaults for incomplete stored data', async () => {
      // Only deviceId stored, others should default
      localStorageMock.store[STORAGE_KEY] = JSON.stringify({ deviceId: 'mic-456' });

      const { getAudioSettings } = await import('./audioSettings');
      
      const settings = getAudioSettings();
      
      expect(settings.deviceId).toBe('mic-456');
      expect(settings.enabled).toBe(false);
      expect(settings.sampleRate).toBe(48000);
      expect(settings.channelCount).toBe(2);
      expect(settings.noiseSuppression).toBe(true);
      expect(settings.echoCancellation).toBe(false);
      expect(settings.autoGainControl).toBe(true);
      expect(settings.audioBitrate).toBe(192);
    });
  });

  describe('setAudioSettings', () => {
    it('should save settings to localStorage', async () => {
      const { setAudioSettings, getAudioSettings } = await import('./audioSettings');
      
      setAudioSettings({ deviceId: 'mic-new', enabled: true });
      
      const stored = JSON.parse(localStorageMock.store[STORAGE_KEY]);
      expect(stored.deviceId).toBe('mic-new');
      expect(stored.enabled).toBe(true);
      
      // Also verify getAudioSettings returns the same
      const settings = getAudioSettings();
      expect(settings.deviceId).toBe('mic-new');
      expect(settings.enabled).toBe(true);
    });

    it('should merge partial updates with existing settings', async () => {
      const { setAudioSettings, getAudioSettings } = await import('./audioSettings');
      
      // First set complete settings
      setAudioSettings({ deviceId: 'mic-first', enabled: true });
      
      // Then update only deviceId
      setAudioSettings({ deviceId: 'mic-second' });
      
      const settings = getAudioSettings();
      expect(settings.deviceId).toBe('mic-second');
      expect(settings.enabled).toBe(true); // Should retain previous value
    });

    it('should persist as JSON string', async () => {
      const { setAudioSettings } = await import('./audioSettings');
      
      setAudioSettings({ deviceId: 'mic-test', enabled: false });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );
      
      // Verify it's valid JSON
      const stored = localStorageMock.store[STORAGE_KEY];
      expect(() => JSON.parse(stored)).not.toThrow();
    });

    it('should allow setting deviceId to null', async () => {
      const { setAudioSettings, getAudioSettings } = await import('./audioSettings');
      
      setAudioSettings({ deviceId: 'mic-123', enabled: true });
      setAudioSettings({ deviceId: null });
      
      const settings = getAudioSettings();
      expect(settings.deviceId).toBeNull();
      expect(settings.enabled).toBe(true);
    });
  });

  describe('clearAudioSettings', () => {
    it('should remove settings from localStorage', async () => {
      const { setAudioSettings, clearAudioSettings } = await import('./audioSettings');
      
      // First set some settings
      setAudioSettings({ deviceId: 'mic-to-clear', enabled: true });
      expect(localStorageMock.store[STORAGE_KEY]).toBeDefined();
      
      // Clear them
      clearAudioSettings();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(localStorageMock.store[STORAGE_KEY]).toBeUndefined();
    });

    it('should return defaults after clear', async () => {
      const { setAudioSettings, clearAudioSettings, getAudioSettings } = await import('./audioSettings');
      
      setAudioSettings({ deviceId: 'mic-test', enabled: true });
      clearAudioSettings();
      
      const settings = getAudioSettings();
      expect(settings).toEqual({
        deviceId: null,
        enabled: false,
        sampleRate: 48000,
        channelCount: 2,
        noiseSuppression: true,
        echoCancellation: false,
        autoGainControl: true,
        audioBitrate: 192,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle localStorage unavailable gracefully', async () => {
      // Make localStorage throw
      delete (globalThis as any).window;
      (globalThis as any).window = {
        get localStorage() {
          throw new Error('localStorage is not available');
        },
      };

      // Re-import to get fresh module
      vi.resetModules();
      const { getAudioSettings, setAudioSettings, clearAudioSettings } = await import('./audioSettings');
      
      // Should not throw and return defaults
      expect(() => getAudioSettings()).not.toThrow();
      expect(() => setAudioSettings({ enabled: true })).not.toThrow();
      expect(() => clearAudioSettings()).not.toThrow();
      
      const settings = getAudioSettings();
      expect(settings).toEqual({
        deviceId: null,
        enabled: false,
        sampleRate: 48000,
        channelCount: 2,
        noiseSuppression: true,
        echoCancellation: false,
        autoGainControl: true,
        audioBitrate: 192,
      });
    });

    it('should handle corrupted data gracefully', async () => {
      // Store data that parses as JSON but has wrong types
      localStorageMock.store[STORAGE_KEY] = JSON.stringify({
        deviceId: 12345, // number instead of string|null
        enabled: 'yes', // string instead of boolean
      });

      const { getAudioSettings } = await import('./audioSettings');
      
      // Should not throw
      expect(() => getAudioSettings()).not.toThrow();
      
      // Should return something reasonable (either defaults or coerced values)
      const settings = getAudioSettings();
      expect(settings).toBeDefined();
      expect(typeof settings.enabled === 'boolean' || settings.enabled === 'yes').toBe(true);
    });

    it('should handle empty object in localStorage', async () => {
      localStorageMock.store[STORAGE_KEY] = JSON.stringify({});

      const { getAudioSettings } = await import('./audioSettings');
      
      const settings = getAudioSettings();
      
      // Should merge with defaults
      expect(settings.deviceId).toBeNull();
      expect(settings.enabled).toBe(false);
    });
  });

  describe('Type Exports', () => {
    it('should export AudioSettings type', async () => {
      // This test ensures the type is exported correctly
      // If it compiles, the type exists
      const mod = await import('./audioSettings');
      
      expect(mod.getAudioSettings).toBeDefined();
      expect(mod.setAudioSettings).toBeDefined();
      expect(mod.clearAudioSettings).toBeDefined();
    });

    it('should export DEFAULT_SETTINGS constant', async () => {
      const { DEFAULT_SETTINGS } = await import('./audioSettings');
      
      expect(DEFAULT_SETTINGS).toEqual({
        deviceId: null,
        enabled: false,
        sampleRate: 48000,
        channelCount: 2,
        noiseSuppression: true,
        echoCancellation: false,
        autoGainControl: true,
        audioBitrate: 192,
      });
    });

    it('should export STORAGE_KEY constant', async () => {
      const { STORAGE_KEY: exportedKey } = await import('./audioSettings');
      
      expect(exportedKey).toBe('openscreen:audioSettings');
    });

    it('should export audio settings option arrays', async () => {
      const { 
        SAMPLE_RATE_OPTIONS, 
        CHANNEL_COUNT_OPTIONS, 
        AUDIO_BITRATE_OPTIONS 
      } = await import('./audioSettings');
      
      expect(SAMPLE_RATE_OPTIONS).toHaveLength(2);
      expect(SAMPLE_RATE_OPTIONS.map(o => o.value)).toEqual([44100, 48000]);
      
      expect(CHANNEL_COUNT_OPTIONS).toHaveLength(2);
      expect(CHANNEL_COUNT_OPTIONS.map(o => o.value)).toEqual([1, 2]);
      
      expect(AUDIO_BITRATE_OPTIONS).toHaveLength(4);
      expect(AUDIO_BITRATE_OPTIONS.map(o => o.value)).toEqual([128, 192, 256, 320]);
    });
  });

  describe('Advanced Audio Settings', () => {
    it('should persist and retrieve sample rate', async () => {
      const { setAudioSettings, getAudioSettings } = await import('./audioSettings');
      
      setAudioSettings({ sampleRate: 44100 });
      expect(getAudioSettings().sampleRate).toBe(44100);
      
      setAudioSettings({ sampleRate: 48000 });
      expect(getAudioSettings().sampleRate).toBe(48000);
    });

    it('should persist and retrieve channel count', async () => {
      const { setAudioSettings, getAudioSettings } = await import('./audioSettings');
      
      setAudioSettings({ channelCount: 1 });
      expect(getAudioSettings().channelCount).toBe(1);
      
      setAudioSettings({ channelCount: 2 });
      expect(getAudioSettings().channelCount).toBe(2);
    });

    it('should persist and retrieve processing toggles', async () => {
      const { setAudioSettings, getAudioSettings } = await import('./audioSettings');
      
      setAudioSettings({ 
        noiseSuppression: false,
        echoCancellation: true,
        autoGainControl: false,
      });
      
      const settings = getAudioSettings();
      expect(settings.noiseSuppression).toBe(false);
      expect(settings.echoCancellation).toBe(true);
      expect(settings.autoGainControl).toBe(false);
    });

    it('should persist and retrieve audio bitrate', async () => {
      const { setAudioSettings, getAudioSettings } = await import('./audioSettings');
      
      const bitrates = [128, 192, 256, 320] as const;
      for (const bitrate of bitrates) {
        setAudioSettings({ audioBitrate: bitrate });
        expect(getAudioSettings().audioBitrate).toBe(bitrate);
      }
    });

    it('should fallback to defaults for invalid values', async () => {
      // Store invalid values
      localStorageMock.store[STORAGE_KEY] = JSON.stringify({
        sampleRate: 96000, // invalid
        channelCount: 5,   // invalid
        audioBitrate: 64,  // invalid
      });

      const { getAudioSettings } = await import('./audioSettings');
      const settings = getAudioSettings();
      
      // Should fallback to defaults
      expect(settings.sampleRate).toBe(48000);
      expect(settings.channelCount).toBe(2);
      expect(settings.audioBitrate).toBe(192);
    });
  });
});
