import { renderHook, act } from '@testing-library/react';
import { useCamSettings } from './useCamSettings';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electronAPI
const mockElectronAPI = {
  camera: {
    getPermissionStatus: vi.fn(),
    requestAccess: vi.fn(),
  },
};

// Mock localStorage — store exposed for direct manipulation in tests
let mockStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStore[key] = value.toString();
  }),
  clear: vi.fn(() => {
    mockStore = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Setup window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('useCamSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = {};

    // Restore getItem to use the store (clears any mockReturnValue from prior tests)
    localStorageMock.getItem.mockImplementation((key: string) => mockStore[key] ?? null);
    
    // Default mock implementations
    mockElectronAPI.camera.getPermissionStatus.mockResolvedValue({ success: true, status: 'unknown' });
    mockElectronAPI.camera.requestAccess.mockResolvedValue({ success: true, granted: true });
  });

  it('should initialize with default settings', async () => {
    const { result } = renderHook(() => useCamSettings());
    
    expect(result.current.settings.enabled).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('should load settings from localStorage', () => {
    mockStore['openscreen-cam-settings'] = JSON.stringify({ enabled: true });
    
    const { result } = renderHook(() => useCamSettings());
    
    expect(result.current.settings.enabled).toBe(true);
  });

  it('should check permission on mount', async () => {
    mockElectronAPI.camera.getPermissionStatus.mockResolvedValue({ success: true, status: 'granted' });
    
    const { result } = renderHook(() => useCamSettings());
    
    // Wait for async effect
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockElectronAPI.camera.getPermissionStatus).toHaveBeenCalled();
    expect(result.current.permissionStatus).toBe('granted');
  });

  it('should request permission when enabling cam', async () => {
    const { result } = renderHook(() => useCamSettings());
    
    await act(async () => {
      await result.current.setEnabled(true);
    });

    expect(mockElectronAPI.camera.requestAccess).toHaveBeenCalled();
    expect(result.current.settings.enabled).toBe(true);
    expect(result.current.permissionStatus).toBe('granted');
  });

  it('should not enable cam if permission denied', async () => {
    mockElectronAPI.camera.requestAccess.mockResolvedValue({ success: true, granted: false });
    
    const { result } = renderHook(() => useCamSettings());
    
    await act(async () => {
      await result.current.setEnabled(true);
    });

    expect(mockElectronAPI.camera.requestAccess).toHaveBeenCalled();
    expect(result.current.settings.enabled).toBe(false); // Should remain false
    expect(result.current.permissionStatus).toBe('denied');
  });

  it('should save settings to localStorage when changed', async () => {
    const { result } = renderHook(() => useCamSettings());
    
    await act(async () => {
      await result.current.setEnabled(true);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'openscreen-cam-settings', 
      JSON.stringify({ enabled: true })
    );
  });

  describe('cross-window sync via storage event', () => {
    it('should update settings when storage event fires with new value', async () => {
      const { result } = renderHook(() => useCamSettings());

      expect(result.current.settings.enabled).toBe(false);

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'openscreen-cam-settings',
          newValue: JSON.stringify({ enabled: true }),
        });
        window.dispatchEvent(event);
      });

      expect(result.current.settings.enabled).toBe(true);
    });

    it('should reset to defaults when storage key is removed', async () => {
      // Start with enabled=true
      mockStore['openscreen-cam-settings'] = JSON.stringify({ enabled: true });
      const { result } = renderHook(() => useCamSettings());

      expect(result.current.settings.enabled).toBe(true);

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'openscreen-cam-settings',
          newValue: null,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.settings.enabled).toBe(false);
    });

    it('should ignore storage events for other keys', () => {
      const { result } = renderHook(() => useCamSettings());

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'other-key',
          newValue: JSON.stringify({ enabled: true }),
        });
        window.dispatchEvent(event);
      });

      expect(result.current.settings.enabled).toBe(false);
    });

    it('should ignore storage events with invalid JSON', () => {
      const { result } = renderHook(() => useCamSettings());

      act(() => {
        const event = new StorageEvent('storage', {
          key: 'openscreen-cam-settings',
          newValue: 'not-valid-json{{{',
        });
        window.dispatchEvent(event);
      });

      // Should remain unchanged (default false)
      expect(result.current.settings.enabled).toBe(false);
    });

    it('should clean up storage listener on unmount', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useCamSettings());

      expect(addSpy).toHaveBeenCalledWith('storage', expect.any(Function));

      unmount();

      expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
