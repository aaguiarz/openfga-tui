import type { Tuple } from './openfga/types.ts'

export interface ServerFilter {
  user: string
  relation: string
  object: string
}

export const EMPTY_FILTER: ServerFilter = { user: '', relation: '', object: '' }

export function isFilterActive(filter: ServerFilter): boolean {
  return !!(filter.user.trim() || filter.relation.trim() || filter.object.trim())
}

export function filterDescription(filter: ServerFilter): string {
  const parts: string[] = []
  if (filter.user.trim()) parts.push(`user=${filter.user.trim()}`)
  if (filter.relation.trim()) parts.push(`relation=${filter.relation.trim()}`)
  if (filter.object.trim()) parts.push(`object=${filter.object.trim()}`)
  return parts.join(', ')
}

// OpenFGA requires user/object in "type:id" format. If the user types just
// "document" (no colon), treat it as "document:" meaning "all of this type".
function ensureTypeFormat(value: string): string {
  const trimmed = value.trim()
  return trimmed && !trimmed.includes(':') ? `${trimmed}:` : trimmed
}

export function buildTupleKeyFromFilter(filter: ServerFilter): Record<string, string> | undefined {
  const key: Record<string, string> = {}
  const user = ensureTypeFormat(filter.user)
  if (user) key.user = user
  if (filter.relation.trim()) key.relation = filter.relation.trim()
  const object = ensureTypeFormat(filter.object)
  if (object) key.object = object
  return Object.keys(key).length > 0 ? key : undefined
}

export type TupleListState =
  | { status: 'loading' }
  | { status: 'loaded'; tuples: Tuple[]; selectedIndex: number; continuationToken?: string }
  | { status: 'error'; message: string }
  | { status: 'adding'; tuples: Tuple[]; selectedIndex: number; continuationToken?: string }
  | { status: 'confirming-delete'; tuples: Tuple[]; selectedIndex: number; continuationToken?: string }
  | { status: 'filtering'; tuples: Tuple[]; selectedIndex: number; continuationToken?: string }

export type TupleListAction =
  | { type: 'load' }
  | { type: 'loaded'; tuples: Tuple[]; continuationToken?: string; append?: boolean }
  | { type: 'error'; message: string }
  | { type: 'move-up' }
  | { type: 'move-down' }
  | { type: 'start-add' }
  | { type: 'cancel-add' }
  | { type: 'start-delete' }
  | { type: 'cancel-delete' }
  | { type: 'start-filter' }
  | { type: 'cancel-filter' }

export function tupleListReducer(state: TupleListState, action: TupleListAction): TupleListState {
  switch (action.type) {
    case 'load':
      return { status: 'loading' }

    case 'loaded':
      if (action.append && 'tuples' in state) {
        const merged = [...state.tuples, ...action.tuples]
        return {
          ...state,
          status: 'loaded',
          tuples: merged,
          selectedIndex: state.selectedIndex,
          continuationToken: action.continuationToken,
        }
      }
      return {
        status: 'loaded',
        tuples: action.tuples,
        selectedIndex: 0,
        continuationToken: action.continuationToken,
      }

    case 'error':
      return { status: 'error', message: action.message }

    case 'move-up':
      if (!('tuples' in state)) return state
      return { ...state, selectedIndex: Math.max(0, state.selectedIndex - 1) }

    case 'move-down':
      if (!('tuples' in state)) return state
      return { ...state, selectedIndex: Math.min(state.tuples.length - 1, state.selectedIndex + 1) }

    case 'start-add':
      if (state.status !== 'loaded') return state
      return { ...state, status: 'adding' }

    case 'cancel-add':
      if (state.status !== 'adding') return state
      return { ...state, status: 'loaded' }

    case 'start-delete':
      if (state.status !== 'loaded') return state
      if (state.tuples.length === 0) return state
      return { ...state, status: 'confirming-delete' }

    case 'cancel-delete':
      if (state.status !== 'confirming-delete') return state
      return { ...state, status: 'loaded' }

    case 'start-filter':
      if (state.status !== 'loaded') return state
      return { ...state, status: 'filtering' }

    case 'cancel-filter':
      if (state.status !== 'filtering') return state
      return { ...state, status: 'loaded' }
  }
}

export function getSelectedTuple(state: TupleListState): Tuple | undefined {
  if ('tuples' in state) {
    return state.tuples[state.selectedIndex]
  }
  return undefined
}

export function formatTupleForDisplay(tuple: Tuple): [string, string, string] {
  return [tuple.key.user, tuple.key.relation, tuple.key.object]
}
