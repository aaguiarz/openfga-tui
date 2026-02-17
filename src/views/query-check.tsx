import { useState, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { FormField } from '../components/form-field.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'

interface QueryCheckProps {
  client: OpenFGAClient
  storeId: string
}

export function QueryCheck({ client, storeId }: QueryCheckProps) {
  const [user, setUser] = useState('')
  const [relation, setRelation] = useState('')
  const [object, setObject] = useState('')
  const [focusedField, setFocusedField] = useState(0)
  const [result, setResult] = useState<{ allowed: boolean; resolution?: string } | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [running, setRunning] = useState(false)

  const handleRun = useCallback(async () => {
    if (!user.trim() || !relation.trim() || !object.trim()) return
    setRunning(true)
    setError(undefined)
    setResult(null)
    try {
      const response = await client.check(storeId, {
        tuple_key: {
          user: user.trim(),
          relation: relation.trim(),
          object: object.trim(),
        },
      })
      setResult(response)
    } catch (err: any) {
      setError(err.message || 'Check query failed')
    } finally {
      setRunning(false)
    }
  }, [client, storeId, user, relation, object])

  useKeyboard(useCallback((key: { name: string }) => {
    if (key.name === 'tab') {
      setFocusedField(f => (f + 1) % 3)
    } else if (key.name === 'shift+tab') {
      setFocusedField(f => (f - 1 + 3) % 3)
    }
  }, []))

  return (
    <box flexDirection="column" gap={1}>
      <text fg="#60a5fa" attributes={1}>Check</text>

      <FormField label="User">
        <input value={user} placeholder="user:anne" focused={focusedField === 0} onInput={setUser} onSubmit={handleRun} width={40} />
      </FormField>
      <FormField label="Relation">
        <input value={relation} placeholder="reader" focused={focusedField === 1} onInput={setRelation} onSubmit={handleRun} width={30} />
      </FormField>
      <FormField label="Object">
        <input value={object} placeholder="document:budget" focused={focusedField === 2} onInput={setObject} onSubmit={handleRun} width={40} />
      </FormField>

      <box height={1} />

      {running && <text fg="#888888">Running check...</text>}
      {error && <text fg="#ef4444">{error}</text>}
      {result && (
        <box flexDirection="column" gap={0}>
          <text fg={result.allowed ? '#22c55e' : '#ef4444'} attributes={1}>
            {result.allowed ? 'ALLOWED' : 'DENIED'}
          </text>
          {result.resolution && <text fg="#888888">Resolution: {result.resolution}</text>}
        </box>
      )}
    </box>
  )
}
