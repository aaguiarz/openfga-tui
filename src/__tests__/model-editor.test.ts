import { describe, expect, test } from 'bun:test'
import {
  validateDsl,
  initialEditorState,
  editorReducer,
  canSave,
  hasUnsavedChanges,
  getEditorStatusText,
  getEditorStatusColor,
  offsetToCursorPosition,
  getLineCount,
  getLineAtIndex,
  type EditorState,
} from '../lib/model-editor.ts'

const VALID_DSL = `model
  schema 1.1

type user

type document
  relations
    define viewer: [user]`

const MINIMAL_DSL = `model
  schema 1.1

type user`

// --- validateDsl ---

describe('validateDsl', () => {
  test('valid DSL returns valid result with model', () => {
    const result = validateDsl(VALID_DSL)
    expect(result.valid).toBe(true)
    expect(result.model).toBeDefined()
    expect(result.model!.type_definitions!.length).toBeGreaterThanOrEqual(1)
    expect(result.error).toBeUndefined()
  })

  test('minimal valid DSL with just a type', () => {
    const result = validateDsl(MINIMAL_DSL)
    expect(result.valid).toBe(true)
    expect(result.model).toBeDefined()
  })

  test('empty string returns invalid', () => {
    const result = validateDsl('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Model is empty')
  })

  test('whitespace-only returns invalid', () => {
    const result = validateDsl('   \n  \n  ')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Model is empty')
  })

  test('invalid DSL returns error message', () => {
    const result = validateDsl('not valid fga')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  test('DSL with no type definitions returns error', () => {
    const result = validateDsl('model\n  schema 1.1\n')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Model must define at least one type')
  })
})

// --- initialEditorState ---

describe('initialEditorState', () => {
  test('creates state with original DSL', () => {
    const state = initialEditorState(VALID_DSL)
    expect(state.originalDsl).toBe(VALID_DSL)
    expect(state.currentDsl).toBe(VALID_DSL)
    expect(state.status).toBe('idle')
    expect(state.isDirty).toBe(false)
    expect(state.validation).toBeNull()
    expect(state.saveError).toBeNull()
  })
})

// --- editorReducer ---

describe('editorReducer', () => {
  test('startEditing transitions to editing', () => {
    const state = initialEditorState(VALID_DSL)
    const next = editorReducer(state, { type: 'startEditing' })
    expect(next.status).toBe('editing')
  })

  test('updateContent sets currentDsl and isDirty', () => {
    const state = initialEditorState(VALID_DSL)
    const next = editorReducer(state, { type: 'updateContent', dsl: 'changed' })
    expect(next.currentDsl).toBe('changed')
    expect(next.isDirty).toBe(true)
    expect(next.status).toBe('editing')
  })

  test('updateContent with same content is not dirty', () => {
    const state = initialEditorState(VALID_DSL)
    const next = editorReducer(state, { type: 'updateContent', dsl: VALID_DSL })
    expect(next.isDirty).toBe(false)
  })

  test('updateContent clears saveError', () => {
    let state = initialEditorState(VALID_DSL)
    state = { ...state, saveError: 'some error' }
    const next = editorReducer(state, { type: 'updateContent', dsl: 'new content' })
    expect(next.saveError).toBeNull()
  })

  test('validate transitions to validating', () => {
    const state = initialEditorState(VALID_DSL)
    const next = editorReducer(state, { type: 'validate' })
    expect(next.status).toBe('validating')
  })

  test('validationResult with valid result transitions to editing', () => {
    const state = initialEditorState(VALID_DSL)
    const result = validateDsl(VALID_DSL)
    const next = editorReducer(state, { type: 'validationResult', result })
    expect(next.status).toBe('editing')
    expect(next.validation).toEqual(result)
  })

  test('validationResult with invalid result transitions to error', () => {
    const state = initialEditorState(VALID_DSL)
    const result = validateDsl('')
    const next = editorReducer(state, { type: 'validationResult', result })
    expect(next.status).toBe('error')
    expect(next.saveError).toBe('Model is empty')
  })

  test('save with valid model transitions to saving', () => {
    let state = initialEditorState(VALID_DSL)
    const result = validateDsl(VALID_DSL)
    state = editorReducer(state, { type: 'validationResult', result })
    const next = editorReducer(state, { type: 'save' })
    expect(next.status).toBe('saving')
  })

  test('save without valid validation stays in error', () => {
    const state = initialEditorState(VALID_DSL)
    const next = editorReducer(state, { type: 'save' })
    expect(next.status).toBe('error')
    expect(next.saveError).toBe('Cannot save: model is invalid')
  })

  test('saveSuccess updates original and clears dirty', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: 'new content' })
    const next = editorReducer(state, { type: 'saveSuccess', dsl: 'new content' })
    expect(next.status).toBe('saved')
    expect(next.originalDsl).toBe('new content')
    expect(next.isDirty).toBe(false)
  })

  test('saveError sets error status and message', () => {
    const state = initialEditorState(VALID_DSL)
    const next = editorReducer(state, { type: 'saveError', error: 'Network error' })
    expect(next.status).toBe('error')
    expect(next.saveError).toBe('Network error')
  })

  test('reset restores original content', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: 'changed' })
    const next = editorReducer(state, { type: 'reset' })
    expect(next.currentDsl).toBe(VALID_DSL)
    expect(next.isDirty).toBe(false)
    expect(next.status).toBe('idle')
    expect(next.validation).toBeNull()
  })

  test('dismiss goes to editing when dirty', () => {
    let state = initialEditorState(VALID_DSL)
    state = { ...state, isDirty: true, status: 'error', saveError: 'err' }
    const next = editorReducer(state, { type: 'dismiss' })
    expect(next.status).toBe('editing')
    expect(next.saveError).toBeNull()
  })

  test('dismiss goes to idle when not dirty', () => {
    let state = initialEditorState(VALID_DSL)
    state = { ...state, isDirty: false, status: 'error', saveError: 'err' }
    const next = editorReducer(state, { type: 'dismiss' })
    expect(next.status).toBe('idle')
    expect(next.saveError).toBeNull()
  })
})

// --- canSave ---

describe('canSave', () => {
  test('returns false when not dirty', () => {
    const state = initialEditorState(VALID_DSL)
    expect(canSave(state)).toBe(false)
  })

  test('returns false when no validation', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: 'changed' })
    expect(canSave(state)).toBe(false)
  })

  test('returns false when validation is invalid', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: 'changed' })
    state = editorReducer(state, { type: 'validationResult', result: { valid: false, error: 'err' } })
    expect(canSave(state)).toBe(false)
  })

  test('returns true when dirty and validation is valid', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: MINIMAL_DSL })
    state = editorReducer(state, { type: 'validationResult', result: validateDsl(MINIMAL_DSL) })
    expect(canSave(state)).toBe(true)
  })

  test('returns false when saving', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: MINIMAL_DSL })
    state = editorReducer(state, { type: 'validationResult', result: validateDsl(MINIMAL_DSL) })
    state = editorReducer(state, { type: 'save' })
    expect(canSave(state)).toBe(false)
  })
})

// --- hasUnsavedChanges ---

describe('hasUnsavedChanges', () => {
  test('returns false initially', () => {
    expect(hasUnsavedChanges(initialEditorState(VALID_DSL))).toBe(false)
  })

  test('returns true after content change', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: 'changed' })
    expect(hasUnsavedChanges(state)).toBe(true)
  })
})

// --- getEditorStatusText ---

describe('getEditorStatusText', () => {
  test('idle shows Ready', () => {
    expect(getEditorStatusText(initialEditorState(VALID_DSL))).toBe('Ready')
  })

  test('editing dirty shows Modified', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: 'changed' })
    expect(getEditorStatusText(state)).toBe('Modified')
  })

  test('editing not dirty shows Ready', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'startEditing' })
    expect(getEditorStatusText(state)).toBe('Ready')
  })

  test('validating shows Validating...', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'validate' })
    expect(getEditorStatusText(state)).toBe('Validating...')
  })

  test('saving shows Saving...', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: MINIMAL_DSL })
    state = editorReducer(state, { type: 'validationResult', result: validateDsl(MINIMAL_DSL) })
    state = editorReducer(state, { type: 'save' })
    expect(getEditorStatusText(state)).toBe('Saving...')
  })

  test('saved shows Saved', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'saveSuccess', dsl: VALID_DSL })
    expect(getEditorStatusText(state)).toBe('Saved')
  })

  test('error shows error message', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'saveError', error: 'Connection failed' })
    expect(getEditorStatusText(state)).toBe('Connection failed')
  })
})

// --- getEditorStatusColor ---

describe('getEditorStatusColor', () => {
  test('idle is gray', () => {
    expect(getEditorStatusColor(initialEditorState(VALID_DSL))).toBe('#e5e7eb')
  })

  test('editing dirty is yellow', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: 'changed' })
    expect(getEditorStatusColor(state)).toBe('#fbbf24')
  })

  test('saving is blue', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'updateContent', dsl: MINIMAL_DSL })
    state = editorReducer(state, { type: 'validationResult', result: validateDsl(MINIMAL_DSL) })
    state = editorReducer(state, { type: 'save' })
    expect(getEditorStatusColor(state)).toBe('#60a5fa')
  })

  test('saved is green', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'saveSuccess', dsl: VALID_DSL })
    expect(getEditorStatusColor(state)).toBe('#22c55e')
  })

  test('error is red', () => {
    let state = initialEditorState(VALID_DSL)
    state = editorReducer(state, { type: 'saveError', error: 'fail' })
    expect(getEditorStatusColor(state)).toBe('#f87171')
  })
})

// --- Cursor position ---

describe('offsetToCursorPosition', () => {
  test('offset 0 is line 1, column 1', () => {
    expect(offsetToCursorPosition('hello', 0)).toEqual({ line: 1, column: 1 })
  })

  test('offset in first line', () => {
    expect(offsetToCursorPosition('hello world', 5)).toEqual({ line: 1, column: 6 })
  })

  test('offset after newline', () => {
    expect(offsetToCursorPosition('hello\nworld', 6)).toEqual({ line: 2, column: 1 })
  })

  test('offset in second line', () => {
    expect(offsetToCursorPosition('hello\nworld', 8)).toEqual({ line: 2, column: 3 })
  })

  test('multiple newlines', () => {
    expect(offsetToCursorPosition('a\nb\nc', 4)).toEqual({ line: 3, column: 1 })
  })

  test('offset beyond text length', () => {
    const result = offsetToCursorPosition('hi', 10)
    // Should stop at end of text
    expect(result.line).toBe(1)
    expect(result.column).toBe(3)
  })
})

describe('getLineCount', () => {
  test('empty string returns 0', () => {
    expect(getLineCount('')).toBe(0)
  })

  test('single line', () => {
    expect(getLineCount('hello')).toBe(1)
  })

  test('multiple lines', () => {
    expect(getLineCount('a\nb\nc')).toBe(3)
  })

  test('trailing newline', () => {
    expect(getLineCount('a\nb\n')).toBe(3)
  })
})

describe('getLineAtIndex', () => {
  test('first line', () => {
    expect(getLineAtIndex('hello\nworld', 0)).toBe('hello')
  })

  test('second line', () => {
    expect(getLineAtIndex('hello\nworld', 1)).toBe('world')
  })

  test('out of bounds returns empty string', () => {
    expect(getLineAtIndex('hello', 5)).toBe('')
  })

  test('empty string with index 0', () => {
    expect(getLineAtIndex('', 0)).toBe('')
  })
})
