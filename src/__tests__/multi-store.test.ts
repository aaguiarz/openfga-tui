import { describe, expect, test } from 'bun:test'
import {
  fuzzyMatch,
  filterStores,
  initialSwitcherState,
  switcherReducer,
  getFilteredStores,
  addQueryToHistory,
  getStoreHistory,
  clearStoreHistory,
  formatHistoryEntry,
  initialBookmarkState,
  toggleBookmark,
  isBookmarked,
  getBookmarkedIds,
  sortStoresWithBookmarks,
  serializeBookmarks,
  type StoreEntry,
  type StoreSwitcherState,
  type QueryHistory,
} from '../lib/multi-store.ts'

// --- Fuzzy match ---

describe('fuzzyMatch', () => {
  test('empty query matches anything', () => {
    expect(fuzzyMatch('', 'anything')).toBe(true)
  })

  test('exact match', () => {
    expect(fuzzyMatch('test', 'test')).toBe(true)
  })

  test('substring match', () => {
    expect(fuzzyMatch('est', 'test-store')).toBe(true)
  })

  test('case insensitive match', () => {
    expect(fuzzyMatch('TEST', 'test-store')).toBe(true)
  })

  test('fuzzy character match', () => {
    expect(fuzzyMatch('tsr', 'test-store')).toBe(true)
  })

  test('no match', () => {
    expect(fuzzyMatch('xyz', 'test-store')).toBe(false)
  })

  test('query longer than text fails', () => {
    expect(fuzzyMatch('longquery', 'short')).toBe(false)
  })
})

// --- filterStores ---

describe('filterStores', () => {
  const stores: StoreEntry[] = [
    { id: 'store-1', name: 'production' },
    { id: 'store-2', name: 'staging' },
    { id: 'store-3', name: 'development' },
  ]

  test('empty query returns all stores', () => {
    expect(filterStores(stores, '')).toEqual(stores)
  })

  test('whitespace query returns all stores', () => {
    expect(filterStores(stores, '  ')).toEqual(stores)
  })

  test('filters by name', () => {
    const result = filterStores(stores, 'prod')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('production')
  })

  test('filters by id', () => {
    const result = filterStores(stores, 'store-2')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('staging')
  })

  test('filters multiple matches', () => {
    const result = filterStores(stores, 'tion')
    expect(result).toHaveLength(1) // only "production" contains "tion"
    expect(result[0].name).toBe('production')
  })

  test('fuzzy filters multiple matches', () => {
    const result = filterStores(stores, 'st')
    expect(result.length).toBeGreaterThanOrEqual(2) // "staging" and all match via id "store-X"
  })

  test('no matches returns empty array', () => {
    const result = filterStores(stores, 'xyz123')
    expect(result).toHaveLength(0)
  })
})

// --- Store switcher state ---

describe('switcherReducer', () => {
  const stores: StoreEntry[] = [
    { id: 's1', name: 'alpha' },
    { id: 's2', name: 'beta' },
    { id: 's3', name: 'gamma' },
  ]

  test('initial state is closed', () => {
    const state = initialSwitcherState()
    expect(state.isOpen).toBe(false)
    expect(state.query).toBe('')
    expect(state.selectedIndex).toBe(0)
  })

  test('open action sets isOpen and stores', () => {
    const state = initialSwitcherState()
    const { state: newState } = switcherReducer(state, { type: 'open', stores })
    expect(newState.isOpen).toBe(true)
    expect(newState.stores).toEqual(stores)
    expect(newState.query).toBe('')
    expect(newState.selectedIndex).toBe(0)
  })

  test('close action resets state', () => {
    const state: StoreSwitcherState = {
      isOpen: true,
      query: 'test',
      selectedIndex: 2,
      stores,
    }
    const { state: newState } = switcherReducer(state, { type: 'close' })
    expect(newState.isOpen).toBe(false)
    expect(newState.query).toBe('')
    expect(newState.selectedIndex).toBe(0)
  })

  test('setQuery updates query and clamps index', () => {
    const state: StoreSwitcherState = {
      isOpen: true,
      query: '',
      selectedIndex: 2,
      stores,
    }
    // Query "alpha" filters to 1 result, so index should clamp to 0
    const { state: newState } = switcherReducer(state, { type: 'setQuery', query: 'alpha' })
    expect(newState.query).toBe('alpha')
    expect(newState.selectedIndex).toBe(0)
  })

  test('moveUp decrements selectedIndex', () => {
    const state: StoreSwitcherState = {
      isOpen: true,
      query: '',
      selectedIndex: 2,
      stores,
    }
    const { state: newState } = switcherReducer(state, { type: 'moveUp' })
    expect(newState.selectedIndex).toBe(1)
  })

  test('moveUp does not go below 0', () => {
    const state: StoreSwitcherState = {
      isOpen: true,
      query: '',
      selectedIndex: 0,
      stores,
    }
    const { state: newState } = switcherReducer(state, { type: 'moveUp' })
    expect(newState.selectedIndex).toBe(0)
  })

  test('moveDown increments selectedIndex', () => {
    const state: StoreSwitcherState = {
      isOpen: true,
      query: '',
      selectedIndex: 0,
      stores,
    }
    const { state: newState } = switcherReducer(state, { type: 'moveDown' })
    expect(newState.selectedIndex).toBe(1)
  })

  test('moveDown does not exceed filtered list length', () => {
    const state: StoreSwitcherState = {
      isOpen: true,
      query: '',
      selectedIndex: 2,
      stores,
    }
    const { state: newState } = switcherReducer(state, { type: 'moveDown' })
    expect(newState.selectedIndex).toBe(2) // already at last index
  })

  test('select returns selected store and closes', () => {
    const state: StoreSwitcherState = {
      isOpen: true,
      query: '',
      selectedIndex: 1,
      stores,
    }
    const result = switcherReducer(state, { type: 'select' })
    expect(result.selectedStore).toEqual({ id: 's2', name: 'beta' })
    expect(result.state.isOpen).toBe(false)
  })

  test('select with query returns filtered result', () => {
    const state: StoreSwitcherState = {
      isOpen: true,
      query: 'gamma',
      selectedIndex: 0,
      stores,
    }
    const result = switcherReducer(state, { type: 'select' })
    expect(result.selectedStore).toEqual({ id: 's3', name: 'gamma' })
  })

  test('select with no matching results returns no store', () => {
    const state: StoreSwitcherState = {
      isOpen: true,
      query: 'zzzzz',
      selectedIndex: 0,
      stores,
    }
    const result = switcherReducer(state, { type: 'select' })
    expect(result.selectedStore).toBeUndefined()
  })
})

describe('getFilteredStores', () => {
  test('returns filtered stores based on state query', () => {
    const state: StoreSwitcherState = {
      isOpen: true,
      query: 'beta',
      selectedIndex: 0,
      stores: [
        { id: 's1', name: 'alpha' },
        { id: 's2', name: 'beta' },
      ],
    }
    const filtered = getFilteredStores(state)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('beta')
  })
})

// --- Query history ---

describe('query history', () => {
  test('getStoreHistory returns empty array for unknown store', () => {
    expect(getStoreHistory({}, 'unknown')).toEqual([])
  })

  test('addQueryToHistory adds entry to front', () => {
    const history: QueryHistory = {}
    const updated = addQueryToHistory(history, 'store-1', {
      queryType: 'check',
      params: { user: 'user:anne', relation: 'viewer', object: 'document:1' },
    })
    const entries = getStoreHistory(updated, 'store-1')
    expect(entries).toHaveLength(1)
    expect(entries[0].queryType).toBe('check')
    expect(entries[0].params.user).toBe('user:anne')
    expect(entries[0].timestamp).toBeGreaterThan(0)
  })

  test('addQueryToHistory deduplicates same query', () => {
    let history: QueryHistory = {}
    const entry = {
      queryType: 'check' as const,
      params: { user: 'user:anne', relation: 'viewer', object: 'document:1' },
    }
    history = addQueryToHistory(history, 'store-1', entry)
    history = addQueryToHistory(history, 'store-1', entry)
    const entries = getStoreHistory(history, 'store-1')
    expect(entries).toHaveLength(1)
  })

  test('addQueryToHistory keeps different queries', () => {
    let history: QueryHistory = {}
    history = addQueryToHistory(history, 'store-1', {
      queryType: 'check',
      params: { user: 'user:anne', relation: 'viewer', object: 'document:1' },
    })
    history = addQueryToHistory(history, 'store-1', {
      queryType: 'expand',
      params: { relation: 'viewer', object: 'document:1' },
    })
    const entries = getStoreHistory(history, 'store-1')
    expect(entries).toHaveLength(2)
    expect(entries[0].queryType).toBe('expand') // most recent first
    expect(entries[1].queryType).toBe('check')
  })

  test('addQueryToHistory limits to 10 entries', () => {
    let history: QueryHistory = {}
    for (let i = 0; i < 15; i++) {
      history = addQueryToHistory(history, 'store-1', {
        queryType: 'check',
        params: { user: `user:user${i}`, relation: 'viewer', object: 'document:1' },
      })
    }
    const entries = getStoreHistory(history, 'store-1')
    expect(entries).toHaveLength(10)
  })

  test('addQueryToHistory keeps stores separate', () => {
    let history: QueryHistory = {}
    history = addQueryToHistory(history, 'store-1', {
      queryType: 'check',
      params: { user: 'user:anne' },
    })
    history = addQueryToHistory(history, 'store-2', {
      queryType: 'expand',
      params: { relation: 'viewer' },
    })
    expect(getStoreHistory(history, 'store-1')).toHaveLength(1)
    expect(getStoreHistory(history, 'store-2')).toHaveLength(1)
  })

  test('clearStoreHistory removes store entries', () => {
    let history: QueryHistory = {}
    history = addQueryToHistory(history, 'store-1', {
      queryType: 'check',
      params: { user: 'user:anne' },
    })
    history = addQueryToHistory(history, 'store-2', {
      queryType: 'check',
      params: { user: 'user:bob' },
    })
    history = clearStoreHistory(history, 'store-1')
    expect(getStoreHistory(history, 'store-1')).toEqual([])
    expect(getStoreHistory(history, 'store-2')).toHaveLength(1)
  })

  test('formatHistoryEntry formats check query', () => {
    const result = formatHistoryEntry({
      queryType: 'check',
      params: { user: 'user:anne', relation: 'viewer', object: 'document:1' },
      timestamp: Date.now(),
    })
    expect(result).toContain('check')
    expect(result).toContain('user=user:anne')
    expect(result).toContain('relation=viewer')
    expect(result).toContain('object=document:1')
  })

  test('formatHistoryEntry skips empty params', () => {
    const result = formatHistoryEntry({
      queryType: 'list-objects',
      params: { user: 'user:anne', relation: 'viewer', object: '', type: 'document' },
      timestamp: Date.now(),
    })
    expect(result).toContain('list-objects')
    expect(result).toContain('user=user:anne')
    expect(result).not.toContain('object=')
  })
})

// --- Store bookmarks ---

describe('bookmarks', () => {
  test('initialBookmarkState creates empty set by default', () => {
    const state = initialBookmarkState()
    expect(state.bookmarkedIds.size).toBe(0)
  })

  test('initialBookmarkState creates set from array', () => {
    const state = initialBookmarkState(['s1', 's2'])
    expect(state.bookmarkedIds.size).toBe(2)
    expect(isBookmarked(state, 's1')).toBe(true)
    expect(isBookmarked(state, 's2')).toBe(true)
  })

  test('toggleBookmark adds bookmark', () => {
    const state = initialBookmarkState()
    const updated = toggleBookmark(state, 's1')
    expect(isBookmarked(updated, 's1')).toBe(true)
  })

  test('toggleBookmark removes existing bookmark', () => {
    const state = initialBookmarkState(['s1'])
    const updated = toggleBookmark(state, 's1')
    expect(isBookmarked(updated, 's1')).toBe(false)
  })

  test('toggleBookmark does not mutate original', () => {
    const state = initialBookmarkState(['s1'])
    toggleBookmark(state, 's1')
    expect(isBookmarked(state, 's1')).toBe(true)
  })

  test('getBookmarkedIds returns sorted array', () => {
    const state = initialBookmarkState(['s3', 's1', 's2'])
    const ids = getBookmarkedIds(state)
    expect(ids).toHaveLength(3)
    expect(ids).toContain('s1')
    expect(ids).toContain('s2')
    expect(ids).toContain('s3')
  })

  test('sortStoresWithBookmarks puts bookmarked first', () => {
    const stores: StoreEntry[] = [
      { id: 's1', name: 'alpha' },
      { id: 's2', name: 'beta' },
      { id: 's3', name: 'gamma' },
    ]
    const state = initialBookmarkState(['s3'])
    const sorted = sortStoresWithBookmarks(stores, state)
    expect(sorted[0].id).toBe('s3')
    expect(sorted[1].id).toBe('s1')
    expect(sorted[2].id).toBe('s2')
  })

  test('sortStoresWithBookmarks preserves order within groups', () => {
    const stores: StoreEntry[] = [
      { id: 's1', name: 'alpha' },
      { id: 's2', name: 'beta' },
      { id: 's3', name: 'gamma' },
      { id: 's4', name: 'delta' },
    ]
    const state = initialBookmarkState(['s3', 's1'])
    const sorted = sortStoresWithBookmarks(stores, state)
    expect(sorted[0].id).toBe('s1')
    expect(sorted[1].id).toBe('s3')
    expect(sorted[2].id).toBe('s2')
    expect(sorted[3].id).toBe('s4')
  })

  test('sortStoresWithBookmarks with no bookmarks preserves order', () => {
    const stores: StoreEntry[] = [
      { id: 's1', name: 'alpha' },
      { id: 's2', name: 'beta' },
    ]
    const state = initialBookmarkState()
    const sorted = sortStoresWithBookmarks(stores, state)
    expect(sorted).toEqual(stores)
  })

  test('serializeBookmarks returns array of ids', () => {
    const state = initialBookmarkState(['s1', 's2'])
    const result = serializeBookmarks(state)
    expect(result).toContain('s1')
    expect(result).toContain('s2')
  })
})
