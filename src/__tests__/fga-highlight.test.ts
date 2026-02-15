import { describe, expect, test } from 'bun:test'
import { highlightFgaLine, highlightFgaDsl, type StyledSegment } from '../lib/fga-highlight.ts'

function getColors(segments: StyledSegment[]): string[] {
  return segments.map(s => s.color)
}

function getTexts(segments: StyledSegment[]): string[] {
  return segments.map(s => s.text)
}

describe('highlightFgaLine', () => {
  test('highlights comment lines in gray', () => {
    const segments = highlightFgaLine('# This is a comment')
    expect(segments).toHaveLength(1)
    expect(segments[0]!.color).toBe('#6b7280')
    expect(segments[0]!.text).toBe('# This is a comment')
  })

  test('empty lines return white', () => {
    const segments = highlightFgaLine('')
    expect(segments).toHaveLength(1)
    expect(segments[0]!.color).toBe('#ffffff')
  })

  test('highlights "model" keyword', () => {
    const segments = highlightFgaLine('model')
    const textSegments = segments.filter(s => s.text.trim() !== '')
    expect(textSegments.some(s => s.text === 'model' && s.color === '#f87171')).toBe(true)
  })

  test('highlights "schema" keyword', () => {
    const segments = highlightFgaLine('  schema 1.1')
    const texts = getTexts(segments)
    expect(texts).toContain('schema')
    const schemaSegment = segments.find(s => s.text === 'schema')
    expect(schemaSegment?.color).toBe('#f87171')
    expect(schemaSegment?.bold).toBe(true)
  })

  test('highlights schema version number', () => {
    const segments = highlightFgaLine('  schema 1.1')
    const versionSegment = segments.find(s => s.text === '1.1')
    expect(versionSegment?.color).toBe('#fbbf24')
  })

  test('highlights "type" keyword', () => {
    const segments = highlightFgaLine('type user')
    const typeSegment = segments.find(s => s.text === 'type')
    expect(typeSegment?.color).toBe('#f87171')
    expect(typeSegment?.bold).toBe(true)
  })

  test('highlights type name in green', () => {
    const segments = highlightFgaLine('type document')
    const nameSegment = segments.find(s => s.text === 'document')
    expect(nameSegment?.color).toBe('#34d399')
  })

  test('highlights "define" keyword', () => {
    const segments = highlightFgaLine('    define owner: [user]')
    const defineSegment = segments.find(s => s.text === 'define')
    expect(defineSegment?.color).toBe('#f87171')
  })

  test('highlights "relations" keyword', () => {
    const segments = highlightFgaLine('  relations')
    const relSegment = segments.find(s => s.text === 'relations')
    expect(relSegment?.color).toBe('#f87171')
  })

  test('highlights operators (or, and, but, not)', () => {
    const segments = highlightFgaLine('    define reader: [user] or owner')
    const orSegment = segments.find(s => s.text === 'or')
    expect(orSegment?.color).toBe('#c084fc')
    expect(orSegment?.bold).toBe(true)
  })

  test('preserves leading whitespace', () => {
    const segments = highlightFgaLine('    define owner: [user]')
    expect(segments[0]!.text).toBe('    ')
  })

  test('highlights brackets', () => {
    const segments = highlightFgaLine('    define owner: [user]')
    const bracket = segments.find(s => s.text === '[')
    expect(bracket?.color).toBe('#888888')
  })

  test('highlights wildcard types', () => {
    const segments = highlightFgaLine('    define viewer: [user:*]')
    const wildcardSegment = segments.find(s => s.text === ':*')
    expect(wildcardSegment?.color).toBe('#fbbf24')
  })

  test('highlights type#relation references', () => {
    const segments = highlightFgaLine('    define viewer: [group#member]')
    const typeSegment = segments.find(s => s.text === 'group')
    expect(typeSegment?.color).toBe('#34d399')
    const hashSegment = segments.find(s => s.text === '#')
    expect(hashSegment?.color).toBe('#888888')
    const relSegment = segments.find(s => s.text === 'member')
    expect(relSegment?.color).toBe('#60a5fa')
  })

  test('highlights "from" keyword', () => {
    const segments = highlightFgaLine('    define viewer: viewer from parent')
    const fromSegment = segments.find(s => s.text === 'from')
    expect(fromSegment?.color).toBe('#f87171')
  })
})

describe('highlightFgaDsl', () => {
  test('returns array of line segments', () => {
    const dsl = `model
  schema 1.1

type user`

    const result = highlightFgaDsl(dsl)
    expect(result).toHaveLength(4)
    expect(result[0]!.length).toBeGreaterThan(0)
  })

  test('handles multi-line DSL with all features', () => {
    const dsl = `model
  schema 1.1

# User type
type user

type document
  relations
    define owner: [user]
    define reader: [user, group#member] or owner
    define viewer: viewer from parent`

    const result = highlightFgaDsl(dsl)
    expect(result).toHaveLength(11)

    // Comment line should be gray
    const commentLine = result[3]!
    expect(commentLine.some(s => s.color === '#6b7280')).toBe(true)
  })

  test('empty DSL returns single empty line', () => {
    const result = highlightFgaDsl('')
    expect(result).toHaveLength(1)
  })
})
