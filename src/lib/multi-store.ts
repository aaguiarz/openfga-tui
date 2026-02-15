/**
 * Multi-store support: store switcher, per-store query history, store bookmarks.
 */

export interface StoreEntry {
  id: string
  name: string
}

// --- Fuzzy search for store switcher ---

export function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()

  // Substring match
  if (lowerText.includes(lowerQuery)) return true

  // Character-by-character fuzzy match
  let qi = 0
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      qi++
    }
  }
  return qi === lowerQuery.length
}

export function filterStores(stores: StoreEntry[], query: string): StoreEntry[] {
  if (!query.trim()) return stores
  return stores.filter(s => fuzzyMatch(query, s.name) || fuzzyMatch(query, s.id))
}

// --- Store switcher state ---

export interface StoreSwitcherState {
  isOpen: boolean
  query: string
  selectedIndex: number
  stores: StoreEntry[]
}

export function initialSwitcherState(): StoreSwitcherState {
  return { isOpen: false, query: '', selectedIndex: 0, stores: [] }
}

export type SwitcherAction =
  | { type: 'open'; stores: StoreEntry[] }
  | { type: 'close' }
  | { type: 'setQuery'; query: string }
  | { type: 'moveUp' }
  | { type: 'moveDown' }
  | { type: 'select' }

export interface SwitcherResult {
  state: StoreSwitcherState
  selectedStore?: StoreEntry
}

export function switcherReducer(state: StoreSwitcherState, action: SwitcherAction): SwitcherResult {
  switch (action.type) {
    case 'open':
      return {
        state: { isOpen: true, query: '', selectedIndex: 0, stores: action.stores },
      }
    case 'close':
      return {
        state: { ...state, isOpen: false, query: '', selectedIndex: 0 },
      }
    case 'setQuery': {
      const filtered = filterStores(state.stores, action.query)
      return {
        state: {
          ...state,
          query: action.query,
          selectedIndex: Math.min(state.selectedIndex, Math.max(0, filtered.length - 1)),
        },
      }
    }
    case 'moveUp':
      return {
        state: {
          ...state,
          selectedIndex: Math.max(0, state.selectedIndex - 1),
        },
      }
    case 'moveDown': {
      const filtered = filterStores(state.stores, state.query)
      return {
        state: {
          ...state,
          selectedIndex: Math.min(filtered.length - 1, state.selectedIndex + 1),
        },
      }
    }
    case 'select': {
      const filtered = filterStores(state.stores, state.query)
      const selected = filtered[state.selectedIndex]
      if (!selected) return { state }
      return {
        state: { ...state, isOpen: false, query: '', selectedIndex: 0 },
        selectedStore: selected,
      }
    }
  }
}

export function getFilteredStores(state: StoreSwitcherState): StoreEntry[] {
  return filterStores(state.stores, state.query)
}

// --- Per-store query history ---

export interface QueryHistoryEntry {
  queryType: 'check' | 'expand' | 'list-objects' | 'list-users'
  params: Record<string, string>
  timestamp: number
}

export interface QueryHistory {
  [storeId: string]: QueryHistoryEntry[]
}

const MAX_HISTORY_PER_STORE = 10

export function addQueryToHistory(
  history: QueryHistory,
  storeId: string,
  entry: Omit<QueryHistoryEntry, 'timestamp'>
): QueryHistory {
  const storeHistory = history[storeId] || []
  const newEntry: QueryHistoryEntry = {
    ...entry,
    timestamp: Date.now(),
  }

  // Add to front, remove duplicates of same query type + params
  const filtered = storeHistory.filter(
    h => !(h.queryType === entry.queryType && JSON.stringify(h.params) === JSON.stringify(entry.params))
  )

  const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_PER_STORE)

  return { ...history, [storeId]: updated }
}

export function getStoreHistory(history: QueryHistory, storeId: string): QueryHistoryEntry[] {
  return history[storeId] || []
}

export function clearStoreHistory(history: QueryHistory, storeId: string): QueryHistory {
  const updated = { ...history }
  delete updated[storeId]
  return updated
}

export function formatHistoryEntry(entry: QueryHistoryEntry): string {
  const params = Object.entries(entry.params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
  return `${entry.queryType}: ${params}`
}

// --- Store bookmarks ---

export interface BookmarkState {
  bookmarkedIds: Set<string>
}

export function initialBookmarkState(bookmarkedIds: string[] = []): BookmarkState {
  return { bookmarkedIds: new Set(bookmarkedIds) }
}

export function toggleBookmark(state: BookmarkState, storeId: string): BookmarkState {
  const newSet = new Set(state.bookmarkedIds)
  if (newSet.has(storeId)) {
    newSet.delete(storeId)
  } else {
    newSet.add(storeId)
  }
  return { bookmarkedIds: newSet }
}

export function isBookmarked(state: BookmarkState, storeId: string): boolean {
  return state.bookmarkedIds.has(storeId)
}

export function getBookmarkedIds(state: BookmarkState): string[] {
  return Array.from(state.bookmarkedIds)
}

export function sortStoresWithBookmarks(stores: StoreEntry[], state: BookmarkState): StoreEntry[] {
  const bookmarked: StoreEntry[] = []
  const regular: StoreEntry[] = []

  for (const store of stores) {
    if (state.bookmarkedIds.has(store.id)) {
      bookmarked.push(store)
    } else {
      regular.push(store)
    }
  }

  return [...bookmarked, ...regular]
}

// --- Serialization helpers for config persistence ---

export function serializeBookmarks(state: BookmarkState): string[] {
  return getBookmarkedIds(state)
}

export function serializeHistory(history: QueryHistory): QueryHistory {
  return history
}
