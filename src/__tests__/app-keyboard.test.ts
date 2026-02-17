import { describe, expect, test } from 'bun:test'
import { handleAppKey } from '../lib/app-keyboard.ts'

describe('handleAppKey', () => {
  test('toggles keyboard help on ? key', () => {
    const opened = handleAppKey({ keyName: '?', helpVisible: false, viewKind: 'stores' })
    expect(opened.helpVisible).toBe(true)
    expect(opened.shouldGoBack).toBe(false)

    const closed = handleAppKey({ keyName: '?', helpVisible: true, viewKind: 'stores' })
    expect(closed.helpVisible).toBe(false)
    expect(closed.shouldGoBack).toBe(false)
  })

  test('swallows non-help keys while help is visible', () => {
    const result = handleAppKey({ keyName: 'escape', helpVisible: true, viewKind: 'model' })
    expect(result.helpVisible).toBe(false)
    expect(result.shouldGoBack).toBe(false)
  })

  test('allows escape back navigation for model and store-overview', () => {
    const model = handleAppKey({ keyName: 'escape', helpVisible: false, viewKind: 'model' })
    expect(model.shouldGoBack).toBe(true)

    const overview = handleAppKey({ keyName: 'escape', helpVisible: false, viewKind: 'store-overview' })
    expect(overview.shouldGoBack).toBe(true)
  })
})
