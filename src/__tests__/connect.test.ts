import { describe, expect, test } from 'bun:test'
import { formStatusReducer, type FormStatus } from '../lib/form-status.ts'

describe('formStatusReducer', () => {
  test('connect action sets connecting state', () => {
    const state: FormStatus = { state: 'idle' }
    const result = formStatusReducer(state, { type: 'connect' })
    expect(result).toEqual({ state: 'connecting' })
  })

  test('success action sets success with message', () => {
    const state: FormStatus = { state: 'connecting' }
    const result = formStatusReducer(state, { type: 'success', message: 'Connected!' })
    expect(result).toEqual({ state: 'success', message: 'Connected!' })
  })

  test('error action sets error with message', () => {
    const state: FormStatus = { state: 'connecting' }
    const result = formStatusReducer(state, { type: 'error', message: 'Failed!' })
    expect(result).toEqual({ state: 'error', message: 'Failed!' })
  })

  test('reset returns idle', () => {
    const state: FormStatus = { state: 'error', message: 'Something broke' }
    const result = formStatusReducer(state, { type: 'reset' })
    expect(result).toEqual({ state: 'idle' })
  })

  test('can transition from error to connecting', () => {
    const state: FormStatus = { state: 'error', message: 'Fail' }
    const result = formStatusReducer(state, { type: 'connect' })
    expect(result).toEqual({ state: 'connecting' })
  })
})
