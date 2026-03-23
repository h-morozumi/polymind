import {
  useIdentityPlugin,
  DefaultAzureCredential,
  DeviceCodeCredential,
  serializeAuthenticationRecord,
  deserializeAuthenticationRecord,
} from '@azure/identity'
import type { TokenCredential, AuthenticationRecord } from '@azure/identity'
import { safeStorage, app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { electronCachePersistencePlugin } from './electron-cache-persistence'

useIdentityPlugin(electronCachePersistencePlugin)

const AZURE_COGNITIVE_SCOPE = 'https://cognitiveservices.azure.com/.default'
const TOKEN_CACHE_OPTIONS = { enabled: true } as const

export interface DeviceCodeCallbackInfo {
  message: string
  userCode: string
  verificationUri: string
}

function getAuthRecordPath(): string {
  return join(app.getPath('userData'), 'azure-cache', 'auth-record.bin')
}

async function loadAuthRecord(): Promise<AuthenticationRecord | undefined> {
  try {
    const encrypted = await readFile(getAuthRecordPath())
    if (!safeStorage.isEncryptionAvailable()) return undefined
    const json = safeStorage.decryptString(encrypted)
    return deserializeAuthenticationRecord(json)
  } catch {
    return undefined
  }
}

async function saveAuthRecord(record: AuthenticationRecord): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) return
  const json = serializeAuthenticationRecord(record)
  const encrypted = safeStorage.encryptString(json)
  const filePath = getAuthRecordPath()
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, encrypted)
}

/**
 * Creates a token provider for Azure Entra ID authentication.
 * Tries DefaultAzureCredential first (Azure CLI, env vars, managed identity),
 * then falls back to DeviceCodeCredential with persistent token cache.
 * AuthenticationRecord and tokens are persisted to OS secure storage.
 */
export function createAzureEntraTokenProvider(
  tenantId?: string,
  onDeviceCode?: (info: DeviceCodeCallbackInfo) => void,
): () => Promise<string> {
  let credential: TokenCredential | null = null

  return async (): Promise<string> => {
    if (!credential) {
      credential = await resolveCredential(tenantId, onDeviceCode)
    }

    const tokenResponse = await credential.getToken(AZURE_COGNITIVE_SCOPE)
    if (!tokenResponse) {
      throw new Error('Azure Entra ID トークンの取得に失敗しました')
    }
    return tokenResponse.token
  }
}

async function resolveCredential(
  tenantId?: string,
  onDeviceCode?: (info: DeviceCodeCallbackInfo) => void,
): Promise<TokenCredential> {
  const defaultCredential = new DefaultAzureCredential(tenantId ? { tenantId } : undefined)

  try {
    await defaultCredential.getToken(AZURE_COGNITIVE_SCOPE)
    return defaultCredential
  } catch {
    console.log('DefaultAzureCredential failed, falling back to DeviceCodeCredential')
  }

  const savedRecord = await loadAuthRecord()
  const credential = new DeviceCodeCredential({
    ...(tenantId ? { tenantId } : {}),
    tokenCachePersistenceOptions: TOKEN_CACHE_OPTIONS,
    ...(savedRecord ? { authenticationRecord: savedRecord } : {}),
    userPromptCallback: (info) => {
      console.log('[Azure Entra ID]', info.message)
      onDeviceCode?.({
        message: info.message,
        userCode: info.userCode,
        verificationUri: info.verificationUri,
      })
    },
  })

  if (!savedRecord) {
    const record = await credential.authenticate(AZURE_COGNITIVE_SCOPE)
    await saveAuthRecord(record)
  }

  return credential
}
