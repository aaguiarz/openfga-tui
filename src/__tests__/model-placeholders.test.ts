import { describe, expect, test } from 'bun:test'
import { getModelPlaceholders } from '../lib/model-placeholders.ts'
import type { AuthorizationModel } from '../lib/openfga/types.ts'

const DEFAULTS = {
  user: 'user:anne',
  relation: 'reader',
  object: 'document:budget',
  objectType: 'document',
  objectId: 'budget',
  userType: 'user',
}

describe('getModelPlaceholders', () => {
  test('returns defaults when model is undefined', () => {
    expect(getModelPlaceholders(undefined)).toEqual(DEFAULTS)
  })

  test('returns defaults when model has no type definitions', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [],
    }
    expect(getModelPlaceholders(model)).toEqual(DEFAULTS)
  })

  test('returns defaults when no types have direct relations', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        { type: 'team', relations: { member: { this: {} } } },
      ],
    }
    expect(getModelPlaceholders(model)).toEqual(DEFAULTS)
  })

  test('extracts placeholders from model with document owner relation', () => {
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
              owner: {
                directly_related_user_types: [{ type: 'user' }],
              },
            },
          },
        },
      ],
    }
    const ph = getModelPlaceholders(model)
    expect(ph.user).toBe('user:anne')
    expect(ph.relation).toBe('owner')
    expect(ph.object).toBe('document:example')
    expect(ph.objectType).toBe('document')
    expect(ph.objectId).toBe('example')
    expect(ph.userType).toBe('user')
  })

  test('uses first concrete user type, skipping wildcards', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        { type: 'employee' },
        {
          type: 'folder',
          relations: { viewer: { this: {} } },
          metadata: {
            relations: {
              viewer: {
                directly_related_user_types: [
                  { type: 'user', wildcard: {} },
                  { type: 'employee' },
                ],
              },
            },
          },
        },
      ],
    }
    const ph = getModelPlaceholders(model)
    expect(ph.user).toBe('employee:anne')
    expect(ph.relation).toBe('viewer')
    expect(ph.object).toBe('folder:example')
    expect(ph.userType).toBe('employee')
  })

  test('skips userset references (type#relation)', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        { type: 'group' },
        {
          type: 'doc',
          relations: { editor: { this: {} } },
          metadata: {
            relations: {
              editor: {
                directly_related_user_types: [
                  { type: 'group', relation: 'member' },
                  { type: 'user' },
                ],
              },
            },
          },
        },
      ],
    }
    const ph = getModelPlaceholders(model)
    expect(ph.user).toBe('user:anne')
    expect(ph.relation).toBe('editor')
    expect(ph.object).toBe('doc:example')
  })

  test('picks first type with direct relations', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'org',
          relations: { admin: { this: {} } },
          metadata: {
            relations: {
              admin: {
                directly_related_user_types: [{ type: 'user' }],
              },
            },
          },
        },
        {
          type: 'repo',
          relations: { maintainer: { this: {} } },
          metadata: {
            relations: {
              maintainer: {
                directly_related_user_types: [{ type: 'user' }],
              },
            },
          },
        },
      ],
    }
    const ph = getModelPlaceholders(model)
    expect(ph.relation).toBe('admin')
    expect(ph.objectType).toBe('org')
  })

  test('returns defaults when only wildcard user types exist', () => {
    const model: AuthorizationModel = {
      id: 'm1',
      schema_version: '1.1',
      type_definitions: [
        { type: 'user' },
        {
          type: 'resource',
          relations: { public: { this: {} } },
          metadata: {
            relations: {
              public: {
                directly_related_user_types: [
                  { type: 'user', wildcard: {} },
                ],
              },
            },
          },
        },
      ],
    }
    expect(getModelPlaceholders(model)).toEqual(DEFAULTS)
  })
})
