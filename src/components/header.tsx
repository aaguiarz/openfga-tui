import type { View } from '../lib/navigation.ts'
import { getBreadcrumb } from '../lib/navigation.ts'

interface HeaderProps {
  view: View
  connected: boolean
  playgroundMode: boolean
}

export function Header({ view, connected, playgroundMode }: HeaderProps) {
  const breadcrumb = getBreadcrumb(view)
  const breadcrumbStr = breadcrumb.join(' > ')

  const statusIndicator = playgroundMode
    ? ' [PLAYGROUND]'
    : connected
      ? ' [CONNECTED]'
      : ' [DISCONNECTED]'

  const statusColor = playgroundMode
    ? '#eab308'
    : connected
      ? '#22c55e'
      : '#ef4444'

  return (
    <box
      width="100%"
      height={1}
      flexDirection="row"
      justifyContent="space-between"
      borderBottom
      borderStyle="single"
      borderColor="#444444"
    >
      <box flexDirection="row" gap={2}>
        <text fg="#60a5fa" attributes={1}>OpenFGA TUI</text>
        <text fg="#888888">{breadcrumbStr}</text>
      </box>
      <text fg={statusColor}>{statusIndicator}</text>
    </box>
  )
}
