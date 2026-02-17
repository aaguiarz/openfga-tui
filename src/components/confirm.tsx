import { useKeyboard } from '@opentui/react'
import { useCallback } from 'react'

interface ConfirmProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export type ConfirmKeyAction = 'confirm' | 'cancel' | 'ignore'

export function resolveConfirmKeyAction(keyName: string): ConfirmKeyAction {
  if (keyName === 'y') return 'confirm'
  if (keyName === 'n' || keyName === 'escape' || keyName === 'return') return 'cancel'
  return 'ignore'
}

export function Confirm({ message, onConfirm, onCancel }: ConfirmProps) {
  useKeyboard(useCallback((key: { name: string }) => {
    const action = resolveConfirmKeyAction(key.name)
    if (action === 'confirm') {
      onConfirm()
    } else if (action === 'cancel') {
      onCancel()
    }
  }, [onConfirm, onCancel]))

  return (
    <box flexDirection="row" gap={1}>
      <text fg="#eab308">{message} [y/N]</text>
    </box>
  )
}
