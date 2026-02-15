import type { AuthConfig } from './openfga/types.ts'
import { join } from 'path'
import { homedir } from 'os'
import { mkdirSync, existsSync } from 'fs'

export interface TuiConfig {
  serverUrl?: string
  auth?: AuthConfig
  lastStoreId?: string
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
  playground?: boolean
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
      case '--playground':
        args.playground = true
        break
    }
  }

  return args
}

export function mergeConfigWithCliArgs(config: TuiConfig, args: CliArgs): TuiConfig {
  const merged = { ...config }

  if (args.serverUrl) {
    merged.serverUrl = args.serverUrl
  }

  if (args.apiKey) {
    merged.auth = { type: 'api-key', apiKey: args.apiKey }
  }

  return merged
}
