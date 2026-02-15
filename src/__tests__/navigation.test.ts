import { describe, expect, test } from 'bun:test'
import {
  navigationReducer,
  getParentView,
  getBreadcrumb,
  getViewKeybindHints,
  type View,
} from '../lib/navigation.ts'

describe('navigationReducer', () => {
  test('navigate action changes view', () => {
    const state: View = { kind: 'connect' }
    const result = navigationReducer(state, {
      type: 'navigate',
      view: { kind: 'stores' },
    })
    expect(result).toEqual({ kind: 'stores' })
  })

  test('navigate to store-overview', () => {
    const state: View = { kind: 'stores' }
    const result = navigationReducer(state, {
      type: 'navigate',
      view: { kind: 'store-overview', storeId: 'store-123' },
    })
    expect(result).toEqual({ kind: 'store-overview', storeId: 'store-123' })
  })

  test('navigate to model view', () => {
    const state: View = { kind: 'store-overview', storeId: 'store-123' }
    const result = navigationReducer(state, {
      type: 'navigate',
      view: { kind: 'model', storeId: 'store-123' },
    })
    expect(result).toEqual({ kind: 'model', storeId: 'store-123' })
  })

  test('back from connect stays on connect', () => {
    const state: View = { kind: 'connect' }
    const result = navigationReducer(state, { type: 'back' })
    expect(result).toEqual({ kind: 'connect' })
  })

  test('back from stores goes to connect', () => {
    const state: View = { kind: 'stores' }
    const result = navigationReducer(state, { type: 'back' })
    expect(result).toEqual({ kind: 'connect' })
  })

  test('back from store-overview goes to stores', () => {
    const state: View = { kind: 'store-overview', storeId: 'store-123' }
    const result = navigationReducer(state, { type: 'back' })
    expect(result).toEqual({ kind: 'stores' })
  })

  test('back from model goes to store-overview', () => {
    const state: View = { kind: 'model', storeId: 'store-123' }
    const result = navigationReducer(state, { type: 'back' })
    expect(result).toEqual({ kind: 'store-overview', storeId: 'store-123' })
  })

  test('back from tuples goes to store-overview', () => {
    const state: View = { kind: 'tuples', storeId: 'store-123' }
    const result = navigationReducer(state, { type: 'back' })
    expect(result).toEqual({ kind: 'store-overview', storeId: 'store-123' })
  })

  test('back from queries goes to store-overview', () => {
    const state: View = { kind: 'queries', storeId: 'store-123' }
    const result = navigationReducer(state, { type: 'back' })
    expect(result).toEqual({ kind: 'store-overview', storeId: 'store-123' })
  })
})

describe('getParentView', () => {
  test('connect has no parent (returns self)', () => {
    expect(getParentView({ kind: 'connect' })).toEqual({ kind: 'connect' })
  })

  test('stores parent is connect', () => {
    expect(getParentView({ kind: 'stores' })).toEqual({ kind: 'connect' })
  })

  test('store-overview parent is stores', () => {
    expect(getParentView({ kind: 'store-overview', storeId: 's1' })).toEqual({
      kind: 'stores',
    })
  })

  test('model parent is store-overview', () => {
    expect(getParentView({ kind: 'model', storeId: 's1' })).toEqual({
      kind: 'store-overview',
      storeId: 's1',
    })
  })

  test('tuples parent is store-overview', () => {
    expect(getParentView({ kind: 'tuples', storeId: 's1' })).toEqual({
      kind: 'store-overview',
      storeId: 's1',
    })
  })

  test('queries parent is store-overview', () => {
    expect(getParentView({ kind: 'queries', storeId: 's1' })).toEqual({
      kind: 'store-overview',
      storeId: 's1',
    })
  })
})

describe('getBreadcrumb', () => {
  test('connect breadcrumb', () => {
    expect(getBreadcrumb({ kind: 'connect' })).toEqual(['Connect'])
  })

  test('stores breadcrumb', () => {
    expect(getBreadcrumb({ kind: 'stores' })).toEqual(['Stores'])
  })

  test('store-overview breadcrumb with short ID', () => {
    expect(getBreadcrumb({ kind: 'store-overview', storeId: 'my-store' })).toEqual([
      'Stores',
      'my-store',
    ])
  })

  test('store-overview breadcrumb truncates long ID', () => {
    const longId = '01HXYZ1234567890ABCDEF'
    const result = getBreadcrumb({ kind: 'store-overview', storeId: longId })
    expect(result[1]).toBe('01HXYZ123456...')
  })

  test('model breadcrumb', () => {
    expect(getBreadcrumb({ kind: 'model', storeId: 'my-store' })).toEqual([
      'Stores',
      'my-store',
      'Model',
    ])
  })

  test('tuples breadcrumb', () => {
    expect(getBreadcrumb({ kind: 'tuples', storeId: 'my-store' })).toEqual([
      'Stores',
      'my-store',
      'Tuples',
    ])
  })

  test('queries breadcrumb', () => {
    expect(getBreadcrumb({ kind: 'queries', storeId: 'my-store' })).toEqual([
      'Stores',
      'my-store',
      'Queries',
    ])
  })
})

describe('getViewKeybindHints', () => {
  test('each view returns non-empty hints', () => {
    const views: View[] = [
      { kind: 'connect' },
      { kind: 'stores' },
      { kind: 'store-overview', storeId: 's1' },
      { kind: 'model', storeId: 's1' },
      { kind: 'tuples', storeId: 's1' },
      { kind: 'queries', storeId: 's1' },
    ]

    for (const view of views) {
      const hints = getViewKeybindHints(view)
      expect(hints.length).toBeGreaterThan(0)
    }
  })

  test('connect view hints include Tab and Enter', () => {
    const hints = getViewKeybindHints({ kind: 'connect' })
    expect(hints).toContain('Tab')
    expect(hints).toContain('Enter')
  })

  test('stores view hints include create and delete', () => {
    const hints = getViewKeybindHints({ kind: 'stores' })
    expect(hints).toContain('[c]reate')
    expect(hints).toContain('[d]elete')
  })

  test('store-overview hints include model, tuples, queries shortcuts', () => {
    const hints = getViewKeybindHints({ kind: 'store-overview', storeId: 's1' })
    expect(hints).toContain('odel')
    expect(hints).toContain('uples')
    expect(hints).toContain('ueries')
  })
})
