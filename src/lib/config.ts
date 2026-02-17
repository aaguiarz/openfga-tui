import type { AuthConfig, ConnectionConfig } from './openfga/types.ts'
import { join } from 'path'
import { homedir } from 'os'
import { mkdirSync, existsSync } from 'fs'

export interface SavedConnection {
  name: string
  serverUrl: string
  auth: AuthConfig
  storeId?: string
}

export interface TuiConfig {
  connections?: SavedConnection[]
}

const CONFIG_DIR = join(homedir(), '.config', 'openfga-tui')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

export function getConfigDir(): string {
  return CONFIG_DIR
}

export function getConfigPath(): string {
  return CONFIG_PATH
}

export async function loadConfig(): Promise<TuiConfig> {
  try {
    const file = Bun.file(CONFIG_PATH)
    if (!await file.exists()) {
      return {}
    }
    const text = await file.text()
    return JSON.parse(text) as TuiConfig
  } catch {
    return {}
  }
}

export async function saveConfig(config: TuiConfig): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2))
}

export interface CliArgs {
  serverUrl?: string
  apiKey?: string
  connection?: string
}

export function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--server-url':
        args.serverUrl = argv[++i]
        break
      case '--api-key':
        args.apiKey = argv[++i]
        break
      case '--connection':
        args.connection = argv[++i]
        break
    }
  }

  return args
}

// --- Saved connections management ---

export async function loadSavedConnections(): Promise<SavedConnection[]> {
  const config = await loadConfig()
  return config.connections || []
}

export async function saveConnection(conn: SavedConnection): Promise<void> {
  const config = await loadConfig()
  const connections = config.connections || []
  const idx = connections.findIndex(c => c.name === conn.name)
  if (idx >= 0) {
    connections[idx] = conn
  } else {
    connections.push(conn)
  }
  config.connections = connections
  await saveConfig(config)
}

export async function deleteConnection(name: string): Promise<void> {
  const config = await loadConfig()
  config.connections = (config.connections || []).filter(c => c.name !== name)
  await saveConfig(config)
}

export function connectionToConfig(conn: SavedConnection): ConnectionConfig {
  return { serverUrl: conn.serverUrl, auth: conn.auth, ...(conn.storeId ? { storeId: conn.storeId } : {}) }
}
