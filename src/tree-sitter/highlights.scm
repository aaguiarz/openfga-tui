; OpenFGA DSL highlight queries for tree-sitter-fga
; See: https://github.com/matoous/tree-sitter-fga

; Keywords
(["model" "schema" "type" "define" "relations"
  "condition" "with" "from" "extend" "module"] @keyword)

; Operators
(["or" "and" "but not"] @keyword.operator)

; Type references in brackets
(direct_relationship) @type

; Relation names (in define statements)
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

; Identifiers (general)
(identifier) @variable

; Punctuation
(["[" "]" "(" ")"] @punctuation.bracket)
([":" ","] @punctuation.delimiter)

; Numbers
(number) @number

; Strings
(string) @string
