import { useEffect, useState } from 'react'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  variant: ToastVariant
  duration?: number
  onDismiss: () => void
}

const variantColors: Record<ToastVariant, string> = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#3b82f6',
}

export function Toast({ message, variant, duration = 3000, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  return (
    <box
      position="absolute"
      top={1}
      right={1}
      border
      borderStyle="rounded"
      borderColor={variantColors[variant]}
      padding={1}
      zIndex={100}
    >
      <text fg={variantColors[variant]}>{message}</text>
    </box>
  )
}

export { type ToastVariant }
