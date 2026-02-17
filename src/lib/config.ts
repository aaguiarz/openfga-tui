import type { AuthConfig, ConnectionConfig } from './openfga/types.ts'
import { join } from 'path'
import { homedir } from 'os'
import { chmodSync, existsSync, mkdirSync } from 'fs'

export interface SavedConnection {
  name: string
  serverUrl: string
  auth: AuthConfig
  storeId?: string
}

export interface TuiConfig {
  connections?: SavedConnection[]
}

const DEFAULT_CONFIG_DIR = join(homedir(), '.config', 'openfga-tui')
const CONFIG_FILE_NAME = 'config.json'

export const CONFIG_DIR_MODE = 0o700
export const CONFIG_FILE_MODE = 0o600

function resolveConfigDir(): string {
  return process.env.OPENFGA_TUI_CONFIG_DIR?.trim() || DEFAULT_CONFIG_DIR
}

export function getConfigDir(): string {
  return resolveConfigDir()
}

export function getConfigPath(): string {
  return join(resolveConfigDir(), CONFIG_FILE_NAME)
}

export async function loadConfig(): Promise<TuiConfig> {
  const configPath = getConfigPath()
  const file = Bun.file(configPath)

  if (!(await file.exists())) {
    return {}
  }

  const text = await file.text()
  if (!text.trim()) {
    return {}
  }

  try {
    return JSON.parse(text) as TuiConfig
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown parse error'
    throw new Error(`Failed to parse config file at ${configPath}: ${message}`)
  }
}

export async function saveConfig(config: TuiConfig): Promise<void> {
  const configDir = getConfigDir()
  const configPath = getConfigPath()

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: CONFIG_DIR_MODE })
  }

  // Ensure existing dirs/files are not left with lax permissions.
  chmodSync(configDir, CONFIG_DIR_MODE)
  await Bun.write(configPath, JSON.stringify(config, null, 2))
  chmodSync(configPath, CONFIG_FILE_MODE)
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
