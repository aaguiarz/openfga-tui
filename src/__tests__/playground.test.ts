import { describe, expect, test, beforeEach } from 'bun:test'
import { PlaygroundClient, PLAYGROUND_STORE, PLAYGROUND_MODEL, PLAYGROUND_TUPLES } from '../lib/playground.ts'

describe('PlaygroundClient', () => {
  let client: PlaygroundClient

  beforeEach(() => {
    client = new PlaygroundClient()
  })

  test('testConnection returns true', async () => {
    expect(await client.testConnection()).toBe(true)
  })

  describe('store operations', () => {
    test('listStores returns playground store', async () => {
      const response = await client.listStores()
      expect(response.stores).toHaveLength(1)
      expect(response.stores[0]!.name).toBe('Playground Store')
    })

    test('createStore adds a new store', async () => {
      const store = await client.createStore({ name: 'test-store' })
      expect(store.name).toBe('test-store')
      const response = await client.listStores()
      expect(response.stores).toHaveLength(2)
    })

    test('getStore returns matching store', async () => {
      const store = await client.getStore(PLAYGROUND_STORE.id)
      expect(store.name).toBe('Playground Store')
    })

    test('getStore throws for unknown ID', async () => {
      await expect(client.getStore('nonexistent')).rejects.toThrow('not found')
    })

    test('deleteStore removes store', async () => {
      await client.deleteStore(PLAYGROUND_STORE.id)
      const response = await client.listStores()
      expect(response.stores).toHaveLength(0)
    })
  })

  describe('model operations', () => {
    test('listAuthorizationModels returns playground model', async () => {
      const response = await client.listAuthorizationModels('any')
      expect(response.authorization_models).toHaveLength(1)
      expect(response.authorization_models[0]!.schema_version).toBe('1.1')
    })

    test('getAuthorizationModel returns matching model', async () => {
      const response = await client.getAuthorizationModel('any', PLAYGROUND_MODEL.id)
      expect(response.authorization_model.type_definitions.length).toBeGreaterThan(0)
    })

    test('writeAuthorizationModel adds a new model', async () => {
      await client.writeAuthorizationModel('any', {
        schema_version: '1.1',
        type_definitions: [{ type: 'user' }],
      })
      const response = await client.listAuthorizationModels('any')
      expect(response.authorization_models).toHaveLength(2)
      // New model is prepended
      expect(response.authorization_models[0]!.type_definitions).toHaveLength(1)
    })
  })

  describe('tuple operations', () => {
    test('read returns all playground tuples', async () => {
      const response = await client.read('any')
      expect(response.tuples.length).toBe(PLAYGROUND_TUPLES.length)
    })

    test('read filters by user', async () => {
      const response = await client.read('any', { tuple_key: { user: 'user:anne' } })
      expect(response.tuples.length).toBeGreaterThan(0)
      for (const t of response.tuples) {
        expect(t.key.user).toBe('user:anne')
      }
    })

    test('read filters by relation', async () => {
      const response = await client.read('any', { tuple_key: { relation: 'owner' } })
      for (const t of response.tuples) {
        expect(t.key.relation).toBe('owner')
      }
    })

    test('read filters by object', async () => {
      const response = await client.read('any', { tuple_key: { object: 'folder:root' } })
      expect(response.tuples.length).toBeGreaterThan(0)
      for (const t of response.tuples) {
        expect(t.key.object).toBe('folder:root')
      }
    })

    test('read respects page_size', async () => {
      const response = await client.read('any', { page_size: 2 })
      expect(response.tuples).toHaveLength(2)
    })

    test('write adds tuples', async () => {
      await client.write('any', {
        writes: {
          tuple_keys: [{ user: 'user:dave', relation: 'reader', object: 'document:new' }],
        },
      })
      const response = await client.read('any')
      expect(response.tuples.length).toBe(PLAYGROUND_TUPLES.length + 1)
      const added = response.tuples.find(t => t.key.user === 'user:dave')
      expect(added).toBeDefined()
    })

    test('write deletes tuples', async () => {
      const before = await client.read('any')
      const toDelete = before.tuples[0]!.key
      await client.write('any', {
        deletes: { tuple_keys: [toDelete] },
      })
      const after = await client.read('any')
      expect(after.tuples.length).toBe(before.tuples.length - 1)
    })
  })

  describe('query operations (limited in playground)', () => {
    test('check returns not-allowed with explanation', async () => {
      const response = await client.check('any', {
        tuple_key: { user: 'user:anne', relation: 'reader', object: 'document:budget' },
      })
      expect(response.allowed).toBe(false)
      expect(response.resolution).toContain('Playground')
    })

    test('expand returns empty', async () => {
      const response = await client.expand('any', {
        tuple_key: { relation: 'reader', object: 'document:budget' },
      })
      expect(response.tree).toBeUndefined()
    })

    test('listObjects returns empty', async () => {
      const response = await client.listObjects('any', {
        type: 'document',
        relation: 'reader',
        user: 'user:anne',
      })
      expect(response.objects).toEqual([])
    })

    test('listUsers returns empty', async () => {
      const response = await client.listUsers('any', {
        object: { type: 'document', id: 'budget' },
        relation: 'reader',
        user_filters: [{ type: 'user' }],
      })
      expect(response.users).toEqual([])
    })
  })
})

describe('Playground sample data', () => {
  test('PLAYGROUND_STORE has required fields', () => {
    expect(PLAYGROUND_STORE.id).toBeDefined()
    expect(PLAYGROUND_STORE.name).toBe('Playground Store')
    expect(PLAYGROUND_STORE.created_at).toBeDefined()
  })

  test('PLAYGROUND_MODEL has type definitions', () => {
    expect(PLAYGROUND_MODEL.type_definitions.length).toBeGreaterThan(0)
    const typeNames = PLAYGROUND_MODEL.type_definitions.map(td => td.type)
    expect(typeNames).toContain('user')
    expect(typeNames).toContain('document')
    expect(typeNames).toContain('folder')
    expect(typeNames).toContain('group')
  })

  test('PLAYGROUND_TUPLES has sample tuples', () => {
    expect(PLAYGROUND_TUPLES.length).toBeGreaterThan(0)
    const users = PLAYGROUND_TUPLES.map(t => t.key.user)
    expect(users).toContain('user:anne')
    expect(users).toContain('user:bob')
  })
})
