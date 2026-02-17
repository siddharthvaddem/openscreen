import { beforeEach, describe, expect, it } from 'vitest'
import path from 'node:path'

import {
  addExplicitlySelectedVideoPath,
  clearExplicitlySelectedVideoPaths,
  isPathWithinDir,
  isVideoPathAllowed,
} from './videoPathAccess'

const RECORDINGS_DIR = path.resolve(path.join(path.sep, 'test', 'recordings'))

describe('videoPathAccess', () => {
  beforeEach(() => {
    clearExplicitlySelectedVideoPaths()
  })

  it('accepts videos inside recordings directory', () => {
    const videoPath = path.join(RECORDINGS_DIR, 'recording-123.webm')

    expect(isVideoPathAllowed(videoPath, RECORDINGS_DIR)).toBe(true)
  })

  it('rejects videos outside recordings when not explicitly selected', () => {
    const videoPath = path.resolve(path.join(path.sep, 'outside', 'recording-123.webm'))

    expect(isVideoPathAllowed(videoPath, RECORDINGS_DIR)).toBe(false)
  })

  it('accepts explicitly selected videos outside recordings directory', () => {
    const videoPath = path.resolve(path.join(path.sep, 'outside', 'recording-123.webm'))
    addExplicitlySelectedVideoPath(videoPath)

    expect(isVideoPathAllowed(videoPath, RECORDINGS_DIR)).toBe(true)
  })

  it('handles normalized paths consistently', () => {
    const nested = path.join(RECORDINGS_DIR, 'folder', '..', 'recording-456.webm')

    expect(isPathWithinDir(nested, RECORDINGS_DIR)).toBe(true)
    expect(isVideoPathAllowed(nested, RECORDINGS_DIR)).toBe(true)
  })
})
