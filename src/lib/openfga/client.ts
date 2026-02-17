import { endpoints } from './endpoints.ts'
import type {
  ApiError,
  AuthConfig,
  AuthorizationModel,
  CheckRequest,
  CheckResponse,
  ConnectionConfig,
  CreateStoreRequest,
  ExpandRequest,
  ExpandResponse,
  ListAuthorizationModelsResponse,
  ListObjectsRequest,
  ListObjectsResponse,
  ListStoresResponse,
  ListUsersRequest,
  ListUsersResponse,
  ReadRequest,
  ReadResponse,
  Store,
  WriteAuthorizationModelRequest,
  WriteAuthorizationModelResponse,
  WriteRequest,
} from './types.ts'

interface TokenCacheEntry {
  accessToken: string
  expiresAt: number
}

interface TokenEndpointResponse {
  access_token?: string
  expires_in?: number
}

const tokenCache = new Map<string, TokenCacheEntry>()

export class OpenFGAClient {
  private config: ConnectionConfig

  constructor(config: ConnectionConfig) {
    this.config = config
  }

  private async parseJson<T>(response: Response): Promise<T> {
    const data = await response.json()
    return data as T
  }

  private getTokenCacheKey(auth: Extract<AuthConfig, { type: 'oidc' }>): string {
    return [
      this.config.serverUrl,
      auth.tokenUrl,
      auth.clientId,
      auth.clientSecret,
      auth.audience || '',
    ].join('|')
  }

  private async getOIDCToken(auth: Extract<AuthConfig, { type: 'oidc' }>): Promise<string> {
    const cacheKey = this.getTokenCacheKey(auth)
    const cached = tokenCache.get(cacheKey)

    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken
    }

    const response = await fetch(auth.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: auth.clientId,
        client_secret: auth.clientSecret,
        ...(auth.audience ? { audience: auth.audience } : {}),
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to obtain OIDC token: ${response.statusText}`)
    }

    const data = await this.parseJson<TokenEndpointResponse>(response)
    if (!data.access_token) {
      throw new Error('Failed to obtain OIDC token: missing access token in response')
    }

    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600

    tokenCache.set(cacheKey, {
      accessToken: data.access_token,
      expiresAt: Date.now() + (expiresIn * 1000),
    })

    return data.access_token
  }

  private async getAuthHeaders(auth: AuthConfig): Promise<Record<string, string>> {
    switch (auth.type) {
      case 'none':
        return {}
      case 'api-key':
        return { Authorization: `Bearer ${auth.apiKey}` }
      case 'oidc': {
        const token = await this.getOIDCToken(auth)
        return { Authorization: `Bearer ${token}` }
      }
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.serverUrl}${path}`
    const authHeaders = await this.getAuthHeaders(this.config.auth)

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`
      try {
        const errorData = await this.parseJson<Partial<ApiError>>(response)
        if (typeof errorData.message === 'string' && errorData.message.trim()) {
          message = errorData.message
        }
      } catch {
        // keep fallback HTTP message
      }
      throw new Error(message)
    }

    if (response.status === 204) {
      return {} as T
    }

    return this.parseJson<T>(response)
  }

  // Store operations
  async listStores(pageSize?: number, continuationToken?: string): Promise<ListStoresResponse> {
    const params = new URLSearchParams()
    if (pageSize) params.set('page_size', pageSize.toString())
    if (continuationToken) params.set('continuation_token', continuationToken)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<ListStoresResponse>('GET', `${endpoints.listStores()}${query}`)
  }

  async listAllStores(pageSize = 100): Promise<Store[]> {
    const allStores: Store[] = []
    let continuationToken: string | undefined

    do {
      const page = await this.listStores(pageSize, continuationToken)
      allStores.push(...(page.stores || []))
      continuationToken = page.continuation_token
    } while (continuationToken)

    return allStores
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

  async listAllAuthorizationModels(storeId: string, pageSize = 100): Promise<AuthorizationModel[]> {
    const allModels: AuthorizationModel[] = []
    let continuationToken: string | undefined

    do {
      const page = await this.listAuthorizationModels(storeId, pageSize, continuationToken)
      allModels.push(...(page.authorization_models || []))
      continuationToken = page.continuation_token
    } while (continuationToken)

    return allModels
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

  // Test connection - tries listStores first, then probes a known OpenFGA endpoint.
  async testConnection(): Promise<boolean> {
    try {
      await this.listStores(1)
      return true
    } catch {
      try {
        const authHeaders = await this.getAuthHeaders(this.config.auth)
        const probeUrl = `${this.config.serverUrl}${endpoints.listStores()}?page_size=1`
        const response = await fetch(probeUrl, {
          method: 'GET',
          headers: authHeaders,
        })

        if (response.status === 401) {
          return false
        }

        if (response.status === 403) {
          return true
        }

        if (!response.ok) {
          return false
        }

        try {
          const parsed = await this.parseJson<Partial<ListStoresResponse>>(response)
          return Array.isArray(parsed.stores)
        } catch {
          return false
        }
      } catch {
        return false
      }
    }
  }
}

// Exported for tests.
export function clearTokenCache(): void {
  tokenCache.clear()
}
