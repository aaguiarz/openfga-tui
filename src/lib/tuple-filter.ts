import type { TupleKey } from './openfga/types.ts'

export interface TupleFilter {
  user?: string
  relation?: string
  object?: string
}

export function buildReadTupleKey(filter: TupleFilter): Partial<TupleKey> | undefined {
  const key: Partial<TupleKey> = {}
  let hasFilter = false

  if (filter.user?.trim()) {
    key.user = filter.user.trim()
    hasFilter = true
  }
  if (filter.relation?.trim()) {
    key.relation = filter.relation.trim()
    hasFilter = true
  }
  if (filter.object?.trim()) {
    key.object = filter.object.trim()
    hasFilter = true
  }

  return hasFilter ? key : undefined
}

export function isFilterActive(filter: TupleFilter): boolean {
  return !!(filter.user?.trim() || filter.relation?.trim() || filter.object?.trim())
}

export function filterDescription(filter: TupleFilter): string {
  const parts: string[] = []
  if (filter.user?.trim()) parts.push(`user=${filter.user.trim()}`)
  if (filter.relation?.trim()) parts.push(`relation=${filter.relation.trim()}`)
  if (filter.object?.trim()) parts.push(`object=${filter.object.trim()}`)
  return parts.join(', ')
}

export function clearFilter(): TupleFilter {
  return { user: undefined, relation: undefined, object: undefined }
}

export interface TupleSelection {
  selected: Set<number>
}

export function toggleSelection(selection: TupleSelection, index: number): TupleSelection {
  const newSelected = new Set(selection.selected)
  if (newSelected.has(index)) {
    newSelected.delete(index)
  } else {
    newSelected.add(index)
  }
  return { selected: newSelected }
}

export function clearSelection(): TupleSelection {
  return { selected: new Set() }
}

export function getSelectedIndices(selection: TupleSelection): number[] {
  return Array.from(selection.selected).sort((a, b) => a - b)
}

export interface TupleExport {
  tuples: { user: string; relation: string; object: string }[]
}

export function exportTuples(tuples: { key: TupleKey }[]): TupleExport {
  return {
    tuples: tuples.map(t => ({
      user: t.key.user,
      relation: t.key.relation,
      object: t.key.object,
    })),
  }
}

export function importTuples(data: TupleExport): TupleKey[] {
  return data.tuples.map(t => ({
    user: t.user,
    relation: t.relation,
    object: t.object,
  }))
}
