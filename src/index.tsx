import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./app.tsx"
import { parseCliArgs, loadSavedConnections, connectionToConfig } from "./lib/config.ts"
import type { ConnectionConfig } from "./lib/openfga/types.ts"
import { setupFgaParser } from "./tree-sitter/setup.ts"

// Register tree-sitter-fga parser if WASM is available
await setupFgaParser()

const args = parseCliArgs(process.argv.slice(2))
const savedConnections = await loadSavedConnections()

// Determine initial config from CLI args
let initialConfig: ConnectionConfig | undefined

if (args.connection) {
  // --connection <name>: auto-connect to a saved connection
  const conn = savedConnections.find(c => c.name === args.connection)
  if (conn) {
    initialConfig = connectionToConfig(conn)
  } else {
    console.error(`Connection '${args.connection}' not found. Available: ${savedConnections.map(c => c.name).join(', ') || '(none)'}`)
    process.exit(1)
  }
} else if (args.serverUrl) {
  // --server-url <url>: auto-connect with inline config
  initialConfig = {
    serverUrl: args.serverUrl,
    auth: args.apiKey ? { type: 'api-key', apiKey: args.apiKey } : { type: 'none' },
  }
}

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  useAlternateScreen: true,
})

const handleQuit = () => {
  renderer.destroy()
  process.exit(0)
}

createRoot(renderer).render(
  <App initialConfig={initialConfig} savedConnections={savedConnections} onQuit={handleQuit} />
)
