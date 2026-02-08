export async function getAssetPath(relativePath: string): Promise<string> {
  try {
    if (typeof window !== 'undefined') {
      // If running in a dev server (http/https), prefer the web-served path
      if (window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
        return `/${relativePath.replace(/^\//, '')}`
      }

      if (window.electronAPI && typeof window.electronAPI.getAssetBasePath === 'function') {
        const base = await window.electronAPI.getAssetBasePath()
        if (base) {
          const normalized = base.replace(/\\/g, '/')
          return `file://${normalized}/${relativePath}`
        }
      }
    }
  } catch (err) {
    // ignore and use fallback
  }

  // Fallback for web/dev server: public/wallpapers are served at '/wallpapers/...'
  return `/${relativePath.replace(/^\//, '')}`
}

export default getAssetPath;
