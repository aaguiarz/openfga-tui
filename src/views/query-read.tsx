import { useState, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { FormField } from '../components/form-field.tsx'
import { Table } from '../components/table.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import type { Tuple } from '../lib/openfga/types.ts'
import type { ModelPlaceholders } from '../lib/model-placeholders.ts'

interface QueryReadProps {
  client: OpenFGAClient
  storeId: string
  placeholders: ModelPlaceholders
}

export function QueryRead({ client, storeId, placeholders: ph }: QueryReadProps) {
  const [user, setUser] = useState('')
  const [relation, setRelation] = useState('')
  const [object, setObject] = useState('')
  const [focusedField, setFocusedField] = useState(0)
  const [results, setResults] = useState<Tuple[]>([])
  const [continuationToken, setContinuationToken] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [running, setRunning] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  const handleRun = useCallback(async (token?: string) => {
    setRunning(true)
    setError(undefined)
    if (!token) {
      setResults([])
    }
    try {
      const tupleKey: Record<string, string> = {}
      if (user.trim()) tupleKey.user = user.trim()
      if (relation.trim()) tupleKey.relation = relation.trim()
      if (object.trim()) tupleKey.object = object.trim()

      const response = await client.read(storeId, {
        tuple_key: Object.keys(tupleKey).length > 0 ? tupleKey as any : undefined,
        page_size: 50,
        continuation_token: token,
      })
      if (token) {
        setResults(prev => [...prev, ...(response.tuples || [])])
      } else {
        setResults(response.tuples || [])
      }
      setContinuationToken(response.continuation_token)
      setHasRun(true)
    } catch (err: any) {
      setError(err.message || 'Read query failed')
    } finally {
      setRunning(false)
    }
  }, [client, storeId, user, relation, object])

  useKeyboard(useCallback((key: { name: string; shift?: boolean }) => {
    if (key.name === 'tab' && key.shift) {
      setFocusedField(f => (f - 1 + 3) % 3)
    } else if (key.name === 'tab') {
      setFocusedField(f => (f + 1) % 3)
    } else if (key.name === 'n' && continuationToken) {
      handleRun(continuationToken)
    }
  }, [continuationToken, handleRun]))

  const rows = results.map(t => [t.key.user, t.key.relation, t.key.object])
  const columns = [
    { header: 'User', width: 24 },
    { header: 'Relation', width: 16 },
    { header: 'Object', width: 24 },
  ]

  return (
    <box flexDirection="column" gap={1}>
      <text fg="#60a5fa" attributes={1}>Read</text>

      <FormField label="User">
        <input value={user} placeholder={`${ph.user} (optional)`} focused={focusedField === 0} onInput={setUser} onSubmit={() => handleRun()} width={40} />
      </FormField>
      <FormField label="Relation">
        <input value={relation} placeholder={`${ph.relation} (optional)`} focused={focusedField === 1} onInput={setRelation} onSubmit={() => handleRun()} width={30} />
      </FormField>
      <FormField label="Object">
        <input value={object} placeholder={`${ph.object} (optional)`} focused={focusedField === 2} onInput={setObject} onSubmit={() => handleRun()} width={40} />
      </FormField>

      <box height={1} />

      {running && <text fg="#888888">Reading tuples...</text>}
      {error && <text fg="#ef4444">{error}</text>}
      {hasRun && !running && !error && (
        <box flexDirection="column">
          <text fg="#888888">{results.length} tuples{continuationToken ? ' (more available - press n)' : ''}</text>
          {results.length > 0 && (
            <Table columns={columns} rows={rows} selectedIndex={-1} />
          )}
        </box>
      )}
    </box>
  )
}
