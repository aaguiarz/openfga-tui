import { describe, expect, test } from 'bun:test'
import { resolveConfirmKeyAction } from '../components/confirm.tsx'

describe('resolveConfirmKeyAction', () => {
  test('confirms only on y', () => {
    expect(resolveConfirmKeyAction('y')).toBe('confirm')
  })

  test('cancels only on explicit cancel keys', () => {
    expect(resolveConfirmKeyAction('n')).toBe('cancel')
    expect(resolveConfirmKeyAction('escape')).toBe('cancel')
    expect(resolveConfirmKeyAction('return')).toBe('cancel')
  })

  test('ignores unrelated keys', () => {
    expect(resolveConfirmKeyAction('up')).toBe('ignore')
    expect(resolveConfirmKeyAction('left')).toBe('ignore')
    expect(resolveConfirmKeyAction('a')).toBe('ignore')
  })
})
