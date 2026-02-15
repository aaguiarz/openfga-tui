import { endpoints } from './endpoints.ts'
import type {
  ConnectionConfig,
  AuthConfig,
  Store,
  ListStoresResponse,
  CreateStoreRequest,
  AuthorizationModel,
  ListAuthorizationModelsResponse,
  WriteAuthorizationModelRequest,
  WriteAuthorizationModelResponse,
  ReadRequest,
  ReadResponse,
  WriteRequest,
  CheckRequest,
  CheckResponse,
  ExpandRequest,
  ExpandResponse,
  ListObjectsRequest,
  ListObjectsResponse,
  ListUsersRequest,
  ListUsersResponse,
  ApiError,
} from './types.ts'

// Token cache for OIDC authentication
interface TokenCache {
  accessToken: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

async function getOIDCToken(auth: Extract<AuthConfig, { type: 'oidc' }>): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.accessToken
  }

  // Fetch new token
  const response = await fetch(auth.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to obtain OIDC token: ${response.statusText}`)
  }

  const data = await response.json()
  const expiresIn = data.expires_in || 3600

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  }

  return tokenCache.accessToken
}

async function getAuthHeaders(auth: AuthConfig): Promise<Record<string, string>> {
  switch (auth.type) {
    case 'none':
      return {}
    case 'api-key':
      return { Authorization: `Bearer ${auth.apiKey}` }
    case 'oidc':
      const token = await getOIDCToken(auth)
      return { Authorization: `Bearer ${token}` }
  }
}

export class OpenFGAClient {
  private config: ConnectionConfig

  constructor(config: ConnectionConfig) {
    this.config = config
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.serverUrl}${path}`
    const authHeaders = await getAuthHeaders(this.config.auth)

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      let errorData: ApiError
      try {
        errorData = await response.json()
      } catch {
        errorData = {
          code: 'unknown',
          message: `HTTP ${response.status}: ${response.statusText}`,
        }
      }
      throw new Error(errorData.message || `Request failed: ${response.statusText}`)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  // Store operations
  async listStores(pageSize?: number, continuationToken?: string): Promise<ListStoresResponse> {
    const params = new URLSearchParams()
    if (pageSize) params.set('page_size', pageSize.toString())
    if (continuationToken) params.set('continuation_token', continuationToken)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<ListStoresResponse>('GET', `${endpoints.listStores()}${query}`)
  }

  async createStore(request: CreateStoreRequest): Promise<Store> {
    return this.request<Store>('POST', endpoints.createStore(), request)
  }

  async getStore(storeId: string): Promise<Store> {
    return this.request<Store>('GET', endpoints.getStore(storeId))
  }

  async deleteStore(storeId: string): Promise<void> {
    await this.request<void>('DELETE', endpoints.deleteStore(storeId))
  }

  // Authorization Model operations
  async listAuthorizationModels(
    storeId: string,
    pageSize?: number,
    continuationToken?: string
  ): Promise<ListAuthorizationModelsResponse> {
    const params = new URLSearchParams()
    if (pageSize) params.set('page_size', pageSize.toString())
    if (continuationToken) params.set('continuation_token', continuationToken)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<ListAuthorizationModelsResponse>(
      'GET',
      `${endpoints.listAuthorizationModels(storeId)}${query}`
    )
  }

  async getAuthorizationModel(storeId: string, modelId: string): Promise<{ authorization_model: AuthorizationModel }> {
    return this.request<{ authorization_model: AuthorizationModel }>(
      'GET',
      endpoints.getAuthorizationModel(storeId, modelId)
    )
  }

  async writeAuthorizationModel(
    storeId: string,
    request: WriteAuthorizationModelRequest
  ): Promise<WriteAuthorizationModelResponse> {
    return this.request<WriteAuthorizationModelResponse>(
      'POST',
      endpoints.writeAuthorizationModel(storeId),
      request
    )
  }

  // Tuple operations
  async read(storeId: string, request: ReadRequest = {}): Promise<ReadResponse> {
    return this.request<ReadResponse>('POST', endpoints.read(storeId), request)
  }

  async write(storeId: string, request: WriteRequest): Promise<void> {
    await this.request<Record<string, never>>('POST', endpoints.write(storeId), request)
  }

  // Query operations
  async check(storeId: string, request: CheckRequest): Promise<CheckResponse> {
    return this.request<CheckResponse>('POST', endpoints.check(storeId), request)
  }

  async expand(storeId: string, request: ExpandRequest): Promise<ExpandResponse> {
    return this.request<ExpandResponse>('POST', endpoints.expand(storeId), request)
  }

  async listObjects(storeId: string, request: ListObjectsRequest): Promise<ListObjectsResponse> {
    return this.request<ListObjectsResponse>('POST', endpoints.listObjects(storeId), request)
  }

  async listUsers(storeId: string, request: ListUsersRequest): Promise<ListUsersResponse> {
    return this.request<ListUsersResponse>('POST', endpoints.listUsers(storeId), request)
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.listStores(1)
      return true
    } catch {
      return false
    }
  }
}

// Export a function to clear the token cache
export function clearTokenCache(): void {
  tokenCache = null
}
