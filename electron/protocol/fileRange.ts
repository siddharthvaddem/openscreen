import path from 'node:path'

export type ResolvedByteRange =
  | { ok: true; start: number; end: number; status: 200 | 206; isPartial: boolean }
  | { ok: false; status: 416 }

export function resolveByteRange(rangeHeader: string | null, fileSize: number): ResolvedByteRange {
  if (fileSize <= 0) {
    return { ok: false, status: 416 }
  }

  if (!rangeHeader) {
    return { ok: true, start: 0, end: fileSize - 1, status: 200, isPartial: false }
  }

  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim())
  if (!match) {
    return { ok: false, status: 416 }
  }

  const [, startRaw, endRaw] = match
  const hasStart = startRaw.length > 0
  const hasEnd = endRaw.length > 0

  if (!hasStart && !hasEnd) {
    return { ok: false, status: 416 }
  }

  let start = 0
  let end = fileSize - 1

  if (hasStart) {
    start = Number.parseInt(startRaw, 10)
    end = hasEnd ? Number.parseInt(endRaw, 10) : fileSize - 1
  } else {
    const suffixLength = Number.parseInt(endRaw, 10)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return { ok: false, status: 416 }
    }
    start = Math.max(fileSize - suffixLength, 0)
    end = fileSize - 1
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { ok: false, status: 416 }
  }

  if (start < 0 || start >= fileSize || end < start) {
    return { ok: false, status: 416 }
  }

  if (end >= fileSize) {
    end = fileSize - 1
  }

  return { ok: true, start, end, status: 206, isPartial: true }
}

export function getMimeTypeForPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase()

  switch (extension) {
    case '.webm':
      return 'video/webm'
    case '.mp4':
      return 'video/mp4'
    case '.mov':
      return 'video/quicktime'
    case '.mkv':
      return 'video/x-matroska'
    case '.avi':
      return 'video/x-msvideo'
    case '.json':
      return 'application/json'
    default:
      return 'application/octet-stream'
  }
}
