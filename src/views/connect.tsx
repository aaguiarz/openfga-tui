import { useState, useReducer, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { FormField } from '../components/form-field.tsx'
import { OpenFGAClient } from '../lib/openfga/client.ts'
import type { AuthConfig, ConnectionConfig } from '../lib/openfga/types.ts'
import { saveConnection, connectionToConfig, type SavedConnection } from '../lib/config.ts'
import { formStatusReducer } from '../lib/form-status.ts'

type AuthType = 'none' | 'api-key' | 'oidc'
type ConnectMode = 'picker' | 'form' | 'save-prompt'

export interface ConnectViewProps {
  onConnect: (config: ConnectionConfig) => void
  savedConnections?: SavedConnection[]
  initialServerUrl?: string
  initialAuthType?: AuthType
  configError?: string
  onQuit: () => void
}

export function ConnectView({
  onConnect,
  savedConnections,
  initialServerUrl,
  initialAuthType,
  configError,
  onQuit,
}: ConnectViewProps) {
  const hasSaved = savedConnections && savedConnections.length > 0
  const [mode, setMode] = useState<ConnectMode>(hasSaved ? 'picker' : 'form')
  const [selectedIdx, setSelectedIdx] = useState(0)

  // Form state
  const [serverUrl, setServerUrl] = useState(initialServerUrl || 'http://localhost:8080')
  const [authType, setAuthType] = useState<AuthType>(initialAuthType || 'none')
  const [apiKey, setApiKey] = useState('')
  const [tokenUrl, setTokenUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [audience, setAudience] = useState('')
  const [status, dispatchStatus] = useReducer(formStatusReducer, { state: 'idle' })
  const [focusedField, setFocusedField] = useState(0)

  // Save prompt state
  const [saveName, setSaveName] = useState('')
  const [pendingConfig, setPendingConfig] = useState<ConnectionConfig | null>(null)

  const fieldCount = authType === 'oidc' ? 6 : authType === 'api-key' ? 3 : 2

  const buildAuthConfig = useCallback((): AuthConfig => {
    switch (authType) {
      case 'none':
        return { type: 'none' }
      case 'api-key':
        return { type: 'api-key', apiKey }
      case 'oidc':
        return { type: 'oidc', clientId, clientSecret, tokenUrl, ...(audience ? { audience } : {}) }
    }
  }, [authType, apiKey, clientId, clientSecret, tokenUrl, audience])

  const buildConnectionConfig = useCallback((): ConnectionConfig => ({
    serverUrl,
    auth: buildAuthConfig(),
  }), [serverUrl, buildAuthConfig])

  const doConnect = useCallback(async (config: ConnectionConfig) => {
    dispatchStatus({ type: 'connect' })
    try {
      const client = new OpenFGAClient(config)
      const ok = await client.testConnection()
      if (ok) {
        onConnect(config)
      } else {
        dispatchStatus({ type: 'error', message: 'Connection failed - server unreachable or returned error' })
      }
    } catch (err: any) {
      dispatchStatus({ type: 'error', message: err.message || 'Connection failed' })
    }
  }, [onConnect])

  const handleFormConnect = useCallback(async () => {
    const config = buildConnectionConfig()
    dispatchStatus({ type: 'connect' })
    try {
      const client = new OpenFGAClient(config)
      const ok = await client.testConnection()
      if (ok) {
        setPendingConfig(config)
        setMode('save-prompt')
      } else {
        dispatchStatus({ type: 'error', message: 'Connection failed - server unreachable or returned error' })
      }
    } catch (err: any) {
      dispatchStatus({ type: 'error', message: err.message || 'Connection failed' })
    }
  }, [buildConnectionConfig])

  const handleSaveAndConnect = useCallback(async () => {
    if (!pendingConfig) return
    try {
      if (saveName.trim()) {
        await saveConnection({
          name: saveName.trim(),
          serverUrl: pendingConfig.serverUrl,
          auth: pendingConfig.auth,
        })
      }
      onConnect(pendingConfig)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save connection'
      dispatchStatus({ type: 'error', message })
    }
  }, [pendingConfig, saveName, onConnect])

  const handleSkipSave = useCallback(() => {
    if (pendingConfig) {
      onConnect(pendingConfig)
    }
  }, [pendingConfig, onConnect])

  // Total items in picker: saved connections + "New connection..."
  const pickerItemCount = (savedConnections?.length || 0) + 1

  useKeyboard(useCallback((key: { name: string; shift?: boolean }) => {
    if (mode === 'picker') {
      if (key.name === 'up' || key.name === 'k') {
        setSelectedIdx(i => Math.max(0, i - 1))
      } else if (key.name === 'down' || key.name === 'j') {
        setSelectedIdx(i => Math.min(pickerItemCount - 1, i + 1))
      } else if (key.name === 'return') {
        if (selectedIdx < (savedConnections?.length || 0)) {
          const conn = savedConnections![selectedIdx]!
          doConnect(connectionToConfig(conn))
        } else {
          setMode('form')
          dispatchStatus({ type: 'reset' })
        }
      } else if (key.name === 'q') {
        onQuit()
      }
    } else if (mode === 'form') {
      if (key.name === 'return') {
        handleFormConnect()
      } else if (key.name === 'tab' && key.shift) {
        setFocusedField(f => (f - 1 + fieldCount) % fieldCount)
      } else if (key.name === 'tab') {
        setFocusedField(f => (f + 1) % fieldCount)
      } else if (key.name === 'escape' && hasSaved) {
        setMode('picker')
        dispatchStatus({ type: 'reset' })
      }
    } else if (mode === 'save-prompt') {
      if (key.name === 'return') {
        handleSaveAndConnect()
      } else if (key.name === 'escape') {
        handleSkipSave()
      }
    }
  }, [mode, selectedIdx, pickerItemCount, savedConnections, fieldCount, hasSaved, doConnect, handleFormConnect, handleSaveAndConnect, handleSkipSave, onQuit]))

  const authTypeOptions = [
    { name: 'None', description: 'No authentication', value: 'none' },
    { name: 'API Key', description: 'Bearer token authentication', value: 'api-key' },
    { name: 'OIDC', description: 'OpenID Connect client credentials', value: 'oidc' },
  ]

  const statusColor = status.state === 'success' ? '#22c55e'
    : status.state === 'error' ? '#ef4444'
    : '#888888'

  const statusMessage = status.state === 'connecting' ? 'Connecting...'
    : status.state === 'error' ? status.message
    : ''

  // --- Save prompt mode ---
  if (mode === 'save-prompt') {
    return (
      <box flexDirection="column" gap={1}>
        <text fg="#22c55e" attributes={1}>Connection successful!</text>
        <box height={1} />
        <text fg="#e5e7eb">Save this connection for quick access?</text>
        <box height={1} />
        <box flexDirection="row" gap={1} height={1}>
          <text fg="#888888" width={18}>Connection name:</text>
          <input
            value={saveName}
            placeholder="e.g. local, staging, prod"
            focused={true}
            onInput={setSaveName}
            width={40}
          />
        </box>
        <box height={1} />
        <box flexDirection="row" gap={2}>
          <text fg="#666666">[Enter] Save & continue</text>
          <text fg="#666666">[Esc] Skip</text>
        </box>
      </box>
    )
  }

  // --- Picker mode ---
  if (mode === 'picker' && savedConnections && savedConnections.length > 0) {
    return (
      <box flexDirection="column" gap={1}>
        <text fg="#60a5fa" attributes={1}>Connect to OpenFGA Server</text>
        <box height={1} />
        <text fg="#e5e7eb">Saved Connections</text>
        <text fg="#444444">{'─'.repeat(70)}</text>

        <box flexDirection="column">
          {savedConnections.map((conn, idx) => {
            const isSelected = idx === selectedIdx
            const bg = isSelected ? '#1e40af' : undefined
            const authLabel = conn.auth.type === 'none' ? ''
              : conn.auth.type === 'api-key' ? '  [API Key]'
              : '  [OIDC]'
            return (
              <box key={conn.name} flexDirection="row" backgroundColor={bg} height={1}>
                <text fg={isSelected ? '#fbbf24' : '#60a5fa'} width={20} attributes={1}>
                  {isSelected ? '> ' : '  '}{conn.name}
                </text>
                <text fg={isSelected ? '#ffffff' : '#cccccc'} width={50}>
                  {conn.serverUrl}{authLabel}
                </text>
              </box>
            )
          })}
          {/* "New connection" option */}
          <box flexDirection="row" backgroundColor={selectedIdx === savedConnections.length ? '#1e40af' : undefined} height={1}>
            <text fg={selectedIdx === savedConnections.length ? '#fbbf24' : '#22c55e'} attributes={1}>
              {selectedIdx === savedConnections.length ? '> ' : '  '}+ New connection...
            </text>
          </box>
        </box>

        <box height={1} />
        {configError && <text fg="#f87171">{configError}</text>}
        {configError && <box height={1} />}
        {statusMessage && <text fg={statusColor}>{statusMessage}</text>}
        <box flexDirection="row" gap={2}>
          <text fg="#666666">[↑↓] select  [Enter] connect  [q] quit</text>
        </box>
      </box>
    )
  }

  // --- Form mode ---
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
          width={60}
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
            width={60}
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
              width={60}
            />
          </FormField>
          <FormField label="Client ID">
            <input
              value={clientId}
              placeholder="Enter client ID"
              focused={focusedField === 3}
              onInput={setClientId}
              width={40}
            />
          </FormField>
          <FormField label="Client Secret">
            <input
              value={clientSecret}
              placeholder="Enter client secret"
              focused={focusedField === 4}
              onInput={setClientSecret}
              width={60}
            />
          </FormField>
          <FormField label="Audience">
            <input
              value={audience}
              placeholder="https://api.example.com/ (optional)"
              focused={focusedField === 5}
              onInput={setAudience}
              width={60}
            />
          </FormField>
        </>
      )}

      <box height={1} />

      {configError && <text fg="#f87171">{configError}</text>}
      {statusMessage && <text fg={statusColor}>{statusMessage}</text>}

      <box height={1} />
      <box flexDirection="row" gap={2}>
        <text fg="#666666">[Enter] Connect</text>
        {hasSaved && <text fg="#666666">[Esc] Back to saved</text>}
      </box>
    </box>
  )
}
