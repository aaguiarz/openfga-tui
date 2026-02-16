import { useState, useReducer, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { FormField } from '../components/form-field.tsx'
import { OpenFGAClient } from '../lib/openfga/client.ts'
import type { AuthConfig, ConnectionConfig } from '../lib/openfga/types.ts'
import { saveConfig } from '../lib/config.ts'
import { formStatusReducer } from '../lib/form-status.ts'

type AuthType = 'none' | 'api-key' | 'oidc'

export interface ConnectViewProps {
  onConnect: (config: ConnectionConfig) => void
  initialServerUrl?: string
  initialAuthType?: AuthType
}

export function ConnectView({ onConnect, initialServerUrl, initialAuthType }: ConnectViewProps) {
  const [serverUrl, setServerUrl] = useState(initialServerUrl || 'http://localhost:8080')
  const [authType, setAuthType] = useState<AuthType>(initialAuthType || 'none')
  const [apiKey, setApiKey] = useState('')
  const [tokenUrl, setTokenUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [status, dispatchStatus] = useReducer(formStatusReducer, { state: 'idle' })
  const [focusedField, setFocusedField] = useState(0)

  const fieldCount = authType === 'oidc' ? 5 : authType === 'api-key' ? 3 : 2

  const buildAuthConfig = useCallback((): AuthConfig => {
    switch (authType) {
      case 'none':
        return { type: 'none' }
      case 'api-key':
        return { type: 'api-key', apiKey }
      case 'oidc':
        return { type: 'oidc', clientId, clientSecret, tokenUrl }
    }
  }, [authType, apiKey, clientId, clientSecret, tokenUrl])

  const buildConnectionConfig = useCallback((): ConnectionConfig => ({
    serverUrl,
    auth: buildAuthConfig(),
  }), [serverUrl, buildAuthConfig])

  const handleTestConnection = useCallback(async () => {
    dispatchStatus({ type: 'test' })
    try {
      const config = buildConnectionConfig()
      const client = new OpenFGAClient(config)
      const ok = await client.testConnection()
      if (ok) {
        dispatchStatus({ type: 'success', message: 'Connection successful!' })
      } else {
        dispatchStatus({ type: 'error', message: 'Connection failed - server unreachable or returned error' })
      }
    } catch (err: any) {
      dispatchStatus({ type: 'error', message: err.message || 'Connection failed' })
    }
  }, [buildConnectionConfig])

  const handleConnect = useCallback(async () => {
    dispatchStatus({ type: 'connect' })
    try {
      const config = buildConnectionConfig()
      const client = new OpenFGAClient(config)
      const ok = await client.testConnection()
      if (ok) {
        await saveConfig({
          serverUrl: config.serverUrl,
          auth: config.auth,
        })
        onConnect(config)
      } else {
        dispatchStatus({ type: 'error', message: 'Connection failed - cannot connect' })
      }
    } catch (err: any) {
      dispatchStatus({ type: 'error', message: err.message || 'Connection failed' })
    }
  }, [buildConnectionConfig, onConnect])

  useKeyboard(useCallback((key: { name: string }) => {
    if (key.name === 'tab') {
      setFocusedField(f => (f + 1) % fieldCount)
    } else if (key.name === 'shift+tab') {
      setFocusedField(f => (f - 1 + fieldCount) % fieldCount)
    } else if (key.name === 'ctrl+return') {
      handleConnect()
    }
  }, [fieldCount, handleConnect]))

  const authTypeOptions = [
    { name: 'None', description: 'No authentication', value: 'none' },
    { name: 'API Key', description: 'Bearer token authentication', value: 'api-key' },
    { name: 'OIDC', description: 'OpenID Connect client credentials', value: 'oidc' },
  ]

  const statusColor = status.state === 'success' ? '#22c55e'
    : status.state === 'error' ? '#ef4444'
    : '#888888'

  const statusMessage = status.state === 'testing' ? 'Testing connection...'
    : status.state === 'connecting' ? 'Connecting...'
    : status.state === 'success' ? status.message
    : status.state === 'error' ? status.message
    : ''

  return (
    <box flexDirection="column" gap={1}>
      <text fg="#60a5fa" attributes={1}>Connect to OpenFGA Server</text>
      <box height={1} />

      <FormField label="Server URL">
        <input
          value={serverUrl}
          placeholder="http://localhost:8080"
          focused={focusedField === 0}
          onInput={setServerUrl}
          onSubmit={handleTestConnection}
        />
      </FormField>

      <FormField label="Auth Type">
        <select
          options={authTypeOptions}
          focused={focusedField === 1}
          onChange={(_idx, opt) => {
            if (opt?.value) setAuthType(opt.value as AuthType)
          }}
        />
      </FormField>

      {authType === 'api-key' && (
        <FormField label="API Key">
          <input
            value={apiKey}
            placeholder="Enter API key"
            focused={focusedField === 2}
            onInput={setApiKey}
            onSubmit={handleTestConnection}
          />
        </FormField>
      )}

      {authType === 'oidc' && (
        <>
          <FormField label="Token URL">
            <input
              value={tokenUrl}
              placeholder="https://auth.example.com/token"
              focused={focusedField === 2}
              onInput={setTokenUrl}
            />
          </FormField>
          <FormField label="Client ID">
            <input
              value={clientId}
              placeholder="Enter client ID"
              focused={focusedField === 3}
              onInput={setClientId}
            />
          </FormField>
          <FormField label="Client Secret">
            <input
              value={clientSecret}
              placeholder="Enter client secret"
              focused={focusedField === 4}
              onInput={setClientSecret}
            />
          </FormField>
        </>
      )}

      <box height={1} />

      {statusMessage && <text fg={statusColor}>{statusMessage}</text>}

      <box height={1} />
      <box flexDirection="row" gap={2}>
        <text fg="#666666">[Enter] Test Connection</text>
        <text fg="#666666">[Ctrl+Enter] Connect</text>
      </box>
    </box>
  )
}
