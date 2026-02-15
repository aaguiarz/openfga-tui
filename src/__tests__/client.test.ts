import { describe, expect, test, mock, beforeEach } from 'bun:test'
import { OpenFGAClient, clearTokenCache } from '../lib/openfga/client.ts'
import type { ConnectionConfig } from '../lib/openfga/types.ts'

// Mock fetch globally
const originalFetch = globalThis.fetch

function mockFetch(responseBody: unknown, status = 200) {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify(responseBody), {
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  ) as any
}

function mockFetch204() {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(null, {
        status: 204,
        statusText: 'No Content',
      })
    )
  ) as any
}

function mockFetchError(status: number, errorBody: unknown) {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify(errorBody), {
        status,
        statusText: 'Error',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  ) as any
}

const testConfig: ConnectionConfig = {
  serverUrl: 'http://localhost:8080',
  auth: { type: 'none' },
}

beforeEach(() => {
  globalThis.fetch = originalFetch
  clearTokenCache()
})

describe('OpenFGAClient', () => {
  test('constructor sets config', () => {
    const client = new OpenFGAClient(testConfig)
    expect(client).toBeDefined()
  })

  test('listStores calls GET /stores', async () => {
    const responseData = { stores: [{ id: 's1', name: 'test' }] }
    mockFetch(responseData)

    const client = new OpenFGAClient(testConfig)
    const result = await client.listStores()

    expect(result).toEqual(responseData)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)

    const [url, options] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('http://localhost:8080/stores')
    expect(options.method).toBe('GET')
  })

  test('listStores with pagination params', async () => {
    mockFetch({ stores: [] })

    const client = new OpenFGAClient(testConfig)
    await client.listStores(10, 'token123')

    const [url] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toContain('page_size=10')
    expect(url).toContain('continuation_token=token123')
  })

  test('createStore calls POST /stores', async () => {
    const store = { id: 's1', name: 'my-store', created_at: '', updated_at: '' }
    mockFetch(store)

    const client = new OpenFGAClient(testConfig)
    const result = await client.createStore({ name: 'my-store' })

    expect(result).toEqual(store)
    const [, options] = (globalThis.fetch as any).mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ name: 'my-store' })
  })

  test('deleteStore calls DELETE /stores/{id}', async () => {
    mockFetch204()

    const client = new OpenFGAClient(testConfig)
    await client.deleteStore('s1')

    const [url, options] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('http://localhost:8080/stores/s1')
    expect(options.method).toBe('DELETE')
  })

  test('check calls POST /stores/{id}/check', async () => {
    mockFetch({ allowed: true })

    const client = new OpenFGAClient(testConfig)
    const result = await client.check('s1', {
      tuple_key: { user: 'user:anne', relation: 'reader', object: 'document:budget' },
    })

    expect(result.allowed).toBe(true)
    const [url, options] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('http://localhost:8080/stores/s1/check')
    expect(options.method).toBe('POST')
  })

  test('handles API errors', async () => {
    mockFetchError(400, { code: 'validation_error', message: 'Invalid request' })

    const client = new OpenFGAClient(testConfig)
    await expect(client.listStores()).rejects.toThrow('Invalid request')
  })

  test('testConnection returns true on success', async () => {
    mockFetch({ stores: [] })

    const client = new OpenFGAClient(testConfig)
    const result = await client.testConnection()
    expect(result).toBe(true)
  })

  test('testConnection returns false on failure', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('Network error'))) as any

    const client = new OpenFGAClient(testConfig)
    const result = await client.testConnection()
    expect(result).toBe(false)
  })

  test('uses API key auth header', async () => {
    mockFetch({ stores: [] })

    const config: ConnectionConfig = {
      serverUrl: 'http://localhost:8080',
      auth: { type: 'api-key', apiKey: 'my-secret-key' },
    }

    const client = new OpenFGAClient(config)
    await client.listStores()

    const [, options] = (globalThis.fetch as any).mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer my-secret-key')
  })

  test('read calls POST /stores/{id}/read', async () => {
    mockFetch({ tuples: [], continuation_token: '' })

    const client = new OpenFGAClient(testConfig)
    await client.read('s1', { page_size: 50 })

    const [url, options] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('http://localhost:8080/stores/s1/read')
    expect(options.method).toBe('POST')
  })

  test('write calls POST /stores/{id}/write', async () => {
    mockFetch204()

    const client = new OpenFGAClient(testConfig)
    await client.write('s1', {
      writes: {
        tuple_keys: [{ user: 'user:anne', relation: 'reader', object: 'doc:1' }],
      },
    })

    const [url, options] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('http://localhost:8080/stores/s1/write')
    expect(options.method).toBe('POST')
  })

  test('expand calls POST /stores/{id}/expand', async () => {
    mockFetch({ tree: { root: {} } })

    const client = new OpenFGAClient(testConfig)
    await client.expand('s1', {
      tuple_key: { relation: 'reader', object: 'document:budget' },
    })

    const [url] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('http://localhost:8080/stores/s1/expand')
  })

  test('listObjects calls POST /stores/{id}/list-objects', async () => {
    mockFetch({ objects: ['document:1', 'document:2'] })

    const client = new OpenFGAClient(testConfig)
    const result = await client.listObjects('s1', {
      type: 'document',
      relation: 'reader',
      user: 'user:anne',
    })

    expect(result.objects).toEqual(['document:1', 'document:2'])
    const [url] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('http://localhost:8080/stores/s1/list-objects')
  })

  test('listUsers calls POST /stores/{id}/list-users', async () => {
    mockFetch({ users: [] })

    const client = new OpenFGAClient(testConfig)
    await client.listUsers('s1', {
      object: { type: 'document', id: '1' },
      relation: 'reader',
      user_filters: [{ type: 'user' }],
    })

    const [url] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('http://localhost:8080/stores/s1/list-users')
  })
})
