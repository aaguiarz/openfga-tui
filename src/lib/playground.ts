import type {
  Store,
  AuthorizationModel,
  Tuple,
  TupleKey,
  ListStoresResponse,
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
  CreateStoreRequest,
} from './openfga/types.ts'

export const PLAYGROUND_STORE: Store = {
  id: 'playground-store-01',
  name: 'Playground Store',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const PLAYGROUND_MODEL: AuthorizationModel = {
  id: 'playground-model-01',
  schema_version: '1.1',
  type_definitions: [
    { type: 'user' },
    {
      type: 'group',
      relations: {
        member: { this: {} },
      },
      metadata: {
        relations: {
          member: {
            directly_related_user_types: [{ type: 'user' }],
          },
        },
      },
    },
    {
      type: 'folder',
      relations: {
        owner: { this: {} },
        parent: { this: {} },
        viewer: {
          union: {
            child: [
              { this: {} },
              { computedUserset: { relation: 'owner' } },
            ],
          },
        },
      },
      metadata: {
        relations: {
          owner: { directly_related_user_types: [{ type: 'user' }] },
          parent: { directly_related_user_types: [{ type: 'folder' }] },
          viewer: {
            directly_related_user_types: [
              { type: 'user' },
              { type: 'user', wildcard: {} },
              { type: 'group', relation: 'member' },
            ],
          },
        },
      },
    },
    {
      type: 'document',
      relations: {
        owner: { this: {} },
        parent: { this: {} },
        writer: {
          union: {
            child: [
              { this: {} },
              { computedUserset: { relation: 'owner' } },
            ],
          },
        },
        reader: {
          union: {
            child: [
              { this: {} },
              { computedUserset: { relation: 'writer' } },
              {
                tupleToUserset: {
                  tupleset: { relation: 'parent' },
                  computedUserset: { relation: 'viewer' },
                },
              },
            ],
          },
        },
      },
      metadata: {
        relations: {
          owner: { directly_related_user_types: [{ type: 'user' }] },
          parent: { directly_related_user_types: [{ type: 'folder' }] },
          writer: {
            directly_related_user_types: [
              { type: 'user' },
              { type: 'group', relation: 'member' },
            ],
          },
          reader: {
            directly_related_user_types: [
              { type: 'user' },
              { type: 'user', wildcard: {} },
              { type: 'group', relation: 'member' },
            ],
          },
        },
      },
    },
  ],
}

export const PLAYGROUND_TUPLES: Tuple[] = [
  { key: { user: 'user:anne', relation: 'owner', object: 'folder:root' }, timestamp: new Date().toISOString() },
  { key: { user: 'user:bob', relation: 'writer', object: 'document:budget' }, timestamp: new Date().toISOString() },
  { key: { user: 'user:anne', relation: 'reader', object: 'document:budget' }, timestamp: new Date().toISOString() },
  { key: { user: 'group:eng#member', relation: 'viewer', object: 'folder:root' }, timestamp: new Date().toISOString() },
  { key: { user: 'user:charlie', relation: 'member', object: 'group:eng' }, timestamp: new Date().toISOString() },
  { key: { user: 'folder:root', relation: 'parent', object: 'document:budget' }, timestamp: new Date().toISOString() },
]

export class PlaygroundClient {
  private stores: Store[]
  private models: AuthorizationModel[]
  private tuples: Tuple[]

  constructor() {
    this.stores = [{ ...PLAYGROUND_STORE }]
    this.models = [{ ...PLAYGROUND_MODEL }]
    this.tuples = [...PLAYGROUND_TUPLES]
  }

  async listStores(): Promise<ListStoresResponse> {
    return { stores: this.stores }
  }

  async createStore(request: CreateStoreRequest): Promise<Store> {
    const store: Store = {
      id: `playground-store-${Date.now()}`,
      name: request.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.stores.push(store)
    return store
  }

  async getStore(storeId: string): Promise<Store> {
    const store = this.stores.find(s => s.id === storeId)
    if (!store) throw new Error(`Store ${storeId} not found`)
    return store
  }

  async deleteStore(storeId: string): Promise<void> {
    this.stores = this.stores.filter(s => s.id !== storeId)
  }

  async listAuthorizationModels(
    _storeId: string,
    _pageSize?: number,
    _continuationToken?: string
  ): Promise<ListAuthorizationModelsResponse> {
    return { authorization_models: this.models }
  }

  async getAuthorizationModel(
    _storeId: string,
    modelId: string
  ): Promise<{ authorization_model: AuthorizationModel }> {
    const model = this.models.find(m => m.id === modelId)
    if (!model) throw new Error(`Model ${modelId} not found`)
    return { authorization_model: model }
  }

  async writeAuthorizationModel(
    _storeId: string,
    request: WriteAuthorizationModelRequest
  ): Promise<WriteAuthorizationModelResponse> {
    const newModel: AuthorizationModel = {
      id: `playground-model-${Date.now()}`,
      schema_version: request.schema_version,
      type_definitions: request.type_definitions,
      conditions: request.conditions,
    }
    this.models.unshift(newModel)
    return { authorization_model_id: newModel.id }
  }

  async read(_storeId: string, request: ReadRequest = {}): Promise<ReadResponse> {
    let filtered = this.tuples

    if (request.tuple_key) {
      const tk = request.tuple_key
      if (tk.user) filtered = filtered.filter(t => t.key.user === tk.user)
      if (tk.relation) filtered = filtered.filter(t => t.key.relation === tk.relation)
      if (tk.object) filtered = filtered.filter(t => t.key.object === tk.object)
    }

    const pageSize = request.page_size || 50
    return { tuples: filtered.slice(0, pageSize) }
  }

  async write(_storeId: string, request: WriteRequest): Promise<void> {
    if (request.writes?.tuple_keys) {
      for (const key of request.writes.tuple_keys) {
        this.tuples.push({ key, timestamp: new Date().toISOString() })
      }
    }
    if (request.deletes?.tuple_keys) {
      for (const key of request.deletes.tuple_keys) {
        this.tuples = this.tuples.filter(
          t => !(t.key.user === key.user && t.key.relation === key.relation && t.key.object === key.object)
        )
      }
    }
  }

  async check(_storeId: string, _request: CheckRequest): Promise<CheckResponse> {
    return {
      allowed: false,
      resolution: 'Playground mode - check requires a live server',
    }
  }

  async expand(_storeId: string, _request: ExpandRequest): Promise<ExpandResponse> {
    return {}
  }

  async listObjects(_storeId: string, _request: ListObjectsRequest): Promise<ListObjectsResponse> {
    return { objects: [] }
  }

  async listUsers(_storeId: string, _request: ListUsersRequest): Promise<ListUsersResponse> {
    return { users: [] }
  }

  async testConnection(): Promise<boolean> {
    return true
  }
}
