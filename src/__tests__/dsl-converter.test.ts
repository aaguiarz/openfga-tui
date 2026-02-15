import { describe, expect, test } from 'bun:test'
import { modelToDsl, dslToModel } from '../lib/openfga/dsl-converter.ts'
import type { AuthorizationModel } from '../lib/openfga/types.ts'

describe('modelToDsl', () => {
  test('converts a simple model with no relations', () => {
    const model: AuthorizationModel = {
      id: 'model-1',
      schema_version: '1.1',
      type_definitions: [{ type: 'user' }],
    }

    const dsl = modelToDsl(model)
    expect(dsl).toContain('model')
    expect(dsl).toContain('schema 1.1')
    expect(dsl).toContain('type user')
  })

  test('converts a model with direct assignment relation', () => {
    const model: AuthorizationModel = {
      id: 'model-1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'document',
          relations: {
            owner: { this: {} },
          },
          metadata: {
            relations: {
              owner: {
                directly_related_user_types: [{ type: 'user' }],
              },
            },
          },
        },
      ],
    }

    const dsl = modelToDsl(model)
    expect(dsl).toContain('type document')
    expect(dsl).toContain('relations')
    expect(dsl).toContain('define owner: [user]')
  })

  test('converts a model with union relation', () => {
    const model: AuthorizationModel = {
      id: 'model-1',
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
              owner: {
                directly_related_user_types: [{ type: 'user' }],
              },
              reader: {
                directly_related_user_types: [{ type: 'user' }],
              },
            },
          },
        },
      ],
    }

    const dsl = modelToDsl(model)
    expect(dsl).toContain('define reader: [user] or owner')
  })

  test('converts a model with tupleToUserset', () => {
    const model: AuthorizationModel = {
      id: 'model-1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'folder',
          relations: {
            viewer: { this: {} },
          },
          metadata: {
            relations: {
              viewer: {
                directly_related_user_types: [{ type: 'user' }],
              },
            },
          },
        },
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
              parent: {
                directly_related_user_types: [{ type: 'folder' }],
              },
            },
          },
        },
      ],
    }

    const dsl = modelToDsl(model)
    expect(dsl).toContain('define viewer: viewer from parent')
  })

  test('converts a model with wildcard type', () => {
    const model: AuthorizationModel = {
      id: 'model-1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'document',
          relations: {
            viewer: { this: {} },
          },
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

    const dsl = modelToDsl(model)
    expect(dsl).toContain('define viewer: [user, user:*]')
  })

  test('converts a model with relation reference (#member)', () => {
    const model: AuthorizationModel = {
      id: 'model-1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'group',
          relations: {
            member: { this: {} },
          },
          metadata: {
            relations: {
              member: {
                directly_related_user_types: [{ type: 'user' }],
              },
            },
          },
        },
        {
          type: 'document',
          relations: {
            viewer: { this: {} },
          },
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

    const dsl = modelToDsl(model)
    expect(dsl).toContain('define viewer: [user, group#member]')
  })
})

describe('dslToModel', () => {
  test('parses a simple model', () => {
    const dsl = `model
  schema 1.1

type user`

    const model = dslToModel(dsl)
    expect(model.schema_version).toBe('1.1')
    expect(model.type_definitions).toHaveLength(1)
    expect(model.type_definitions[0]!.type).toBe('user')
  })

  test('parses a model with direct assignment', () => {
    const dsl = `model
  schema 1.1

type user

type document
  relations
    define owner: [user]`

    const model = dslToModel(dsl)
    expect(model.type_definitions).toHaveLength(2)
    const doc = model.type_definitions[1]!
    expect(doc.type).toBe('document')
    expect(doc.relations?.owner).toBeDefined()
    expect(doc.relations?.owner?.this).toBeDefined()
    expect(doc.metadata?.relations?.owner?.directly_related_user_types).toEqual([
      { type: 'user' },
    ])
  })

  test('parses a model with union (or)', () => {
    const dsl = `model
  schema 1.1

type user

type document
  relations
    define owner: [user]
    define reader: [user] or owner`

    const model = dslToModel(dsl)
    const doc = model.type_definitions[1]!
    expect(doc.relations?.reader?.union?.child).toHaveLength(2)
  })

  test('parses a model with tupleToUserset (from)', () => {
    const dsl = `model
  schema 1.1

type user

type document
  relations
    define parent: [folder]
    define viewer: viewer from parent`

    const model = dslToModel(dsl)
    const doc = model.type_definitions[1]!
    expect(doc.relations?.viewer?.tupleToUserset).toBeDefined()
    expect(doc.relations?.viewer?.tupleToUserset?.tupleset?.relation).toBe('parent')
    expect(doc.relations?.viewer?.tupleToUserset?.computedUserset?.relation).toBe('viewer')
  })

  test('parses a model with intersection (and)', () => {
    const dsl = `model
  schema 1.1

type user

type document
  relations
    define owner: [user]
    define writer: [user]
    define editor: owner and writer`

    const model = dslToModel(dsl)
    const doc = model.type_definitions[1]!
    expect(doc.relations?.editor?.intersection?.child).toHaveLength(2)
  })

  test('parses a model with difference (but not)', () => {
    const dsl = `model
  schema 1.1

type user

type document
  relations
    define writer: [user]
    define blocked: [user]
    define editor: writer but not blocked`

    const model = dslToModel(dsl)
    const doc = model.type_definitions[1]!
    expect(doc.relations?.editor?.difference).toBeDefined()
    expect(doc.relations?.editor?.difference?.base?.computedUserset?.relation).toBe('writer')
    expect(doc.relations?.editor?.difference?.subtract?.computedUserset?.relation).toBe('blocked')
  })

  test('parses wildcard types', () => {
    const dsl = `model
  schema 1.1

type user

type document
  relations
    define viewer: [user, user:*]`

    const model = dslToModel(dsl)
    const doc = model.type_definitions[1]!
    const types = doc.metadata?.relations?.viewer?.directly_related_user_types
    expect(types).toHaveLength(2)
    expect(types?.[0]).toEqual({ type: 'user' })
    expect(types?.[1]?.wildcard).toBeDefined()
  })

  test('parses relation references (#member)', () => {
    const dsl = `model
  schema 1.1

type user

type group
  relations
    define member: [user]

type document
  relations
    define viewer: [user, group#member]`

    const model = dslToModel(dsl)
    const doc = model.type_definitions[2]!
    const types = doc.metadata?.relations?.viewer?.directly_related_user_types
    expect(types).toHaveLength(2)
    expect(types?.[1]).toEqual({ type: 'group', relation: 'member' })
  })

  test('skips comments', () => {
    const dsl = `model
  schema 1.1

# This is a comment
type user`

    const model = dslToModel(dsl)
    expect(model.type_definitions).toHaveLength(1)
    expect(model.type_definitions[0]!.type).toBe('user')
  })

  test('roundtrip: modelToDsl then dslToModel', () => {
    const original: AuthorizationModel = {
      id: 'model-1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'document',
          relations: {
            owner: { this: {} },
          },
          metadata: {
            relations: {
              owner: {
                directly_related_user_types: [{ type: 'user' }],
              },
            },
          },
        },
      ],
    }

    const dsl = modelToDsl(original)
    const parsed = dslToModel(dsl)

    expect(parsed.schema_version).toBe('1.1')
    expect(parsed.type_definitions).toHaveLength(2)
    expect(parsed.type_definitions[0]!.type).toBe('user')
    expect(parsed.type_definitions[1]!.type).toBe('document')
    expect(parsed.type_definitions[1]!.relations?.owner?.this).toBeDefined()
  })
})
