import { useReducer, useState, useCallback, useRef } from 'react'
import { useKeyboard } from '@opentui/react'
import { Header } from './components/header.tsx'
import { StatusBar } from './components/status-bar.tsx'
import { ConnectView } from './views/connect.tsx'
import { StoresView } from './views/stores.tsx'
import { StoreOverview } from './views/store-overview.tsx'
import { ModelViewer } from './views/model-viewer.tsx'
import { TuplesView } from './views/tuples.tsx'
import { QueriesView } from './views/queries.tsx'
import { OpenFGAClient } from './lib/openfga/client.ts'
import { PlaygroundClient } from './lib/playground.ts'
import { navigationReducer, type View } from './lib/navigation.ts'
import type { ConnectionConfig } from './lib/openfga/types.ts'

interface AppProps {
  initialPlayground?: boolean
  initialConfig?: ConnectionConfig
}

export function App({ initialPlayground, initialConfig }: AppProps) {
  const [view, dispatch] = useReducer(
    navigationReducer,
    initialPlayground || initialConfig
      ? { kind: 'stores' } as View
      : { kind: 'connect' } as View
  )
  const [connected, setConnected] = useState(!!initialConfig)
  const [playgroundMode, setPlaygroundMode] = useState(!!initialPlayground)
  const [serverUrl, setServerUrl] = useState<string | undefined>(initialConfig?.serverUrl)
  const [storeName, setStoreName] = useState<string | undefined>(undefined)

  const clientRef = useRef<OpenFGAClient | PlaygroundClient>(
    initialPlayground
      ? new PlaygroundClient()
      : initialConfig
        ? new OpenFGAClient(initialConfig)
        : null as any
  )

  const handleConnect = useCallback((config: ConnectionConfig) => {
    clientRef.current = new OpenFGAClient(config)
    setConnected(true)
    setPlaygroundMode(false)
    setServerUrl(config.serverUrl)
    dispatch({ type: 'navigate', view: { kind: 'stores' } })
  }, [])

  const handlePlayground = useCallback(() => {
    clientRef.current = new PlaygroundClient()
    setConnected(false)
    setPlaygroundMode(true)
    setServerUrl(undefined)
    dispatch({ type: 'navigate', view: { kind: 'stores' } })
  }, [])

  useKeyboard(useCallback((key: { name: string }) => {
    if (key.name === 'escape') {
      if (view.kind !== 'connect') {
        dispatch({ type: 'back' })
      }
    }
  }, [view.kind]))

  return (
    <box flexDirection="column" width="100%" height="100%">
      <Header
        view={view}
        connected={connected}
        playgroundMode={playgroundMode}
      />
      <box flexGrow={1} flexDirection="column" padding={1}>
        <ViewContent
          view={view}
          dispatch={dispatch}
          client={clientRef.current}
          serverUrl={serverUrl}
          onConnect={handleConnect}
          onPlayground={handlePlayground}
          setStoreName={setStoreName}
        />
      </box>
      <StatusBar
        view={view}
        serverUrl={serverUrl}
        storeName={storeName}
        playgroundMode={playgroundMode}
      />
    </box>
  )
}

interface ViewContentProps {
  view: View
  dispatch: React.Dispatch<any>
  client: OpenFGAClient | PlaygroundClient
  serverUrl?: string
  onConnect: (config: ConnectionConfig) => void
  onPlayground: () => void
  setStoreName: (v: string | undefined) => void
}

function ViewContent({ view, dispatch, client, serverUrl, onConnect, onPlayground, setStoreName }: ViewContentProps) {
  switch (view.kind) {
    case 'connect':
      return (
        <ConnectView
          onConnect={onConnect}
          onPlayground={onPlayground}
          initialServerUrl={serverUrl}
        />
      )
    case 'stores':
      return (
        <StoresView
          client={client as any}
          onSelectStore={(storeId, name) => {
            setStoreName(name)
            dispatch({ type: 'navigate', view: { kind: 'store-overview', storeId } })
          }}
        />
      )
    case 'store-overview':
      return (
        <StoreOverview
          client={client as any}
          storeId={view.storeId}
          onNavigate={(target) => {
            dispatch({ type: 'navigate', view: { kind: target, storeId: view.storeId } })
          }}
        />
      )
    case 'model':
      return <ModelViewer client={client as any} storeId={view.storeId} />
    case 'tuples':
      return <TuplesView client={client as any} storeId={view.storeId} />
    case 'queries':
      return <QueriesView client={client as any} storeId={view.storeId} />
    default:
      return <text>Unknown view</text>
  }
}
