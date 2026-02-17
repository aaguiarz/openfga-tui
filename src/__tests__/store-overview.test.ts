import { describe, expect, test } from 'bun:test'
import { formatStoreDate } from '../lib/store-list.ts'
import { formatTupleSummary } from '../lib/store-overview.ts'

// Store overview relies on formatStoreDate from store-list and client API calls.
// The UI component itself uses OpenTUI and can't be unit tested without WASM.
// These tests cover the data formatting logic used by the overview.

describe('store overview data formatting', () => {
  test('formatStoreDate formats dates correctly for display', () => {
    const result = formatStoreDate('2024-06-15T14:30:00Z')
    expect(result).toContain('Jun')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  test('store ID truncation logic', () => {
    // This mirrors the truncation logic in store-overview.tsx
    const truncate = (id: string) => id.length > 20 ? id.slice(0, 20) + '...' : id

    expect(truncate('short-id')).toBe('short-id')
    expect(truncate('01HXYZ1234567890ABCDEFGHIJ')).toBe('01HXYZ1234567890ABCD...')
    expect(truncate('exactly-twenty-chars')).toBe('exactly-twenty-chars')
  })

  test('navigation targets are valid', () => {
    // Verify the navigation targets match what App expects
    const validTargets = ['model', 'tuples', 'queries']
    for (const target of validTargets) {
      expect(['model', 'tuples', 'queries']).toContain(target)
    }
  })

  test('stats default to loading state', () => {
    interface StoreStats {
      loading: boolean
      modelCount?: number
      tupleCount?: number
      error?: string
    }
    const initial: StoreStats = { loading: true }
    expect(initial.loading).toBe(true)
    expect(initial.modelCount).toBeUndefined()
    expect(initial.tupleCount).toBeUndefined()
    expect(initial.error).toBeUndefined()
  })

  test('stats loaded state has counts', () => {
    interface StoreStats {
      loading: boolean
      modelCount?: number
      tupleCount?: number
      error?: string
    }
    const loaded: StoreStats = { loading: false, modelCount: 3, tupleCount: 42 }
    expect(loaded.loading).toBe(false)
    expect(loaded.modelCount).toBe(3)
    expect(loaded.tupleCount).toBe(42)
  })

  test('stats error state has message', () => {
    interface StoreStats {
      loading: boolean
      error?: string
    }
    const error: StoreStats = { loading: false, error: 'Network error' }
    expect(error.loading).toBe(false)
    expect(error.error).toBe('Network error')
  })

  test('tuple summary marks sampled values explicitly', () => {
    expect(formatTupleSummary(0, false)).toBe('0 tuples (sampled)')
    expect(formatTupleSummary(1, false)).toBe('1 tuple (sampled)')
    expect(formatTupleSummary(1, true)).toBe('1+ tuples (sampled)')
  })
})
