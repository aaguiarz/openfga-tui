import { useState, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { FormField } from '../components/form-field.tsx'
import { TreeView } from '../components/tree-view.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import type { ExpandResponse } from '../lib/openfga/types.ts'

interface QueryExpandProps {
  client: OpenFGAClient
  storeId: string
}

export function QueryExpand({ client, storeId }: QueryExpandProps) {
  const [relation, setRelation] = useState('')
  const [object, setObject] = useState('')
  const [focusedField, setFocusedField] = useState(0)
  const [result, setResult] = useState<ExpandResponse | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [running, setRunning] = useState(false)

  const handleRun = useCallback(async () => {
    if (!relation.trim() || !object.trim()) return
    setRunning(true)
    setError(undefined)
    setResult(null)
    try {
      const response = await client.expand(storeId, {
        tuple_key: {
          relation: relation.trim(),
          object: object.trim(),
        },
      })
      setResult(response)
    } catch (err: any) {
      setError(err.message || 'Expand query failed')
    } finally {
      setRunning(false)
    }
  }, [client, storeId, relation, object])

  useKeyboard(useCallback((key: { name: string }) => {
    if (key.name === 'tab') {
      setFocusedField(f => (f + 1) % 2)
    } else if (key.name === 'shift+tab') {
      setFocusedField(f => (f - 1 + 2) % 2)
    }
  }, []))

  return (
    <box flexDirection="column" gap={1}>
      <text fg="#60a5fa" attributes={1}>Expand</text>

      <FormField label="Relation">
        <input value={relation} placeholder="reader" focused={focusedField === 0} onInput={setRelation} onSubmit={handleRun} width={30} />
      </FormField>
      <FormField label="Object">
        <input value={object} placeholder="document:budget" focused={focusedField === 1} onInput={setObject} onSubmit={handleRun} width={40} />
      </FormField>

      <box height={1} />

      {running && <text fg="#888888">Expanding...</text>}
      {error && <text fg="#ef4444">{error}</text>}
      {result?.tree?.root && (
        <scrollbox flexGrow={1}>
          <TreeView node={result.tree.root} />
        </scrollbox>
      )}
    </box>
  )
}
