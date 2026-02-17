import { describe, expect, it } from 'vitest'

import { getMimeTypeForPath, resolveByteRange } from './fileRange'

describe('resolveByteRange', () => {
  it('returns full content when range header is missing', () => {
    const result = resolveByteRange(null, 1000)

    expect(result).toEqual({
      ok: true,
      start: 0,
      end: 999,
      status: 200,
      isPartial: false,
    })
  })

  it('parses explicit start and end byte range', () => {
    const result = resolveByteRange('bytes=100-199', 1000)

    expect(result).toEqual({
      ok: true,
      start: 100,
      end: 199,
      status: 206,
      isPartial: true,
    })
  })

  it('parses open-ended range', () => {
    const result = resolveByteRange('bytes=900-', 1000)

    expect(result).toEqual({
      ok: true,
      start: 900,
      end: 999,
      status: 206,
      isPartial: true,
    })
  })

  it('parses suffix range', () => {
    const result = resolveByteRange('bytes=-100', 1000)

    expect(result).toEqual({
      ok: true,
      start: 900,
      end: 999,
      status: 206,
      isPartial: true,
    })
  })

  it('returns 416 for invalid range', () => {
    const result = resolveByteRange('bytes=1000-1200', 1000)

    expect(result).toEqual({
      ok: false,
      status: 416,
    })
  })
})

describe('getMimeTypeForPath', () => {
  it('returns video mime types for known extensions', () => {
    expect(getMimeTypeForPath('recording.webm')).toBe('video/webm')
    expect(getMimeTypeForPath('recording.mp4')).toBe('video/mp4')
    expect(getMimeTypeForPath('recording.mov')).toBe('video/quicktime')
  })

  it('falls back to octet-stream for unknown extension', () => {
    expect(getMimeTypeForPath('recording.bin')).toBe('application/octet-stream')
  })
})
