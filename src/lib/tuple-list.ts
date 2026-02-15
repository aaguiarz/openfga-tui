import type { Tuple } from './openfga/types.ts'

export type TupleListState =
  | { status: 'loading' }
  | { status: 'loaded'; tuples: Tuple[]; selectedIndex: number; continuationToken?: string; filter: string }
  | { status: 'error'; message: string }
  | { status: 'adding'; tuples: Tuple[]; selectedIndex: number; continuationToken?: string; filter: string }
  | { status: 'confirming-delete'; tuples: Tuple[]; selectedIndex: number; continuationToken?: string; filter: string }
  | { status: 'filtering'; tuples: Tuple[]; selectedIndex: number; continuationToken?: string; filter: string }

export type TupleListAction =
  | { type: 'load' }
  | { type: 'loaded'; tuples: Tuple[]; continuationToken?: string }
  | { type: 'error'; message: string }
  | { type: 'move-up' }
  | { type: 'move-down' }
  | { type: 'start-add' }
  | { type: 'cancel-add' }
  | { type: 'start-delete' }
  | { type: 'cancel-delete' }
  | { type: 'start-filter' }
  | { type: 'cancel-filter' }
  | { type: 'set-filter'; filter: string }

export function tupleListReducer(state: TupleListState, action: TupleListAction): TupleListState {
  switch (action.type) {
    case 'load':
      return { status: 'loading' }

    case 'loaded':
      return {
        status: 'loaded',
        tuples: action.tuples,
        selectedIndex: 0,
        continuationToken: action.continuationToken,
        filter: ('filter' in state) ? state.filter : '',
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

    case 'set-filter':
      if (!('filter' in state)) return state
      return { ...state, filter: action.filter }
  }
}

export function getSelectedTuple(state: TupleListState): Tuple | undefined {
  if ('tuples' in state) {
    return getFilteredTuples(state)[state.selectedIndex]
  }
  return undefined
}

export function getFilteredTuples(state: TupleListState): Tuple[] {
  if (!('tuples' in state)) return []
  if (!state.filter) return state.tuples

  const filter = state.filter.toLowerCase()
  return state.tuples.filter(t =>
    t.key.user.toLowerCase().includes(filter) ||
    t.key.relation.toLowerCase().includes(filter) ||
    t.key.object.toLowerCase().includes(filter)
  )
}

export function formatTupleForDisplay(tuple: Tuple): [string, string, string] {
  return [tuple.key.user, tuple.key.relation, tuple.key.object]
}
