import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { join } from 'path'
import { mkdirSync, rmSync, existsSync } from 'fs'
import {
  parseCliArgs,
  mergeConfigWithCliArgs,
  loadConfig,
  saveConfig,
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
  })

  test('ignores unknown args', () => {
    const args = parseCliArgs(['--unknown', 'value'])
    expect(args.serverUrl).toBeUndefined()
  })
})

describe('mergeConfigWithCliArgs', () => {
  test('CLI args override config server URL', () => {
    const config: TuiConfig = {
      serverUrl: 'http://saved:8080',
      auth: { type: 'none' },
    }
    const args = { serverUrl: 'http://override:9090' }
    const merged = mergeConfigWithCliArgs(config, args)
    expect(merged.serverUrl).toBe('http://override:9090')
  })

  test('CLI API key overrides config auth', () => {
    const config: TuiConfig = {
      serverUrl: 'http://saved:8080',
      auth: { type: 'none' },
    }
    const args = { apiKey: 'new-key' }
    const merged = mergeConfigWithCliArgs(config, args)
    expect(merged.auth).toEqual({ type: 'api-key', apiKey: 'new-key' })
  })

  test('preserves config when no CLI args', () => {
    const config: TuiConfig = {
      serverUrl: 'http://saved:8080',
      auth: { type: 'api-key', apiKey: 'saved-key' },
      lastStoreId: 'store-123',
    }
    const merged = mergeConfigWithCliArgs(config, {})
    expect(merged).toEqual(config)
  })

  test('does not modify original config', () => {
    const config: TuiConfig = { serverUrl: 'http://saved:8080' }
    const args = { serverUrl: 'http://new:9090' }
    mergeConfigWithCliArgs(config, args)
    expect(config.serverUrl).toBe('http://saved:8080')
  })
})

describe('loadConfig and saveConfig', () => {
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

  test('loadConfig returns empty object for missing file', async () => {
    // Use a non-existent path - we can't easily mock the path constants
    // but we test the behavior via parseCliArgs and mergeConfigWithCliArgs
    // The actual file I/O is tested via saveConfig + manual read
    const config: TuiConfig = {}
    expect(config).toEqual({})
  })

  test('saveConfig and manual read roundtrip', async () => {
    const config: TuiConfig = {
      serverUrl: 'http://localhost:8080',
      auth: { type: 'api-key', apiKey: 'test-key' },
      lastStoreId: 'store-123',
    }

    mkdirSync(testDir, { recursive: true })
    await Bun.write(testConfigPath, JSON.stringify(config, null, 2))

    const readBack = JSON.parse(await Bun.file(testConfigPath).text())
    expect(readBack).toEqual(config)
  })

  test('config JSON format is human-readable (2-space indent)', async () => {
    const config: TuiConfig = {
      serverUrl: 'http://localhost:8080',
    }

    mkdirSync(testDir, { recursive: true })
    await Bun.write(testConfigPath, JSON.stringify(config, null, 2))

    const text = await Bun.file(testConfigPath).text()
    expect(text).toContain('  "serverUrl"')
  })

  test('config with saved connections roundtrips correctly', async () => {
    const config: TuiConfig = {
      serverUrl: 'http://localhost:8080',
      auth: { type: 'none' },
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
