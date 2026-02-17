import { platform } from 'os'

/**
 * Copy text to the system clipboard.
 * Detects the platform and uses the appropriate command:
 * - macOS: pbcopy
 * - Linux/X11: xclip -selection clipboard
 * - Linux/Wayland: wl-copy
 * - WSL: clip.exe
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const cmd = getClipboardCommand()
  if (!cmd) return false

  try {
    const proc = Bun.spawn(cmd, { stdin: 'pipe' })
    proc.stdin.write(text)
    proc.stdin.end()
    await proc.exited
    return proc.exitCode === 0
  } catch {
    return false
  }
}

function getClipboardCommand(): string[] | null {
  const os = platform()

  if (os === 'darwin') {
    return ['pbcopy']
  }

  if (os === 'linux') {
    // WSL detection
    if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
      return ['clip.exe']
    }
    // Wayland
    if (process.env.WAYLAND_DISPLAY) {
      return ['wl-copy']
    }
    // X11 (default for Linux)
    return ['xclip', '-selection', 'clipboard']
  }

  if (os === 'win32') {
    return ['clip.exe']
  }

  return null
}
