/**
 * tree-sitter-fga grammar registration for OpenTUI.
 *
 * To enable tree-sitter syntax highlighting for FGA DSL:
 * 1. Build tree-sitter-fga.wasm from https://github.com/matoous/tree-sitter-fga
 *    $ git clone https://github.com/matoous/tree-sitter-fga
 *    $ cd tree-sitter-fga && tree-sitter build --wasm
 * 2. Copy tree-sitter-fga.wasm to this directory (src/tree-sitter/)
 * 3. Call setupFgaParser() in src/index.tsx before rendering
 *
 * Without the WASM binary, the app falls back to the custom
 * regex-based highlighter in src/lib/fga-highlight.ts.
 */

import { addDefaultParsers } from '@opentui/core'

const HIGHLIGHTS_SCM = `
; Keywords
(["model" "schema" "type" "define" "relations"
  "condition" "with" "from" "extend" "module"] @keyword)

; Operators
(["or" "and" "but not"] @keyword.operator)

; Type references
(direct_relationship) @type

; Relation names
(relation_declaration
  name: (identifier) @function)

; Type declarations
(type_declaration
  name: (identifier) @type.definition)

; Condition declarations
(condition_declaration
  name: (identifier) @function.definition)

; Condition parameter types
(["string" "int" "bool" "uint" "timestamp"
  "duration" "double" "ipaddress" "map" "list"] @type.builtin)

; Comments
(comment) @comment

; Schema version
(schema_version) @string

; Identifiers
(identifier) @variable

; Punctuation
(["[" "]" "(" ")"] @punctuation.bracket)
([":" ","] @punctuation.delimiter)

; Numbers
(number) @number

; Strings
(string) @string
`

export async function setupFgaParser(): Promise<boolean> {
  try {
    const wasmPath = new URL('./tree-sitter-fga.wasm', import.meta.url).pathname
    const file = Bun.file(wasmPath)
    if (!(await file.exists())) {
      return false
    }

    addDefaultParsers([{
      filetype: 'fga',
      wasm: wasmPath,
      queries: {
        highlights: [HIGHLIGHTS_SCM],
      },
    }])

    return true
  } catch {
    return false
  }
}
