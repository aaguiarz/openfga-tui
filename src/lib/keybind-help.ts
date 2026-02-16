import type { View } from './navigation.ts'

export interface KeybindSection {
  title: string
  bindings: { key: string; description: string }[]
}

export function getKeybindSections(view: View): KeybindSection[] {
  const sections: KeybindSection[] = []

  // View-specific keybindings
  switch (view.kind) {
    case 'connect':
      sections.push({
        title: 'Connection',
        bindings: [
          { key: 'Tab / Shift+Tab', description: 'Next / previous field' },
          { key: 'Enter', description: 'Test connection' },
          { key: 'Ctrl+Enter', description: 'Connect' },
        ],
      })
      break

    case 'stores':
      sections.push({
        title: 'Navigation',
        bindings: [
          { key: '↑ / k', description: 'Move up' },
          { key: '↓ / j', description: 'Move down' },
          { key: 'Enter', description: 'Select store' },
        ],
      })
      sections.push({
        title: 'Actions',
        bindings: [
          { key: 'c', description: 'Create new store' },
          { key: 'd', description: 'Delete selected store' },
          { key: 'r', description: 'Refresh list' },
        ],
      })
      break

    case 'store-overview':
      sections.push({
        title: 'Navigation',
        bindings: [
          { key: 'm', description: 'Go to Models' },
          { key: 't', description: 'Go to Tuples' },
          { key: 'q', description: 'Go to Queries' },
        ],
      })
      break

    case 'model':
      sections.push({
        title: 'Actions',
        bindings: [
          { key: 'e', description: 'Edit in $EDITOR' },
          { key: 'v', description: 'Select model version' },
          { key: '[ / ]', description: 'Previous / next version' },
          { key: 'y', description: 'Copy DSL to clipboard' },
          { key: 'g', description: 'Toggle graph view' },
          { key: 'r', description: 'Refresh' },
        ],
      })
      break

    case 'tuples':
      sections.push({
        title: 'Navigation',
        bindings: [
          { key: '↑ / k', description: 'Move up' },
          { key: '↓ / j', description: 'Move down' },
          { key: 'n', description: 'Next page' },
        ],
      })
      sections.push({
        title: 'Actions',
        bindings: [
          { key: 'a', description: 'Add tuple' },
          { key: 'd', description: 'Delete selected tuple' },
          { key: 'r', description: 'Refresh list' },
          { key: '/', description: 'Filter tuples' },
        ],
      })
      break

    case 'queries':
      sections.push({
        title: 'Tabs',
        bindings: [
          { key: '1', description: 'Check' },
          { key: '2', description: 'Expand' },
          { key: '3', description: 'List Objects' },
          { key: '4', description: 'List Users' },
        ],
      })
      sections.push({
        title: 'Query',
        bindings: [
          { key: 'Tab', description: 'Next input field' },
          { key: 'Enter', description: 'Run query' },
        ],
      })
      break
  }

  // Global keybindings always shown last
  sections.push({
    title: 'Global',
    bindings: [
      { key: 'Esc', description: 'Go back' },
      { key: '?', description: 'Toggle this help' },
      { key: 'Ctrl+C', description: 'Exit' },
    ],
  })

  return sections
}

export function renderKeybindHelp(sections: KeybindSection[]): string[] {
  const lines: string[] = []
  const width = 44

  lines.push('╔' + '═'.repeat(width) + '╗')
  lines.push('║' + ' Keyboard Shortcuts'.padEnd(width) + '║')
  lines.push('╠' + '═'.repeat(width) + '╣')

  for (const section of sections) {
    lines.push('║' + ''.padEnd(width) + '║')
    lines.push('║' + ('  ' + section.title).padEnd(width) + '║')

    for (const binding of section.bindings) {
      const keyPad = binding.key.padEnd(16)
      const desc = binding.description
      const line = `  ${keyPad} ${desc}`
      lines.push('║' + line.padEnd(width) + '║')
    }
  }

  lines.push('║' + ''.padEnd(width) + '║')
  lines.push('╚' + '═'.repeat(width) + '╝')

  return lines
}
