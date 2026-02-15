// Simple FGA DSL highlighter that produces styled text segments
// This provides basic syntax highlighting without requiring tree-sitter WASM

export interface StyledSegment {
  text: string
  color: string
  bold?: boolean
}

const KEYWORDS = new Set([
  'model', 'schema', 'type', 'define', 'relations',
  'condition', 'with', 'from', 'extend', 'module',
])

const OPERATORS = new Set(['or', 'and', 'but', 'not'])

const BUILTIN_TYPES = new Set([
  'string', 'int', 'bool', 'uint', 'timestamp',
  'duration', 'double', 'ipaddress', 'map', 'list',
])

export function highlightFgaLine(line: string): StyledSegment[] {
  const segments: StyledSegment[] = []
  const trimmed = line.trim()

  // Comment line
  if (trimmed.startsWith('#')) {
    segments.push({ text: line, color: '#6b7280' })
    return segments
  }

  // Empty line
  if (!trimmed) {
    segments.push({ text: line, color: '#ffffff' })
    return segments
  }

  // Preserve leading whitespace
  const leadingSpaces = line.match(/^(\s*)/)?.[0] || ''
  if (leadingSpaces) {
    segments.push({ text: leadingSpaces, color: '#ffffff' })
  }

  const tokens = tokenizeFgaLine(trimmed)
  for (const token of tokens) {
    if (KEYWORDS.has(token)) {
      segments.push({ text: token, color: '#f87171', bold: true })
    } else if (OPERATORS.has(token)) {
      segments.push({ text: token, color: '#c084fc', bold: true })
    } else if (BUILTIN_TYPES.has(token)) {
      segments.push({ text: token, color: '#38bdf8' })
    } else if (token.match(/^\d/)) {
      // Schema version numbers
      segments.push({ text: token, color: '#fbbf24' })
    } else if (token.startsWith('[') || token.startsWith(']')) {
      segments.push({ text: token, color: '#888888' })
    } else if (token === ':' || token === ',') {
      segments.push({ text: token, color: '#888888' })
    } else if (token.includes('#')) {
      // Type#relation references
      const [type, relation] = token.split('#')
      segments.push({ text: type!, color: '#34d399' })
      segments.push({ text: '#', color: '#888888' })
      segments.push({ text: relation!, color: '#60a5fa' })
    } else if (token.includes(':*')) {
      // Wildcard type
      const type = token.replace(':*', '')
      segments.push({ text: type, color: '#34d399' })
      segments.push({ text: ':*', color: '#fbbf24' })
    } else if (trimmed.startsWith('type ') && token === trimmed.slice(5)) {
      // Type name in type declaration
      segments.push({ text: token, color: '#34d399', bold: true })
    } else if (trimmed.startsWith('define ') && !OPERATORS.has(token) && !token.includes('[')) {
      // Relation name or reference in define
      segments.push({ text: token, color: '#60a5fa' })
    } else {
      segments.push({ text: token, color: '#e5e7eb' })
    }
  }

  return segments
}

function tokenizeFgaLine(line: string): string[] {
  const tokens: string[] = []
  let current = ''

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!

    if (char === ' ') {
      if (current) tokens.push(current)
      tokens.push(' ')
      current = ''
    } else if (char === '[' || char === ']') {
      if (current) tokens.push(current)
      tokens.push(char)
      current = ''
    } else if (char === ':' && line[i + 1] !== '*') {
      if (current) tokens.push(current)
      tokens.push(':')
      current = ''
    } else if (char === ',') {
      if (current) tokens.push(current)
      tokens.push(',')
      current = ''
    } else {
      current += char
    }
  }

  if (current) tokens.push(current)
  return tokens
}

export function highlightFgaDsl(dsl: string): StyledSegment[][] {
  return dsl.split('\n').map(highlightFgaLine)
}
