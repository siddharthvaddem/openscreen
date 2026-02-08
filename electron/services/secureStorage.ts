/**
 * Secure Storage Service
 * 
 * Provides encrypted storage for sensitive data like API keys.
 * Uses Electron's safeStorage module for encryption/decryption.
 * Stores encrypted data in electron-store.
 */

import { safeStorage } from 'electron';
import Store from 'electron-store';

interface SecureStorageSchema {
  apiKeys: {
    assemblyai?: string; // base64 encoded encrypted buffer
  };
}

const ALLOWED_SERVICES = ['assemblyai'] as const
type AllowedService = (typeof ALLOWED_SERVICES)[number]

function isValidService(service: string): service is AllowedService {
  return ALLOWED_SERVICES.includes(service as AllowedService)
}

const store = new Store<SecureStorageSchema>({
  name: 'secure-storage',
  schema: {
    apiKeys: {
      type: 'object',
      default: {},
      properties: {
        assemblyai: {
          type: 'string',
        },
      },
    },
  },
});

/**
 * Check if encryption is available on this platform
 */
export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

/**
 * Store an API key securely
 * @param service - The service name (e.g., 'assemblyai')
 * @param apiKey - The API key to encrypt and store
 * @returns Object with success status and optional error message
 */
export function setApiKey(service: string, apiKey: string): { success: boolean; error?: string } {
  try {
    if (!isValidService(service)) {
      return { success: false, error: `Unknown service: ${service}` }
    }

    if (!safeStorage.isEncryptionAvailable()) {
      return {
        success: false,
        error: 'Encryption is not available on this platform',
      };
    }

    if (!apiKey || apiKey.trim() === '') {
      return {
        success: false,
        error: 'API key cannot be empty',
      };
    }

    const encrypted = safeStorage.encryptString(apiKey.trim());
    const encryptedBase64 = encrypted.toString('base64');

    const apiKeys = store.get('apiKeys', {});
    apiKeys[service] = encryptedBase64;
    store.set('apiKeys', apiKeys);

    return { success: true };
  } catch (error) {
    console.error(`Failed to store API key for ${service}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error storing API key',
    };
  }
}

/**
 * Retrieve a stored API key
 * @param service - The service name (e.g., 'assemblyai')
 * @returns Object with success status, apiKey (if found), and optional error message
 */
export function getApiKey(service: string): {
  success: boolean;
  apiKey?: string;
  error?: string;
  notFound?: boolean;
} {
  try {
    if (!isValidService(service)) {
      return { success: false, error: `Unknown service: ${service}` }
    }

    if (!safeStorage.isEncryptionAvailable()) {
      return {
        success: false,
        error: 'Encryption is not available on this platform',
      };
    }

    const apiKeys = store.get('apiKeys', {});
    const encryptedBase64 = apiKeys[service];

    if (!encryptedBase64) {
      return {
        success: false,
        notFound: true,
        error: `No API key found for ${service}`,
      };
    }

    const encrypted = Buffer.from(encryptedBase64, 'base64');
    const decrypted = safeStorage.decryptString(encrypted);

    return {
      success: true,
      apiKey: decrypted,
    };
  } catch (error) {
    console.error(`Failed to retrieve API key for ${service}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error retrieving API key',
    };
  }
}

/**
 * Delete a stored API key
 * @param service - The service name (e.g., 'assemblyai')
 * @returns Object with success status and optional error message
 */
export function deleteApiKey(service: string): { success: boolean; error?: string } {
  try {
    if (!isValidService(service)) {
      return { success: false, error: `Unknown service: ${service}` }
    }

    const apiKeys = store.get('apiKeys', {});

    if (!(service in apiKeys)) {
      return {
        success: false,
        error: `No API key found for ${service}`,
      };
    }

    delete apiKeys[service];
    store.set('apiKeys', apiKeys);

    return { success: true };
  } catch (error) {
    console.error(`Failed to delete API key for ${service}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error deleting API key',
    };
  }
}

/**
 * Check if an API key exists for a service
 * @param service - The service name (e.g., 'assemblyai')
 * @returns boolean indicating if key exists
 */
export function hasApiKey(service: string): boolean {
  try {
    if (!isValidService(service)) {
      return false
    }

    const apiKeys = store.get('apiKeys', {});
    return service in apiKeys;
  } catch (error) {
    console.error(`Failed to check API key for ${service}:`, error);
    return false;
  }
}

/**
 * Migrate API key from localStorage (one-time migration)
 * Call this when the app starts to migrate existing keys
 * @param service - The service name
 * @returns Object with migration status
 */
export function migrateFromLocalStorage(
  service: string
): { 
  success: boolean; 
  migrated: boolean;
  error?: string;
} {
  try {
    // Check if already migrated (key exists in secure storage)
    if (hasApiKey(service)) {
      return { success: true, migrated: false };
    }

    // Note: This function should be called from the renderer process
    // via IPC, as localStorage is only accessible there
    // The actual migration logic will be in the IPC handler
    return { 
      success: true, 
      migrated: false,
      error: 'Migration should be handled via IPC from renderer',
    };
  } catch (error) {
    console.error(`Failed to migrate API key for ${service}:`, error);
    return {
      success: false,
      migrated: false,
      error: error instanceof Error ? error.message : 'Unknown error during migration',
    };
  }
}
