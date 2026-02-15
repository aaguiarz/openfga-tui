import { describe, expect, test } from 'bun:test'
import { getKeybindSections, renderKeybindHelp } from '../lib/keybind-help.ts'
import type { View } from '../lib/navigation.ts'

describe('getKeybindSections', () => {
  test('connect view has Connection section', () => {
    const sections = getKeybindSections({ kind: 'connect' })
    expect(sections.some(s => s.title === 'Connection')).toBe(true)
  })

  test('stores view has Navigation and Actions sections', () => {
    const sections = getKeybindSections({ kind: 'stores' })
    expect(sections.some(s => s.title === 'Navigation')).toBe(true)
    expect(sections.some(s => s.title === 'Actions')).toBe(true)
  })

  test('store-overview has Navigation section with m/t/q', () => {
    const sections = getKeybindSections({ kind: 'store-overview', storeId: 's1' })
    const nav = sections.find(s => s.title === 'Navigation')
    expect(nav).toBeDefined()
    expect(nav!.bindings.some(b => b.key === 'm')).toBe(true)
    expect(nav!.bindings.some(b => b.key === 't')).toBe(true)
    expect(nav!.bindings.some(b => b.key === 'q')).toBe(true)
  })

  test('model view has Actions section', () => {
    const sections = getKeybindSections({ kind: 'model', storeId: 's1' })
    const actions = sections.find(s => s.title === 'Actions')
    expect(actions).toBeDefined()
    expect(actions!.bindings.some(b => b.key === 'e')).toBe(true)
    expect(actions!.bindings.some(b => b.key === 'y')).toBe(true)
  })

  test('tuples view has Navigation and Actions', () => {
    const sections = getKeybindSections({ kind: 'tuples', storeId: 's1' })
    expect(sections.some(s => s.title === 'Navigation')).toBe(true)
    expect(sections.some(s => s.title === 'Actions')).toBe(true)
    const actions = sections.find(s => s.title === 'Actions')
    expect(actions!.bindings.some(b => b.key === 'a')).toBe(true)
    expect(actions!.bindings.some(b => b.key === 'd')).toBe(true)
  })

  test('queries view has Tabs and Query sections', () => {
    const sections = getKeybindSections({ kind: 'queries', storeId: 's1' })
    expect(sections.some(s => s.title === 'Tabs')).toBe(true)
    expect(sections.some(s => s.title === 'Query')).toBe(true)
  })

  test('all views have Global section at end', () => {
    const views: View[] = [
      { kind: 'connect' },
      { kind: 'stores' },
      { kind: 'store-overview', storeId: 's1' },
      { kind: 'model', storeId: 's1' },
      { kind: 'tuples', storeId: 's1' },
      { kind: 'queries', storeId: 's1' },
    ]

    for (const view of views) {
      const sections = getKeybindSections(view)
      const last = sections[sections.length - 1]
      expect(last!.title).toBe('Global')
      expect(last!.bindings.some(b => b.key === 'Ctrl+C')).toBe(true)
    }
  })

  test('Global section includes Esc and ? and Ctrl+C', () => {
    const sections = getKeybindSections({ kind: 'connect' })
    const global = sections.find(s => s.title === 'Global')
    expect(global!.bindings.some(b => b.key === 'Esc')).toBe(true)
    expect(global!.bindings.some(b => b.key === '?')).toBe(true)
    expect(global!.bindings.some(b => b.key === 'Ctrl+C')).toBe(true)
  })
})

describe('renderKeybindHelp', () => {
  test('renders box-drawing border', () => {
    const sections = getKeybindSections({ kind: 'connect' })
    const lines = renderKeybindHelp(sections)
    expect(lines[0]).toContain('╔')
    expect(lines[lines.length - 1]).toContain('╝')
  })

  test('includes title', () => {
    const sections = getKeybindSections({ kind: 'connect' })
    const lines = renderKeybindHelp(sections)
    const text = lines.join('\n')
    expect(text).toContain('Keyboard Shortcuts')
  })

  test('includes section titles', () => {
    const sections = getKeybindSections({ kind: 'stores' })
    const lines = renderKeybindHelp(sections)
    const text = lines.join('\n')
    expect(text).toContain('Navigation')
    expect(text).toContain('Actions')
    expect(text).toContain('Global')
  })

  test('includes keybindings', () => {
    const sections = getKeybindSections({ kind: 'stores' })
    const lines = renderKeybindHelp(sections)
    const text = lines.join('\n')
    expect(text).toContain('Create new store')
    expect(text).toContain('Delete selected store')
  })
})
