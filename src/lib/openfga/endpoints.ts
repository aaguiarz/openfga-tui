// OpenFGA API endpoint definitions
export const endpoints = {
  // Store endpoints
  listStores: () => '/stores',
  createStore: () => '/stores',
  getStore: (storeId: string) => `/stores/${storeId}`,
  deleteStore: (storeId: string) => `/stores/${storeId}`,

  // Authorization Model endpoints
  listAuthorizationModels: (storeId: string) =>
    `/stores/${storeId}/authorization-models`,
  getAuthorizationModel: (storeId: string, modelId: string) =>
    `/stores/${storeId}/authorization-models/${modelId}`,
  writeAuthorizationModel: (storeId: string) =>
    `/stores/${storeId}/authorization-models`,

  // Tuple endpoints
  read: (storeId: string) => `/stores/${storeId}/read`,
  write: (storeId: string) => `/stores/${storeId}/write`,

  // Query endpoints
  check: (storeId: string) => `/stores/${storeId}/check`,
  expand: (storeId: string) => `/stores/${storeId}/expand`,
  listObjects: (storeId: string) => `/stores/${storeId}/list-objects`,
  listUsers: (storeId: string) => `/stores/${storeId}/list-users`,
}
