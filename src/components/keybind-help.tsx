import { useKeyboard } from '@opentui/react'
import { useCallback } from 'react'
import type { View } from '../lib/navigation.ts'
import { getKeybindSections } from '../lib/keybind-help.ts'

interface KeybindHelpProps {
  view: View
  onDismiss: () => void
}

export function KeybindHelp({ view, onDismiss }: KeybindHelpProps) {
  const sections = getKeybindSections(view)

  useKeyboard(useCallback((key: { name: string }) => {
    if (key.name === '?' || key.name === 'escape') {
      onDismiss()
    }
  }, [onDismiss]))

  return (
    <box
      position="absolute"
      top={2}
      left={0}
      right={0}
      bottom={2}
      justifyContent="center"
      alignItems="center"
      zIndex={50}
    >
      <box
        border
        borderStyle="double"
        borderColor="#60a5fa"
        padding={1}
        flexDirection="column"
        width={48}
        backgroundColor="#1a1a2e"
      >
        <text fg="#60a5fa" attributes={1}>  Keyboard Shortcuts</text>
        <box height={1} />

        {sections.map((section, sIdx) => (
          <box key={sIdx} flexDirection="column">
            <text fg="#eab308" attributes={1}>  {section.title}</text>
            {section.bindings.map((binding, bIdx) => (
              <box key={bIdx} flexDirection="row">
                <text fg="#22c55e" width={18}>  {binding.key}</text>
                <text fg="#e5e7eb">{binding.description}</text>
              </box>
            ))}
            <box height={1} />
          </box>
        ))}
      </box>
    </box>
  )
}
