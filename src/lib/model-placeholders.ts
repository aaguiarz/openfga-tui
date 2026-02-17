import type { AuthorizationModel, TypeDefinition } from './openfga/types.ts'

export interface ModelPlaceholders {
  user: string
  relation: string
  object: string
  objectType: string
  objectId: string
  userType: string
}

const DEFAULTS: ModelPlaceholders = {
  user: 'user:anne',
  relation: 'reader',
  object: 'document:budget',
  objectType: 'document',
  objectId: 'budget',
  userType: 'user',
}

/**
 * Extracts example placeholder values from an authorization model.
 * Finds the first type with a directly-assignable relation and uses it
 * to build realistic placeholders for tuple/query forms.
 */
export function getModelPlaceholders(model: AuthorizationModel | undefined): ModelPlaceholders {
  if (!model?.type_definitions) return DEFAULTS

  // Find the first non-user type that has a direct relation with assignable user types
  for (const typeDef of model.type_definitions) {
    const result = extractFromType(typeDef)
    if (result) return result
  }

  return DEFAULTS
}

function extractFromType(typeDef: TypeDefinition): ModelPlaceholders | null {
  const relations = typeDef.metadata?.relations
  if (!relations) return null

  for (const [relationName, meta] of Object.entries(relations)) {
    const userTypes = meta.directly_related_user_types
    if (!userTypes || userTypes.length === 0) continue

    // Find the first concrete user type (not wildcard, not userset)
    const concreteUser = userTypes.find(u => !u.wildcard && !u.relation)
    if (!concreteUser) continue

    return {
      user: `${concreteUser.type}:anne`,
      relation: relationName,
      object: `${typeDef.type}:example`,
      objectType: typeDef.type,
      objectId: 'example',
      userType: concreteUser.type,
    }
  }

  return null
}
