# OpenFGA TUI Dashboard — Implementation Plan

## Overview

Build a terminal-based OpenFGA dashboard using [OpenTUI](https://github.com/anomalyco/opentui) (`@opentui/react`) with [tree-sitter-fga](https://github.com/matoous/tree-sitter-fga) for FGA DSL syntax highlighting. The TUI replicates the core functionality of the existing web dashboard (`openfga-dashboard`) in a keyboard-driven terminal interface.

### Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | **Bun** | Required by OpenTUI — no Node.js support |
| TUI Framework | **@opentui/react** | React reconciler over OpenTUI's native renderer |
| Layout | **Yoga (flexbox)** | CSS-like flexbox via OpenTUI |
| Syntax Highlighting | **tree-sitter-fga** | Custom WASM grammar + highlight queries |
| API Layer | **Direct REST** | Reuse existing `OpenFGAClient` class (zero dependencies) |
| State | **React hooks** | `useState`, `useReducer` — no external state library needed |
| Config Persistence | **JSON file** | `~/.config/openfga-tui/config.json` |

### Reusable Code from Existing Dashboard

These files can be copied directly with minimal or no changes:

| File | Lines | Changes Needed |
|---|---|---|
| `lib/openfga/client.ts` | 221 | None — pure `fetch()` calls, no browser APIs |
| `lib/openfga/types.ts` | 261 | None — pure TypeScript interfaces |
| `lib/openfga/endpoints.ts` | 27 | None — pure string functions |
| `lib/openfga/dsl-converter.ts` | 357 | None — pure string parsing, no DOM dependencies |

**Total reusable**: ~866 lines of API, types, and DSL conversion logic carried over unchanged.

---

## Project Structure

```
openfga-tui/
├── package.json
├── tsconfig.json
├── bunfig.toml
│
├── src/
│   ├── index.tsx                    # Entry: createCliRenderer, createRoot, CLI arg parsing
│   ├── app.tsx                      # Root component: navigation state machine, global keyboard
│   │
│   ├── lib/
│   │   ├── openfga/
│   │   │   ├── client.ts            # [REUSE] OpenFGAClient — direct REST calls
│   │   │   ├── types.ts             # [REUSE] All TypeScript interfaces
│   │   │   ├── endpoints.ts         # [REUSE] API endpoint path builders
│   │   │   └── dsl-converter.ts     # [REUSE] modelToDsl / dslToModel converters
│   │   ├── config.ts                # File-based config persistence (~/.config/openfga-tui/)
│   │   ├── playground.ts            # Playground sample data (model, store, tuples)
│   │   └── hooks.ts                 # React hooks wrapping OpenFGAClient methods
│   │
│   ├── views/
│   │   ├── connect.tsx              # Connection form view
│   │   ├── stores.tsx               # Store list + create/delete
│   │   ├── store-overview.tsx       # Store detail with stats
│   │   ├── model-viewer.tsx         # Model DSL viewer with syntax highlighting
│   │   ├── model-editor.tsx         # [v2] Inline model editor with tree-sitter
│   │   ├── tuples.tsx               # Tuple list + add/delete
│   │   ├── queries.tsx              # Query tab container
│   │   ├── query-check.tsx          # Check query panel
│   │   ├── query-expand.tsx         # Expand query with tree rendering
│   │   ├── query-list-objects.tsx   # List Objects query panel
│   │   └── query-list-users.tsx     # List Users query panel
│   │
│   ├── components/
│   │   ├── table.tsx                # Reusable data table (Box + Text rows)
│   │   ├── form-field.tsx           # Label + Input wrapper
│   │   ├── status-bar.tsx           # Bottom bar: connection info, current store, keybinds
│   │   ├── header.tsx               # Top bar: title, breadcrumb, mode indicator
│   │   ├── confirm.tsx              # Inline confirmation prompt
│   │   ├── toast.tsx                # Temporary success/error message
│   │   ├── spinner.tsx              # Loading indicator (text-based)
│   │   ├── tree-view.tsx            # Recursive tree renderer (for Expand results)
│   │   └── keybind-help.tsx         # [v2] Overlay showing all keybindings
│   │
│   └── tree-sitter/
│       ├── tree-sitter-fga.wasm     # Compiled grammar (from tree-sitter-fga repo)
│       ├── highlights.scm           # Highlight queries mapping AST nodes → theme scopes
│       └── setup.ts                 # Grammar registration via addDefaultParsers()
│
└── assets/
    └── sample-model.fga             # Sample model for playground mode
```

---

## V1 — Operational Dashboard

V1 delivers a fully functional, keyboard-driven OpenFGA management tool covering all day-to-day operations: connecting to servers, managing stores, viewing models with syntax highlighting, managing tuples, and running queries.

### V1 Milestone Breakdown

---

### Step 1: Project Scaffolding

**Goal**: Set up the project, install dependencies, configure TypeScript and Bun, get a "Hello World" rendering in the terminal.

**Tasks**:
1. Initialize project with `bun init`
2. Install dependencies:
   ```
   bun add @opentui/core @opentui/react
   ```
3. Configure `tsconfig.json` with JSX support for OpenTUI React (`"jsx": "react-jsx"`)
4. Create entry point `src/index.tsx`:
   ```tsx
   import { createCliRenderer } from "@opentui/core"
   import { createRoot } from "@opentui/react"
   import { App } from "./app"

   const renderer = await createCliRenderer({ exitOnCtrlC: true })
   createRoot(renderer).render(<App />)
   ```
5. Create `src/app.tsx` with a minimal `<text>` element to verify rendering
6. Add `scripts` to `package.json`: `"start": "bun run src/index.tsx"`, `"dev": "bun --watch src/index.tsx"`
7. Copy reusable files from existing dashboard:
   - `lib/openfga/client.ts`
   - `lib/openfga/types.ts`
   - `lib/openfga/endpoints.ts`
   - `lib/openfga/dsl-converter.ts`

**Acceptance**: Running `bun run start` renders text in the terminal and exits cleanly with Ctrl+C.

---

### Step 2: Navigation & Layout Shell

**Goal**: Build the app shell with header, content area, status bar, and a navigation state machine driven by keyboard shortcuts.

**Tasks**:
1. Define the navigation state type:
   ```tsx
   type View =
     | { kind: "connect" }
     | { kind: "stores" }
     | { kind: "store-overview"; storeId: string }
     | { kind: "model"; storeId: string }
     | { kind: "tuples"; storeId: string }
     | { kind: "queries"; storeId: string }
   ```
2. Build `App` component with `useReducer` for navigation transitions
3. Create `<Header>` component:
   - Renders at top of screen (`<box>` with fixed height)
   - Shows: app title, current view breadcrumb, connection status indicator
   - Uses `useTerminalDimensions()` for full-width rendering
4. Create `<StatusBar>` component:
   - Renders at bottom of screen
   - Shows: server URL (truncated), current store name, available keyboard shortcuts for current view
   - Color-coded connection status (green=connected, yellow=playground, red=disconnected)
5. Register global keyboard shortcuts via `useKeyboard()`:
   - `Ctrl+C` — exit (handled by renderer)
   - `Esc` — go back (to parent view)
   - `?` — toggle keybind help overlay (v2)
6. Content area: `<box flexGrow={1}>` between header and status bar, renders current view component

**Layout structure**:
```
┌─────────────────────────────────────────┐
│ OpenFGA TUI    stores > my-store > model│  ← Header
├─────────────────────────────────────────┤
│                                         │
│           (current view)                │  ← Content (flexGrow=1)
│                                         │
├─────────────────────────────────────────┤
│ http://localhost:8080 │ my-store │ ?help │  ← StatusBar
└─────────────────────────────────────────┘
```

**Acceptance**: App renders the three-section layout, keyboard shortcuts switch between placeholder views, breadcrumb updates accordingly.

---

### Step 3: Configuration Persistence

**Goal**: Persist connection configuration to disk so users don't re-enter credentials on every launch.

**Tasks**:
1. Create `src/lib/config.ts`:
   ```tsx
   interface TuiConfig {
     serverUrl?: string
     auth?: AuthConfig
     lastStoreId?: string
   }
   ```
2. Config file location: `~/.config/openfga-tui/config.json`
   - Use `Bun.file()` and `Bun.write()` for I/O
   - Create directory if it doesn't exist (`mkdir -p` equivalent)
3. Implement functions:
   - `loadConfig(): Promise<TuiConfig>` — read and parse, return empty object on missing/corrupt
   - `saveConfig(config: TuiConfig): Promise<void>` — write JSON with 2-space indent
4. Also support CLI arguments that override config file:
   - `--server-url <url>`
   - `--api-key <key>`
   - Parse via `Bun.argv` or `process.argv`
5. On app start: load config → if valid connection info exists, auto-connect → navigate to stores view

**Acceptance**: After connecting once, restarting the app auto-connects without re-entering credentials.

---

### Step 4: Connection View

**Goal**: Build the connection form — the first screen users see when not connected.

**Tasks**:
1. Create `src/views/connect.tsx`
2. Form fields using OpenTUI's `<input>`:
   - **Server URL** — `<input placeholder="http://localhost:8080" />`
   - **Auth Type** — `<select>` with options: None, API Key, OIDC
   - Conditional fields based on auth type:
     - API Key: `<input>` for token
     - OIDC: three `<input>` fields (Token URL, Client ID, Client Secret)
3. Actions:
   - **Test Connection** (`Enter` on form or `Ctrl+T`): calls `client.testConnection()`, shows success/error inline
   - **Connect** (`Ctrl+Enter`): saves config, establishes connection, navigates to stores
   - **Playground Mode** (`Ctrl+P`): enters playground with mock data, navigates to stores
4. Form navigation: `Tab`/`Shift+Tab` to move between fields (OpenTUI handles focus management)
5. Inline error display: red `<text>` below form for connection errors
6. Inline success display: green `<text>` for "Connection successful"
7. State management: local `useState` for form values, `useReducer` for form status (idle/testing/connecting/error/success)

**Acceptance**: User can fill in connection details, test connection, connect, and be navigated to the stores list. Playground mode enters with sample data.

---

### Step 5: Store Management

**Goal**: List, create, and delete OpenFGA stores.

**Tasks**:
1. Create `src/views/stores.tsx`
2. On mount: call `client.listStores()`, display results in a selectable list
3. Store list rendering:
   - Each row: `<box>` with store name, store ID (truncated), created date
   - Highlight currently selected row (background color change)
   - Arrow keys (`Up`/`Down`) to navigate, `Enter` to select → navigate to store-overview
   - Use `<scrollbox>` if list exceeds terminal height
4. Keyboard actions:
   - `c` — Create store: show inline `<input>` at top for store name, `Enter` to confirm, `Esc` to cancel
   - `d` — Delete selected store: show `<Confirm>` component ("Delete store 'name'? [y/N]")
   - `r` — Refresh store list
5. Create `src/components/confirm.tsx`:
   - Inline text prompt: "Are you sure? [y/N]"
   - `y` confirms, any other key cancels
   - Returns result via callback
6. Empty state: centered text "No stores found. Press 'c' to create one."
7. Loading state: `<Spinner>` component while fetching
8. Error state: red text with error message, `r` to retry

**Acceptance**: User can browse stores, create new ones, delete existing ones, and navigate into a store.

---

### Step 6: Store Overview

**Goal**: Show store details and provide navigation to model, tuples, and queries sub-views.

**Tasks**:
1. Create `src/views/store-overview.tsx`
2. On mount: fetch store details, model count, and tuple count in parallel
3. Display layout:
   ```
   Store: my-store
   ID:    01HXYZ...  Created: 2024-01-15  Updated: 2024-01-20

   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │ [m] Models   │  │ [t] Tuples   │  │ [q] Queries  │
   │     3 models │  │   42 tuples  │  │  4 operations│
   └─────────────┘  └─────────────┘  └─────────────┘
   ```
4. Keyboard shortcuts:
   - `m` — navigate to model viewer
   - `t` — navigate to tuples
   - `q` — navigate to queries
   - `Esc` — back to stores list
5. Stats are fetched once on mount; display "..." while loading

**Acceptance**: User sees store summary and can navigate to any sub-view via single keypress.

---

### Step 7: tree-sitter-fga Integration

**Goal**: Compile tree-sitter-fga to WASM, write highlight queries, and register the grammar with OpenTUI.

**Tasks**:
1. Clone `matoous/tree-sitter-fga` and build the WASM binary:
   ```bash
   cd tree-sitter-fga
   tree-sitter build --wasm
   # Produces tree-sitter-fga.wasm
   ```
2. Copy `tree-sitter-fga.wasm` to `src/tree-sitter/`
3. Write `src/tree-sitter/highlights.scm` — mapping grammar nodes to highlight scopes:
   ```scheme
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
   ```
4. Create `src/tree-sitter/setup.ts`:
   ```tsx
   import { addDefaultParsers } from "@opentui/core"

   export async function setupFgaParser() {
     await addDefaultParsers({
       filetype: "fga",
       wasm: new URL("./tree-sitter-fga.wasm", import.meta.url).href,
       queries: {
         highlights: [new URL("./highlights.scm", import.meta.url).href],
       },
     })
   }
   ```
5. Call `setupFgaParser()` in `src/index.tsx` before `createRoot().render()`
6. Verify by rendering a `<code filetype="fga">` component with sample FGA DSL

**Note**: The `highlights.scm` file will need iterative refinement based on the actual AST node names produced by tree-sitter-fga's `grammar.js`. Use `tree-sitter parse` on a sample `.fga` file to inspect the concrete syntax tree and adjust capture names accordingly.

**Acceptance**: FGA DSL renders in the terminal with colored keywords, types, relations, and comments.

---

### Step 8: Model Viewer

**Goal**: Display the current authorization model with syntax highlighting and support editing via `$EDITOR`.

**Tasks**:
1. Create `src/views/model-viewer.tsx`
2. On mount: fetch models via `client.listAuthorizationModels(storeId)`, take the latest model
3. Convert model JSON to DSL using `modelToDsl()` from the reused `dsl-converter.ts`
4. Render DSL using OpenTUI's `<code>` component:
   ```tsx
   <code filetype="fga" width="100%" height="100%">
     {dslContent}
   </code>
   ```
   This automatically uses the registered tree-sitter-fga parser for highlighting.
5. Wrap in `<scrollbox>` for models that exceed terminal height
6. Model version selector:
   - Show current model ID at the top
   - `[`/`]` keys to cycle through model versions (older/newer)
   - Model list shown as `<select>` triggered by `v` key
7. Keyboard actions:
   - `e` — Edit model:
     1. Write current DSL to a temp file (`/tmp/openfga-model-XXXX.fga`)
     2. Spawn `$EDITOR` (or `vi` fallback) as a child process via `Bun.spawn()`
     3. On editor exit: read temp file, parse with `dslToModel()`, validate
     4. If valid: prompt "Save model? [y/N]" → call `client.writeAuthorizationModel()`
     5. If invalid: show parse error, offer to re-edit or discard
     6. Clean up temp file
   - `r` — Refresh (re-fetch from server)
   - `y` — Yank/copy DSL to clipboard (`pbcopy` on macOS, `xclip`/`xsel` on Linux)
   - `Esc` — back to store overview
8. Playground mode: show the sample model, `e` edits in-memory (no server call)

**Editor integration detail**:
```tsx
async function openInEditor(content: string): Promise<string | null> {
  const tmpPath = `/tmp/openfga-model-${Date.now()}.fga`
  await Bun.write(tmpPath, content)

  const editor = Bun.env.EDITOR || Bun.env.VISUAL || "vi"
  const proc = Bun.spawn([editor, tmpPath], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  await proc.exited

  const result = await Bun.file(tmpPath).text()
  await unlink(tmpPath) // clean up
  return result
}
```

**Acceptance**: User sees the FGA model with syntax highlighting. Pressing `e` opens the model in their editor; on save, the model is validated and pushed to the server.

---

### Step 9: Tuple Management

**Goal**: List, add, and delete relationship tuples.

**Tasks**:
1. Create `src/views/tuples.tsx`
2. On mount: fetch tuples via `client.read(storeId, { page_size: 50 })`
3. Table display using the reusable `<Table>` component:
   ```
   ┌──────────────────┬──────────┬────────────────────┐
   │ User             │ Relation │ Object             │
   ├──────────────────┼──────────┼────────────────────┤
   │ user:anne         │ reader   │ document:budget    │
   │ user:bob          │ writer   │ document:budget    │
   │ group:eng#member  │ viewer   │ folder:root        │
   └──────────────────┴──────────┴────────────────────┘
   ```
4. Create `src/components/table.tsx`:
   - Renders header row + data rows using `<box>` and `<text>`
   - Column widths calculated from content or fixed proportions
   - Selected row highlighted with background color
   - Unicode box-drawing characters for borders: `│`, `─`, `┌`, `┐`, `└`, `┘`, `├`, `┤`, `┬`, `┴`, `┼`
   - Wrap in `<scrollbox>` for pagination
5. Navigation: `Up`/`Down` arrows, `PageUp`/`PageDown` for fast scroll
6. Keyboard actions:
   - `a` — Add tuple: show inline form with three `<input>` fields (user, relation, object)
     - `Tab` between fields, `Enter` to submit, `Esc` to cancel
     - On submit: `client.write(storeId, { writes: { tuple_keys: [{ user, relation, object }] } })`
     - On success: refresh list, show green toast "Tuple added"
     - On error: show red toast with error message
   - `d` — Delete selected tuple: confirm prompt → `client.write(storeId, { deletes: { tuple_keys: [...] } })`
   - `r` — Refresh list
   - `n` — Next page (if `continuation_token` exists)
   - `/` — Filter tuples: `<input>` for filter text, filters client-side on user/relation/object
   - `Esc` — back to store overview
7. Empty state: "No tuples found. Press 'a' to add one."
8. Pagination: show "Page 1 | n for next" in status area when continuation token present

**Acceptance**: User can view tuples in a table, add new tuples inline, delete selected tuples, and paginate through results.

---

### Step 10: Query Operations

**Goal**: Implement the four query operations (Check, Expand, List Objects, List Users) in a tabbed interface.

**Tasks**:

#### 10.1: Query container with tabs

1. Create `src/views/queries.tsx`
2. Use OpenTUI's `<tab-select>` for switching between query types:
   ```tsx
   <tab-select
     items={["Check", "Expand", "List Objects", "List Users"]}
     onSelect={setActiveTab}
   />
   ```
3. Render the active panel below the tab bar
4. `Esc` — back to store overview

#### 10.2: Check query panel

1. Create `src/views/query-check.tsx`
2. Three input fields: User, Relation, Object
3. `Enter` or `Ctrl+Enter` to run
4. Result display:
   - Allowed: `<text fg="#22c55e">ALLOWED</text>` (green)
   - Denied: `<text fg="#ef4444">DENIED</text>` (red)
   - Resolution string shown below if present
5. Error handling: red text with API error message

#### 10.3: Expand query panel

1. Create `src/views/query-expand.tsx`
2. Two input fields: Relation, Object
3. `Enter` to run
4. Result: recursive tree rendered via `<TreeView>` component
5. Create `src/components/tree-view.tsx`:
   - Renders `Node` type from `types.ts` recursively
   - Uses Unicode tree characters: `├──`, `└──`, `│`
   - Color-coded node types:
     - `union` → blue
     - `intersection` → green
     - `difference` → orange
     - `leaf/users` → default
     - `leaf/computed` → cyan
   ```
   document:budget#reader
   └── union
       ├── Users: user:anne, user:bob
       ├── Computed: writer
       └── TupleToUserset: parent → viewer
   ```
6. Wrap tree in `<scrollbox>` for large expansion results

#### 10.4: List Objects query panel

1. Create `src/views/query-list-objects.tsx`
2. Three input fields: User, Relation, Type
3. `Enter` to run
4. Result: scrollable list of object IDs

#### 10.5: List Users query panel

1. Create `src/views/query-list-users.tsx`
2. Four input fields: Object Type, Object ID, Relation, User Filter Type
3. `Enter` to run
4. Result: table of users with columns for type (object/userset/wildcard), type name, ID, relation

**Acceptance**: All four query types work. Results display clearly with appropriate formatting.

---

### Step 11: Playground Mode

**Goal**: Allow exploring the TUI without a running OpenFGA server.

**Tasks**:
1. Create `src/lib/playground.ts`:
   - Export `PLAYGROUND_STORE`, `PLAYGROUND_SAMPLE_MODEL`, `PLAYGROUND_TUPLES` (port from existing `connection-store.ts`)
   - `PLAYGROUND_TUPLES`: array of sample tuples matching the sample model:
     ```ts
     [
       { key: { user: "user:anne", relation: "owner", object: "folder:root" }, timestamp: "..." },
       { key: { user: "user:bob", relation: "writer", object: "document:budget" }, timestamp: "..." },
       { key: { user: "user:anne", relation: "reader", object: "document:budget" }, timestamp: "..." },
       { key: { user: "group:eng#member", relation: "viewer", object: "folder:root" }, timestamp: "..." },
     ]
     ```
2. Create a `PlaygroundClient` class that implements the same interface as `OpenFGAClient` but operates on in-memory data:
   - `listStores()` → returns `[PLAYGROUND_STORE]`
   - `listAuthorizationModels()` → returns `[PLAYGROUND_SAMPLE_MODEL]`
   - `read()` → returns playground tuples (with client-side filtering)
   - `write()` → adds/removes from in-memory tuple array
   - `writeAuthorizationModel()` → updates in-memory model
   - `check()`, `expand()`, `listObjects()`, `listUsers()` → return informative "not available in playground" responses
3. When playground mode is active:
   - Header shows `[PLAYGROUND]` badge in yellow
   - Status bar shows "Playground Mode — no server connection"
   - Query operations show a notice: "Queries require a live server connection"
4. Playground entered via `Ctrl+P` on connect screen or `--playground` CLI flag

**Acceptance**: Launching with `--playground` enters a fully navigable app with sample data. Store browsing, model viewing, and tuple management work against in-memory data.

---

### Step 12: Polish & Error Handling

**Goal**: Robust error handling, edge cases, and UX polish.

**Tasks**:
1. Create `src/components/toast.tsx`:
   - Temporary message overlay (auto-dismiss after 3 seconds)
   - Variants: success (green), error (red), info (blue)
   - Positioned at top-right of content area
2. Create `src/components/spinner.tsx`:
   - Text-based spinner animation: `⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏` cycling via `useTimeline()`
   - Shows next to "Loading..." text
3. Global error boundary:
   - Catch unhandled errors, display "Something went wrong" with error message
   - Offer `r` to retry, `Esc` to go back
4. Network error handling:
   - Detect connection failures (server unreachable)
   - Show "Connection lost" in status bar (red)
   - Auto-retry with exponential backoff (optional)
   - `Ctrl+R` to force reconnect
5. Terminal resize handling:
   - `useOnResize()` hook — re-render layout on terminal resize
   - Minimum terminal size check (80x24) — show warning if too small
6. Graceful exit:
   - `Ctrl+C` — clean up temp files, save config, exit
7. Help text per view:
   - Each view shows contextual keyboard shortcuts in the status bar
   - Format: `[a]dd [d]elete [r]efresh [/]filter [Esc]back`

**Acceptance**: App handles network errors gracefully, shows loading states, auto-saves config, and provides clear contextual keyboard hints.

---

## V2 — Power User Features

V2 adds advanced editing, visualization, and quality-of-life features for heavy users.

---

### Step 13: Inline Model Editor with Syntax Highlighting

**Goal**: Replace `$EDITOR` workflow with an in-TUI editor that has live syntax highlighting via tree-sitter-fga.

**Tasks**:
1. Create `src/views/model-editor.tsx`
2. Architecture approach: combine OpenTUI's `EditBufferRenderable` + `TextBufferRenderable` + tree-sitter pipeline:
   - Use the `<textarea>` component for editing input (cursor movement, selections, undo/redo)
   - On every content change, run tree-sitter-fga highlighting asynchronously
   - Apply highlights to the rendered text buffer
3. Editor layout — split pane:
   ```
   ┌─────────────────────┬─────────────────────┐
   │ EDITOR (editable)   │ PREVIEW (read-only) │
   │                     │                     │
   │ model               │ model               │
   │   schema 1.1        │   schema 1.1        │
   │                     │                     │
   │ type user           │ type user           │
   │ type document       │ type document       │
   │   relations         │   relations         │
   │     define owner... │     define owner... │
   │                     │                     │
   │ (plain text input)  │ (syntax highlighted)│
   └─────────────────────┴─────────────────────┘
   ```
   - Left pane: `<textarea>` — editable, no highlighting
   - Right pane: `<code filetype="fga">` — read-only, highlighted, updates on each keystroke (debounced 300ms)
4. Alternative approach (preferred if feasible): build a custom `HighlightedTextarea` component:
   - Extend `TextareaRenderable` to accept styled text from tree-sitter
   - Intercept the rendering pipeline to apply highlight styles before drawing
   - This gives single-pane editing with highlighting — better UX
   - Investigate OpenCode's source for reference (it achieves this for code editing)
5. Validation:
   - On each change (debounced 500ms): parse DSL with `dslToModel()`
   - If invalid: show error line/message below editor
   - If valid: update preview pane
6. Save workflow:
   - `Ctrl+S` — save to server: parse → validate → `client.writeAuthorizationModel()` → refresh
   - Show validation errors if parse fails
   - Show confirmation toast on success
7. Keyboard bindings:
   - Standard text editing (arrows, Home/End, Ctrl+A, Ctrl+Z/Y for undo/redo) — provided by `<textarea>`
   - `Ctrl+S` — save
   - `Esc` — exit editor (prompt to save if changes exist)

**Tradeoffs**:
- Split-pane approach is simpler to implement but uses more screen space
- Single-pane highlighted editor is ideal UX but requires digging into OpenTUI internals
- Recommend: ship split-pane first, iterate to single-pane

**Acceptance**: User can edit FGA models inline with real-time syntax highlighting (at minimum in preview pane), validate, and save.

---

### Step 14: ASCII Model Visualization

**Goal**: Render the authorization model as a text-based graph showing type→relation relationships.

**Tasks**:
1. Create a `renderModelGraph()` function that takes an `AuthorizationModel` and produces a string
2. Layout algorithm — hierarchical tree with box drawing:
   ```
   ┌──────────────────────────────────────────────────┐
   │                    my-store                       │
   └──────┬───────────────┬───────────────┬───────────┘
          │               │               │
   ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
   │    user     │ │   folder    │ │  document   │
   └─────────────┘ └──────┬──────┘ └──────┬──────┘
                          │               │
                   ┌──────┼──────┐ ┌──────┼──────┐
                   │      │      │ │      │      │
                 owner  parent viewer  owner  parent
                                      writer reader
   ```
3. Alternative: indented tree format (simpler, more terminal-friendly):
   ```
   my-store
   ├── user (no relations)
   ├── group
   │   └── member: [user]
   ├── folder
   │   ├── owner: [user]
   │   ├── parent: [folder]
   │   └── viewer: [user, user:*, group#member] or owner or parent->viewer
   └── document
       ├── owner: [user]
       ├── parent: [folder]
       ├── writer: [user, group#member] or owner
       └── reader: [user, user:*, group#member] or writer or parent->viewer
   ```
4. Color coding:
   - Type names: bold cyan
   - Relation names: green
   - Direct type references: yellow
   - Operators (or/and/but not): magenta
   - Computed references: blue
5. Integration:
   - Accessible from model viewer via `g` key (toggle graph/code view)
   - Wrap in `<scrollbox>` for large models
6. The indented tree format is recommended — it's more information-dense, easier to render, and works well at any terminal width

**Acceptance**: Pressing `g` on the model view toggles to a colored ASCII representation of the model graph.

---

### Step 15: Vim-Style Keybindings

**Goal**: Add vim motion support throughout the app for power users.

**Tasks**:
1. Create a keybinding mode system:
   - Normal mode: single-key actions (`j`/`k` for up/down, `G` for bottom, `gg` for top)
   - Insert mode: text input in forms/editor (activated on focus of `<input>`/`<textarea>`)
   - Visual mode: (v2 stretch) selection in lists
2. List navigation (stores, tuples):
   - `j` / `Down` — move down
   - `k` / `Up` — move up
   - `G` — jump to last item
   - `gg` — jump to first item
   - `Ctrl+D` / `Ctrl+U` — half-page down/up
   - `/` — search/filter
   - `n` / `N` — next/previous search match
3. Model viewer navigation:
   - `j`/`k` — scroll line by line
   - `Ctrl+D`/`Ctrl+U` — half-page scroll
   - `G`/`gg` — top/bottom
4. Model editor (if single-pane):
   - Full vim insert/normal mode for text editing
   - This is a significant undertaking; consider using OpenTUI's built-in Emacs bindings as the base and adding vim as an opt-in layer
5. Configuration:
   - `~/.config/openfga-tui/config.json` gets a `"keymap": "vim" | "default"` setting
   - `--vim` CLI flag to enable

**Acceptance**: Users with `"keymap": "vim"` can navigate lists with `j`/`k`, jump with `G`/`gg`, and search with `/`.

---

### Step 16: Keybinding Help Overlay

**Goal**: `?` toggles a full-screen overlay showing all available keybindings for the current view.

**Tasks**:
1. Create `src/components/keybind-help.tsx`
2. Overlay rendered as a `<box>` with absolute positioning covering the content area
3. Content: two-column layout of keybinding → description, grouped by category
4. Example for the tuples view:
   ```
   ╔══════════════════════════════════════════╗
   ║           Keyboard Shortcuts             ║
   ╠══════════════════════════════════════════╣
   ║                                          ║
   ║  Navigation                              ║
   ║  ↑/k     Move up                         ║
   ║  ↓/j     Move down                       ║
   ║  Esc     Go back                         ║
   ║                                          ║
   ║  Actions                                 ║
   ║  a       Add tuple                        ║
   ║  d       Delete selected tuple            ║
   ║  r       Refresh list                     ║
   ║  /       Filter tuples                    ║
   ║  n       Next page                        ║
   ║                                          ║
   ║  Global                                   ║
   ║  Ctrl+C  Exit                             ║
   ║  ?       Toggle this help                 ║
   ║                                          ║
   ╚══════════════════════════════════════════╝
   ```
5. `?` toggles the overlay on/off
6. `Esc` also dismisses the overlay
7. Each view registers its keybindings via a context/hook so the overlay auto-populates

**Acceptance**: Pressing `?` on any view shows a complete, contextual keybinding reference.

---

### Step 17: Advanced Tuple Features

**Goal**: Enhance tuple management with filtering, bulk operations, and contextual tuples for queries.

**Tasks**:
1. **Server-side tuple filtering**:
   - `f` key opens filter mode with three optional fields (user, relation, object)
   - Sends filters via `ReadRequest.tuple_key` partial match
   - Active filters shown as badges below the header
   - `Ctrl+F` to clear all filters
2. **Bulk delete**:
   - Visual selection mode: `Space` to toggle selection on current row
   - `Shift+D` to delete all selected tuples
   - Selection count shown in status bar
3. **Tuple import/export** (stretch):
   - `Ctrl+E` — export tuples to JSON file (via `Bun.write()`)
   - `Ctrl+I` — import tuples from JSON file (via `Bun.file()`)
4. **Contextual tuples for queries**:
   - In query views, `Ctrl+T` opens a mini tuple editor
   - User adds temporary tuples that are included in the query's `contextual_tuples` field
   - These aren't persisted to the server
   - Show count of contextual tuples in query panel header

**Acceptance**: Users can filter tuples server-side, bulk-select and delete, and attach contextual tuples to queries.

---

### Step 18: Multi-Store Support

**Goal**: Allow working with multiple stores simultaneously, and store-aware command history.

**Tasks**:
1. **Store switcher**: `Ctrl+S` opens a quick-switch overlay listing all stores
   - Fuzzy search by store name
   - `Enter` to switch, `Esc` to cancel
   - Avoids navigating back to the stores list
2. **Per-store query history**:
   - Save last 10 queries per store in config file under `queryHistory[storeId]`
   - In query views, `Ctrl+H` shows history, `Enter` to re-run
3. **Store bookmarks**:
   - `b` on a store to bookmark it
   - Bookmarked stores appear at the top of the store list with a marker

**Acceptance**: Quick-switch between stores without leaving the current context.

---

## Keyboard Shortcut Reference (V1)

### Global
| Key | Action |
|---|---|
| `Ctrl+C` | Exit application |
| `Esc` | Go back / cancel current action |
| `?` | Show keybind help (v2) |

### Connect View
| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Next / previous field |
| `Enter` | Test connection |
| `Ctrl+Enter` | Connect |
| `Ctrl+P` | Enter playground mode |

### Stores View
| Key | Action |
|---|---|
| `Up` / `Down` | Navigate store list |
| `Enter` | Select store |
| `c` | Create new store |
| `d` | Delete selected store |
| `r` | Refresh list |

### Store Overview
| Key | Action |
|---|---|
| `m` | Go to Models |
| `t` | Go to Tuples |
| `q` | Go to Queries |

### Model Viewer
| Key | Action |
|---|---|
| `e` | Edit in $EDITOR |
| `v` | Select model version |
| `[` / `]` | Previous / next model version |
| `y` | Copy DSL to clipboard |
| `r` | Refresh |
| `g` | Toggle graph view (v2) |

### Tuples View
| Key | Action |
|---|---|
| `Up` / `Down` | Navigate tuple list |
| `a` | Add tuple |
| `d` | Delete selected tuple |
| `r` | Refresh |
| `n` | Next page |
| `/` | Filter |

### Query Views
| Key | Action |
|---|---|
| `Tab` | Next input field |
| `Enter` | Run query |
| `1-4` or `Tab-Select` | Switch query type |

---

## Risk Registry

| Risk | Severity | Impact | Mitigation |
|---|---|---|---|
| OpenTUI "not production ready" | High | Breaking changes, API instability | Pin exact version, vendor critical code, track OpenTUI releases |
| Bun-only runtime | Medium | Users must install Bun | Document clearly, provide install script, consider single binary via `bun build --compile` |
| tree-sitter-fga missing `highlights.scm` | Medium | Must write + maintain highlight queries | Write it ourselves (~60 lines), contribute upstream |
| tree-sitter-fga WASM compilation | Low | Build toolchain requirement | Pre-build and commit the `.wasm` binary |
| No `<textarea>` syntax highlighting | Medium | v2 inline editor limited to split-pane | Split-pane is functional; single-pane requires custom component work |
| OpenTUI native Zig dependency | Medium | Cross-platform build complexity | Use `bun build --compile` for distribution; test on macOS/Linux |
| Small terminal sizes | Low | Layout breaks below 80x24 | Detect and warn; degrade gracefully |
| FGA DSL parser limitations | Low | `dslToModel()` is simplified | Works for common patterns; recommend `@openfga/syntax-transformer` for production |

---

## Distribution Strategy

1. **Development**: `bun run src/index.tsx` — requires Bun + Zig toolchain
2. **Binary**: `bun build --compile src/index.tsx --outfile openfga-tui` — single binary, no runtime dependencies
3. **npm**: `bunx openfga-tui` — requires Bun installed
4. **Homebrew** (stretch): tap formula pointing to compiled binaries per platform

The `bun build --compile` approach is the recommended primary distribution method — it produces a single ~50MB binary with the Bun runtime embedded, eliminating all user-side dependency requirements.
