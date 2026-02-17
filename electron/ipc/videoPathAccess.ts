import path from 'node:path'

const explicitlySelectedVideoPaths = new Set<string>()

function resolvePath(filePath: string): string {
  return path.resolve(filePath)
}

export function addExplicitlySelectedVideoPath(filePath: string): void {
  explicitlySelectedVideoPaths.add(resolvePath(filePath))
}

export function clearExplicitlySelectedVideoPaths(): void {
  explicitlySelectedVideoPaths.clear()
}

export function isPathWithinDir(filePath: string, allowedDir: string): boolean {
  const resolved = resolvePath(filePath)
  const resolvedDir = resolvePath(allowedDir)
  return resolved === resolvedDir || resolved.startsWith(resolvedDir + path.sep)
}

export function isVideoPathAllowed(filePath: string, recordingsDir: string): boolean {
  const resolvedPath = resolvePath(filePath)
  return isPathWithinDir(resolvedPath, recordingsDir) || explicitlySelectedVideoPaths.has(resolvedPath)
}
