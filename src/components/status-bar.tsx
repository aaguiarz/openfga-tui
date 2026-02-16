import type { View } from '../lib/navigation.ts'
import { getViewKeybindHints } from '../lib/navigation.ts'

interface StatusBarProps {
  view: View
  serverUrl?: string
  storeName?: string
}

export function StatusBar({ view, serverUrl, storeName }: StatusBarProps) {
  const keybindHints = getViewKeybindHints(view)

  const connectionLabel = serverUrl || 'Not connected'

  const connectionColor = serverUrl
    ? '#22c55e'
    : '#ef4444'

  return (
    <box
      width="100%"
      height={1}
      flexDirection="row"
      justifyContent="space-between"
      borderTop
      borderStyle="single"
      borderColor="#444444"
    >
      <box flexDirection="row" gap={2}>
        <text fg={connectionColor}>{connectionLabel}</text>
        {storeName && <text fg="#888888">| {storeName}</text>}
      </box>
      <text fg="#666666">{keybindHints}</text>
    </box>
  )
}
