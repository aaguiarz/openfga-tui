import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { join } from 'path'
import { mkdirSync, rmSync, existsSync } from 'fs'
import {
  parseCliArgs,
  connectionToConfig,
  type TuiConfig,
  type SavedConnection,
} from '../lib/config.ts'

describe('parseCliArgs', () => {
  test('parses --server-url', () => {
    const args = parseCliArgs(['--server-url', 'http://localhost:8080'])
    expect(args.serverUrl).toBe('http://localhost:8080')
  })

  test('parses --api-key', () => {
    const args = parseCliArgs(['--api-key', 'my-secret'])
    expect(args.apiKey).toBe('my-secret')
  })

  test('parses --connection', () => {
    const args = parseCliArgs(['--connection', 'my-server'])
    expect(args.connection).toBe('my-server')
  })

  test('parses multiple args', () => {
    const args = parseCliArgs([
      '--server-url', 'http://localhost:8080',
      '--api-key', 'my-secret',
    ])
    expect(args.serverUrl).toBe('http://localhost:8080')
    expect(args.apiKey).toBe('my-secret')
  })

  test('returns empty object for no args', () => {
    const args = parseCliArgs([])
    expect(args.serverUrl).toBeUndefined()
    expect(args.apiKey).toBeUndefined()
    expect(args.connection).toBeUndefined()
  })

  test('ignores unknown args', () => {
    const args = parseCliArgs(['--unknown', 'value'])
    expect(args.serverUrl).toBeUndefined()
  })
})

describe('config file format', () => {
  const testDir = join('/tmp/claude', 'openfga-tui-test-config')
  const testConfigPath = join(testDir, 'config.json')

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
  })

  test('empty config is valid', () => {
    const config: TuiConfig = {}
    expect(config).toEqual({})
  })

  test('config with connections roundtrips correctly', async () => {
    const config: TuiConfig = {
      connections: [
        { name: 'local', serverUrl: 'http://localhost:8080', auth: { type: 'none' } },
        { name: 'prod', serverUrl: 'https://fga.example.com', auth: { type: 'api-key', apiKey: 'key123' } },
      ],
    }

    mkdirSync(testDir, { recursive: true })
    await Bun.write(testConfigPath, JSON.stringify(config, null, 2))

    const readBack = JSON.parse(await Bun.file(testConfigPath).text())
    expect(readBack.connections).toHaveLength(2)
    expect(readBack.connections[0].name).toBe('local')
    expect(readBack.connections[1].name).toBe('prod')
    expect(readBack.connections[1].auth).toEqual({ type: 'api-key', apiKey: 'key123' })
  })

  test('config JSON format is human-readable (2-space indent)', async () => {
    const config: TuiConfig = {
      connections: [
        { name: 'local', serverUrl: 'http://localhost:8080', auth: { type: 'none' } },
      ],
    }

    mkdirSync(testDir, { recursive: true })
    await Bun.write(testConfigPath, JSON.stringify(config, null, 2))

    const text = await Bun.file(testConfigPath).text()
    expect(text).toContain('  "connections"')
  })

  test('config with storeId roundtrips correctly', async () => {
    const config: TuiConfig = {
      connections: [
        { name: 'cloud', serverUrl: 'https://api.fga.dev', storeId: 'store-123', auth: { type: 'oidc', clientId: 'cid', clientSecret: 'cs', tokenUrl: 'https://auth/token' } },
      ],
    }

    mkdirSync(testDir, { recursive: true })
    await Bun.write(testConfigPath, JSON.stringify(config, null, 2))

    const readBack = JSON.parse(await Bun.file(testConfigPath).text())
    expect(readBack.connections[0].storeId).toBe('store-123')
  })
})

describe('connectionToConfig', () => {
  test('converts SavedConnection to ConnectionConfig', () => {
    const saved: SavedConnection = {
      name: 'local',
      serverUrl: 'http://localhost:8080',
      auth: { type: 'none' },
    }
    const config = connectionToConfig(saved)
    expect(config).toEqual({
      serverUrl: 'http://localhost:8080',
      auth: { type: 'none' },
    })
  })

  test('preserves api-key auth in conversion', () => {
    const saved: SavedConnection = {
      name: 'staging',
      serverUrl: 'https://staging.example.com',
      auth: { type: 'api-key', apiKey: 'my-key' },
    }
    const config = connectionToConfig(saved)
    expect(config.serverUrl).toBe('https://staging.example.com')
    expect(config.auth).toEqual({ type: 'api-key', apiKey: 'my-key' })
  })

  test('preserves oidc auth in conversion', () => {
    const saved: SavedConnection = {
      name: 'prod',
      serverUrl: 'https://prod.example.com',
      auth: { type: 'oidc', clientId: 'cid', clientSecret: 'csecret', tokenUrl: 'https://auth.example.com/token' },
    }
    const config = connectionToConfig(saved)
    expect(config.auth).toEqual({
      type: 'oidc',
      clientId: 'cid',
      clientSecret: 'csecret',
      tokenUrl: 'https://auth.example.com/token',
    })
  })

  test('preserves storeId in conversion', () => {
    const saved: SavedConnection = {
      name: 'cloud',
      serverUrl: 'https://api.fga.dev',
      auth: { type: 'none' },
      storeId: 'store-abc',
    }
    const config = connectionToConfig(saved)
    expect(config.storeId).toBe('store-abc')
  })

  test('does not include name in ConnectionConfig', () => {
    const saved: SavedConnection = {
      name: 'test',
      serverUrl: 'http://test:8080',
      auth: { type: 'none' },
    }
    const config = connectionToConfig(saved)
    expect((config as any).name).toBeUndefined()
  })
})
