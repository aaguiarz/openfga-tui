import { useReducer, useEffect, useCallback, useState } from 'react'
import { useKeyboard } from '@opentui/react'
import { Table } from '../components/table.tsx'
import { Spinner } from '../components/spinner.tsx'
import { Confirm } from '../components/confirm.tsx'
import type { OpenFGAClient } from '../lib/openfga/client.ts'
import { tupleListReducer, getSelectedTuple, getFilteredTuples, formatTupleForDisplay, type TupleListState } from '../lib/tuple-list.ts'

interface TuplesViewProps {
  client: OpenFGAClient
  storeId: string
}

export function TuplesView({ client, storeId }: TuplesViewProps) {
  const [state, dispatch] = useReducer(tupleListReducer, { status: 'loading' } as TupleListState)
  const [addUser, setAddUser] = useState('')
  const [addRelation, setAddRelation] = useState('')
  const [addObject, setAddObject] = useState('')
  const [addFieldIdx, setAddFieldIdx] = useState(0)

  const fetchTuples = useCallback(async (continuationToken?: string) => {
    dispatch({ type: 'load' })
    try {
      const response = await client.read(storeId, {
        page_size: 50,
        continuation_token: continuationToken,
      })
      dispatch({
        type: 'loaded',
        tuples: response.tuples || [],
        continuationToken: response.continuation_token,
      })
    } catch (err: any) {
      dispatch({ type: 'error', message: err.message || 'Failed to load tuples' })
    }
  }, [client, storeId])

  useEffect(() => {
    fetchTuples()
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
      fetchTuples()
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
      fetchTuples()
    } catch (err: any) {
      dispatch({ type: 'error', message: err.message || 'Failed to delete tuple' })
    }
  }, [client, storeId, state, fetchTuples])

  useKeyboard(useCallback((key: { name: string }) => {
    if (state.status === 'adding' || state.status === 'filtering' || state.status === 'confirming-delete') {
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
        fetchTuples()
        break
      case '/':
        dispatch({ type: 'start-filter' })
        break
      case 'n':
        if ('continuationToken' in state && state.continuationToken) {
          fetchTuples(state.continuationToken)
        }
        break
    }
  }, [state, fetchTuples]))

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

  const filteredTuples = getFilteredTuples(state)
  const rows = filteredTuples.map(formatTupleForDisplay)
  const columns = [
    { header: 'User', width: 24 },
    { header: 'Relation', width: 16 },
    { header: 'Object', width: 24 },
  ]

  const hasContinuation = 'continuationToken' in state && !!state.continuationToken

  return (
    <box flexDirection="column" gap={0}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg="#60a5fa" attributes={1}>Tuples</text>
        <text fg="#888888">{filteredTuples.length} tuples{hasContinuation ? ' (more available)' : ''}</text>
      </box>

      {'filter' in state && state.filter && (
        <text fg="#eab308">Filter: {state.filter}</text>
      )}

      {state.status === 'adding' && (
        <box flexDirection="column" gap={0} border borderStyle="single" borderColor="#444444" padding={1}>
          <text fg="#60a5fa" attributes={1}>Add Tuple</text>
          <box flexDirection="row" gap={1} height={1}>
            <text fg="#888888" width={10}>User:</text>
            <input
              value={addUser}
              placeholder="user:anne"
              focused={addFieldIdx === 0}
              onInput={setAddUser}
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
              placeholder="reader"
              focused={addFieldIdx === 1}
              onInput={setAddRelation}
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
              placeholder="document:budget"
              focused={addFieldIdx === 2}
              onInput={setAddObject}
              onSubmit={handleAddTuple}
            />
          </box>
          <text fg="#666666">[Tab] next field  [Enter] submit  [Esc] cancel</text>
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
        <box flexDirection="row" gap={1} height={1}>
          <text fg="#eab308">Filter:</text>
          <input
            value={'filter' in state ? state.filter : ''}
            placeholder="Type to filter..."
            focused={true}
            onInput={(val: string) => dispatch({ type: 'set-filter', filter: val })}
            onSubmit={() => dispatch({ type: 'cancel-filter' })}
          />
        </box>
      )}

      <box height={1} />

      {filteredTuples.length === 0 ? (
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
