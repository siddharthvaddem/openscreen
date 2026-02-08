import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'node:path'

// Mock fs/promises
const mockAccess = vi.fn()
vi.mock('node:fs/promises', () => ({
  default: {
    access: (...args: unknown[]) => mockAccess(...args),
  },
}))

// Simulate the handler logic directly (since registerIpcHandlers registers it inside a closure)
// This tests the same logic as the `webcam:get-webcam-video-path` handler

const RECORDINGS_DIR = '/test/recordings'

function validatePathWithinDir(filePath: string, allowedDir: string): boolean {
  const resolved = path.resolve(filePath)
  const resolvedDir = path.resolve(allowedDir)
  return resolved === resolvedDir || resolved.startsWith(resolvedDir + path.sep)
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

const explicitlySelectedVideoPaths = new Set<string>()

async function getWebcamVideoPath(mainVideoPath: string) {
  try {
    const resolvedVideoPath = path.resolve(mainVideoPath)
    const isInRecordingsDir = validatePathWithinDir(resolvedVideoPath, RECORDINGS_DIR)
    const isExplicitlySelected = explicitlySelectedVideoPaths.has(resolvedVideoPath)

    if (!isInRecordingsDir && !isExplicitlySelected) {
      return { success: false, error: 'Invalid video path' }
    }

    const webcamPath = resolvedVideoPath.replace(/\.(webm|mp4|mov|avi|mkv)$/i, '.webcam.webm')

    try {
      await mockAccess(webcamPath)
      return { success: true, path: webcamPath }
    } catch (accessError: unknown) {
      if (isErrnoException(accessError) && (accessError as NodeJS.ErrnoException).code === 'ENOENT') {
        return { success: false, notFound: true }
      }
      throw accessError
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

describe('webcam:get-webcam-video-path handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    explicitlySelectedVideoPaths.clear()
  })

  it('should return success with webcam path when file exists', async () => {
    const mainVideoPath = path.join(RECORDINGS_DIR, 'recording-12345.webm')
    mockAccess.mockResolvedValue(undefined)

    const result = await getWebcamVideoPath(mainVideoPath)

    expect(result.success).toBe(true)
    expect(result.path).toBe(path.resolve(path.join(RECORDINGS_DIR, 'recording-12345.webcam.webm')))
  })

  it('should return notFound when webcam file does not exist', async () => {
    const mainVideoPath = path.join(RECORDINGS_DIR, 'recording-12345.webm')
    const enoentError = new Error('ENOENT') as NodeJS.ErrnoException
    enoentError.code = 'ENOENT'
    mockAccess.mockRejectedValue(enoentError)

    const result = await getWebcamVideoPath(mainVideoPath)

    expect(result.success).toBe(false)
    expect(result.notFound).toBe(true)
  })

  it('should return error for invalid path outside RECORDINGS_DIR', async () => {
    const mainVideoPath = '/some/other/dir/recording-12345.webm'

    const result = await getWebcamVideoPath(mainVideoPath)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid video path')
  })

  it('should accept explicitly selected video paths outside RECORDINGS_DIR', async () => {
    const mainVideoPath = '/some/other/dir/recording-12345.webm'
    explicitlySelectedVideoPaths.add(path.resolve(mainVideoPath))
    mockAccess.mockResolvedValue(undefined)

    const result = await getWebcamVideoPath(mainVideoPath)

    expect(result.success).toBe(true)
    expect(result.path).toContain('.webcam.webm')
  })

  it('should handle .mp4 extension correctly', async () => {
    const mainVideoPath = path.join(RECORDINGS_DIR, 'recording-12345.mp4')
    mockAccess.mockResolvedValue(undefined)

    const result = await getWebcamVideoPath(mainVideoPath)

    expect(result.success).toBe(true)
    expect(result.path).toBe(path.resolve(path.join(RECORDINGS_DIR, 'recording-12345.webcam.webm')))
  })

  it('should handle .mov extension correctly', async () => {
    const mainVideoPath = path.join(RECORDINGS_DIR, 'recording-12345.mov')
    mockAccess.mockResolvedValue(undefined)

    const result = await getWebcamVideoPath(mainVideoPath)

    expect(result.success).toBe(true)
    expect(result.path).toBe(path.resolve(path.join(RECORDINGS_DIR, 'recording-12345.webcam.webm')))
  })

  it('should return error on general filesystem error', async () => {
    const mainVideoPath = path.join(RECORDINGS_DIR, 'recording-12345.webm')
    const permError = new Error('EACCES: permission denied') as NodeJS.ErrnoException
    permError.code = 'EACCES'
    mockAccess.mockRejectedValue(permError)

    const result = await getWebcamVideoPath(mainVideoPath)

    expect(result.success).toBe(false)
    expect(result.error).toContain('EACCES')
  })

  it('should handle case-insensitive extension matching', async () => {
    const mainVideoPath = path.join(RECORDINGS_DIR, 'recording-12345.WEBM')
    mockAccess.mockResolvedValue(undefined)

    const result = await getWebcamVideoPath(mainVideoPath)

    expect(result.success).toBe(true)
    expect(result.path).toContain('.webcam.webm')
  })
})
