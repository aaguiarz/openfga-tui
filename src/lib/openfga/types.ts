// Authentication configuration types
export type AuthConfig =
  | { type: 'none' }
  | { type: 'api-key'; apiKey: string }
  | { type: 'oidc'; clientId: string; clientSecret: string; tokenUrl: string; audience?: string }

// Connection configuration
export interface ConnectionConfig {
  serverUrl: string
  auth: AuthConfig
  storeId?: string
}

// Store types
export interface Store {
  id: string
  name: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface ListStoresResponse {
  stores: Store[]
  continuation_token?: string
}

export interface CreateStoreRequest {
  name: string
}

// Authorization Model types
export interface TypeDefinition {
  type: string
  relations?: Record<string, Userset>
  metadata?: Metadata
}

export interface Metadata {
  relations?: Record<string, RelationMetadata>
}

export interface RelationMetadata {
  directly_related_user_types?: RelationReference[]
}

export interface RelationReference {
  type: string
  relation?: string
  wildcard?: Record<string, never>
}

export interface Userset {
  this?: Record<string, never>
  computedUserset?: ObjectRelation
  tupleToUserset?: TupleToUserset
  union?: Usersets
  intersection?: Usersets
  difference?: Difference
}

export interface ObjectRelation {
  object?: string
  relation: string
}

export interface TupleToUserset {
  tupleset: ObjectRelation
  computedUserset: ObjectRelation
}

export interface Usersets {
  child: Userset[]
}

export interface Difference {
  base: Userset
  subtract: Userset
}

export interface AuthorizationModel {
  id: string
  schema_version: string
  type_definitions: TypeDefinition[]
  conditions?: Record<string, Condition>
}

export interface Condition {
  name: string
  expression: string
  parameters?: Record<string, ConditionParamTypeRef>
}

export interface ConditionParamTypeRef {
  type_name: string
  generic_types?: ConditionParamTypeRef[]
}

export interface ListAuthorizationModelsResponse {
  authorization_models: AuthorizationModel[]
  continuation_token?: string
}

export interface WriteAuthorizationModelRequest {
  schema_version: string
  type_definitions: TypeDefinition[]
  conditions?: Record<string, Condition>
}

export interface WriteAuthorizationModelResponse {
  authorization_model_id: string
}

// Tuple types
export interface TupleKey {
  user: string
  relation: string
  object: string
  condition?: RelationshipCondition
}

export interface RelationshipCondition {
  name: string
  context?: Record<string, unknown>
}

export interface Tuple {
  key: TupleKey
  timestamp: string
}

export interface ReadRequest {
  tuple_key?: Partial<TupleKey>
  page_size?: number
  continuation_token?: string
}

export interface ReadResponse {
  tuples: Tuple[]
  continuation_token?: string
}

export interface WriteRequest {
  writes?: { tuple_keys: TupleKey[] }
  deletes?: { tuple_keys: TupleKey[] }
}

// Query types
export interface CheckRequest {
  tuple_key: TupleKey
  contextual_tuples?: { tuple_keys: TupleKey[] }
  authorization_model_id?: string
  context?: Record<string, unknown>
}

export interface CheckResponse {
  allowed: boolean
  resolution?: string
}

export interface ExpandRequest {
  tuple_key: {
    relation: string
    object: string
  }
  authorization_model_id?: string
}

export interface ExpandResponse {
  tree?: UsersetTree
}

export interface UsersetTree {
  root?: Node
}

export interface Node {
  name?: string
  leaf?: Leaf
  difference?: Nodes
  union?: Nodes
  intersection?: Nodes
}

export interface Leaf {
  users?: Users
  computed?: Computed
  tupleToUserset?: TupleToUsersetNode
}

export interface Users {
  users: string[]
}

export interface Computed {
  userset: string
}

export interface TupleToUsersetNode {
  tupleset: string
  computed: Computed[]
}

export interface Nodes {
  nodes: Node[]
}

export interface ListObjectsRequest {
  authorization_model_id?: string
  type: string
  relation: string
  user: string
  contextual_tuples?: { tuple_keys: TupleKey[] }
  context?: Record<string, unknown>
}

export interface ListObjectsResponse {
  objects: string[]
}

export interface ListUsersRequest {
  authorization_model_id?: string
  object: {
    type: string
    id: string
  }
  relation: string
  user_filters: UserTypeFilter[]
  contextual_tuples?: { tuple_keys: TupleKey[] }
  context?: Record<string, unknown>
}

export interface UserTypeFilter {
  type: string
  relation?: string
}

export interface ListUsersResponse {
  users: User[]
}

export interface User {
  object?: {
    type: string
    id: string
  }
  userset?: {
    type: string
    id: string
    relation: string
  }
  wildcard?: {
    type: string
  }
}

// API Error
export interface ApiError {
  code: string
  message: string
}
