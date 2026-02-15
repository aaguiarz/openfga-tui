import { useState, useEffect, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { Spinner } from '../components/spinner.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import type { AuthorizationModel } from '../lib/openfga/types.ts'
import { modelToDsl } from '../lib/openfga/dsl-converter.ts'
import { highlightFgaDsl } from '../lib/fga-highlight.ts'

interface ModelViewerProps {
  client: OpenFGAClient
  storeId: string
}

export function ModelViewer({ client, storeId }: ModelViewerProps) {
  const [models, setModels] = useState<AuthorizationModel[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const fetchModels = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const response = await client.listAuthorizationModels(storeId, 100)
      const fetched = response.authorization_models || []
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

  useKeyboard(useCallback((key: { name: string }) => {
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
        // Copy to clipboard
        const model = models[selectedIndex]
        if (model) {
          const dsl = modelToDsl(model)
          // Use pbcopy on macOS, xclip on Linux
          try {
            const proc = Bun.spawn(['pbcopy'], { stdin: 'pipe' })
            proc.stdin.write(dsl)
            proc.stdin.end()
          } catch {
            // Silently fail if clipboard not available
          }
        }
        break
      }
      case 'e': {
        // Open in $EDITOR
        const model = models[selectedIndex]
        if (model) {
          openInEditor(modelToDsl(model))
        }
        break
      }
    }
  }, [models, selectedIndex, fetchModels]))

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

  if (models.length === 0) {
    return <text fg="#666666">No authorization models found.</text>
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
        <text fg="#666666">[v]ersion [{selectedIndex + 1}/{models.length}]</text>
        <text fg="#666666">[y]ank</text>
        <text fg="#666666">[r]efresh</text>
      </box>
    </box>
  )
}

async function openInEditor(content: string): Promise<string | null> {
  try {
    const tmpPath = `/tmp/claude/openfga-model-${Date.now()}.fga`
    await Bun.write(tmpPath, content)

    const editor = Bun.env.EDITOR || Bun.env.VISUAL || 'vi'
    const proc = Bun.spawn([editor, tmpPath], {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    })
    await proc.exited

    const result = await Bun.file(tmpPath).text()
    const { unlink } = await import('fs/promises')
    await unlink(tmpPath)
    return result
  } catch {
    return null
  }
}
