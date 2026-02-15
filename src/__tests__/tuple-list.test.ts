import { describe, expect, test } from 'bun:test'
import {
  tupleListReducer,
  getSelectedTuple,
  getFilteredTuples,
  formatTupleForDisplay,
  type TupleListState,
} from '../lib/tuple-list.ts'
import type { Tuple } from '../lib/openfga/types.ts'

const sampleTuples: Tuple[] = [
  { key: { user: 'user:anne', relation: 'owner', object: 'folder:root' }, timestamp: '2024-01-15T10:00:00Z' },
  { key: { user: 'user:bob', relation: 'writer', object: 'document:budget' }, timestamp: '2024-01-16T10:00:00Z' },
  { key: { user: 'group:eng#member', relation: 'viewer', object: 'folder:root' }, timestamp: '2024-01-17T10:00:00Z' },
]

describe('tupleListReducer', () => {
  test('load sets loading state', () => {
    const state: TupleListState = { status: 'loaded', tuples: [], selectedIndex: 0, filter: '' }
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

  test('loaded preserves existing filter', () => {
    const state: TupleListState = { status: 'loaded', tuples: [], selectedIndex: 0, filter: 'anne' }
    const result = tupleListReducer(state, { type: 'loaded', tuples: sampleTuples })
    if (result.status === 'loaded') {
      expect(result.filter).toBe('anne')
    }
  })

  test('loaded stores continuation token', () => {
    const state: TupleListState = { status: 'loading' }
    const result = tupleListReducer(state, { type: 'loaded', tuples: sampleTuples, continuationToken: 'abc' })
    if (result.status === 'loaded') {
      expect(result.continuationToken).toBe('abc')
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
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 2, filter: '' }
    const result = tupleListReducer(state, { type: 'move-up' })
    if ('selectedIndex' in result) {
      expect(result.selectedIndex).toBe(1)
    }
  })

  test('move-up does not go below 0', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0, filter: '' }
    const result = tupleListReducer(state, { type: 'move-up' })
    if ('selectedIndex' in result) {
      expect(result.selectedIndex).toBe(0)
    }
  })

  test('move-down increments selectedIndex', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0, filter: '' }
    const result = tupleListReducer(state, { type: 'move-down' })
    if ('selectedIndex' in result) {
      expect(result.selectedIndex).toBe(1)
    }
  })

  test('move-down does not exceed tuple count', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 2, filter: '' }
    const result = tupleListReducer(state, { type: 'move-down' })
    if ('selectedIndex' in result) {
      expect(result.selectedIndex).toBe(2)
    }
  })

  test('start-add transitions to adding', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0, filter: '' }
    const result = tupleListReducer(state, { type: 'start-add' })
    expect(result.status).toBe('adding')
  })

  test('cancel-add returns to loaded', () => {
    const state: TupleListState = { status: 'adding', tuples: sampleTuples, selectedIndex: 0, filter: '' }
    const result = tupleListReducer(state, { type: 'cancel-add' })
    expect(result.status).toBe('loaded')
  })

  test('start-delete transitions to confirming-delete', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 1, filter: '' }
    const result = tupleListReducer(state, { type: 'start-delete' })
    expect(result.status).toBe('confirming-delete')
  })

  test('start-delete ignored with empty tuples', () => {
    const state: TupleListState = { status: 'loaded', tuples: [], selectedIndex: 0, filter: '' }
    const result = tupleListReducer(state, { type: 'start-delete' })
    expect(result.status).toBe('loaded')
  })

  test('cancel-delete returns to loaded', () => {
    const state: TupleListState = { status: 'confirming-delete', tuples: sampleTuples, selectedIndex: 1, filter: '' }
    const result = tupleListReducer(state, { type: 'cancel-delete' })
    expect(result.status).toBe('loaded')
  })

  test('start-filter transitions to filtering', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0, filter: '' }
    const result = tupleListReducer(state, { type: 'start-filter' })
    expect(result.status).toBe('filtering')
  })

  test('cancel-filter returns to loaded', () => {
    const state: TupleListState = { status: 'filtering', tuples: sampleTuples, selectedIndex: 0, filter: 'test' }
    const result = tupleListReducer(state, { type: 'cancel-filter' })
    expect(result.status).toBe('loaded')
  })

  test('set-filter updates filter text', () => {
    const state: TupleListState = { status: 'filtering', tuples: sampleTuples, selectedIndex: 0, filter: '' }
    const result = tupleListReducer(state, { type: 'set-filter', filter: 'anne' })
    if ('filter' in result) {
      expect(result.filter).toBe('anne')
    }
  })

  test('move-up/down ignored during loading', () => {
    const state: TupleListState = { status: 'loading' }
    expect(tupleListReducer(state, { type: 'move-up' }).status).toBe('loading')
    expect(tupleListReducer(state, { type: 'move-down' }).status).toBe('loading')
  })
})

describe('getSelectedTuple', () => {
  test('returns selected tuple when loaded', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 1, filter: '' }
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

describe('getFilteredTuples', () => {
  test('returns all tuples when no filter', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0, filter: '' }
    expect(getFilteredTuples(state)).toEqual(sampleTuples)
  })

  test('filters by user', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0, filter: 'anne' }
    const filtered = getFilteredTuples(state)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.key.user).toBe('user:anne')
  })

  test('filters by relation', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0, filter: 'viewer' }
    const filtered = getFilteredTuples(state)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.key.relation).toBe('viewer')
  })

  test('filters by object', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0, filter: 'budget' }
    const filtered = getFilteredTuples(state)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.key.object).toBe('document:budget')
  })

  test('filter is case-insensitive', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0, filter: 'ANNE' }
    const filtered = getFilteredTuples(state)
    expect(filtered).toHaveLength(1)
  })

  test('returns empty for non-matching filter', () => {
    const state: TupleListState = { status: 'loaded', tuples: sampleTuples, selectedIndex: 0, filter: 'nonexistent' }
    const filtered = getFilteredTuples(state)
    expect(filtered).toHaveLength(0)
  })

  test('returns empty for loading state', () => {
    const state: TupleListState = { status: 'loading' }
    expect(getFilteredTuples(state)).toEqual([])
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
