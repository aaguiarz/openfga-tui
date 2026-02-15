import { useKeyboard } from '@opentui/react'
import { useCallback } from 'react'

interface ConfirmProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function Confirm({ message, onConfirm, onCancel }: ConfirmProps) {
  useKeyboard(useCallback((key: { name: string }) => {
    if (key.name === 'y') {
      onConfirm()
    } else {
      onCancel()
    }
  }, [onConfirm, onCancel]))

  return (
    <box flexDirection="row" gap={1}>
      <text fg="#eab308">{message} [y/N]</text>
    </box>
  )
}
