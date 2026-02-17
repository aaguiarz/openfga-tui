import { useState, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { FormField } from '../components/form-field.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import type { ModelPlaceholders } from '../lib/model-placeholders.ts'

interface QueryListObjectsProps {
  client: OpenFGAClient
  storeId: string
  placeholders: ModelPlaceholders
}

export function QueryListObjects({ client, storeId, placeholders: ph }: QueryListObjectsProps) {
  const [user, setUser] = useState('')
  const [relation, setRelation] = useState('')
  const [objectType, setObjectType] = useState('')
  const [focusedField, setFocusedField] = useState(0)
  const [results, setResults] = useState<string[]>([])
  const [error, setError] = useState<string | undefined>()
  const [running, setRunning] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  const handleRun = useCallback(async () => {
    if (!user.trim() || !relation.trim() || !objectType.trim()) return
    setRunning(true)
    setError(undefined)
    setResults([])
    try {
      const response = await client.listObjects(storeId, {
        user: user.trim(),
        relation: relation.trim(),
        type: objectType.trim(),
      })
      setResults(response.objects || [])
      setHasRun(true)
    } catch (err: any) {
      setError(err.message || 'List Objects query failed')
    } finally {
      setRunning(false)
    }
  }, [client, storeId, user, relation, objectType])

  useKeyboard(useCallback((key: { name: string }) => {
    if (key.name === 'tab') {
      setFocusedField(f => (f + 1) % 3)
    } else if (key.name === 'shift+tab') {
      setFocusedField(f => (f - 1 + 3) % 3)
    }
  }, []))

  return (
    <box flexDirection="column" gap={1}>
      <text fg="#60a5fa" attributes={1}>List Objects</text>

      <FormField label="User">
        <input value={user} placeholder={ph.user} focused={focusedField === 0} onInput={setUser} onSubmit={handleRun} width={40} />
      </FormField>
      <FormField label="Relation">
        <input value={relation} placeholder={ph.relation} focused={focusedField === 1} onInput={setRelation} onSubmit={handleRun} width={30} />
      </FormField>
      <FormField label="Type">
        <input value={objectType} placeholder={ph.objectType} focused={focusedField === 2} onInput={setObjectType} onSubmit={handleRun} width={30} />
      </FormField>

      <box height={1} />

      {running && <text fg="#888888">Querying...</text>}
      {error && <text fg="#ef4444">{error}</text>}
      {hasRun && !running && !error && (
        <box flexDirection="column">
          <text fg="#888888">{results.length} objects found</text>
          <scrollbox flexGrow={1}>
            <box flexDirection="column">
              {results.map((obj, idx) => (
                <text key={idx} fg="#e5e7eb">{obj}</text>
              ))}
            </box>
          </scrollbox>
        </box>
      )}
    </box>
  )
}
