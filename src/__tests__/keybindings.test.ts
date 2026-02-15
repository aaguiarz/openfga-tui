import { describe, expect, test } from 'bun:test'
import { getKeyMap, matchesAction, resolveKeyAction, type KeymapMode } from '../lib/keybindings.ts'

describe('getKeyMap', () => {
  test('default mode includes arrow keys', () => {
    const keyMap = getKeyMap('default')
    expect(keyMap.moveUp).toContain('up')
    expect(keyMap.moveDown).toContain('down')
  })

  test('default mode does not include vim keys', () => {
    const keyMap = getKeyMap('default')
    expect(keyMap.moveUp).not.toContain('k')
    expect(keyMap.moveDown).not.toContain('j')
  })

  test('vim mode includes j/k', () => {
    const keyMap = getKeyMap('vim')
    expect(keyMap.moveUp).toContain('k')
    expect(keyMap.moveDown).toContain('j')
  })

  test('vim mode also includes arrow keys', () => {
    const keyMap = getKeyMap('vim')
    expect(keyMap.moveUp).toContain('up')
    expect(keyMap.moveDown).toContain('down')
  })

  test('vim mode includes ctrl+d/u for paging', () => {
    const keyMap = getKeyMap('vim')
    expect(keyMap.pageDown).toContain('ctrl+d')
    expect(keyMap.pageUp).toContain('ctrl+u')
  })

  test('vim mode includes shift+g for jump to bottom', () => {
    const keyMap = getKeyMap('vim')
    expect(keyMap.jumpBottom).toContain('shift+g')
  })

  test('both modes include return for select', () => {
    expect(getKeyMap('default').select).toContain('return')
    expect(getKeyMap('vim').select).toContain('return')
  })

  test('both modes include escape for back', () => {
    expect(getKeyMap('default').back).toContain('escape')
    expect(getKeyMap('vim').back).toContain('escape')
  })

  test('both modes include / for search', () => {
    expect(getKeyMap('default').search).toContain('/')
    expect(getKeyMap('vim').search).toContain('/')
  })
})

describe('matchesAction', () => {
  test('matches arrow key for default mode', () => {
    const keyMap = getKeyMap('default')
    expect(matchesAction('up', 'moveUp', keyMap)).toBe(true)
  })

  test('does not match j for default mode moveUp', () => {
    const keyMap = getKeyMap('default')
    expect(matchesAction('j', 'moveDown', keyMap)).toBe(false)
  })

  test('matches j for vim mode moveDown', () => {
    const keyMap = getKeyMap('vim')
    expect(matchesAction('j', 'moveDown', keyMap)).toBe(true)
  })

  test('matches k for vim mode moveUp', () => {
    const keyMap = getKeyMap('vim')
    expect(matchesAction('k', 'moveUp', keyMap)).toBe(true)
  })

  test('does not match unrelated key', () => {
    const keyMap = getKeyMap('vim')
    expect(matchesAction('x', 'moveUp', keyMap)).toBe(false)
  })
})

describe('resolveKeyAction', () => {
  test('resolves up arrow to moveUp', () => {
    const keyMap = getKeyMap('default')
    expect(resolveKeyAction('up', keyMap)).toBe('moveUp')
  })

  test('resolves j to moveDown in vim mode', () => {
    const keyMap = getKeyMap('vim')
    expect(resolveKeyAction('j', keyMap)).toBe('moveDown')
  })

  test('resolves return to select', () => {
    const keyMap = getKeyMap('default')
    expect(resolveKeyAction('return', keyMap)).toBe('select')
  })

  test('resolves escape to back', () => {
    const keyMap = getKeyMap('default')
    expect(resolveKeyAction('escape', keyMap)).toBe('back')
  })

  test('returns null for unknown key', () => {
    const keyMap = getKeyMap('default')
    expect(resolveKeyAction('x', keyMap)).toBeNull()
  })

  test('resolves ctrl+d to pageDown in vim mode', () => {
    const keyMap = getKeyMap('vim')
    expect(resolveKeyAction('ctrl+d', keyMap)).toBe('pageDown')
  })

  test('resolves shift+g to jumpBottom in vim mode', () => {
    const keyMap = getKeyMap('vim')
    expect(resolveKeyAction('shift+g', keyMap)).toBe('jumpBottom')
  })
})
