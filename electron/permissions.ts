import { session, systemPreferences } from 'electron'

const ALLOWED_PERMISSIONS = new Set(['media', 'fullscreen'])

/**
 * Set up Electron session permission handlers for camera/media access.
 * Implements both setPermissionRequestHandler and setPermissionCheckHandler
 * for consistent behavior with navigator.permissions.query() and getUserMedia().
 */
export function setupPermissionHandlers(): void {
  const ses = session.defaultSession

  // Reset to force fresh permission state
  ses.setPermissionRequestHandler(null)

  ses.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    if (permission === 'media') {
      const mediaDetails = details as { mediaTypes?: string[] }
      const wantsVideo = mediaDetails.mediaTypes?.includes('video') ?? false

      if (wantsVideo) {
        if (process.platform === 'darwin') {
          handleMacOSCameraRequest()
            .then(callback)
            .catch(() => callback(false))
          return
        }
        callback(true)
        return
      }
      // Deny audio-only or other media sub-types not needed for webcam overlay
      callback(false)
      return
    }

    callback(ALLOWED_PERMISSIONS.has(permission))
  })

  ses.setPermissionCheckHandler((_webContents, permission, _origin, details) => {
    if (permission === 'media') {
      const mediaCheck = details as { mediaType?: string }
      if (mediaCheck.mediaType === 'video') {
        if (process.platform === 'darwin' || process.platform === 'win32') {
          return systemPreferences.getMediaAccessStatus('camera') === 'granted'
        }
        return true // Linux: no OS-level permission API, assume granted
      }
      return false
    }
    return ALLOWED_PERMISSIONS.has(permission)
  })
}

/**
 * Get OS-level camera permission status.
 * Returns a stable status string across platforms.
 */
export function getCameraPermissionStatus(): string {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    return systemPreferences.getMediaAccessStatus('camera')
  }
  // Linux: no OS-level permission API
  return 'granted'
}

/**
 * Request camera access. On macOS, triggers the OS consent dialog if needed.
 * Returns true if access was granted.
 */
export async function requestCameraAccess(): Promise<boolean> {
  if (process.platform === 'darwin') {
    return handleMacOSCameraRequest()
  }
  if (process.platform === 'win32') {
    return systemPreferences.getMediaAccessStatus('camera') === 'granted'
  }
  // Linux: assume granted
  return true
}

async function handleMacOSCameraRequest(): Promise<boolean> {
  const status = systemPreferences.getMediaAccessStatus('camera')
  if (status === 'not-determined') {
    return systemPreferences.askForMediaAccess('camera')
  }
  return status === 'granted'
}
