import { useState, useEffect, useCallback, useReducer } from 'react'
import { useKeyboard } from '@opentui/react'
import { Spinner } from '../components/spinner.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import { highlightFgaDsl } from '../lib/fga-highlight.ts'
import {
  validateDsl,
  initialEditorState,
  editorReducer,
  canSave,
  getEditorStatusText,
  getEditorStatusColor,
  getLineCount,
} from '../lib/model-editor.ts'

interface ModelEditorProps {
  client: OpenFGAClient
  storeId: string
  initialDsl: string
  onSave: () => void
  onClose: () => void
}

export function ModelEditor({ client, storeId, initialDsl, onSave, onClose }: ModelEditorProps) {
  const [state, dispatch] = useReducer(editorReducer, initialDsl, initialEditorState)
  const [content, setContent] = useState(initialDsl)

  // Validate on content change (debounced via effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = validateDsl(content)
      dispatch({ type: 'validationResult', result })
    }, 500)
    return () => clearTimeout(timer)
  }, [content])

  const handleSave = useCallback(async () => {
    if (!canSave(state)) return

    dispatch({ type: 'save' })
    try {
      const result = validateDsl(state.currentDsl)
      if (!result.valid || !result.model) {
        dispatch({ type: 'saveError', error: 'Invalid model' })
        return
      }
      await client.writeAuthorizationModel(storeId, result.model)
      dispatch({ type: 'saveSuccess', dsl: state.currentDsl })
      onSave()
    } catch (err: any) {
      dispatch({ type: 'saveError', error: err.message || 'Failed to save model' })
    }
  }, [client, storeId, state, onSave])

  useKeyboard(useCallback((key: { name: string; ctrl?: boolean }) => {
    if (key.ctrl && key.name === 's') {
      handleSave()
    } else if (key.name === 'escape') {
      onClose()
    }
  }, [handleSave, onClose]))

  const handleChange = useCallback((value: string) => {
    setContent(value)
    dispatch({ type: 'updateContent', dsl: value })
  }, [])

  const highlightedLines = highlightFgaDsl(state.currentDsl)
  const lineCount = getLineCount(state.currentDsl)
  const statusText = getEditorStatusText(state)
  const statusColor = getEditorStatusColor(state)

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <box flexDirection="row" justifyContent="space-between">
        <text fg="#60a5fa" attributes={1}>Model Editor</text>
        <text fg={statusColor}>{statusText}</text>
      </box>
      <text fg="#444444">{'─'.repeat(76)}</text>

      {/* Split pane */}
      <box flexDirection="row" flexGrow={1}>
        {/* Left: editable textarea */}
        <box flexDirection="column" width="50%">
          <text fg="#888888" attributes={1}>  Editor</text>
          <textarea
            value={content}
            onChange={handleChange}
            flexGrow={1}
          />
        </box>

        {/* Right: highlighted preview */}
        <box flexDirection="column" width="50%">
          <text fg="#888888" attributes={1}>  Preview</text>
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
        </box>
      </box>

      {/* Footer */}
      <text fg="#444444">{'─'.repeat(76)}</text>
      <box flexDirection="row" gap={2}>
        <text fg="#666666">Ctrl+S Save</text>
        <text fg="#666666">Esc Close</text>
        <text fg="#666666">{lineCount} lines</text>
        {state.saveError && <text fg="#f87171">{state.saveError}</text>}
        {state.validation?.valid === true && <text fg="#22c55e">Valid</text>}
        {state.validation?.valid === false && <text fg="#f87171">Invalid</text>}
      </box>
    </box>
  )
}
