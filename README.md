# openfga-tui

A terminal user interface for [OpenFGA](https://openfga.dev) — manage stores, authorization models, tuples, and run queries directly from your terminal.

Built with [Bun](https://bun.sh) and [@opentui/react](https://github.com/nicksrandall/opentui) for a fast, reactive terminal experience with syntax highlighting and vim keybindings.

```
┌─ OpenFGA TUI ─────────────────────── Stores > store-abc > Model ─┐
│                                                                    │
│  Authorization Model              Model 1/3  ID: 01HXYZ...        │
│  ──────────────────────────────────────────────────────────────     │
│    1  model                                                        │
│    2    schema 1.1                                                 │
│    3                                                               │
│    4  type user                                                    │
│    5                                                               │
│    6  type document                                                │
│    7    relations                                                  │
│    8      define owner: [user]                                     │
│    9      define viewer: [user] or owner                           │
│                                                                    │
│  ──────────────────────────────────────────────────────────────     │
│  [e]dit  [v]ersion [1/3]  [y]ank  [r]efresh                       │
├────────────────────────────────────────────────────────────────────┤
│  http://localhost:8080  │  [e]dit [v]ersion [y]ank [g]raph [?]help │
└────────────────────────────────────────────────────────────────────┘
```

## Features

- **Store Management** — List, create, and delete OpenFGA stores
- **Model Viewer** — View authorization models with FGA DSL syntax highlighting and line numbers
- **Inline Model Editor** — Split-pane editor with live validation and highlighted preview
- **Model Graph** — ASCII tree visualization of type/relation relationships
- **Tuple Management** — Browse, add, delete, filter, and paginate tuples with server-side filtering
- **Query Operations** — Run Check, Expand, List Objects, and List Users queries
- **Vim Keybindings** — Optional vim-style navigation (j/k, Ctrl+D/U, Shift+G)
- **Multi-Store Support** — Quick-switch between stores with fuzzy search, bookmarks, and per-store query history
- **Keyboard Help** — Press `?` on any screen to see available shortcuts
- **Config Persistence** — Connection settings saved to `~/.config/openfga-tui/config.json`

## Requirements

- [Bun](https://bun.sh) v1.3 or later

## Installation

```bash
git clone https://github.com/your-org/openfga-tui.git
cd openfga-tui
bun install
```

## Usage

### Connect to an OpenFGA server

```bash
bun run src/index.tsx
```

This opens the connection screen where you can enter your server URL and authentication details.

### Connect via CLI arguments

```bash
# Connect with server URL
bun run src/index.tsx --server-url http://localhost:8080

# Connect with API key authentication
bun run src/index.tsx --server-url http://localhost:8080 --api-key your-api-key
```

### Development mode (auto-reload)

```bash
bun --watch src/index.tsx
```

### Build a standalone binary

```bash
bun build --compile src/index.tsx --outfile openfga-tui
./openfga-tui --server-url http://localhost:8080
```

## Screens

### Connect

Enter your OpenFGA server URL and authentication credentials. Supports no-auth and API key authentication. Press `Enter` to test the connection, then connect to proceed.

### Stores

Browse all stores on the server. Create new stores with `c`, delete with `d`, and press `Enter` to select a store. Bookmarked stores appear at the top of the list.

### Store Overview

See store details and stats. Navigate to sub-views:
- `m` — Models
- `t` — Tuples
- `q` — Queries

### Model Viewer

View authorization models with syntax-highlighted FGA DSL. Cycle through model versions with `[` / `]`. Copy DSL to clipboard with `y`, open in `$EDITOR` with `e`, or toggle ASCII graph view with `g`.

### Model Editor

Split-pane editor with a plain-text editing area on the left and a syntax-highlighted preview on the right. Real-time validation (debounced 500ms) shows whether your model is valid. Save with `Ctrl+S`.

### Tuples

Browse relationship tuples in a table view. Add tuples with `a`, delete with `d`, filter with `/`. Supports pagination with `n` for next page. Server-side filtering by user, relation, and object.

### Queries

Run authorization queries across four tabs:
- **1 — Check**: Test if a user has a relationship with an object
- **2 — Expand**: View the expansion tree for a relationship
- **3 — List Objects**: Find all objects a user has access to
- **4 — List Users**: Find all users with access to an object

## Keyboard Shortcuts

### Global

| Key | Action |
|---|---|
| `Esc` | Go back |
| `?` | Toggle keyboard help |
| `Ctrl+C` | Exit |

### Connect

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Next / previous field |
| `Enter` | Test connection |

### Stores

| Key | Action |
|---|---|
| `Up` / `k` | Move up |
| `Down` / `j` | Move down |
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
| `[` / `]` | Previous / next version |
| `y` | Copy DSL to clipboard |
| `g` | Toggle graph view |
| `r` | Refresh |

### Tuples

| Key | Action |
|---|---|
| `Up` / `k` | Move up |
| `Down` / `j` | Move down |
| `n` | Next page |
| `a` | Add tuple |
| `d` | Delete selected tuple |
| `r` | Refresh |
| `/` | Filter tuples |

### Queries

| Key | Action |
|---|---|
| `1` — `4` | Switch query tab |
| `Tab` | Next input field |
| `Enter` | Run query |

### Vim Mode

When vim keybindings are enabled, additional keys are available:

| Key | Action |
|---|---|
| `j` / `k` | Move down / up |
| `Ctrl+D` / `Ctrl+U` | Page down / up |
| `Shift+G` | Jump to bottom |

## Configuration

Settings are persisted to `~/.config/openfga-tui/config.json`:

```json
{
  "serverUrl": "http://localhost:8080",
  "auth": {
    "type": "api-key",
    "apiKey": "your-key"
  },
  "lastStoreId": "01HXYZ..."
}
```

CLI arguments override saved configuration.

## Syntax Highlighting

The model viewer and editor include FGA DSL syntax highlighting:

- **Keywords** — `model`, `schema`, `type`, `define`, `relations`, `condition` (red, bold)
- **Operators** — `or`, `and`, `but not` (purple, bold)
- **Types** — Type names after `type` keyword (green, bold)
- **References** — `type#relation` cross-references (green)
- **Built-in types** — `string`, `int`, `bool`, `timestamp`, etc. (cyan)
- **Version numbers** — Schema version identifiers (yellow)
- **Comments** — Lines starting with `#` (gray)
- **Wildcards** — `type:*` patterns (yellow)

## Project Structure

```
src/
  index.tsx                    # Entry point, CLI args, renderer setup
  app.tsx                      # Root component, view routing

  views/                       # Screen components
    connect.tsx                # Connection form
    stores.tsx                 # Store listing
    store-overview.tsx         # Store detail
    model-viewer.tsx           # Model display with highlighting
    model-editor.tsx           # Split-pane inline editor
    tuples.tsx                 # Tuple table management
    queries.tsx                # Query tab container
    query-check.tsx            # Check query
    query-expand.tsx           # Expand query with tree view
    query-list-objects.tsx     # List Objects query
    query-list-users.tsx       # List Users query

  components/                  # Reusable UI components
    header.tsx                 # Top bar with breadcrumb
    status-bar.tsx             # Bottom bar with hints
    form-field.tsx             # Label + input wrapper
    table.tsx                  # Data table with selection
    confirm.tsx                # Inline y/N confirmation
    spinner.tsx                # Loading animation
    toast.tsx                  # Auto-dismiss notification
    tree-view.tsx              # Recursive tree renderer
    keybind-help.tsx           # Keyboard shortcut overlay

  lib/                         # Pure logic (testable, no UI imports)
    navigation.ts              # View state machine
    config.ts                  # Config persistence
    keybindings.ts             # Keymap definitions
    keybind-help.ts            # Per-view shortcut data
    form-status.ts             # Form validation state
    store-list.ts              # Store list operations
    tuple-list.ts              # Tuple list state
    tuple-filter.ts            # Tuple filtering & selection
    fga-highlight.ts           # FGA DSL syntax highlighter
    model-graph.ts             # ASCII model visualization
    model-editor.ts            # Editor state machine
    multi-store.ts             # Store switcher, history, bookmarks

    openfga/                   # OpenFGA client library
      client.ts                # REST API client with auth
      types.ts                 # TypeScript interfaces
      endpoints.ts             # API URL builders
      dsl-converter.ts         # DSL <-> JSON model conversion

  __tests__/                   # Test suite (388 tests)
    client.test.ts
    config.test.ts
    connect.test.ts
    dsl-converter.test.ts
    endpoints.test.ts
    fga-highlight.test.ts
    keybind-help.test.ts
    keybindings.test.ts
    model-editor.test.ts
    model-graph.test.ts
    multi-store.test.ts
    navigation.test.ts
    query.test.ts
    store-list.test.ts
    store-overview.test.ts
    tuple-filter.test.ts
    tuple-list.test.ts
```

## Testing

All business logic lives in `src/lib/` as pure TypeScript modules with no UI framework imports, making them fast and reliable to test.

```bash
# Run all tests
bun test

# Run a specific test file
bun test src/__tests__/navigation.test.ts

# Run tests matching a pattern
bun test --filter "keybind"
```

Tests cover navigation, configuration, store operations, tuple management, query execution, syntax highlighting, model visualization, editor state, keybindings, and multi-store features.

## Architecture

The application follows a strict separation between UI and logic:

- **`src/lib/`** — Pure TypeScript functions and state machines. No OpenTUI or React imports. All testable with `bun test`.
- **`src/views/`** — React components using OpenTUI's JSX intrinsic elements (`<box>`, `<text>`, `<scrollbox>`, `<input>`, `<select>`). Handle rendering and keyboard input.
- **`src/components/`** — Reusable UI building blocks shared across views.

State management uses React's `useReducer` for state machines (navigation, store list, tuple list, editor) and `useState` for simpler local state. Keyboard input is handled via OpenTUI's `useKeyboard` hook.

## License

MIT
