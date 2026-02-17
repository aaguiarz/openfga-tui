import type { Store } from './openfga/types.ts'

export type StoreListState =
  | { status: 'loading' }
  | { status: 'loaded'; stores: Store[]; selectedIndex: number }
  | { status: 'error'; message: string }
  | { status: 'creating'; stores: Store[]; selectedIndex: number }
  | { status: 'confirming-delete'; stores: Store[]; selectedIndex: number }

export type StoreListAction =
  | { type: 'load' }
  | { type: 'loaded'; stores: Store[] }
  | { type: 'error'; message: string }
  | { type: 'move-up' }
  | { type: 'move-down' }
  | { type: 'start-create' }
  | { type: 'cancel-create' }
  | { type: 'start-delete' }
  | { type: 'cancel-delete' }

export function storeListReducer(state: StoreListState, action: StoreListAction): StoreListState {
  switch (action.type) {
    case 'load':
      return { status: 'loading' }

    case 'loaded':
      return {
        status: 'loaded',
        stores: action.stores,
        selectedIndex: 0,
      }

    case 'error':
      return { status: 'error', message: action.message }

    case 'move-up':
      if (state.status !== 'loaded' && state.status !== 'creating' && state.status !== 'confirming-delete') return state
      return {
        ...state,
        selectedIndex: Math.max(0, state.selectedIndex - 1),
      }

    case 'move-down':
      if (state.status !== 'loaded' && state.status !== 'creating' && state.status !== 'confirming-delete') return state
      return {
        ...state,
        selectedIndex: Math.min(state.stores.length - 1, state.selectedIndex + 1),
      }

    case 'start-create':
      if (state.status !== 'loaded') return state
      return { ...state, status: 'creating' }

    case 'cancel-create':
      if (state.status !== 'creating') return state
      return { ...state, status: 'loaded' }

    case 'start-delete':
      if (state.status !== 'loaded') return state
      if (state.stores.length === 0) return state
      return { ...state, status: 'confirming-delete' }

    case 'cancel-delete':
      if (state.status !== 'confirming-delete') return state
      return { ...state, status: 'loaded' }
  }
}

export function getSelectedStore(state: StoreListState): Store | undefined {
  if (state.status === 'loaded' || state.status === 'creating' || state.status === 'confirming-delete') {
    return state.stores[state.selectedIndex]
  }
  return undefined
}

/** Create a synthetic store entry for a scoped storeId (e.g. FGA Cloud) */
export function createScopedStoreEntry(storeId: string): Store {
  return {
    id: storeId,
    name: storeId,
    created_at: '',
    updated_at: '',
  }
}

export function formatStoreDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}
