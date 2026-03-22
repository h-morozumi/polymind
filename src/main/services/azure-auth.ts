import { DefaultAzureCredential, InteractiveBrowserCredential } from '@azure/identity'
import type { TokenCredential } from '@azure/identity'

const AZURE_COGNITIVE_SCOPE = 'https://cognitiveservices.azure.com/.default'

/**
 * Creates a token provider for Azure Entra ID authentication.
 * Tries DefaultAzureCredential first (Azure CLI, env vars, managed identity),
 * then falls back to InteractiveBrowserCredential (opens browser for login).
 */
export function createAzureEntraTokenProvider(tenantId?: string): () => Promise<string> {
  let credential: TokenCredential | null = null

  return async (): Promise<string> => {
    if (!credential) {
      credential = await resolveCredential(tenantId)
    }

    const tokenResponse = await credential.getToken(AZURE_COGNITIVE_SCOPE)
    if (!tokenResponse) {
      throw new Error('Azure Entra ID トークンの取得に失敗しました')
    }
    return tokenResponse.token
  }
}

async function resolveCredential(tenantId?: string): Promise<TokenCredential> {
  const defaultCredential = new DefaultAzureCredential(tenantId ? { tenantId } : undefined)

  try {
    await defaultCredential.getToken(AZURE_COGNITIVE_SCOPE)
    return defaultCredential
  } catch {
    console.log('DefaultAzureCredential failed, falling back to InteractiveBrowserCredential')
    return new InteractiveBrowserCredential(tenantId ? { tenantId } : undefined)
  }
}
