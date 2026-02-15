import type { AuthorizationModel, TypeDefinition } from './types.ts'

/**
 * Convert an OpenFGA JSON model to DSL format
 */
export function modelToDsl(model: AuthorizationModel): string {
  const lines: string[] = []

  // Add model header
  lines.push('model')
  lines.push(`  schema ${model.schema_version || '1.1'}`)
  lines.push('')

  // Process each type definition
  for (const typeDef of model.type_definitions || []) {
    lines.push(`type ${typeDef.type}`)

    // Get relations if any
    const relations = typeDef.relations || {}
    const metadata = typeDef.metadata?.relations || {}

    if (Object.keys(relations).length > 0) {
      lines.push('  relations')

      for (const [relationName, relationDef] of Object.entries(relations)) {
        const relMeta = metadata[relationName]
        const relationStr = buildRelationString(relationName, relationDef, relMeta)
        lines.push(`    define ${relationStr}`)
      }
    }

    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * Build a relation definition string from the relation object
 */
function buildRelationString(
  name: string,
  relationDef: any,
  metadata?: { directly_related_user_types?: Array<{ type: string; relation?: string; wildcard?: object }> }
): string {
  const parts: string[] = []

  // Get directly assignable types from metadata
  const directTypes = metadata?.directly_related_user_types || []

  if (relationDef.this !== undefined) {
    // Direct assignment relation
    const typeStrs = directTypes.map((t: any) => {
      if (t.wildcard) {
        return `${t.type}:*`
      } else if (t.relation) {
        return `${t.type}#${t.relation}`
      } else {
        return t.type
      }
    })

    if (typeStrs.length > 0) {
      parts.push(`[${typeStrs.join(', ')}]`)
    }
  }

  if (relationDef.computedUserset) {
    // Computed relation (referencing another relation on same type)
    parts.push(relationDef.computedUserset.relation)
  }

  if (relationDef.tupleToUserset) {
    // Tuple to userset (relation from another object)
    const ttu = relationDef.tupleToUserset
    const fromRelation = ttu.tupleset?.relation
    const computedRelation = ttu.computedUserset?.relation
    if (fromRelation && computedRelation) {
      parts.push(`${computedRelation} from ${fromRelation}`)
    }
  }

  if (relationDef.union) {
    // Union of multiple relations
    const unionParts = relationDef.union.child?.map((child: any) => {
      return buildChildRelation(child, directTypes)
    }) || []
    return `${name}: ${unionParts.join(' or ')}`
  }

  if (relationDef.intersection) {
    // Intersection of multiple relations
    const intersectionParts = relationDef.intersection.child?.map((child: any) => {
      return buildChildRelation(child, directTypes)
    }) || []
    return `${name}: ${intersectionParts.join(' and ')}`
  }

  if (relationDef.difference) {
    // Difference (exclusion)
    const base = buildChildRelation(relationDef.difference.base, directTypes)
    const subtract = buildChildRelation(relationDef.difference.subtract, directTypes)
    return `${name}: ${base} but not ${subtract}`
  }

  return `${name}: ${parts.join(' ')}`
}

/**
 * Build a child relation string (for union/intersection/difference)
 */
function buildChildRelation(
  child: any,
  directTypes: Array<{ type: string; relation?: string; wildcard?: object }>
): string {
  if (child.this !== undefined) {
    const typeStrs = directTypes.map((t: any) => {
      if (t.wildcard) {
        return `${t.type}:*`
      } else if (t.relation) {
        return `${t.type}#${t.relation}`
      } else {
        return t.type
      }
    })
    return typeStrs.length > 0 ? `[${typeStrs.join(', ')}]` : '[]'
  }

  if (child.computedUserset) {
    return child.computedUserset.relation
  }

  if (child.tupleToUserset) {
    const ttu = child.tupleToUserset
    const fromRelation = ttu.tupleset?.relation
    const computedRelation = ttu.computedUserset?.relation
    if (fromRelation && computedRelation) {
      return `${computedRelation} from ${fromRelation}`
    }
  }

  return ''
}

/**
 * Parse DSL format back to JSON model
 * This is a simplified parser - for production use consider using @openfga/syntax-transformer
 */
export function dslToModel(dsl: string): Omit<AuthorizationModel, 'id'> {
  const lines = dsl.split('\n')
  let schemaVersion = '1.1'
  const typeDefinitions: TypeDefinition[] = []

  let currentType: TypeDefinition | null = null
  let inRelations = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue

    // Parse schema version
    if (trimmed.startsWith('schema ')) {
      schemaVersion = trimmed.replace('schema ', '').trim()
      continue
    }

    // Skip 'model' line
    if (trimmed === 'model') continue

    // Parse type definition
    if (trimmed.startsWith('type ')) {
      // Save previous type if exists
      if (currentType) {
        typeDefinitions.push(currentType)
      }

      const typeName = trimmed.replace('type ', '').trim()
      currentType = { type: typeName }
      inRelations = false
      continue
    }

    // Parse relations section
    if (trimmed === 'relations') {
      inRelations = true
      if (currentType) {
        currentType.relations = {}
        currentType.metadata = { relations: {} }
      }
      continue
    }

    // Parse relation definition
    if (trimmed.startsWith('define ') && currentType && inRelations) {
      const definePart = trimmed.replace('define ', '')
      parseRelationDefinition(definePart, currentType)
      continue
    }
  }

  // Don't forget the last type
  if (currentType) {
    typeDefinitions.push(currentType)
  }

  return {
    schema_version: schemaVersion,
    type_definitions: typeDefinitions
  }
}

/**
 * Parse a single relation definition line
 */
function parseRelationDefinition(definition: string, typeDef: TypeDefinition): void {
  const colonIndex = definition.indexOf(':')
  if (colonIndex === -1) return

  const relationName = definition.substring(0, colonIndex).trim()
  const relationExpr = definition.substring(colonIndex + 1).trim()

  if (!typeDef.relations) typeDef.relations = {}
  if (!typeDef.metadata) typeDef.metadata = { relations: {} }
  if (!typeDef.metadata.relations) typeDef.metadata.relations = {}

  // Parse the relation expression
  const { relationDef, directTypes } = parseRelationExpression(relationExpr)

  typeDef.relations[relationName] = relationDef
  if (directTypes.length > 0) {
    typeDef.metadata.relations[relationName] = {
      directly_related_user_types: directTypes
    }
  }
}

// Type for direct types during parsing
type DirectType = { type: string; relation?: string; wildcard?: Record<string, never> }

/**
 * Parse a relation expression (the part after "define name:")
 */
function parseRelationExpression(expr: string): {
  relationDef: any
  directTypes: DirectType[]
} {
  const directTypes: DirectType[] = []

  // Handle "but not" (difference)
  if (expr.includes(' but not ')) {
    const [basePart, subtractPart] = expr.split(' but not ')
    const base = parseRelationExpression(basePart!.trim())
    const subtract = parseRelationExpression(subtractPart!.trim())
    return {
      relationDef: {
        difference: {
          base: base.relationDef,
          subtract: subtract.relationDef
        }
      },
      directTypes: [...base.directTypes, ...subtract.directTypes]
    }
  }

  // Handle "and" (intersection)
  if (expr.includes(' and ')) {
    const parts = expr.split(' and ')
    const children: any[] = []
    const allDirectTypes: DirectType[] = []

    for (const part of parts) {
      const parsed = parseRelationExpression(part.trim())
      children.push(parsed.relationDef)
      allDirectTypes.push(...parsed.directTypes)
    }

    return {
      relationDef: { intersection: { child: children } },
      directTypes: allDirectTypes
    }
  }

  // Handle "or" (union)
  if (expr.includes(' or ')) {
    const parts = expr.split(' or ')
    const children: any[] = []
    const allDirectTypes: DirectType[] = []

    for (const part of parts) {
      const parsed = parseRelationExpression(part.trim())
      children.push(parsed.relationDef)
      allDirectTypes.push(...parsed.directTypes)
    }

    return {
      relationDef: { union: { child: children } },
      directTypes: allDirectTypes
    }
  }

  // Handle "from" (tupleToUserset)
  if (expr.includes(' from ')) {
    const [computedRelation, fromRelation] = expr.split(' from ')
    return {
      relationDef: {
        tupleToUserset: {
          tupleset: { relation: fromRelation!.trim() },
          computedUserset: { relation: computedRelation!.trim() }
        }
      },
      directTypes: []
    }
  }

  // Handle direct types [type1, type2, ...]
  if (expr.startsWith('[') && expr.includes(']')) {
    const typesMatch = expr.match(/\[([^\]]*)\]/)
    if (typesMatch) {
      const typesStr = typesMatch[1]!
      const types = typesStr.split(',').map(t => t.trim()).filter(t => t)

      for (const typeStr of types) {
        if (typeStr.includes(':*')) {
          // Wildcard type
          directTypes.push({
            type: typeStr.replace(':*', ''),
            wildcard: {} as Record<string, never>
          })
        } else if (typeStr.includes('#')) {
          // Type with relation
          const [type, relation] = typeStr.split('#')
          directTypes.push({ type: type!, relation })
        } else {
          // Simple type
          directTypes.push({ type: typeStr })
        }
      }

      return {
        relationDef: { this: {} },
        directTypes
      }
    }
  }

  // Handle computed userset (just a relation name)
  if (/^[a-z_]+$/.test(expr)) {
    return {
      relationDef: { computedUserset: { relation: expr } },
      directTypes: []
    }
  }

  return { relationDef: { this: {} }, directTypes }
}
