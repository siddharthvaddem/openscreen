// Google Fonts loading and management utility

export interface CustomFont {
  id: string;
  name: string; // Display name
  fontFamily: string; // CSS font-family value
  importUrl: string; // Google Fonts @import URL
}

const STORAGE_KEY = 'openscreen_custom_fonts';
const loadedFonts = new Set<string>();

// Load custom fonts from localStorage
export function getCustomFonts(): CustomFont[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load custom fonts from storage:', error);
    return [];
  }
}

// Save custom fonts to localStorage
export function saveCustomFonts(fonts: CustomFont[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts));
  } catch (error) {
    console.error('Failed to save custom fonts to storage:', error);
  }
}

// Add a new custom font (throws error if font fails to load)
export async function addCustomFont(font: CustomFont): Promise<CustomFont[]> {
  const fonts = getCustomFonts();
  const exists = fonts.some(f => f.id === font.id || f.fontFamily === font.fontFamily);

  if (exists) {
    return fonts;
  }

  // Try to load the font first - this will throw if it fails
  await loadFont(font);

  // Only add to storage if font loaded successfully
  fonts.push(font);
  saveCustomFonts(fonts);

  return fonts;
}

// Remove a custom font
export function removeCustomFont(fontId: string): CustomFont[] {
  const fonts = getCustomFonts();
  const filtered = fonts.filter(f => f.id !== fontId);
  saveCustomFonts(filtered);

  // Remove the style element
  const styleEl = document.getElementById(`custom-font-${fontId}`);
  if (styleEl) {
    styleEl.remove();
  }

  loadedFonts.delete(fontId);
  return filtered;
}

// Load a Google Font into the document
export function loadFont(font: CustomFont): Promise<void> {
  return new Promise((resolve, reject) => {
    // Skip if already loaded
    if (loadedFonts.has(font.id)) {
      resolve();
      return;
    }

    try {
      const styleId = `custom-font-${font.id}`;

      // Remove existing style if present
      const existing = document.getElementById(styleId);
      if (existing) {
        existing.remove();
      }

      // Create style element with @import
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `@import url('${font.importUrl}');`;
      document.head.appendChild(style);

      // Wait for font to load
      waitForFont(font.fontFamily)
        .then(() => {
          loadedFonts.add(font.id);
          resolve();
        })
        .catch(reject);

    } catch (error) {
      console.error('Failed to load font:', font, error);
      reject(error);
    }
  });
}

// Wait for a font to be available and verify it loaded
function waitForFont(fontFamily: string, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use CSS Font Loading API if available
    if ('fonts' in document) {
      Promise.race([
        document.fonts.load(`16px "${fontFamily}"`),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Font load timeout')), timeout))
      ])
        .then(() => {
          // Verify the font actually loaded by checking if it's available
          const isAvailable = document.fonts.check(`16px "${fontFamily}"`);
          if (isAvailable) {
            resolve();
          } else {
            reject(new Error(`Font "${fontFamily}" failed to load`));
          }
        })
        .catch((error) => {
          reject(error);
        });
    } else {
      // Fallback for browsers without Font Loading API
      // Wait a bit and hope for the best
      setTimeout(() => resolve(), 1000);
    }
  });
}

// Load all stored custom fonts on app initialization
export function loadAllCustomFonts(): Promise<void[]> {
  const fonts = getCustomFonts();
  return Promise.all(fonts.map(font => loadFont(font).catch(err => {
    console.error('Failed to load custom font:', font.name, err);
  })));
}

// Generate a unique ID for a font
export function generateFontId(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
}

// Parse Google Fonts @import URL to extract font family name
export function parseFontFamilyFromImport(importUrl: string): string | null {
  try {
    // Extract from URL like: https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap
    const url = new URL(importUrl);
    const familyParam = url.searchParams.get('family');

    if (familyParam) {
      // Remove weight/style info: "Roboto:wght@400;700" -> "Roboto"
      const fontName = familyParam.split(':')[0];
      // Replace + with spaces: "Open+Sans" -> "Open Sans"
      return fontName.replace(/\+/g, ' ');
    }

    return null;
  } catch (error) {
    console.error('Failed to parse font family from import URL:', error);
    return null;
  }
}

// Validate if a string looks like a Google Fonts import URL
export function isValidGoogleFontsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'fonts.googleapis.com' && urlObj.searchParams.has('family');
  } catch {
    return false;
  }
}
