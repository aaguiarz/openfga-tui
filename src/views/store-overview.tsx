import { useState, useEffect, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { Spinner } from '../components/spinner.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import type { Store } from '../lib/openfga/types.ts'
import { formatStoreDate } from '../lib/store-list.ts'

interface StoreOverviewProps {
  client: OpenFGAClient
  storeId: string
  onNavigate: (target: 'model' | 'tuples' | 'queries') => void
}

interface StoreStats {
  store?: Store
  modelCount?: number
  tupleCount?: number
  loading: boolean
  error?: string
}

export function StoreOverview({ client, storeId, onNavigate }: StoreOverviewProps) {
  const [stats, setStats] = useState<StoreStats>({ loading: true })

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const [store, models, tuples] = await Promise.all([
          client.getStore(storeId),
          client.listAuthorizationModels(storeId, 100),
          client.read(storeId, { page_size: 1 }),
        ])

        if (!cancelled) {
          setStats({
            store,
            modelCount: models.authorization_models?.length ?? 0,
            tupleCount: tuples.tuples?.length ?? 0,
            loading: false,
          })
        }
      } catch (err: any) {
        if (!cancelled) {
          setStats({ loading: false, error: err.message || 'Failed to load store details' })
        }
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [client, storeId])

  useKeyboard(useCallback((key: { name: string }) => {
    switch (key.name) {
      case 'm':
        onNavigate('model')
        break
      case 't':
        onNavigate('tuples')
        break
      case 'q':
        onNavigate('queries')
        break
    }
  }, [onNavigate]))

  if (stats.loading) {
    return <Spinner label="Loading store details..." />
  }

  if (stats.error) {
    return <text fg="#ef4444">{stats.error}</text>
  }

  const store = stats.store
  const displayName = store?.name || storeId
  const displayId = storeId.length > 20 ? storeId.slice(0, 20) + '...' : storeId
  const created = store?.created_at ? formatStoreDate(store.created_at) : '...'
  const updated = store?.updated_at ? formatStoreDate(store.updated_at) : '...'

  return (
    <box flexDirection="column" gap={1}>
      <text fg="#60a5fa" attributes={1}>Store: {displayName}</text>
      <text fg="#888888">
        ID: {displayId}  Created: {created}  Updated: {updated}
      </text>

      <box height={1} />

      <box flexDirection="row" gap={4}>
        <box
          border
          borderStyle="rounded"
          borderColor="#444444"
          padding={1}
          width={20}
          flexDirection="column"
          alignItems="center"
        >
          <text fg="#60a5fa" attributes={1}>[m] Models</text>
          <text fg="#888888">{stats.modelCount ?? '...'} models</text>
        </box>

        <box
          border
          borderStyle="rounded"
          borderColor="#444444"
          padding={1}
          width={20}
          flexDirection="column"
          alignItems="center"
        >
          <text fg="#22c55e" attributes={1}>[t] Tuples</text>
          <text fg="#888888">{stats.tupleCount ?? '...'} tuples</text>
        </box>

        <box
          border
          borderStyle="rounded"
          borderColor="#444444"
          padding={1}
          width={20}
          flexDirection="column"
          alignItems="center"
        >
          <text fg="#eab308" attributes={1}>[q] Queries</text>
          <text fg="#888888">4 operations</text>
        </box>
      </box>
    </box>
  )
}
