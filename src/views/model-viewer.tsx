import { useState, useEffect, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { Spinner } from '../components/spinner.tsx'
import { ModelEditor } from './model-editor.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import type { AuthorizationModel } from '../lib/openfga/types.ts'
import { modelToDsl } from '../lib/openfga/dsl-converter.ts'
import { highlightFgaDsl } from '../lib/fga-highlight.ts'
import { copyToClipboard } from '../lib/clipboard.ts'

const DEFAULT_MODEL = `model
  schema 1.1

type user

type document
  relations
    define viewer: [user]
    define editor: [user]
    define owner: [user]
    
    define can_view : viewer or can_edit
    define can_edit : editor or owner
`

interface ModelViewerProps {
  client: OpenFGAClient
  storeId: string
}

export function ModelViewer({ client, storeId }: ModelViewerProps) {
  const [models, setModels] = useState<AuthorizationModel[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [editing, setEditing] = useState(false)

  const fetchModels = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const fetched = await client.listAllAuthorizationModels(storeId, 100)
      setModels(fetched)
      setSelectedIndex(0)
    } catch (err: any) {
      setError(err.message || 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }, [client, storeId])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const handleEdit = useCallback(() => {
    setEditing(true)
  }, [])

  const handleEditorSave = useCallback(() => {
    setEditing(false)
    fetchModels()
  }, [fetchModels])

  const handleEditorClose = useCallback(() => {
    setEditing(false)
  }, [])

  useKeyboard(useCallback((key: { name: string }) => {
    if (editing) return

    switch (key.name) {
      case '[':
        setSelectedIndex(i => Math.max(0, i - 1))
        break
      case ']':
        setSelectedIndex(i => Math.min(models.length - 1, i + 1))
        break
      case 'r':
        fetchModels()
        break
      case 'y': {
        const model = models[selectedIndex]
        if (model) {
          copyToClipboard(modelToDsl(model))
        }
        break
      }
      case 'e':
      case 'c':
        handleEdit()
        break
    }
  }, [models, selectedIndex, fetchModels, editing, handleEdit]))

  if (loading) {
    return <Spinner label="Loading models..." />
  }

  if (error) {
    return (
      <box flexDirection="column" gap={1}>
        <text fg="#ef4444">{error}</text>
        <text fg="#666666">Press 'r' to retry</text>
      </box>
    )
  }

  // Inline editor mode
  if (editing) {
    const currentDsl = models.length > 0
      ? modelToDsl(models[selectedIndex]!)
      : DEFAULT_MODEL

    return (
      <ModelEditor
        client={client}
        storeId={storeId}
        initialDsl={currentDsl}
        onSave={handleEditorSave}
        onClose={handleEditorClose}
      />
    )
  }

  // Empty state - prompt to create a model
  if (models.length === 0) {
    return (
      <box flexDirection="column" gap={1}>
        <text fg="#60a5fa" attributes={1}>Authorization Model</text>
        <text fg="#444444">{'─'.repeat(76)}</text>
        <box height={1} />
        <text fg="#888888">No authorization models found.</text>
        <text fg="#888888">Press [c] to create a new model or [e] to open the editor.</text>
        <box height={1} />
        <box flexDirection="row" gap={2}>
          <text fg="#666666">[c]reate</text>
          <text fg="#666666">[e]dit</text>
          <text fg="#666666">[r]efresh</text>
        </box>
      </box>
    )
  }

  const currentModel = models[selectedIndex]!
  const dsl = modelToDsl(currentModel)
  const highlightedLines = highlightFgaDsl(dsl)

  return (
    <box flexDirection="column" gap={0}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg="#60a5fa" attributes={1}>Authorization Model</text>
        <text fg="#888888">
          Model {selectedIndex + 1}/{models.length}  ID: {currentModel.id.slice(0, 16)}...
        </text>
      </box>
      <text fg="#444444">{'─'.repeat(76)}</text>

      <scrollbox flexGrow={1}>
        <box flexDirection="column">
          {highlightedLines.map((segments, lineIdx) => (
            <box key={lineIdx} flexDirection="row" height={1}>
              <text fg="#555555" width={4}>{String(lineIdx + 1).padStart(3)} </text>
              {segments.map((seg, segIdx) => (
                <text key={segIdx} fg={seg.color} attributes={seg.bold ? 1 : 0}>
                  {seg.text}
                </text>
              ))}
            </box>
          ))}
        </box>
      </scrollbox>

      <text fg="#444444">{'─'.repeat(76)}</text>
      <box flexDirection="row" gap={2}>
        <text fg="#666666">[e]dit</text>
        <text fg="#666666">[c]reate</text>
        <text fg="#666666">[[] prev  []] next</text>
        <text fg="#666666">[y]ank</text>
        <text fg="#666666">[r]efresh</text>
      </box>
    </box>
  )
}
