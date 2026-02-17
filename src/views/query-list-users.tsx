import { useState, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { FormField } from '../components/form-field.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import type { User } from '../lib/openfga/types.ts'
import type { ModelPlaceholders } from '../lib/model-placeholders.ts'

interface QueryListUsersProps {
  client: OpenFGAClient
  storeId: string
  placeholders: ModelPlaceholders
}

export function QueryListUsers({ client, storeId, placeholders: ph }: QueryListUsersProps) {
  const [objectType, setObjectType] = useState('')
  const [objectId, setObjectId] = useState('')
  const [relation, setRelation] = useState('')
  const [userFilterType, setUserFilterType] = useState('')
  const [focusedField, setFocusedField] = useState(0)
  const [results, setResults] = useState<User[]>([])
  const [error, setError] = useState<string | undefined>()
  const [running, setRunning] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  const handleRun = useCallback(async () => {
    if (!objectType.trim() || !objectId.trim() || !relation.trim() || !userFilterType.trim()) return
    setRunning(true)
    setError(undefined)
    setResults([])
    try {
      const response = await client.listUsers(storeId, {
        object: { type: objectType.trim(), id: objectId.trim() },
        relation: relation.trim(),
        user_filters: [{ type: userFilterType.trim() }],
      })
      setResults(response.users || [])
      setHasRun(true)
    } catch (err: any) {
      setError(err.message || 'List Users query failed')
    } finally {
      setRunning(false)
    }
  }, [client, storeId, objectType, objectId, relation, userFilterType])

  useKeyboard(useCallback((key: { name: string }) => {
    if (key.name === 'tab') {
      setFocusedField(f => (f + 1) % 4)
    } else if (key.name === 'shift+tab') {
      setFocusedField(f => (f - 1 + 4) % 4)
    }
  }, []))

  return (
    <box flexDirection="column" gap={1}>
      <text fg="#60a5fa" attributes={1}>List Users</text>

      <FormField label="Object Type">
        <input value={objectType} placeholder={ph.objectType} focused={focusedField === 0} onInput={setObjectType} onSubmit={handleRun} width={30} />
      </FormField>
      <FormField label="Object ID">
        <input value={objectId} placeholder={ph.objectId} focused={focusedField === 1} onInput={setObjectId} onSubmit={handleRun} width={40} />
      </FormField>
      <FormField label="Relation">
        <input value={relation} placeholder={ph.relation} focused={focusedField === 2} onInput={setRelation} onSubmit={handleRun} width={30} />
      </FormField>
      <FormField label="User Filter Type">
        <input value={userFilterType} placeholder={ph.userType} focused={focusedField === 3} onInput={setUserFilterType} onSubmit={handleRun} width={30} />
      </FormField>

      <box height={1} />

      {running && <text fg="#888888">Querying...</text>}
      {error && <text fg="#ef4444">{error}</text>}
      {hasRun && !running && !error && (
        <box flexDirection="column">
          <text fg="#888888">{results.length} users found</text>
          <scrollbox flexGrow={1}>
            <box flexDirection="column">
              {results.map((user, idx) => (
                <text key={idx} fg="#e5e7eb">{formatUser(user)}</text>
              ))}
            </box>
          </scrollbox>
        </box>
      )}
    </box>
  )
}

function formatUser(user: User): string {
  if (user.object) return `${user.object.type}:${user.object.id}`
  if (user.userset) return `${user.userset.type}:${user.userset.id}#${user.userset.relation}`
  if (user.wildcard) return `${user.wildcard.type}:*`
  return '(unknown)'
}

export { formatUser }
