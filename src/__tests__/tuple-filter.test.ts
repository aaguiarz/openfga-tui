import { describe, expect, test } from 'bun:test'
import {
  buildReadTupleKey,
  isFilterActive,
  filterDescription,
  clearFilter,
  toggleSelection,
  clearSelection,
  getSelectedIndices,
  exportTuples,
  importTuples,
  type TupleFilter,
  type TupleSelection,
} from '../lib/tuple-filter.ts'

describe('buildReadTupleKey', () => {
  test('returns undefined when no filter fields are set', () => {
    expect(buildReadTupleKey({})).toBeUndefined()
  })

  test('returns undefined when all fields are empty strings', () => {
    expect(buildReadTupleKey({ user: '', relation: '', object: '' })).toBeUndefined()
  })

  test('returns undefined when all fields are whitespace', () => {
    expect(buildReadTupleKey({ user: '  ', relation: '  ', object: '  ' })).toBeUndefined()
  })

  test('returns key with user when user is set', () => {
    const result = buildReadTupleKey({ user: 'user:anne' })
    expect(result).toEqual({ user: 'user:anne' })
  })

  test('returns key with relation when relation is set', () => {
    const result = buildReadTupleKey({ relation: 'viewer' })
    expect(result).toEqual({ relation: 'viewer' })
  })

  test('returns key with object when object is set', () => {
    const result = buildReadTupleKey({ object: 'document:1' })
    expect(result).toEqual({ object: 'document:1' })
  })

  test('returns key with all fields when all are set', () => {
    const result = buildReadTupleKey({ user: 'user:anne', relation: 'viewer', object: 'document:1' })
    expect(result).toEqual({ user: 'user:anne', relation: 'viewer', object: 'document:1' })
  })

  test('trims whitespace from values', () => {
    const result = buildReadTupleKey({ user: '  user:anne  ', relation: ' viewer ' })
    expect(result).toEqual({ user: 'user:anne', relation: 'viewer' })
  })

  test('ignores undefined fields', () => {
    const result = buildReadTupleKey({ user: 'user:anne', relation: undefined, object: undefined })
    expect(result).toEqual({ user: 'user:anne' })
  })
})

describe('isFilterActive', () => {
  test('returns false for empty filter', () => {
    expect(isFilterActive({})).toBe(false)
  })

  test('returns false for whitespace-only fields', () => {
    expect(isFilterActive({ user: '  ', relation: '', object: '  ' })).toBe(false)
  })

  test('returns true when user is set', () => {
    expect(isFilterActive({ user: 'user:anne' })).toBe(true)
  })

  test('returns true when relation is set', () => {
    expect(isFilterActive({ relation: 'viewer' })).toBe(true)
  })

  test('returns true when object is set', () => {
    expect(isFilterActive({ object: 'document:1' })).toBe(true)
  })

  test('returns true when multiple fields are set', () => {
    expect(isFilterActive({ user: 'user:anne', relation: 'viewer' })).toBe(true)
  })
})

describe('filterDescription', () => {
  test('returns empty string for empty filter', () => {
    expect(filterDescription({})).toBe('')
  })

  test('returns single field description', () => {
    expect(filterDescription({ user: 'user:anne' })).toBe('user=user:anne')
  })

  test('returns multiple field descriptions joined by comma', () => {
    const desc = filterDescription({ user: 'user:anne', relation: 'viewer' })
    expect(desc).toBe('user=user:anne, relation=viewer')
  })

  test('returns all three fields', () => {
    const desc = filterDescription({ user: 'user:anne', relation: 'viewer', object: 'doc:1' })
    expect(desc).toBe('user=user:anne, relation=viewer, object=doc:1')
  })

  test('trims whitespace from values', () => {
    expect(filterDescription({ user: '  user:anne  ' })).toBe('user=user:anne')
  })

  test('ignores empty fields', () => {
    expect(filterDescription({ user: '', relation: 'viewer', object: '' })).toBe('relation=viewer')
  })
})

describe('clearFilter', () => {
  test('returns filter with all undefined fields', () => {
    const result = clearFilter()
    expect(result.user).toBeUndefined()
    expect(result.relation).toBeUndefined()
    expect(result.object).toBeUndefined()
  })
})

describe('toggleSelection', () => {
  test('adds index to empty selection', () => {
    const sel: TupleSelection = { selected: new Set() }
    const result = toggleSelection(sel, 0)
    expect(result.selected.has(0)).toBe(true)
  })

  test('removes index from selection if already present', () => {
    const sel: TupleSelection = { selected: new Set([0, 1, 2]) }
    const result = toggleSelection(sel, 1)
    expect(result.selected.has(1)).toBe(false)
    expect(result.selected.has(0)).toBe(true)
    expect(result.selected.has(2)).toBe(true)
  })

  test('does not mutate original selection', () => {
    const sel: TupleSelection = { selected: new Set([0]) }
    toggleSelection(sel, 1)
    expect(sel.selected.has(1)).toBe(false)
  })

  test('toggles back and forth', () => {
    let sel: TupleSelection = { selected: new Set() }
    sel = toggleSelection(sel, 3)
    expect(sel.selected.has(3)).toBe(true)
    sel = toggleSelection(sel, 3)
    expect(sel.selected.has(3)).toBe(false)
  })
})

describe('clearSelection', () => {
  test('returns empty selection set', () => {
    const result = clearSelection()
    expect(result.selected.size).toBe(0)
  })
})

describe('getSelectedIndices', () => {
  test('returns empty array for empty selection', () => {
    expect(getSelectedIndices({ selected: new Set() })).toEqual([])
  })

  test('returns sorted indices', () => {
    const sel: TupleSelection = { selected: new Set([3, 1, 5, 0]) }
    expect(getSelectedIndices(sel)).toEqual([0, 1, 3, 5])
  })

  test('returns single index', () => {
    expect(getSelectedIndices({ selected: new Set([7]) })).toEqual([7])
  })
})

describe('exportTuples', () => {
  test('exports empty array', () => {
    expect(exportTuples([])).toEqual({ tuples: [] })
  })

  test('exports tuple keys', () => {
    const tuples = [
      { key: { user: 'user:anne', relation: 'viewer', object: 'document:1' } },
      { key: { user: 'user:bob', relation: 'editor', object: 'document:2' } },
    ]
    const result = exportTuples(tuples)
    expect(result.tuples).toHaveLength(2)
    expect(result.tuples[0]).toEqual({ user: 'user:anne', relation: 'viewer', object: 'document:1' })
    expect(result.tuples[1]).toEqual({ user: 'user:bob', relation: 'editor', object: 'document:2' })
  })
})

describe('importTuples', () => {
  test('imports empty tuples', () => {
    expect(importTuples({ tuples: [] })).toEqual([])
  })

  test('imports tuple keys', () => {
    const data = {
      tuples: [
        { user: 'user:anne', relation: 'viewer', object: 'document:1' },
        { user: 'user:bob', relation: 'editor', object: 'document:2' },
      ],
    }
    const result = importTuples(data)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ user: 'user:anne', relation: 'viewer', object: 'document:1' })
    expect(result[1]).toEqual({ user: 'user:bob', relation: 'editor', object: 'document:2' })
  })
})
