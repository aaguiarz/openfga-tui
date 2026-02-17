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
import { navigationReducer, type View } from './lib/navigation.ts'
import type { ConnectionConfig } from './lib/openfga/types.ts'
import type { SavedConnection } from './lib/config.ts'

interface AppProps {
  initialConfig?: ConnectionConfig
  savedConnections?: SavedConnection[]
  onQuit: () => void
}

export function App({ initialConfig, savedConnections, onQuit }: AppProps) {
  const [view, dispatch] = useReducer(
    navigationReducer,
    initialConfig
      ? { kind: 'stores' } as View
      : { kind: 'connect' } as View
  )
  const [connected, setConnected] = useState(!!initialConfig)
  const [serverUrl, setServerUrl] = useState<string | undefined>(initialConfig?.serverUrl)
  const [storeName, setStoreName] = useState<string | undefined>(undefined)
  const [scopedStoreId, setScopedStoreId] = useState<string | undefined>(initialConfig?.storeId)
  // Counter to force re-mount of view components on navigation
  const [viewKey, setViewKey] = useState(0)

  const clientRef = useRef<OpenFGAClient>(
    initialConfig
      ? new OpenFGAClient(initialConfig)
      : null as any
  )

  const handleConnect = useCallback((config: ConnectionConfig) => {
    clientRef.current = new OpenFGAClient(config)
    setConnected(true)
    setServerUrl(config.serverUrl)
    setScopedStoreId(config.storeId)
    if (config.storeId) {
      dispatch({ type: 'navigate', view: { kind: 'store-overview', storeId: config.storeId } })
    } else {
      dispatch({ type: 'navigate', view: { kind: 'stores' } })
    }
    setViewKey(k => k + 1)
  }, [])

  // Let views with modal states (adding, filtering) handle Escape themselves
  // via the onBack callback. Only handle Escape at App level for views
  // that don't have their own Escape handling.
  const handleBack = useCallback(() => {
    dispatch({ type: 'back' })
    setViewKey(k => k + 1)
  }, [])

  useKeyboard(useCallback((key: { name: string }) => {
    if (key.name === 'escape') {
      // Views that handle Escape internally (tuples, stores, queries)
      // will call onBack themselves - don't double-handle here.
      // Only handle Escape for views without their own Escape handling.
      if (view.kind === 'store-overview' || view.kind === 'model') {
        handleBack()
      }
    }
  }, [view.kind, handleBack]))

  return (
    <box flexDirection="column" width="100%" height="100%">
      <Header
        view={view}
        connected={connected}
        storeName={storeName}
      />
      <box flexGrow={1} flexDirection="column" padding={1}>
        <ViewContent
          key={viewKey}
          view={view}
          dispatch={dispatch}
          client={clientRef.current}
          serverUrl={serverUrl}
          onConnect={handleConnect}
          onBack={handleBack}
          setStoreName={setStoreName}
          savedConnections={savedConnections}
          scopedStoreId={scopedStoreId}
          onQuit={onQuit}
        />
      </box>
      <StatusBar
        view={view}
        serverUrl={serverUrl}
        storeName={storeName}
      />
    </box>
  )
}

interface ViewContentProps {
  view: View
  dispatch: React.Dispatch<any>
  client: OpenFGAClient
  serverUrl?: string
  onConnect: (config: ConnectionConfig) => void
  onBack: () => void
  setStoreName: (v: string | undefined) => void
  savedConnections?: SavedConnection[]
  scopedStoreId?: string
  onQuit: () => void
}

function ViewContent({ view, dispatch, client, serverUrl, onConnect, onBack, setStoreName, savedConnections, scopedStoreId, onQuit }: ViewContentProps) {
  switch (view.kind) {
    case 'connect':
      return (
        <ConnectView
          onConnect={onConnect}
          initialServerUrl={serverUrl}
          savedConnections={savedConnections}
          onQuit={onQuit}
        />
      )
    case 'stores':
      return (
        <StoresView
          client={client as any}
          scopedStoreId={scopedStoreId}
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
      return <TuplesView client={client as any} storeId={view.storeId} onBack={onBack} />
    case 'queries':
      return <QueriesView client={client as any} storeId={view.storeId} onBack={onBack} />
    default:
      return <text>Unknown view</text>
  }
}
