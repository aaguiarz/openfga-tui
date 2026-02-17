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
- **Query Operations** — Run Check, Read, List Objects, and List Users queries
- **Model-Aware Placeholders** — Form fields show examples matching your actual authorization model
- **Vim Keybindings** — Optional vim-style navigation (j/k, Ctrl+D/U, Shift+G)
- **Multi-Store Support** — Quick-switch between stores with fuzzy search, bookmarks, and per-store query history
- **Keyboard Help** — Press `?` on any screen to see available shortcuts
- **Saved Connections** — Save and manage multiple server connections with `~/.config/openfga-tui/config.json`
- **Authentication** — Supports no-auth, API key, and OIDC client credentials

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

This opens the connection screen. If you have saved connections, a picker lets you choose one; otherwise the connection form is shown.

### Connect via CLI arguments

```bash
# Connect with server URL (no auth)
bun run src/index.tsx --server-url http://localhost:8080

# Connect with API key authentication
bun run src/index.tsx --server-url http://localhost:8080 --api-key your-api-key

# Connect using a saved connection by name
bun run src/index.tsx --connection local
```

CLI arguments skip the connection screen and connect directly.

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

Enter your OpenFGA server URL and authentication credentials. Three authentication modes are supported:

- **None** — No authentication (local development)
- **API Key** — Bearer token authentication
- **OIDC** — OpenID Connect client credentials (client ID, client secret, token URL, optional audience)

Press `Enter` to test the connection. On success, you can save the connection with a name for quick access later.

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
- **2 — Read**: Read tuples matching optional user/relation/object filters (all fields optional)
- **3 — List Objects**: Find all objects a user has access to
- **4 — List Users**: Find all users with access to an object

Form fields show placeholder values derived from your actual authorization model (e.g., if your model defines `document` with an `owner` relation, placeholders show `user:anne`, `owner`, `document:budget` instead of generic examples).

## Keyboard Shortcuts

### Global

| Key | Action |
|---|---|
| `Esc` | Go back |
| `?` | Toggle keyboard help |
| `q` | Quit (from connection picker) |
| `Ctrl+C` | Exit |

### Connect

| Key | Action |
|---|---|
| `Up` / `Down` | Navigate saved connections |
| `Enter` | Connect (picker) / Test connection (form) |
| `Tab` / `Shift+Tab` | Next / previous field |
| `Esc` | Back to saved connections |

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

Connections are saved to `~/.config/openfga-tui/config.json`. The file is created automatically when you save a connection from the UI.

```json
{
  "connections": [
    {
      "name": "local",
      "serverUrl": "http://localhost:8080",
      "auth": { "type": "none" }
    },
    {
      "name": "staging",
      "serverUrl": "https://staging.example.com",
      "auth": {
        "type": "api-key",
        "apiKey": "your-api-key"
      }
    },
    {
      "name": "production",
      "serverUrl": "https://api.example.com",
      "auth": {
        "type": "oidc",
        "clientId": "my-client-id",
        "clientSecret": "my-client-secret",
        "tokenUrl": "https://auth.example.com/oauth/token",
        "audience": "https://api.example.com/"
      },
      "storeId": "01HXYZ..."
    }
  ]
}
```

### Connection options

| Field | Description |
|---|---|
| `name` | Display name for the connection picker |
| `serverUrl` | OpenFGA server URL |
| `auth.type` | `none`, `api-key`, or `oidc` |
| `auth.apiKey` | API key (when `type` is `api-key`) |
| `auth.clientId` | OIDC client ID (when `type` is `oidc`) |
| `auth.clientSecret` | OIDC client secret (when `type` is `oidc`) |
| `auth.tokenUrl` | OIDC token endpoint URL (when `type` is `oidc`) |
| `auth.audience` | OIDC audience, optional (when `type` is `oidc`) |
| `storeId` | Optional — scope the connection to a specific store, skipping the store list |

### CLI arguments

| Argument | Description |
|---|---|
| `--server-url <url>` | Connect directly to this server URL |
| `--api-key <key>` | Use API key authentication (requires `--server-url`) |
| `--connection <name>` | Connect using a saved connection by name |

CLI arguments skip the connection screen and connect directly.

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
    connect.tsx                # Connection picker + form
    stores.tsx                 # Store listing
    store-overview.tsx         # Store detail with stats
    model-viewer.tsx           # Model display with highlighting
    model-editor.tsx           # Split-pane inline editor
    tuples.tsx                 # Tuple table management
    queries.tsx                # Query tab container
    query-check.tsx            # Check query
    query-read.tsx             # Read query (filter tuples)
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
    config.ts                  # Config persistence & CLI arg parsing
    clipboard.ts               # Cross-platform clipboard support
    keybindings.ts             # Keymap definitions
    keybind-help.ts            # Per-view shortcut data
    form-status.ts             # Form validation state
    store-list.ts              # Store list operations
    tuple-list.ts              # Tuple list state
    tuple-filter.ts            # Tuple filtering & selection
    fga-highlight.ts           # FGA DSL syntax highlighter
    model-graph.ts             # ASCII model visualization
    model-editor.ts            # Editor state machine
    model-placeholders.ts      # Model-aware form placeholders
    multi-store.ts             # Store switcher, history, bookmarks

    openfga/                   # OpenFGA client library
      client.ts                # REST API client with auth
      types.ts                 # TypeScript interfaces
      endpoints.ts             # API URL builders
      dsl-converter.ts         # DSL <-> JSON model conversion

  __tests__/                   # Test suite
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
    model-placeholders.test.ts
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
