import { useReducer, useEffect, useCallback, useState, useRef } from 'react'
import { useKeyboard } from '@opentui/react'
import { Table } from '../components/table.tsx'
import { Spinner } from '../components/spinner.tsx'
import { Confirm } from '../components/confirm.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import type { AuthorizationModel } from '../lib/openfga/types.ts'
import {
  tupleListReducer,
  getSelectedTuple,
  formatTupleForDisplay,
  buildTupleKeyFromFilter,
  isFilterActive,
  filterDescription,
  EMPTY_FILTER,
  type TupleListState,
  type ServerFilter,
} from '../lib/tuple-list.ts'
import { getModelPlaceholders } from '../lib/model-placeholders.ts'

interface TuplesViewProps {
  client: OpenFGAClient
  storeId: string
  onBack: () => void
}

export function TuplesView({ client, storeId, onBack }: TuplesViewProps) {
  const [state, dispatch] = useReducer(tupleListReducer, { status: 'loading' } as TupleListState)
  const [addUser, setAddUser] = useState('')
  const [addRelation, setAddRelation] = useState('')
  const [addObject, setAddObject] = useState('')
  const [addFieldIdx, setAddFieldIdx] = useState(0)
  const [model, setModel] = useState<AuthorizationModel | undefined>()

  // Server-side filter state
  const [activeFilter, setActiveFilter] = useState<ServerFilter>(EMPTY_FILTER)
  const [filterUser, setFilterUser] = useState('')
  const [filterRelation, setFilterRelation] = useState('')
  const [filterObject, setFilterObject] = useState('')
  const [filterFieldIdx, setFilterFieldIdx] = useState(0)

  // Keep a ref to the active filter for use in callbacks
  const activeFilterRef = useRef(activeFilter)
  activeFilterRef.current = activeFilter

  useEffect(() => {
    client.listAuthorizationModels(storeId, 1).then(res => {
      if (res.authorization_models?.[0]) setModel(res.authorization_models[0])
    }).catch(() => {})
  }, [client, storeId])

  const ph = getModelPlaceholders(model)

  const fetchTuples = useCallback(async (filter: ServerFilter, continuationToken?: string) => {
    if (!continuationToken) {
      dispatch({ type: 'load' })
    }
    try {
      const tupleKey = buildTupleKeyFromFilter(filter)
      const response = await client.read(storeId, {
        tuple_key: tupleKey as any,
        page_size: 50,
        continuation_token: continuationToken,
      })
      dispatch({
        type: 'loaded',
        tuples: response.tuples || [],
        continuationToken: response.continuation_token,
        append: !!continuationToken,
      })
    } catch (err: any) {
      dispatch({ type: 'error', message: err.message || 'Failed to load tuples' })
    }
  }, [client, storeId])

  useEffect(() => {
    fetchTuples(EMPTY_FILTER)
  }, [fetchTuples])

  const handleAddTuple = useCallback(async () => {
    if (!addUser.trim() || !addRelation.trim() || !addObject.trim()) return
    try {
      await client.write(storeId, {
        writes: {
          tuple_keys: [{
            user: addUser.trim(),
            relation: addRelation.trim(),
            object: addObject.trim(),
          }],
        },
      })
      setAddUser('')
      setAddRelation('')
      setAddObject('')
      setAddFieldIdx(0)
      dispatch({ type: 'cancel-add' })
      fetchTuples(activeFilterRef.current)
    } catch (err: any) {
      dispatch({ type: 'error', message: err.message || 'Failed to add tuple' })
    }
  }, [client, storeId, addUser, addRelation, addObject, fetchTuples])

  const handleDeleteTuple = useCallback(async () => {
    const tuple = getSelectedTuple(state)
    if (!tuple) return
    try {
      await client.write(storeId, {
        deletes: { tuple_keys: [tuple.key] },
      })
      dispatch({ type: 'cancel-delete' })
      fetchTuples(activeFilterRef.current)
    } catch (err: any) {
      dispatch({ type: 'error', message: err.message || 'Failed to delete tuple' })
    }
  }, [client, storeId, state, fetchTuples])

  const handleApplyFilter = useCallback(() => {
    const newFilter: ServerFilter = {
      user: filterUser,
      relation: filterRelation,
      object: filterObject,
    }
    setActiveFilter(newFilter)
    dispatch({ type: 'cancel-filter' })
    fetchTuples(newFilter)
  }, [filterUser, filterRelation, filterObject, fetchTuples])

  const handleClearFilter = useCallback(() => {
    setActiveFilter(EMPTY_FILTER)
    setFilterUser('')
    setFilterRelation('')
    setFilterObject('')
    fetchTuples(EMPTY_FILTER)
  }, [fetchTuples])

  useKeyboard(useCallback((key: { name: string; shift?: boolean }) => {
    if (key.name === 'escape') {
      if (state.status === 'adding') {
        setAddUser('')
        setAddRelation('')
        setAddObject('')
        setAddFieldIdx(0)
        dispatch({ type: 'cancel-add' })
      } else if (state.status === 'filtering') {
        dispatch({ type: 'cancel-filter' })
      } else if (state.status === 'confirming-delete') {
        dispatch({ type: 'cancel-delete' })
      } else if (state.status === 'error') {
        handleClearFilter()
      } else {
        onBack()
      }
      return
    }

    if (state.status === 'adding') {
      if (key.name === 'tab' && key.shift) {
        setAddFieldIdx(f => (f - 1 + 3) % 3)
      } else if (key.name === 'tab') {
        setAddFieldIdx(f => (f + 1) % 3)
      }
      return
    }

    if (state.status === 'confirming-delete') {
      return
    }

    if (state.status === 'filtering') {
      if (key.name === 'tab' && key.shift) {
        setFilterFieldIdx(f => (f - 1 + 3) % 3)
      } else if (key.name === 'tab') {
        setFilterFieldIdx(f => (f + 1) % 3)
      }
      return
    }

    switch (key.name) {
      case 'up':
        dispatch({ type: 'move-up' })
        break
      case 'down':
        dispatch({ type: 'move-down' })
        break
      case 'a':
        dispatch({ type: 'start-add' })
        break
      case 'd':
        dispatch({ type: 'start-delete' })
        break
      case 'r':
        fetchTuples(activeFilterRef.current)
        break
      case '/':
        // Pre-populate filter fields with current active filter
        setFilterUser(activeFilter.user)
        setFilterRelation(activeFilter.relation)
        setFilterObject(activeFilter.object)
        setFilterFieldIdx(0)
        dispatch({ type: 'start-filter' })
        break
      case 'x':
        if (isFilterActive(activeFilter)) {
          handleClearFilter()
        }
        break
      case 'n':
        if ('continuationToken' in state && state.continuationToken) {
          fetchTuples(activeFilterRef.current, state.continuationToken)
        }
        break
    }
  }, [state, activeFilter, fetchTuples, onBack, handleClearFilter]))

  if (state.status === 'loading') {
    return <Spinner label="Loading tuples..." />
  }

  if (state.status === 'error') {
    return (
      <box flexDirection="column" gap={1}>
        <text fg="#ef4444">{state.message}</text>
        <text fg="#666666">Press 'r' to retry</text>
      </box>
    )
  }

  const tuples = state.tuples
  const rows = tuples.map(formatTupleForDisplay)
  const columns = [
    { header: 'User', width: 24 },
    { header: 'Relation', width: 16 },
    { header: 'Object', width: 24 },
  ]

  const hasContinuation = 'continuationToken' in state && !!state.continuationToken
  const hasActiveFilter = isFilterActive(activeFilter)

  return (
    <box flexDirection="column" gap={0}>
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row" gap={0}>
          <text fg="#60a5fa" attributes={1}>Tuples</text>
          {state.status === 'adding' && <text fg="#888888"> / Add Tuple</text>}
          {state.status === 'filtering' && <text fg="#eab308"> / Filter (all optional)</text>}
        </box>
        <text fg="#888888">{tuples.length} tuples{hasContinuation ? ' (more available)' : ''}</text>
      </box>

      {hasActiveFilter && (
        <text fg="#eab308">Filter: {filterDescription(activeFilter)}  [x] clear  [/] edit</text>
      )}

      {state.status === 'adding' && (
        <box flexDirection="column" gap={0}>
          <box flexDirection="row" gap={1} height={1}>
            <text fg="#888888" width={10}>User:</text>
            <input
              value={addUser}
              placeholder={ph.user}
              focused={addFieldIdx === 0}
              onInput={setAddUser}
              width={40}
              onSubmit={() => {
                if (addFieldIdx < 2) setAddFieldIdx(addFieldIdx + 1)
                else handleAddTuple()
              }}
            />
          </box>
          <box flexDirection="row" gap={1} height={1}>
            <text fg="#888888" width={10}>Relation:</text>
            <input
              value={addRelation}
              placeholder={ph.relation}
              focused={addFieldIdx === 1}
              onInput={setAddRelation}
              width={30}
              onSubmit={() => {
                if (addFieldIdx < 2) setAddFieldIdx(addFieldIdx + 1)
                else handleAddTuple()
              }}
            />
          </box>
          <box flexDirection="row" gap={1} height={1}>
            <text fg="#888888" width={10}>Object:</text>
            <input
              value={addObject}
              placeholder={ph.object}
              focused={addFieldIdx === 2}
              onInput={setAddObject}
              width={40}
              onSubmit={handleAddTuple}
            />
          </box>
          <box height={1}>
            <text fg="#666666">[Tab] next field  [Enter] submit  [Esc] cancel</text>
          </box>
        </box>
      )}

      {state.status === 'confirming-delete' && (
        <Confirm
          message={`Delete tuple '${getSelectedTuple(state)?.key.user} ${getSelectedTuple(state)?.key.relation} ${getSelectedTuple(state)?.key.object}'?`}
          onConfirm={handleDeleteTuple}
          onCancel={() => dispatch({ type: 'cancel-delete' })}
        />
      )}

      {state.status === 'filtering' && (
        <box flexDirection="column">
          <box flexDirection="row" gap={1} height={1}>
            <text fg="#888888" width={10}>User:</text>
            <input
              value={filterUser}
              placeholder={`${ph.user} (optional)`}
              focused={filterFieldIdx === 0}
              onInput={setFilterUser}
              width={40}
              onSubmit={handleApplyFilter}
            />
          </box>
          <box flexDirection="row" gap={1} height={1}>
            <text fg="#888888" width={10}>Relation:</text>
            <input
              value={filterRelation}
              placeholder={`${ph.relation} (optional)`}
              focused={filterFieldIdx === 1}
              onInput={setFilterRelation}
              width={30}
              onSubmit={handleApplyFilter}
            />
          </box>
          <box flexDirection="row" gap={1} height={1}>
            <text fg="#888888" width={10}>Object:</text>
            <input
              value={filterObject}
              placeholder={`${ph.object} (optional)`}
              focused={filterFieldIdx === 2}
              onInput={setFilterObject}
              width={40}
              onSubmit={handleApplyFilter}
            />
          </box>
          <box height={1}>
            <text fg="#666666">[Tab] next  [Enter] apply  [Esc] cancel</text>
          </box>
        </box>
      )}

      <box height={1} />

      {tuples.length === 0 ? (
        <text fg="#666666">No tuples found. Press 'a' to add one.</text>
      ) : (
        <Table
          columns={columns}
          rows={rows}
          selectedIndex={'selectedIndex' in state ? state.selectedIndex : 0}
        />
      )}

      {hasContinuation && (
        <text fg="#888888">Press 'n' for next page</text>
      )}
    </box>
  )
}
