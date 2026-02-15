/**
 * Model editor state machine and validation logic.
 * Pure logic for the inline model editor (Step 13).
 */

import { dslToModel } from './openfga/dsl-converter.ts'
import type { AuthorizationModel } from './openfga/types.ts'

// --- Validation ---

export interface ValidationResult {
  valid: boolean
  model?: Omit<AuthorizationModel, 'id'>
  error?: string
}

export function validateDsl(dsl: string): ValidationResult {
  if (!dsl.trim()) {
    return { valid: false, error: 'Model is empty' }
  }

  try {
    const model = dslToModel(dsl)
    if (!model.type_definitions || model.type_definitions.length === 0) {
      return { valid: false, error: 'Model must define at least one type' }
    }
    return { valid: true, model }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid DSL syntax'
    return { valid: false, error: message }
  }
}

// --- Editor state machine ---

export type EditorStatus = 'idle' | 'editing' | 'validating' | 'saving' | 'saved' | 'error'

export interface EditorState {
  status: EditorStatus
  originalDsl: string
  currentDsl: string
  validation: ValidationResult | null
  saveError: string | null
  isDirty: boolean
}

export function initialEditorState(dsl: string): EditorState {
  return {
    status: 'idle',
    originalDsl: dsl,
    currentDsl: dsl,
    validation: null,
    saveError: null,
    isDirty: false,
  }
}

export type EditorAction =
  | { type: 'startEditing' }
  | { type: 'updateContent'; dsl: string }
  | { type: 'validate' }
  | { type: 'validationResult'; result: ValidationResult }
  | { type: 'save' }
  | { type: 'saveSuccess'; dsl: string }
  | { type: 'saveError'; error: string }
  | { type: 'reset' }
  | { type: 'dismiss' }

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'startEditing':
      return { ...state, status: 'editing' }

    case 'updateContent': {
      const isDirty = action.dsl !== state.originalDsl
      return {
        ...state,
        currentDsl: action.dsl,
        isDirty,
        status: 'editing',
        saveError: null,
      }
    }

    case 'validate':
      return { ...state, status: 'validating' }

    case 'validationResult':
      return {
        ...state,
        validation: action.result,
        status: action.result.valid ? 'editing' : 'error',
        saveError: action.result.valid ? null : action.result.error || null,
      }

    case 'save':
      if (!state.validation?.valid) {
        return { ...state, status: 'error', saveError: 'Cannot save: model is invalid' }
      }
      return { ...state, status: 'saving', saveError: null }

    case 'saveSuccess':
      return {
        ...state,
        status: 'saved',
        originalDsl: action.dsl,
        isDirty: false,
        saveError: null,
      }

    case 'saveError':
      return { ...state, status: 'error', saveError: action.error }

    case 'reset':
      return {
        ...state,
        currentDsl: state.originalDsl,
        isDirty: false,
        status: 'idle',
        validation: null,
        saveError: null,
      }

    case 'dismiss':
      return { ...state, status: state.isDirty ? 'editing' : 'idle', saveError: null }
  }
}

// --- Helpers ---

export function canSave(state: EditorState): boolean {
  return state.isDirty && state.validation?.valid === true && state.status !== 'saving'
}

export function hasUnsavedChanges(state: EditorState): boolean {
  return state.isDirty
}

export function getEditorStatusText(state: EditorState): string {
  switch (state.status) {
    case 'idle':
      return 'Ready'
    case 'editing':
      return state.isDirty ? 'Modified' : 'Ready'
    case 'validating':
      return 'Validating...'
    case 'saving':
      return 'Saving...'
    case 'saved':
      return 'Saved'
    case 'error':
      return state.saveError || 'Error'
  }
}

export function getEditorStatusColor(state: EditorState): string {
  switch (state.status) {
    case 'idle':
      return '#e5e7eb'
    case 'editing':
      return state.isDirty ? '#fbbf24' : '#e5e7eb'
    case 'validating':
      return '#60a5fa'
    case 'saving':
      return '#60a5fa'
    case 'saved':
      return '#22c55e'
    case 'error':
      return '#f87171'
  }
}

// --- Line/column tracking ---

export interface CursorPosition {
  line: number
  column: number
}

export function offsetToCursorPosition(text: string, offset: number): CursorPosition {
  let line = 1
  let column = 1

  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++
      column = 1
    } else {
      column++
    }
  }

  return { line, column }
}

export function getLineCount(text: string): number {
  if (!text) return 0
  return text.split('\n').length
}

export function getLineAtIndex(text: string, lineIndex: number): string {
  const lines = text.split('\n')
  return lines[lineIndex] ?? ''
}
