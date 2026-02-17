import type {
  AuthorizationModel,
  Condition,
  ConditionParamTypeRef,
  RelationReference,
  TypeDefinition,
  Userset,
} from './types.ts'

/**
 * Convert an OpenFGA JSON model to DSL format.
 */
export function modelToDsl(model: AuthorizationModel): string {
  const lines: string[] = []

  lines.push('model')
  lines.push(`  schema ${model.schema_version || '1.1'}`)
  lines.push('')

  for (const typeDef of model.type_definitions || []) {
    lines.push(`type ${typeDef.type}`)

    const relations = typeDef.relations || {}
    const metadata = typeDef.metadata?.relations || {}

    if (Object.keys(relations).length > 0) {
      lines.push('  relations')

      for (const [relationName, relationDef] of Object.entries(relations)) {
        const relMeta = metadata[relationName]
        const relationStr = buildRelationString(relationName, relationDef, relMeta?.directly_related_user_types)
        lines.push(`    define ${relationStr}`)
      }
    }

    lines.push('')
  }

  const conditionEntries = Object.entries(model.conditions || {})
  for (const [conditionName, condition] of conditionEntries) {
    const params = Object.entries(condition.parameters || {})
      .map(([paramName, typeRef]) => `${paramName}: ${conditionParamTypeRefToDsl(typeRef)}`)
      .join(', ')

    const conditionHeader = params
      ? `condition ${conditionName}(${params}) {`
      : `condition ${conditionName} {`

    lines.push(conditionHeader)

    const expressionLines = (condition.expression || '').split('\n')
    if (expressionLines.length === 0) {
      lines.push('  ')
    } else {
      for (const expressionLine of expressionLines) {
        lines.push(`  ${expressionLine}`)
      }
    }

    lines.push('}')
    lines.push('')
  }

  return lines.join('\n').trim()
}

function conditionParamTypeRefToDsl(typeRef: ConditionParamTypeRef): string {
  if (!typeRef.generic_types || typeRef.generic_types.length === 0) {
    return typeRef.type_name
  }

  const genericTypes = typeRef.generic_types.map(conditionParamTypeRefToDsl).join(', ')
  return `${typeRef.type_name}<${genericTypes}>`
}

/**
 * Build a relation definition string from the relation object.
 */
function buildRelationString(
  name: string,
  relationDef: Userset,
  directTypes: RelationReference[] = []
): string {
  const parts: string[] = []

  if (relationDef.this !== undefined) {
    const typeStrs = directTypes.map(relationReferenceToDsl)
    if (typeStrs.length > 0) {
      parts.push(`[${typeStrs.join(', ')}]`)
    }
  }

  if (relationDef.computedUserset) {
    parts.push(relationDef.computedUserset.relation)
  }

  if (relationDef.tupleToUserset) {
    const fromRelation = relationDef.tupleToUserset.tupleset?.relation
    const computedRelation = relationDef.tupleToUserset.computedUserset?.relation
    if (fromRelation && computedRelation) {
      parts.push(`${computedRelation} from ${fromRelation}`)
    }
  }

  if (relationDef.union) {
    const unionParts = relationDef.union.child?.map(child => buildChildRelation(child, directTypes)) || []
    return `${name}: ${unionParts.join(' or ')}`
  }

  if (relationDef.intersection) {
    const intersectionParts = relationDef.intersection.child?.map(child => buildChildRelation(child, directTypes)) || []
    return `${name}: ${intersectionParts.join(' and ')}`
  }

  if (relationDef.difference) {
    const base = buildChildRelation(relationDef.difference.base, directTypes)
    const subtract = buildChildRelation(relationDef.difference.subtract, directTypes)
    return `${name}: ${base} but not ${subtract}`
  }

  return `${name}: ${parts.join(' ')}`
}

function relationReferenceToDsl(reference: RelationReference): string {
  if (reference.wildcard) {
    return `${reference.type}:*`
  }
  if (reference.relation) {
    return `${reference.type}#${reference.relation}`
  }
  return reference.type
}

/**
 * Build a child relation string (for union/intersection/difference).
 */
function buildChildRelation(child: Userset, directTypes: RelationReference[]): string {
  if (child.this !== undefined) {
    const typeStrs = directTypes.map(relationReferenceToDsl)
    return typeStrs.length > 0 ? `[${typeStrs.join(', ')}]` : '[]'
  }

  if (child.computedUserset) {
    return child.computedUserset.relation
  }

  if (child.tupleToUserset) {
    const fromRelation = child.tupleToUserset.tupleset?.relation
    const computedRelation = child.tupleToUserset.computedUserset?.relation
    if (fromRelation && computedRelation) {
      return `${computedRelation} from ${fromRelation}`
    }
  }

  return ''
}

/**
 * Parse DSL format back to JSON model.
 * This parser intentionally covers the subset used in this project,
 * including condition blocks and typed condition parameters.
 */
export function dslToModel(dsl: string): Omit<AuthorizationModel, 'id'> {
  const lines = dsl.split('\n')
  let schemaVersion = '1.1'
  const typeDefinitions: TypeDefinition[] = []
  const conditions: Record<string, Condition> = {}

  let currentType: TypeDefinition | null = null
  let inRelations = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    if (trimmed.startsWith('schema ')) {
      schemaVersion = trimmed.replace('schema ', '').trim()
      continue
    }

    if (trimmed === 'model') {
      continue
    }

    if (trimmed.startsWith('condition ')) {
      const parsed = parseConditionBlock(lines, i)
      conditions[parsed.condition.name] = parsed.condition
      i = parsed.nextLineIndex
      continue
    }

    if (trimmed.startsWith('type ')) {
      if (currentType) {
        typeDefinitions.push(currentType)
      }

      const typeName = trimmed.replace('type ', '').trim()
      currentType = { type: typeName }
      inRelations = false
      continue
    }

    if (trimmed === 'relations') {
      inRelations = true
      if (currentType) {
        currentType.relations = {}
        currentType.metadata = { relations: {} }
      }
      continue
    }

    if (trimmed.startsWith('define ') && currentType && inRelations) {
      const definePart = trimmed.replace('define ', '')
      parseRelationDefinition(definePart, currentType)
      continue
    }
  }

  if (currentType) {
    typeDefinitions.push(currentType)
  }

  const parsedModel: Omit<AuthorizationModel, 'id'> = {
    schema_version: schemaVersion,
    type_definitions: typeDefinitions,
  }

  if (Object.keys(conditions).length > 0) {
    parsedModel.conditions = conditions
  }

  return parsedModel
}

function parseConditionBlock(
  lines: string[],
  startLineIndex: number
): { condition: Condition; nextLineIndex: number } {
  const header = (lines[startLineIndex] ?? '').trim()
  const headerMatch = header.match(/^condition\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\((.*)\))?\s*\{\s*$/)

  if (!headerMatch) {
    throw new Error(`Invalid condition declaration: ${header}`)
  }

  const conditionName = headerMatch[1]!
  const rawParams = headerMatch[2]

  const expressionLines: string[] = []
  let endLineIndex = startLineIndex

  for (let i = startLineIndex + 1; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (line.trim() === '}') {
      endLineIndex = i
      break
    }
    expressionLines.push(line.trim())
  }

  if (endLineIndex === startLineIndex) {
    throw new Error(`Unterminated condition block: ${conditionName}`)
  }

  const condition: Condition = {
    name: conditionName,
    expression: expressionLines.join('\n').trim(),
  }

  const parameters = parseConditionParameters(rawParams)
  if (parameters && Object.keys(parameters).length > 0) {
    condition.parameters = parameters
  }

  return {
    condition,
    nextLineIndex: endLineIndex,
  }
}

function parseConditionParameters(rawParams: string | undefined): Record<string, ConditionParamTypeRef> | undefined {
  if (!rawParams || !rawParams.trim()) {
    return undefined
  }

  const parsed: Record<string, ConditionParamTypeRef> = {}
  const parts = splitTopLevel(rawParams, ',')

  for (const part of parts) {
    const separatorIndex = part.indexOf(':')
    if (separatorIndex === -1) {
      throw new Error(`Invalid condition parameter: ${part}`)
    }

    const paramName = part.slice(0, separatorIndex).trim()
    const typeExpr = part.slice(separatorIndex + 1).trim()
    if (!paramName || !typeExpr) {
      throw new Error(`Invalid condition parameter: ${part}`)
    }

    parsed[paramName] = parseConditionParamTypeRef(typeExpr)
  }

  return parsed
}

function parseConditionParamTypeRef(typeExpr: string): ConditionParamTypeRef {
  const match = typeExpr.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:<(.*)>)?$/)
  if (!match) {
    throw new Error(`Invalid condition type: ${typeExpr}`)
  }

  const typeName = match[1]!
  const rawGenericTypes = match[2]

  if (!rawGenericTypes) {
    return { type_name: typeName }
  }

  const genericTypes = splitTopLevel(rawGenericTypes, ',').map(part =>
    parseConditionParamTypeRef(part.trim())
  )

  return {
    type_name: typeName,
    generic_types: genericTypes,
  }
}

function splitTopLevel(input: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let depth = 0

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!

    if (ch === '<') {
      depth++
      current += ch
      continue
    }

    if (ch === '>') {
      depth = Math.max(0, depth - 1)
      current += ch
      continue
    }

    if (ch === delimiter && depth === 0) {
      if (current.trim()) {
        result.push(current.trim())
      }
      current = ''
      continue
    }

    current += ch
  }

  if (current.trim()) {
    result.push(current.trim())
  }

  return result
}

/**
 * Parse a single relation definition line.
 */
function parseRelationDefinition(definition: string, typeDef: TypeDefinition): void {
  const colonIndex = definition.indexOf(':')
  if (colonIndex === -1) return

  const relationName = definition.substring(0, colonIndex).trim()
  const relationExpr = definition.substring(colonIndex + 1).trim()

  if (!typeDef.relations) typeDef.relations = {}
  if (!typeDef.metadata) typeDef.metadata = { relations: {} }
  if (!typeDef.metadata.relations) typeDef.metadata.relations = {}

  const { relationDef, directTypes } = parseRelationExpression(relationExpr)

  typeDef.relations[relationName] = relationDef
  if (directTypes.length > 0) {
    typeDef.metadata.relations[relationName] = {
      directly_related_user_types: directTypes,
    }
  }
}

type DirectType = { type: string; relation?: string; wildcard?: Record<string, never> }

/**
 * Parse a relation expression (the part after "define name:").
 */
function parseRelationExpression(expr: string): {
  relationDef: Userset
  directTypes: DirectType[]
} {
  const directTypes: DirectType[] = []

  if (expr.includes(' but not ')) {
    const [basePart, subtractPart] = expr.split(' but not ')
    const base = parseRelationExpression(basePart!.trim())
    const subtract = parseRelationExpression(subtractPart!.trim())
    return {
      relationDef: {
        difference: {
          base: base.relationDef,
          subtract: subtract.relationDef,
        },
      },
      directTypes: [...base.directTypes, ...subtract.directTypes],
    }
  }

  if (expr.includes(' and ')) {
    const parts = expr.split(' and ')
    const children: Userset[] = []
    const allDirectTypes: DirectType[] = []

    for (const part of parts) {
      const parsed = parseRelationExpression(part.trim())
      children.push(parsed.relationDef)
      allDirectTypes.push(...parsed.directTypes)
    }

    return {
      relationDef: { intersection: { child: children } },
      directTypes: allDirectTypes,
    }
  }

  if (expr.includes(' or ')) {
    const parts = expr.split(' or ')
    const children: Userset[] = []
    const allDirectTypes: DirectType[] = []

    for (const part of parts) {
      const parsed = parseRelationExpression(part.trim())
      children.push(parsed.relationDef)
      allDirectTypes.push(...parsed.directTypes)
    }

    return {
      relationDef: { union: { child: children } },
      directTypes: allDirectTypes,
    }
  }

  if (expr.includes(' from ')) {
    const [computedRelation, fromRelation] = expr.split(' from ')
    return {
      relationDef: {
        tupleToUserset: {
          tupleset: { relation: fromRelation!.trim() },
          computedUserset: { relation: computedRelation!.trim() },
        },
      },
      directTypes: [],
    }
  }

  if (expr.startsWith('[') && expr.includes(']')) {
    const typesMatch = expr.match(/\[([^\]]*)\]/)
    if (typesMatch) {
      const types = typesMatch[1]!
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      for (const typeStr of types) {
        if (typeStr.includes(':*')) {
          directTypes.push({
            type: typeStr.replace(':*', ''),
            wildcard: {},
          })
        } else if (typeStr.includes('#')) {
          const [type, relation] = typeStr.split('#')
          directTypes.push({ type: type!, relation })
        } else {
          directTypes.push({ type: typeStr })
        }
      }

      return {
        relationDef: { this: {} },
        directTypes,
      }
    }
  }

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(expr)) {
    return {
      relationDef: { computedUserset: { relation: expr } },
      directTypes: [],
    }
  }

  return { relationDef: { this: {} }, directTypes }
}
