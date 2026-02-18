import { describe, expect, test } from 'bun:test'
import {
  tupleListReducer,
  getSelectedTuple,
  formatTupleForDisplay,
  isFilterActive,
  filterDescription,
  buildTupleKeyFromFilter,
  EMPTY_FILTER,
  type TupleListState,
  type ServerFilter,
} from '../lib/tuple-list.ts'
import type { Tuple } from '../lib/openfga/types.ts'

const sampleTuples: Tuple[] = [
  { key: { user: 'user:anne', relation: 'owner', object: 'folder:root' }, timestamp: '2024-01-15T10:00:00Z' },
  { key: { user: 'user:bob', relation: 'writer', object: 'document:budget' }, timestamp: '2024-01-16T10:00:00Z' },
  { key: { user: 'group:eng#member', relation: 'viewer', object: 'folder:root' }, timestamp: '2024-01-17T10:00:00Z' },
]

describe('tupleListReducer', () => {
  test('load sets loading state', () => {
    const state: TupleListState = { status: 'loaded', tuples: [], selectedIndex: 0 }
    const result = tupleListReducer(state, { type: 'load' })
    expect(result.status).toBe('loading')
  })

  test('loaded sets tuples and resets index', () => {
    const state: TupleListState = { status: 'loading' }
    const result = tupleListReducer(state, { type: 'loaded', tuples: sampleTuples })
    expect(result.status).toBe('loaded')
    if (result.status === 'loaded') {
      expect(result.tuples).toEqual(sampleTuples)
      expect(result.selectedIndex).toBe(0)
    }
  })

  test('loaded stores continuation token', () => {
    const state: TupleListState = { status: 'loading' }
    const result = tupleListReducer(state, { type: 'loaded', tuples: sampleTuples, continuationToken: 'abc' })
    if (result.status === 'loaded') {
      expect(result.continuationToken).toBe('abc')
    }
  })

  test('loaded with append merges tuples', () => {
    const extraTuples: Tuple[] = [
      { key: { user: 'user:charlie', relation: 'viewer', object: 'document:report' }, timestamp: '2024-01-18T10:00:00Z' },
    ]
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 1 }
    const result = tupleListReducer(state, { type: 'loaded', tuples: extraTuples, append: true, continuationToken: 'next' })
    if (result.status === 'loaded') {
      expect(result.tuples).toHaveLength(4)
      expect(result.tuples[3]!.key.user).toBe('user:charlie')
      expect(result.selectedIndex).toBe(1) // preserved
      expect(result.continuationToken).toBe('next')
    }
  })

  test('loaded with append from loading state does not append', () => {
    const state: TupleListState = { status: 'loading' }
    const result = tupleListReducer(state, { type: 'loaded', tuples: sampleTuples, append: true })
    if (result.status === 'loaded') {
      expect(result.tuples).toEqual(sampleTuples)
      expect(result.selectedIndex).toBe(0)
    }
  })

  test('error sets error state', () => {
    const state: TupleListState = { status: 'loading' }
    const result = tupleListReducer(state, { type: 'error', message: 'Network error' })
    expect(result.status).toBe('error')
    if (result.status === 'error') {
      expect(result.message).toBe('Network error')
    }
  })

  test('move-up decrements selectedIndex', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 2 }
    const result = tupleListReducer(state, { type: 'move-up' })
    if ('selectedIndex' in result) {
      expect(result.selectedIndex).toBe(1)
    }
  })

  test('move-up does not go below 0', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0 }
    const result = tupleListReducer(state, { type: 'move-up' })
    if ('selectedIndex' in result) {
      expect(result.selectedIndex).toBe(0)
    }
  })

  test('move-down increments selectedIndex', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0 }
    const result = tupleListReducer(state, { type: 'move-down' })
    if ('selectedIndex' in result) {
      expect(result.selectedIndex).toBe(1)
    }
  })

  test('move-down does not exceed tuple count', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 2 }
    const result = tupleListReducer(state, { type: 'move-down' })
    if ('selectedIndex' in result) {
      expect(result.selectedIndex).toBe(2)
    }
  })

  test('start-add transitions to adding', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0 }
    const result = tupleListReducer(state, { type: 'start-add' })
    expect(result.status).toBe('adding')
  })

  test('cancel-add returns to loaded', () => {
    const state: TupleListState = { status: 'adding', tuples: sampleTuples, selectedIndex: 0 }
    const result = tupleListReducer(state, { type: 'cancel-add' })
    expect(result.status).toBe('loaded')
  })

  test('start-delete transitions to confirming-delete', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 1 }
    const result = tupleListReducer(state, { type: 'start-delete' })
    expect(result.status).toBe('confirming-delete')
  })

  test('start-delete ignored with empty tuples', () => {
    const state: TupleListState = { status: 'loaded', tuples: [], selectedIndex: 0 }
    const result = tupleListReducer(state, { type: 'start-delete' })
    expect(result.status).toBe('loaded')
  })

  test('cancel-delete returns to loaded', () => {
    const state: TupleListState = { status: 'confirming-delete', tuples: sampleTuples, selectedIndex: 1 }
    const result = tupleListReducer(state, { type: 'cancel-delete' })
    expect(result.status).toBe('loaded')
  })

  test('start-filter transitions to filtering', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0 }
    const result = tupleListReducer(state, { type: 'start-filter' })
    expect(result.status).toBe('filtering')
  })

  test('cancel-filter returns to loaded', () => {
    const state: TupleListState = { status: 'filtering', tuples: sampleTuples, selectedIndex: 0 }
    const result = tupleListReducer(state, { type: 'cancel-filter' })
    expect(result.status).toBe('loaded')
  })

  test('move-up/down ignored during loading', () => {
    const state: TupleListState = { status: 'loading' }
    expect(tupleListReducer(state, { type: 'move-up' }).status).toBe('loading')
    expect(tupleListReducer(state, { type: 'move-down' }).status).toBe('loading')
  })
})

describe('getSelectedTuple', () => {
  test('returns selected tuple when loaded', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 1 }
    const tuple = getSelectedTuple(state)
    expect(tuple?.key.user).toBe('user:bob')
  })

  test('returns undefined during loading', () => {
    const state: TupleListState = { status: 'loading' }
    expect(getSelectedTuple(state)).toBeUndefined()
  })

  test('returns undefined during error', () => {
    const state: TupleListState = { status: 'error', message: 'fail' }
    expect(getSelectedTuple(state)).toBeUndefined()
  })
})

describe('isFilterActive', () => {
  test('returns false for empty filter', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false)
  })

  test('returns false for whitespace-only filter', () => {
    expect(isFilterActive({ user: '  ', relation: '', object: '' })).toBe(false)
  })

  test('returns true when user is set', () => {
    expect(isFilterActive({ user: 'user:anne', relation: '', object: '' })).toBe(true)
  })

  test('returns true when relation is set', () => {
    expect(isFilterActive({ user: '', relation: 'owner', object: '' })).toBe(true)
  })

  test('returns true when object is set', () => {
    expect(isFilterActive({ user: '', relation: '', object: 'document:budget' })).toBe(true)
  })
})

describe('filterDescription', () => {
  test('returns empty for empty filter', () => {
    expect(filterDescription(EMPTY_FILTER)).toBe('')
  })

  test('describes single field', () => {
    expect(filterDescription({ user: 'user:anne', relation: '', object: '' })).toBe('user=user:anne')
  })

  test('describes multiple fields', () => {
    const filter: ServerFilter = { user: 'user:anne', relation: 'owner', object: '' }
    expect(filterDescription(filter)).toBe('user=user:anne, relation=owner')
  })

  test('describes all fields', () => {
    const filter: ServerFilter = { user: 'user:anne', relation: 'owner', object: 'document:budget' }
    expect(filterDescription(filter)).toBe('user=user:anne, relation=owner, object=document:budget')
  })
})

describe('buildTupleKeyFromFilter', () => {
  test('returns undefined for empty filter', () => {
    expect(buildTupleKeyFromFilter(EMPTY_FILTER)).toBeUndefined()
  })

  test('returns undefined for whitespace-only filter', () => {
    expect(buildTupleKeyFromFilter({ user: '  ', relation: '', object: '' })).toBeUndefined()
  })

  test('builds key with user only', () => {
    const result = buildTupleKeyFromFilter({ user: 'user:anne', relation: '', object: '' })
    expect(result).toEqual({ user: 'user:anne' })
  })

  test('builds key with relation only', () => {
    const result = buildTupleKeyFromFilter({ user: '', relation: 'owner', object: '' })
    expect(result).toEqual({ relation: 'owner' })
  })

  test('builds key with all fields', () => {
    const filter: ServerFilter = { user: 'user:anne', relation: 'owner', object: 'document:budget' }
    const result = buildTupleKeyFromFilter(filter)
    expect(result).toEqual({ user: 'user:anne', relation: 'owner', object: 'document:budget' })
  })

  test('trims whitespace', () => {
    const result = buildTupleKeyFromFilter({ user: ' user:anne ', relation: '', object: '' })
    expect(result).toEqual({ user: 'user:anne' })
  })

  test('appends colon to user without type:id format', () => {
    const result = buildTupleKeyFromFilter({ user: 'user', relation: '', object: '' })
    expect(result).toEqual({ user: 'user:' })
  })

  test('appends colon to object without type:id format', () => {
    const result = buildTupleKeyFromFilter({ user: '', relation: '', object: 'document' })
    expect(result).toEqual({ object: 'document:' })
  })

  test('does not double-append colon when already present', () => {
    const result = buildTupleKeyFromFilter({ user: 'user:anne', relation: '', object: 'document:' })
    expect(result).toEqual({ user: 'user:anne', object: 'document:' })
  })
})

describe('formatTupleForDisplay', () => {
  test('formats tuple as [user, relation, object]', () => {
    const result = formatTupleForDisplay(sampleTuples[0]!)
    expect(result).toEqual(['user:anne', 'owner', 'folder:root'])
  })

  test('formats tuple with relation reference', () => {
    const result = formatTupleForDisplay(sampleTuples[2]!)
    expect(result).toEqual(['group:eng#member', 'viewer', 'folder:root'])
  })
})
