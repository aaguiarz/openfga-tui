import { useState, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import { QueryCheck } from './query-check.tsx'
import { QueryExpand } from './query-expand.tsx'
import { QueryListObjects } from './query-list-objects.tsx'
import { QueryListUsers } from './query-list-users.tsx'

const TABS = ['Check', 'Expand', 'List Objects', 'List Users'] as const
type QueryTab = typeof TABS[number]

interface QueriesViewProps {
  client: OpenFGAClient
  storeId: string
}

export function QueriesView({ client, storeId }: QueriesViewProps) {
  const [activeTab, setActiveTab] = useState<QueryTab>('Check')

  useKeyboard(useCallback((key: { name: string }) => {
    switch (key.name) {
      case '1':
        setActiveTab('Check')
        break
      case '2':
        setActiveTab('Expand')
        break
      case '3':
        setActiveTab('List Objects')
        break
      case '4':
        setActiveTab('List Users')
        break
    }
  }, []))

  const tabOptions = TABS.map(tab => ({
    name: tab,
    description: '',
    value: tab,
  }))

  return (
    <box flexDirection="column" gap={1}>
      <box flexDirection="row" gap={0}>
        {TABS.map((tab, idx) => {
          const isActive = tab === activeTab
          return (
            <box key={tab} paddingX={1}>
              <text
                fg={isActive ? '#60a5fa' : '#666666'}
                attributes={isActive ? 1 : 0}
              >
                [{idx + 1}] {tab}
              </text>
            </box>
          )
        })}
      </box>
      <text fg="#444444">{'─'.repeat(76)}</text>

      <box flexGrow={1}>
        {activeTab === 'Check' && <QueryCheck client={client} storeId={storeId} />}
        {activeTab === 'Expand' && <QueryExpand client={client} storeId={storeId} />}
        {activeTab === 'List Objects' && <QueryListObjects client={client} storeId={storeId} />}
        {activeTab === 'List Users' && <QueryListUsers client={client} storeId={storeId} />}
      </box>
    </box>
  )
}
