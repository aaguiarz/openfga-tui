import { useReducer, useState, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { Header } from './components/header.tsx'
import { StatusBar } from './components/status-bar.tsx'
import { navigationReducer, type View } from './lib/navigation.ts'

export function App() {
  const [view, dispatch] = useReducer(navigationReducer, { kind: 'connect' } as View)
  const [connected, setConnected] = useState(false)
  const [playgroundMode, setPlaygroundMode] = useState(false)
  const [serverUrl, setServerUrl] = useState<string | undefined>(undefined)
  const [storeName, setStoreName] = useState<string | undefined>(undefined)

  useKeyboard(useCallback((key: { name: string }) => {
    if (key.name === 'escape') {
      dispatch({ type: 'back' })
    }
  }, []))

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
          setConnected={setConnected}
          setPlaygroundMode={setPlaygroundMode}
          setServerUrl={setServerUrl}
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
  setConnected: (v: boolean) => void
  setPlaygroundMode: (v: boolean) => void
  setServerUrl: (v: string | undefined) => void
  setStoreName: (v: string | undefined) => void
}

function ViewContent({ view, dispatch }: ViewContentProps) {
  switch (view.kind) {
    case 'connect':
      return <text fg="#888888">Connection form (Step 4)</text>
    case 'stores':
      return <text fg="#888888">Store list (Step 5)</text>
    case 'store-overview':
      return <text fg="#888888">Store overview for {view.storeId} (Step 6)</text>
    case 'model':
      return <text fg="#888888">Model viewer for {view.storeId} (Step 8)</text>
    case 'tuples':
      return <text fg="#888888">Tuples for {view.storeId} (Step 9)</text>
    case 'queries':
      return <text fg="#888888">Queries for {view.storeId} (Step 10)</text>
    default:
      return <text>Unknown view</text>
  }
}
