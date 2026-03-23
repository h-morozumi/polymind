import { safeStorage, app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import type { IdentityPlugin } from '@azure/identity'

function getCachePath(name: string): string {
  return join(app.getPath('userData'), 'azure-cache', `${name}.bin`)
}

interface TokenCacheContext {
  tokenCache: { deserialize(data: string): void; serialize(): string }
  cacheHasChanged: boolean
}

function createCachePlugin(options: { name: string }) {
  const cachePath = getCachePath(options.name)

  return {
    async beforeCacheAccess(context: TokenCacheContext): Promise<void> {
      try {
        const encrypted = await readFile(cachePath)
        if (safeStorage.isEncryptionAvailable()) {
          context.tokenCache.deserialize(safeStorage.decryptString(encrypted))
        }
      } catch {
        // No cache file yet
      }
    },
    async afterCacheAccess(context: TokenCacheContext): Promise<void> {
      if (!context.cacheHasChanged) return
      const data = context.tokenCache.serialize()
      if (!safeStorage.isEncryptionAvailable()) return
      const encrypted = safeStorage.encryptString(data)
      await mkdir(dirname(cachePath), { recursive: true })
      await writeFile(cachePath, encrypted)
    },
  }
}

/**
 * Electron-native token cache persistence plugin for @azure/identity.
 * Uses Electron's safeStorage API (macOS Keychain / Windows DPAPI) to
 * encrypt MSAL token cache data on disk.
 */
export const electronCachePersistencePlugin: IdentityPlugin = (
  context: Record<string, unknown>,
) => {
  const control = context.cachePluginControl as { setPersistence: (fn: unknown) => void }
  control.setPersistence(createCachePlugin)
}
