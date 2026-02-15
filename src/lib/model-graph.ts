import type { AuthorizationModel, TypeDefinition, Userset, RelationReference } from './openfga/types.ts'

export interface GraphLine {
  text: string
  color: string
  bold?: boolean
}

export function renderModelGraph(model: AuthorizationModel, storeName?: string): GraphLine[][] {
  const lines: GraphLine[][] = []

  // Title
  lines.push([{ text: storeName || 'Authorization Model', color: '#60a5fa', bold: true }])
  lines.push([])

  const types = model.type_definitions || []

  for (let i = 0; i < types.length; i++) {
    const typeDef = types[i]!
    const isLast = i === types.length - 1
    const prefix = isLast ? '└── ' : '├── '
    const childPrefix = isLast ? '    ' : '│   '

    // Type name
    lines.push([
      { text: prefix, color: '#444444' },
      { text: typeDef.type, color: '#06b6d4', bold: true },
    ])

    const relations = typeDef.relations || {}
    const metadata = typeDef.metadata?.relations || {}
    const relationEntries = Object.entries(relations)

    if (relationEntries.length === 0) {
      lines.push([
        { text: childPrefix + '  ', color: '#444444' },
        { text: '(no relations)', color: '#666666' },
      ])
    } else {
      for (let j = 0; j < relationEntries.length; j++) {
        const [relName, relDef] = relationEntries[j]!
        const isLastRel = j === relationEntries.length - 1
        const relPrefix = isLastRel ? '└── ' : '├── '
        const relMeta = metadata[relName]
        const definition = renderRelationDefinition(relDef, relMeta?.directly_related_user_types)

        lines.push([
          { text: childPrefix, color: '#444444' },
          { text: relPrefix, color: '#444444' },
          { text: relName, color: '#22c55e' },
          { text: ': ', color: '#888888' },
          ...definition,
        ])
      }
    }

    if (!isLast) {
      lines.push([{ text: '│', color: '#444444' }])
    }
  }

  return lines
}

function renderRelationDefinition(
  relDef: Userset,
  directTypes?: RelationReference[]
): GraphLine[] {
  const segments: GraphLine[] = []

  if (relDef.this !== undefined && directTypes) {
    segments.push(...renderDirectTypes(directTypes))
  }

  if (relDef.computedUserset) {
    segments.push({ text: relDef.computedUserset.relation, color: '#3b82f6' })
  }

  if (relDef.tupleToUserset) {
    const ttu = relDef.tupleToUserset
    segments.push(
      { text: ttu.computedUserset.relation, color: '#3b82f6' },
      { text: ' from ', color: '#c084fc', bold: true },
      { text: ttu.tupleset.relation, color: '#3b82f6' },
    )
  }

  if (relDef.union) {
    const parts = relDef.union.child || []
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        segments.push({ text: ' or ', color: '#c084fc', bold: true })
      }
      segments.push(...renderChildRelation(parts[i]!, directTypes))
    }
  }

  if (relDef.intersection) {
    const parts = relDef.intersection.child || []
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        segments.push({ text: ' and ', color: '#c084fc', bold: true })
      }
      segments.push(...renderChildRelation(parts[i]!, directTypes))
    }
  }

  if (relDef.difference) {
    segments.push(...renderChildRelation(relDef.difference.base, directTypes))
    segments.push({ text: ' but not ', color: '#c084fc', bold: true })
    segments.push(...renderChildRelation(relDef.difference.subtract, directTypes))
  }

  return segments
}

function renderDirectTypes(types: RelationReference[]): GraphLine[] {
  const segments: GraphLine[] = []
  segments.push({ text: '[', color: '#888888' })

  for (let i = 0; i < types.length; i++) {
    if (i > 0) segments.push({ text: ', ', color: '#888888' })
    const t = types[i]!
    if (t.wildcard) {
      segments.push({ text: `${t.type}:*`, color: '#fbbf24' })
    } else if (t.relation) {
      segments.push(
        { text: t.type, color: '#fbbf24' },
        { text: '#', color: '#888888' },
        { text: t.relation, color: '#fbbf24' },
      )
    } else {
      segments.push({ text: t.type, color: '#fbbf24' })
    }
  }

  segments.push({ text: ']', color: '#888888' })
  return segments
}

function renderChildRelation(
  child: Userset,
  directTypes?: RelationReference[]
): GraphLine[] {
  if (child.this !== undefined && directTypes) {
    return renderDirectTypes(directTypes)
  }
  if (child.computedUserset) {
    return [{ text: child.computedUserset.relation, color: '#3b82f6' }]
  }
  if (child.tupleToUserset) {
    const ttu = child.tupleToUserset
    return [
      { text: ttu.computedUserset.relation, color: '#3b82f6' },
      { text: ' from ', color: '#c084fc', bold: true },
      { text: ttu.tupleset.relation, color: '#3b82f6' },
    ]
  }
  return []
}

export function graphToPlainText(lines: GraphLine[][]): string {
  return lines.map(line => line.map(seg => seg.text).join('')).join('\n')
}
