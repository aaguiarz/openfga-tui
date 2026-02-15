import { useState, useEffect } from 'react'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

interface SpinnerProps {
  label?: string
}

export function Spinner({ label = 'Loading...' }: SpinnerProps) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % SPINNER_FRAMES.length)
    }, 80)
    return () => clearInterval(interval)
  }, [])

  return (
    <text fg="#60a5fa">{SPINNER_FRAMES[frame]} {label}</text>
  )
}

export { SPINNER_FRAMES }
