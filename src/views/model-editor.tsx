import { useState, useEffect, useCallback, useReducer, useRef } from 'react'
import { useKeyboard } from '@opentui/react'
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
  const textareaRef = useRef<any>(null)
  const [previewDsl, setPreviewDsl] = useState(initialDsl)

  // Poll content from textarea ref when content changes
  const handleContentChange = useCallback(() => {
    if (textareaRef.current) {
      const text = textareaRef.current.plainText || ''
      setPreviewDsl(text)
      dispatch({ type: 'updateContent', dsl: text })
    }
  }, [])

  // Validate on content change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = validateDsl(state.currentDsl)
      dispatch({ type: 'validationResult', result })
    }, 500)
    return () => clearTimeout(timer)
  }, [state.currentDsl])

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

  const highlightedLines = highlightFgaDsl(previewDsl)
  const lineCount = getLineCount(previewDsl)
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
            ref={textareaRef}
            initialValue={initialDsl}
            focused={true}
            onContentChange={handleContentChange}
            textColor="#e5e7eb"
            backgroundColor="#1a1a2e"
            focusedBackgroundColor="#1a1a2e"
            focusedTextColor="#e5e7eb"
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
