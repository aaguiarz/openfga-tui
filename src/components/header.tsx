import type { View } from '../lib/navigation.ts'
import { getBreadcrumb } from '../lib/navigation.ts'

interface HeaderProps {
  view: View
  connected: boolean
  storeName?: string
}

export function Header({ view, connected, storeName }: HeaderProps) {
  const breadcrumb = getBreadcrumb(view, storeName)
  const breadcrumbStr = breadcrumb.join(' > ')

  const statusIndicator = connected
    ? ' [CONNECTED]'
    : ' [DISCONNECTED]'

  const statusColor = connected
    ? '#22c55e'
    : '#ef4444'

  return (
    <box
      width="100%"
      height={1}
      flexDirection="row"
      justifyContent="space-between"
    >
      <box flexDirection="row" gap={2}>
        <text fg="#60a5fa" attributes={1}>OpenFGA TUI</text>
        <text fg="#888888">{breadcrumbStr}</text>
      </box>
      <text fg={statusColor}>{statusIndicator}</text>
    </box>
  )
}
