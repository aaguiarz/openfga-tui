import { describe, expect, test } from 'bun:test'
import { getNodeLabel, getNodeColor, getNodeChildren } from '../components/tree-view.tsx'
import { formatUser } from '../views/query-list-users.tsx'
import type { Node, User } from '../lib/openfga/types.ts'

describe('TreeView logic', () => {
  describe('getNodeLabel', () => {
    test('returns name if present', () => {
      const node: Node = { name: 'document:budget#reader' }
      expect(getNodeLabel(node)).toBe('document:budget#reader')
    })

    test('returns Users label for leaf users', () => {
      const node: Node = { leaf: { users: { users: ['user:anne', 'user:bob'] } } }
      expect(getNodeLabel(node)).toBe('Users: user:anne, user:bob')
    })

    test('returns Computed label for leaf computed', () => {
      const node: Node = { leaf: { computed: { userset: 'writer' } } }
      expect(getNodeLabel(node)).toBe('Computed: writer')
    })

    test('returns TupleToUserset label', () => {
      const node: Node = {
        leaf: { tupleToUserset: { tupleset: 'parent', computed: [{ userset: 'viewer' }] } },
      }
      expect(getNodeLabel(node)).toBe('TupleToUserset: parent')
    })

    test('returns "union" for union nodes', () => {
      const node: Node = { union: { nodes: [] } }
      expect(getNodeLabel(node)).toBe('union')
    })

    test('returns "intersection" for intersection nodes', () => {
      const node: Node = { intersection: { nodes: [] } }
      expect(getNodeLabel(node)).toBe('intersection')
    })

    test('returns "difference" for difference nodes', () => {
      const node: Node = { difference: { nodes: [] } }
      expect(getNodeLabel(node)).toBe('difference')
    })

    test('returns "(unknown)" for empty node', () => {
      const node: Node = {}
      expect(getNodeLabel(node)).toBe('(unknown)')
    })
  })

  describe('getNodeColor', () => {
    test('union is blue', () => {
      expect(getNodeColor({ union: { nodes: [] } })).toBe('#3b82f6')
    })

    test('intersection is green', () => {
      expect(getNodeColor({ intersection: { nodes: [] } })).toBe('#22c55e')
    })

    test('difference is orange', () => {
      expect(getNodeColor({ difference: { nodes: [] } })).toBe('#f97316')
    })

    test('leaf users is default', () => {
      expect(getNodeColor({ leaf: { users: { users: [] } } })).toBe('#e5e7eb')
    })

    test('leaf computed is cyan', () => {
      expect(getNodeColor({ leaf: { computed: { userset: 'x' } } })).toBe('#06b6d4')
    })
  })

  describe('getNodeChildren', () => {
    test('union returns its nodes', () => {
      const childA: Node = { name: 'a' }
      const childB: Node = { name: 'b' }
      expect(getNodeChildren({ union: { nodes: [childA, childB] } })).toEqual([childA, childB])
    })

    test('intersection returns its nodes', () => {
      const child: Node = { name: 'c' }
      expect(getNodeChildren({ intersection: { nodes: [child] } })).toEqual([child])
    })

    test('difference returns its nodes', () => {
      const child: Node = { name: 'd' }
      expect(getNodeChildren({ difference: { nodes: [child] } })).toEqual([child])
    })

    test('leaf returns empty array', () => {
      expect(getNodeChildren({ leaf: { users: { users: [] } } })).toEqual([])
    })

    test('empty node returns empty array', () => {
      expect(getNodeChildren({})).toEqual([])
    })
  })
})

describe('formatUser', () => {
  test('formats object user', () => {
    const user: User = { object: { type: 'user', id: 'anne' } }
    expect(formatUser(user)).toBe('user:anne')
  })

  test('formats userset user', () => {
    const user: User = { userset: { type: 'group', id: 'eng', relation: 'member' } }
    expect(formatUser(user)).toBe('group:eng#member')
  })

  test('formats wildcard user', () => {
    const user: User = { wildcard: { type: 'user' } }
    expect(formatUser(user)).toBe('user:*')
  })

  test('returns (unknown) for empty user', () => {
    const user: User = {}
    expect(formatUser(user)).toBe('(unknown)')
  })
})
