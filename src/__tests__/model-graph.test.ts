import { describe, expect, test } from 'bun:test'
import { renderModelGraph, graphToPlainText } from '../lib/model-graph.ts'
import type { AuthorizationModel } from '../lib/openfga/types.ts'

describe('renderModelGraph', () => {
  test('renders a simple model with no relations', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [{ type: 'user' }],
    }
    const lines = renderModelGraph(model)
    const text = graphToPlainText(lines)
    expect(text).toContain('user')
    expect(text).toContain('(no relations)')
  })

  test('renders a model with direct assignment', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'document',
          relations: { owner: { this: {} } },
          metadata: {
            relations: {
              owner: { directly_related_user_types: [{ type: 'user' }] },
            },
          },
        },
      ],
    }
    const text = graphToPlainText(renderModelGraph(model))
    expect(text).toContain('document')
    expect(text).toContain('owner')
    expect(text).toContain('[user]')
  })

  test('renders a model with union', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'document',
          relations: {
            owner: { this: {} },
            reader: {
              union: {
                child: [
                  { this: {} },
                  { computedUserset: { relation: 'owner' } },
                ],
              },
            },
          },
          metadata: {
            relations: {
              owner: { directly_related_user_types: [{ type: 'user' }] },
              reader: { directly_related_user_types: [{ type: 'user' }] },
            },
          },
        },
      ],
    }
    const text = graphToPlainText(renderModelGraph(model))
    expect(text).toContain('reader')
    expect(text).toContain(' or ')
    expect(text).toContain('owner')
  })

  test('renders a model with tupleToUserset', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'document',
          relations: {
            parent: { this: {} },
            viewer: {
              tupleToUserset: {
                tupleset: { relation: 'parent' },
                computedUserset: { relation: 'viewer' },
              },
            },
          },
          metadata: {
            relations: {
              parent: { directly_related_user_types: [{ type: 'folder' }] },
            },
          },
        },
      ],
    }
    const text = graphToPlainText(renderModelGraph(model))
    expect(text).toContain('viewer')
    expect(text).toContain(' from ')
    expect(text).toContain('parent')
  })

  test('renders wildcard types', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'document',
          relations: { viewer: { this: {} } },
          metadata: {
            relations: {
              viewer: {
                directly_related_user_types: [
                  { type: 'user' },
                  { type: 'user', wildcard: {} },
                ],
              },
            },
          },
        },
      ],
    }
    const text = graphToPlainText(renderModelGraph(model))
    expect(text).toContain('user:*')
  })

  test('renders relation references (#member)', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'document',
          relations: { viewer: { this: {} } },
          metadata: {
            relations: {
              viewer: {
                directly_related_user_types: [
                  { type: 'user' },
                  { type: 'group', relation: 'member' },
                ],
              },
            },
          },
        },
      ],
    }
    const text = graphToPlainText(renderModelGraph(model))
    expect(text).toContain('group#member')
  })

  test('renders a complex multi-type model successfully', () => {
    const model: AuthorizationModel = {
      id: 'complex-model-01',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'group',
          relations: { member: { this: {} } },
          metadata: { relations: { member: { directly_related_user_types: [{ type: 'user' }] } } },
        },
        {
          type: 'folder',
          relations: {
            owner: { this: {} },
            viewer: { union: { child: [{ this: {} }, { computedUserset: { relation: 'owner' } }] } },
          },
          metadata: {
            relations: {
              owner: { directly_related_user_types: [{ type: 'user' }] },
              viewer: { directly_related_user_types: [{ type: 'user' }, { type: 'group', relation: 'member' }] },
            },
          },
        },
        {
          type: 'document',
          relations: {
            owner: { this: {} },
            parent: { this: {} },
            writer: { union: { child: [{ this: {} }, { computedUserset: { relation: 'owner' } }] } },
            reader: {
              union: {
                child: [
                  { this: {} },
                  { computedUserset: { relation: 'writer' } },
                  { tupleToUserset: { tupleset: { relation: 'parent' }, computedUserset: { relation: 'viewer' } } },
                ],
              },
            },
          },
          metadata: {
            relations: {
              owner: { directly_related_user_types: [{ type: 'user' }] },
              parent: { directly_related_user_types: [{ type: 'folder' }] },
              writer: { directly_related_user_types: [{ type: 'user' }] },
              reader: { directly_related_user_types: [{ type: 'user' }, { type: 'user', wildcard: {} }] },
            },
          },
        },
      ],
    }
    const lines = renderModelGraph(model, 'Test Store')
    const text = graphToPlainText(lines)
    expect(text).toContain('Test Store')
    expect(text).toContain('user')
    expect(text).toContain('group')
    expect(text).toContain('folder')
    expect(text).toContain('document')
    expect(text).toContain('owner')
    expect(text).toContain('reader')
    expect(text).toContain('writer')
    expect(text).toContain('viewer')
  })

  test('uses custom store name in title', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [{ type: 'user' }],
    }
    const text = graphToPlainText(renderModelGraph(model, 'my-store'))
    expect(text).toContain('my-store')
  })

  test('uses tree characters for structure', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        { type: 'document' },
      ],
    }
    const text = graphToPlainText(renderModelGraph(model))
    expect(text).toContain('├──')
    expect(text).toContain('└──')
  })
})

describe('graphToPlainText', () => {
  test('joins lines and segments correctly', () => {
    const lines = [
      [{ text: 'hello', color: '#fff' }, { text: ' world', color: '#aaa' }],
      [{ text: 'line 2', color: '#fff' }],
    ]
    expect(graphToPlainText(lines)).toBe('hello world\nline 2')
  })

  test('handles empty lines', () => {
    const lines = [
      [{ text: 'first', color: '#fff' }],
      [],
      [{ text: 'third', color: '#fff' }],
    ]
    expect(graphToPlainText(lines)).toBe('first\n\nthird')
  })
})
