import { describe, expect, test } from 'bun:test'
import {
  storeListReducer,
  getSelectedStore,
  formatStoreDate,
  createScopedStoreEntry,
  type StoreListState,
} from '../lib/store-list.ts'
import type { Store } from '../lib/openfga/types.ts'

const sampleStores: Store[] = [
  { id: 's1', name: 'store-one', created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z' },
  { id: 's2', name: 'store-two', created_at: '2024-02-20T10:00:00Z', updated_at: '2024-02-20T10:00:00Z' },
  { id: 's3', name: 'store-three', created_at: '2024-03-10T10:00:00Z', updated_at: '2024-03-10T10:00:00Z' },
]

describe('storeListReducer', () => {
  test('load sets loading state', () => {
    const state: StoreListState = { status: 'loaded', stores: [], selectedIndex: 0 }
    const result = storeListReducer(state, { type: 'load' })
    expect(result.status).toBe('loading')
  })

  test('loaded sets stores and resets selectedIndex', () => {
    const state: StoreListState = { status: 'loading' }
    const result = storeListReducer(state, { type: 'loaded', stores: sampleStores })
    expect(result.status).toBe('loaded')
    if (result.status === 'loaded') {
      expect(result.stores).toEqual(sampleStores)
      expect(result.selectedIndex).toBe(0)
    }
  })

  test('error sets error state', () => {
    const state: StoreListState = { status: 'loading' }
    const result = storeListReducer(state, { type: 'error', message: 'Network error' })
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message).toBe('Network error')
    }
  })

  test('move-up decrements selectedIndex', () => {
    const state: StoreListState = { status: 'loaded', stores: sampleStores, selectedIndex: 2 }
    const result = storeListReducer(state, { type: 'move-up' })
    if (result.status === 'loaded') {
      expect(result.selectedIndex).toBe(1)
    }
  })

  test('move-up does not go below 0', () => {
    const state: StoreListState = { status: 'loaded', stores: sampleStores, selectedIndex: 0 }
    const result = storeListReducer(state, { type: 'move-up' })
    if (result.status === 'loaded') {
      expect(result.selectedIndex).toBe(0)
    }
  })

  test('move-down increments selectedIndex', () => {
    const state: StoreListState = { status: 'loaded', stores: sampleStores, selectedIndex: 0 }
    const result = storeListReducer(state, { type: 'move-down' })
    if (result.status === 'loaded') {
      expect(result.selectedIndex).toBe(1)
    }
  })

  test('move-down does not exceed store count', () => {
    const state: StoreListState = { status: 'loaded', stores: sampleStores, selectedIndex: 2 }
    const result = storeListReducer(state, { type: 'move-down' })
    if (result.status === 'loaded') {
      expect(result.selectedIndex).toBe(2)
    }
  })

  test('start-create transitions from loaded to creating', () => {
    const state: StoreListState = { status: 'loaded', stores: sampleStores, selectedIndex: 0 }
    const result = storeListReducer(state, { type: 'start-create' })
    expect(result.status).toBe('creating')
  })

  test('start-create ignored if not loaded', () => {
    const state: StoreListState = { status: 'loading' }
    const result = storeListReducer(state, { type: 'start-create' })
    expect(result.status).toBe('loading')
  })

  test('cancel-create returns to loaded', () => {
    const state: StoreListState = { status: 'creating', stores: sampleStores, selectedIndex: 0 }
    const result = storeListReducer(state, { type: 'cancel-create' })
    expect(result.status).toBe('loaded')
  })

  test('start-delete transitions to confirming-delete', () => {
    const state: StoreListState = { status: 'loaded', stores: sampleStores, selectedIndex: 1 }
    const result = storeListReducer(state, { type: 'start-delete' })
    expect(result.status).toBe('confirming-delete')
  })

  test('start-delete ignored with empty stores', () => {
    const state: StoreListState = { status: 'loaded', stores: [], selectedIndex: 0 }
    const result = storeListReducer(state, { type: 'start-delete' })
    expect(result.status).toBe('loaded')
  })

  test('cancel-delete returns to loaded', () => {
    const state: StoreListState = { status: 'confirming-delete', stores: sampleStores, selectedIndex: 1 }
    const result = storeListReducer(state, { type: 'cancel-delete' })
    expect(result.status).toBe('loaded')
  })

  test('move-up and move-down are ignored during loading', () => {
    const state: StoreListState = { status: 'loading' }
    expect(storeListReducer(state, { type: 'move-up' }).status).toBe('loading')
    expect(storeListReducer(state, { type: 'move-down' }).status).toBe('loading')
  })
})

describe('getSelectedStore', () => {
  test('returns the selected store when loaded', () => {
    const state: StoreListState = { status: 'loaded', stores: sampleStores, selectedIndex: 1 }
    expect(getSelectedStore(state)).toEqual(sampleStores[1])
  })

  test('returns selected store during creating', () => {
    const state: StoreListState = { status: 'creating', stores: sampleStores, selectedIndex: 0 }
    expect(getSelectedStore(state)).toEqual(sampleStores[0])
  })

  test('returns selected store during confirming-delete', () => {
    const state: StoreListState = { status: 'confirming-delete', stores: sampleStores, selectedIndex: 2 }
    expect(getSelectedStore(state)).toEqual(sampleStores[2])
  })

  test('returns undefined during loading', () => {
    const state: StoreListState = { status: 'loading' }
    expect(getSelectedStore(state)).toBeUndefined()
  })

  test('returns undefined during error', () => {
    const state: StoreListState = { status: 'error', message: 'fail' }
    expect(getSelectedStore(state)).toBeUndefined()
  })
})

describe('formatStoreDate', () => {
  test('formats ISO date string', () => {
    const result = formatStoreDate('2024-01-15T10:00:00Z')
    expect(result).toContain('2024')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })

  test('returns original string for invalid date', () => {
    const result = formatStoreDate('not-a-date')
    // Invalid Date's toLocaleDateString returns "Invalid Date"
    expect(typeof result).toBe('string')
  })

  test('handles empty string', () => {
    const result = formatStoreDate('')
    expect(typeof result).toBe('string')
  })
})

describe('createScopedStoreEntry', () => {
  test('creates a store entry from storeId', () => {
    const store = createScopedStoreEntry('01K95QAG5CBPAKHKZKTJNNQ157')
    expect(store.id).toBe('01K95QAG5CBPAKHKZKTJNNQ157')
    expect(store.name).toBe('01K95QAG5CBPAKHKZKTJNNQ157')
    expect(store.created_at).toBe('')
    expect(store.updated_at).toBe('')
  })

  test('scoped store entry works with storeListReducer', () => {
    const store = createScopedStoreEntry('store-abc')
    const state: StoreListState = { status: 'loading' }
    const result = storeListReducer(state, { type: 'loaded', stores: [store] })
    expect(result.status).toBe('loaded')
    if (result.status === 'loaded') {
      expect(result.stores).toHaveLength(1)
      expect(result.stores[0]!.id).toBe('store-abc')
      expect(result.selectedIndex).toBe(0)
    }
  })

  test('scoped store is selectable via getSelectedStore', () => {
    const store = createScopedStoreEntry('store-xyz')
    const state: StoreListState = { status: 'loaded', stores: [store], selectedIndex: 0 }
    const selected = getSelectedStore(state)
    expect(selected).toBeDefined()
    expect(selected!.id).toBe('store-xyz')
  })
})
