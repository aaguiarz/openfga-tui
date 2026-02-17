import { useReducer, useState, useCallback, useRef } from 'react'
import { useKeyboard } from '@opentui/react'
import { Header } from './components/header.tsx'
import { StatusBar } from './components/status-bar.tsx'
import { KeybindHelp } from './components/keybind-help.tsx'
import { ConnectView } from './views/connect.tsx'
import { StoresView } from './views/stores.tsx'
import { StoreOverview } from './views/store-overview.tsx'
import { ModelViewer } from './views/model-viewer.tsx'
import { TuplesView } from './views/tuples.tsx'
import { QueriesView } from './views/queries.tsx'
import { OpenFGAClient } from './lib/openfga/client.ts'
import { navigationReducer, type NavigationAction, type View } from './lib/navigation.ts'
import type { ConnectionConfig } from './lib/openfga/types.ts'
import type { SavedConnection } from './lib/config.ts'
import { handleAppKey } from './lib/app-keyboard.ts'

interface AppProps {
  initialConfig?: ConnectionConfig
  savedConnections?: SavedConnection[]
  configError?: string
  onQuit: () => void
}

export function App({ initialConfig, savedConnections, configError, onQuit }: AppProps) {
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
  const [showKeybindHelp, setShowKeybindHelp] = useState(false)
  // Counter to force re-mount of view components on navigation
  const [viewKey, setViewKey] = useState(0)

  const clientRef = useRef<OpenFGAClient | null>(
    initialConfig
      ? new OpenFGAClient(initialConfig)
      : null
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

  const handleBack = useCallback(() => {
    dispatch({ type: 'back' })
    setViewKey(k => k + 1)
  }, [])

  useKeyboard(useCallback((key: { name: string }) => {
    const result = handleAppKey({
      keyName: key.name,
      helpVisible: showKeybindHelp,
      viewKind: view.kind,
    })

    if (result.helpVisible !== showKeybindHelp) {
      setShowKeybindHelp(result.helpVisible)
    }

    if (result.shouldGoBack) {
      handleBack()
    }
  }, [view.kind, handleBack, showKeybindHelp]))

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
          configError={configError}
          scopedStoreId={scopedStoreId}
          onQuit={onQuit}
        />
      </box>
      {showKeybindHelp && (
        <KeybindHelp view={view} onDismiss={() => setShowKeybindHelp(false)} />
      )}
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
  dispatch: React.Dispatch<NavigationAction>
  client: OpenFGAClient | null
  serverUrl?: string
  onConnect: (config: ConnectionConfig) => void
  onBack: () => void
  setStoreName: (v: string | undefined) => void
  savedConnections?: SavedConnection[]
  configError?: string
  scopedStoreId?: string
  onQuit: () => void
}

function ViewContent({
  view,
  dispatch,
  client,
  serverUrl,
  onConnect,
  onBack,
  setStoreName,
  savedConnections,
  configError,
  scopedStoreId,
  onQuit,
}: ViewContentProps) {
  switch (view.kind) {
    case 'connect':
      return (
        <ConnectView
          onConnect={onConnect}
          initialServerUrl={serverUrl}
          savedConnections={savedConnections}
          configError={configError}
          onQuit={onQuit}
        />
      )
    case 'stores':
      if (!client) return <text fg="#ef4444">Not connected</text>
      return (
        <StoresView
          client={client}
          scopedStoreId={scopedStoreId}
          onSelectStore={(storeId, name) => {
            setStoreName(name)
            dispatch({ type: 'navigate', view: { kind: 'store-overview', storeId } })
          }}
        />
      )
    case 'store-overview':
      if (!client) return <text fg="#ef4444">Not connected</text>
      return (
        <StoreOverview
          client={client}
          storeId={view.storeId}
          onNavigate={(target) => {
            dispatch({ type: 'navigate', view: { kind: target, storeId: view.storeId } })
          }}
        />
      )
    case 'model':
      if (!client) return <text fg="#ef4444">Not connected</text>
      return <ModelViewer client={client} storeId={view.storeId} />
    case 'tuples':
      if (!client) return <text fg="#ef4444">Not connected</text>
      return <TuplesView client={client} storeId={view.storeId} onBack={onBack} />
    case 'queries':
      if (!client) return <text fg="#ef4444">Not connected</text>
      return <QueriesView client={client} storeId={view.storeId} onBack={onBack} />
    default:
      return <text>Unknown view</text>
  }
}
