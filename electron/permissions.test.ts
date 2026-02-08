import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron modules before any imports
const mockSetPermissionRequestHandler = vi.fn()
const mockSetPermissionCheckHandler = vi.fn()
const mockGetMediaAccessStatus = vi.fn()
const mockAskForMediaAccess = vi.fn()

vi.mock('electron', () => ({
  session: {
    defaultSession: {
      setPermissionRequestHandler: (...args: unknown[]) => mockSetPermissionRequestHandler(...args),
      setPermissionCheckHandler: (...args: unknown[]) => mockSetPermissionCheckHandler(...args),
    },
  },
  systemPreferences: {
    getMediaAccessStatus: (...args: unknown[]) => mockGetMediaAccessStatus(...args),
    askForMediaAccess: (...args: unknown[]) => mockAskForMediaAccess(...args),
  },
}))

import {
  setupPermissionHandlers,
  getCameraPermissionStatus,
  requestCameraAccess,
} from './permissions'

describe('setupPermissionHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reset and register both permission handlers', () => {
    setupPermissionHandlers()

    // Should reset first (call with null), then set new handler
    expect(mockSetPermissionRequestHandler).toHaveBeenCalledTimes(2)
    expect(mockSetPermissionRequestHandler).toHaveBeenNthCalledWith(1, null)
    expect(typeof mockSetPermissionRequestHandler.mock.calls[1][0]).toBe('function')

    expect(mockSetPermissionCheckHandler).toHaveBeenCalledTimes(1)
    expect(typeof mockSetPermissionCheckHandler.mock.calls[0][0]).toBe('function')
  })

  describe('permission request handler', () => {
    let requestHandler: (
      webContents: unknown,
      permission: string,
      callback: (granted: boolean) => void,
      details: Record<string, unknown>
    ) => void

    beforeEach(() => {
      setupPermissionHandlers()
      requestHandler = mockSetPermissionRequestHandler.mock.calls[1][0]
    })

    it('should grant media permission when mediaTypes includes video', () => {
      const callback = vi.fn()
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })

      requestHandler(null, 'media', callback, { mediaTypes: ['video'] })

      expect(callback).toHaveBeenCalledWith(true)
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should deny media permission for audio-only requests', () => {
      const callback = vi.fn()

      requestHandler(null, 'media', callback, { mediaTypes: ['audio'] })

      expect(callback).toHaveBeenCalledWith(false)
    })

    it('should deny media permission when mediaTypes is empty', () => {
      const callback = vi.fn()

      requestHandler(null, 'media', callback, { mediaTypes: [] })

      expect(callback).toHaveBeenCalledWith(false)
    })

    it('should grant fullscreen permission', () => {
      const callback = vi.fn()

      requestHandler(null, 'fullscreen', callback, {})

      expect(callback).toHaveBeenCalledWith(true)
    })

    it('should deny unknown permissions', () => {
      const callback = vi.fn()

      requestHandler(null, 'geolocation', callback, {})

      expect(callback).toHaveBeenCalledWith(false)
    })

    it('should deny notifications permission', () => {
      const callback = vi.fn()

      requestHandler(null, 'notifications', callback, {})

      expect(callback).toHaveBeenCalledWith(false)
    })

    it('should trigger macOS askForMediaAccess for video on darwin', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      mockGetMediaAccessStatus.mockReturnValue('not-determined')
      mockAskForMediaAccess.mockResolvedValue(true)

      const callback = vi.fn()
      requestHandler(null, 'media', callback, { mediaTypes: ['video'] })

      // Wait for async macOS handler
      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith(true)
      })

      expect(mockAskForMediaAccess).toHaveBeenCalledWith('camera')

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })
  })

  describe('permission check handler', () => {
    let checkHandler: (
      webContents: unknown,
      permission: string,
      origin: string,
      details: Record<string, unknown>
    ) => boolean

    beforeEach(() => {
      setupPermissionHandlers()
      checkHandler = mockSetPermissionCheckHandler.mock.calls[0][0]
    })

    it('should return true for video media check when camera is granted (macOS/Windows)', () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      mockGetMediaAccessStatus.mockReturnValue('granted')

      const result = checkHandler(null, 'media', '', { mediaType: 'video' })

      expect(result).toBe(true)
      expect(mockGetMediaAccessStatus).toHaveBeenCalledWith('camera')

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should return false for video media check when camera is denied (macOS/Windows)', () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })
      mockGetMediaAccessStatus.mockReturnValue('denied')

      const result = checkHandler(null, 'media', '', { mediaType: 'video' })

      expect(result).toBe(false)

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should return true for video media check on Linux (no OS-level API)', () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'linux' })

      const result = checkHandler(null, 'media', '', { mediaType: 'video' })

      expect(result).toBe(true)

      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should return false for audio media check', () => {
      const result = checkHandler(null, 'media', '', { mediaType: 'audio' })

      expect(result).toBe(false)
    })

    it('should return true for fullscreen check', () => {
      const result = checkHandler(null, 'fullscreen', '', {})

      expect(result).toBe(true)
    })

    it('should return false for unknown permission check', () => {
      const result = checkHandler(null, 'geolocation', '', {})

      expect(result).toBe(false)
    })
  })
})

describe('getCameraPermissionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return OS camera status on macOS', () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    mockGetMediaAccessStatus.mockReturnValue('granted')

    const status = getCameraPermissionStatus()

    expect(status).toBe('granted')
    expect(mockGetMediaAccessStatus).toHaveBeenCalledWith('camera')

    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it('should return OS camera status on Windows', () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32' })
    mockGetMediaAccessStatus.mockReturnValue('denied')

    const status = getCameraPermissionStatus()

    expect(status).toBe('denied')

    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it('should return "granted" on Linux', () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const status = getCameraPermissionStatus()

    expect(status).toBe('granted')
    expect(mockGetMediaAccessStatus).not.toHaveBeenCalled()

    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })
})

describe('requestCameraAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should trigger OS dialog on macOS when not-determined', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    mockGetMediaAccessStatus.mockReturnValue('not-determined')
    mockAskForMediaAccess.mockResolvedValue(true)

    const result = await requestCameraAccess()

    expect(result).toBe(true)
    expect(mockAskForMediaAccess).toHaveBeenCalledWith('camera')

    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it('should return granted status on macOS when already determined', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    mockGetMediaAccessStatus.mockReturnValue('granted')

    const result = await requestCameraAccess()

    expect(result).toBe(true)
    expect(mockAskForMediaAccess).not.toHaveBeenCalled()

    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it('should return false on macOS when denied', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    mockGetMediaAccessStatus.mockReturnValue('denied')

    const result = await requestCameraAccess()

    expect(result).toBe(false)

    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it('should check OS status on Windows', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32' })
    mockGetMediaAccessStatus.mockReturnValue('granted')

    const result = await requestCameraAccess()

    expect(result).toBe(true)

    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it('should return true on Linux', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const result = await requestCameraAccess()

    expect(result).toBe(true)

    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })
})
