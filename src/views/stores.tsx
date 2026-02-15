import { useReducer, useEffect, useCallback, useState } from 'react'
import { useKeyboard } from '@opentui/react'
import { Spinner } from '../components/spinner.tsx'
import { Confirm } from '../components/confirm.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import { storeListReducer, getSelectedStore, formatStoreDate, type StoreListState } from '../lib/store-list.ts'

interface StoresViewProps {
  client: OpenFGAClient
  onSelectStore: (storeId: string, storeName: string) => void
}

export function StoresView({ client, onSelectStore }: StoresViewProps) {
  const [state, dispatch] = useReducer(storeListReducer, { status: 'loading' } as StoreListState)
  const [createName, setCreateName] = useState('')

  const fetchStores = useCallback(async () => {
    dispatch({ type: 'load' })
    try {
      const response = await client.listStores()
      dispatch({ type: 'loaded', stores: response.stores || [] })
    } catch (err: any) {
      dispatch({ type: 'error', message: err.message || 'Failed to load stores' })
    }
  }, [client])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  const handleCreateStore = useCallback(async (name: string) => {
    try {
      await client.createStore({ name })
      await fetchStores()
    } catch (err: any) {
      dispatch({ type: 'error', message: err.message || 'Failed to create store' })
    }
  }, [client, fetchStores])

  const handleDeleteStore = useCallback(async () => {
    const store = getSelectedStore(state)
    if (!store) return
    try {
      await client.deleteStore(store.id)
      await fetchStores()
    } catch (err: any) {
      dispatch({ type: 'error', message: err.message || 'Failed to delete store' })
    }
  }, [client, state, fetchStores])

  useKeyboard(useCallback((key: { name: string }) => {
    if (state.status === 'creating') {
      return // Let the input handle keys
    }
    if (state.status === 'confirming-delete') {
      return // Let the confirm handle keys
    }

    switch (key.name) {
      case 'up':
        dispatch({ type: 'move-up' })
        break
      case 'down':
        dispatch({ type: 'move-down' })
        break
      case 'return': {
        const store = getSelectedStore(state)
        if (store) onSelectStore(store.id, store.name)
        break
      }
      case 'c':
        dispatch({ type: 'start-create' })
        break
      case 'd':
        dispatch({ type: 'start-delete' })
        break
      case 'r':
        fetchStores()
        break
    }
  }, [state, onSelectStore, fetchStores]))

  if (state.status === 'loading') {
    return <Spinner label="Loading stores..." />
  }

  if (state.status === 'error') {
    return (
      <box flexDirection="column" gap={1}>
        <text fg="#ef4444">{state.message}</text>
        <text fg="#666666">Press 'r' to retry</text>
      </box>
    )
  }

  const stores = state.stores
  const selectedIndex = state.selectedIndex

  return (
    <box flexDirection="column" gap={0}>
      <text fg="#60a5fa" attributes={1}>Stores</text>
      <box height={1} />

      {state.status === 'creating' && (
        <box flexDirection="row" gap={1} height={1}>
          <text fg="#eab308">New store name:</text>
          <input
            value={createName}
            placeholder="my-store"
            focused={true}
            onInput={setCreateName}
            onSubmit={(name: string) => {
              if (name.trim()) {
                handleCreateStore(name.trim())
              }
              setCreateName('')
              dispatch({ type: 'cancel-create' })
            }}
          />
        </box>
      )}

      {state.status === 'confirming-delete' && stores[selectedIndex] && (
        <Confirm
          message={`Delete store '${stores[selectedIndex]!.name}'?`}
          onConfirm={() => {
            handleDeleteStore()
            dispatch({ type: 'cancel-delete' })
          }}
          onCancel={() => dispatch({ type: 'cancel-delete' })}
        />
      )}

      {stores.length === 0 ? (
        <text fg="#666666">No stores found. Press 'c' to create one.</text>
      ) : (
        <box flexDirection="column">
          {/* Header */}
          <box flexDirection="row" gap={2}>
            <text fg="#888888" width={30}>Name</text>
            <text fg="#888888" width={28}>ID</text>
            <text fg="#888888" width={16}>Created</text>
          </box>
          <text fg="#444444">{'─'.repeat(76)}</text>

          {/* Store rows */}
          <scrollbox height="100%">
            <box flexDirection="column">
              {stores.map((store, idx) => {
                const isSelected = idx === selectedIndex
                const fg = isSelected ? '#ffffff' : '#cccccc'
                const bg = isSelected ? '#1e40af' : undefined
                return (
                  <box key={store.id} flexDirection="row" gap={2} backgroundColor={bg}>
                    <text fg={fg} width={30}>{store.name}</text>
                    <text fg="#888888" width={28}>{store.id.length > 24 ? store.id.slice(0, 24) + '...' : store.id}</text>
                    <text fg="#888888" width={16}>{formatStoreDate(store.created_at)}</text>
                  </box>
                )
              })}
            </box>
          </scrollbox>
        </box>
      )}
    </box>
  )
}
