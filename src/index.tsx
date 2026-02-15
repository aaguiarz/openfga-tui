import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./app.tsx"
import { parseCliArgs, loadConfig, mergeConfigWithCliArgs } from "./lib/config.ts"
import type { ConnectionConfig } from "./lib/openfga/types.ts"

const args = parseCliArgs(process.argv.slice(2))

// Load saved config and merge with CLI args
const savedConfig = await loadConfig()
const config = mergeConfigWithCliArgs(savedConfig, args)

// Determine initial state
let initialConfig: ConnectionConfig | undefined
let initialPlayground = args.playground || false

if (!initialPlayground && config.serverUrl) {
  initialConfig = {
    serverUrl: config.serverUrl,
    auth: config.auth || { type: 'none' },
  }
}

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  useAlternateScreen: true,
})

createRoot(renderer).render(
  <App
    initialPlayground={initialPlayground}
    initialConfig={initialConfig}
  />
)
