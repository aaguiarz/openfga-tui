# OpenFGA TUI - Functional Specification

A terminal user interface for managing [OpenFGA](https://openfga.dev) servers. This document describes the functional requirements, screen layouts, user interactions, and OpenFGA API usage so an implementor can recreate this application in any language or TUI framework.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Configuration](#2-configuration)
3. [Application Layout](#3-application-layout)
4. [Navigation Model](#4-navigation-model)
5. [Screen Specifications](#5-screen-specifications)
   - 5.1 [Connect Screen](#51-connect-screen)
   - 5.2 [Stores Screen](#52-stores-screen)
   - 5.3 [Store Overview Screen](#53-store-overview-screen)
   - 5.4 [Model Viewer Screen](#54-model-viewer-screen)
   - 5.5 [Model Editor Screen](#55-model-editor-screen)
   - 5.6 [Tuples Screen](#56-tuples-screen)
   - 5.7 [Queries Screen](#57-queries-screen)
6. [OpenFGA API Reference](#6-openfga-api-reference)
7. [Authentication](#7-authentication)
8. [Model-Aware Placeholders](#8-model-aware-placeholders)
9. [FGA DSL Syntax Highlighting](#9-fga-dsl-syntax-highlighting)
10. [DSL-to-JSON Conversion](#10-dsl-to-json-conversion)
11. [Error Handling Patterns](#11-error-handling-patterns)
12. [Re-Implementation Notes](#12-re-implementation-notes)

---

## 1. Overview

The application is a full-screen terminal UI (alternate screen mode) that connects to an OpenFGA server and provides:

- Store management (list, create, delete)
- Authorization model viewing with DSL syntax highlighting
- Inline model editing with live validation
- Tuple browsing, creation, deletion, and filtering
- Query execution (Check, Read, List Objects, List Users)

The UI is keyboard-driven with no mouse interaction (though mouse tracking should be properly cleaned up on exit). The application uses the alternate terminal screen and must restore the terminal state when exiting.

---

## 2. Configuration

### 2.1 Config File

Connections are persisted to `~/.config/openfga-tui/config.json`:

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

### 2.2 Connection Fields

| Field              | Type   | Required | Description                                      |
|--------------------|--------|----------|--------------------------------------------------|
| `name`             | string | yes      | Display name for the connection picker            |
| `serverUrl`        | string | yes      | OpenFGA server base URL                           |
| `auth.type`        | string | yes      | `"none"`, `"api-key"`, or `"oidc"`                |
| `auth.apiKey`      | string | api-key  | Bearer token value                                |
| `auth.clientId`    | string | oidc     | OIDC client ID                                    |
| `auth.clientSecret`| string | oidc     | OIDC client secret                                |
| `auth.tokenUrl`    | string | oidc     | OIDC token endpoint URL                           |
| `auth.audience`    | string | oidc     | OIDC audience (optional)                          |
| `storeId`          | string | no       | Scope connection to a specific store              |

When `storeId` is set, the application skips the store list and navigates directly to the store overview for that store.

### 2.3 CLI Arguments

| Argument              | Description                                    |
|-----------------------|------------------------------------------------|
| `--server-url <url>`  | Connect directly to this server URL            |
| `--api-key <key>`     | Use API key auth (requires `--server-url`)     |
| `--connection <name>` | Connect using a saved connection by name       |

CLI arguments skip the connect screen entirely.

---

## 3. Application Layout

The application has three fixed layout regions:

```
┌──────────────────────────────────────────────────────────────────────┐
│ OpenFGA TUI              Stores > mystore > Model      [CONNECTED]  │  <- Header
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                                                                      │
│                         (View Content Area)                          │
│                                                                      │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ http://localhost:8080  | mystore     [m]odel [t]uples [q]ueries     │  <- Status Bar
└──────────────────────────────────────────────────────────────────────┘
```

### 3.1 Header Bar (1 row)

- **Left**: App name "OpenFGA TUI" (bold, blue) followed by breadcrumb path (gray)
- **Right**: Connection status indicator `[CONNECTED]` (green) or `[DISCONNECTED]` (red)
- Bottom border line separating header from content

**Breadcrumb rules** (joined with ` > `):
- Connect: `Connect`
- Stores: `Stores`
- Store Overview: `Stores > {storeName}`
- Model: `Stores > {storeName} > Model`
- Tuples: `Stores > {storeName} > Tuples`
- Queries: `Stores > {storeName} > Queries`

Use the store name (not the ID) in breadcrumbs when available.

### 3.2 Content Area (fills remaining space)

Each screen renders its content here. Content has 1 character of padding on all sides.

### 3.3 Status Bar (1 row)

- **Left**: Server URL (green if connected, red if not) + optional ` | {storeName}`
- **Right**: Context-sensitive keyboard shortcut hints
- Top border line separating status bar from content

**Keybind hints per view:**

| View           | Hints                                                                 |
|----------------|-----------------------------------------------------------------------|
| Connect        | `[Up/Down] select  [Enter] connect  [Tab] next field`                 |
| Stores         | `[Up/Down] navigate  [Enter] select  [c]reate  [d]elete  [r]efresh`  |
| Store Overview | `[m]odel  [t]uples  [q]ueries  [Esc] back`                           |
| Model          | `[e]dit  [c]reate  [[] prev  []] next  [y]ank  [r]efresh  [Esc] back`|
| Tuples         | `[Up/Down] navigate  [a]dd  [d]elete  [r]efresh  [/]filter  [Esc] back` |
| Queries        | `[Tab] switch tab  [Enter] run  [Esc] back`                          |

---

## 4. Navigation Model

### 4.1 View Hierarchy

```
connect
  └── stores
        └── store-overview (storeId)
              ├── model (storeId)
              ├── tuples (storeId)
              └── queries (storeId)
```

### 4.2 Navigation Rules

- `Esc` navigates to the parent view (see hierarchy above)
- Views with modal states (adding, filtering, confirming delete) handle `Esc` internally first:
  - If a modal is open, `Esc` closes the modal
  - If no modal is open, `Esc` navigates back
- `Ctrl+C` exits the application at any time
- `q` exits the application from the connection picker screen

### 4.3 Back Navigation Map

| Current View   | Back destination      |
|----------------|-----------------------|
| Connect        | (none - stays)        |
| Stores         | Connect               |
| Store Overview | Stores                |
| Model          | Store Overview        |
| Tuples         | Store Overview        |
| Queries        | Store Overview        |

### 4.4 Component Remounting

When navigating between views, components should be fully re-created (not reused) to ensure fresh state. This prevents stale data from appearing when navigating back to a previously visited view.

---

## 5. Screen Specifications

### 5.1 Connect Screen

The connect screen has three modes: **Picker**, **Form**, and **Save Prompt**.

#### 5.1.1 Picker Mode (shown when saved connections exist)

```
  Connect to OpenFGA Server

  Saved Connections
  ──────────────────────────────────────────────────────────────────
  > local                http://localhost:8080
    staging              https://staging.example.com  [API Key]
    production           https://api.example.com  [OIDC]
    + New connection...

  [Up/Down] select  [Enter] connect  [q] quit
```

**Behavior:**
- List all saved connections from config file
- Last item is always "+ New connection..." which opens the form
- Highlight selected row with distinct background color
- Show auth type label: `[API Key]` or `[OIDC]` (nothing for `none`)
- `Enter` on a saved connection: test connection, then navigate to stores (or store-overview if `storeId` is set)
- `Enter` on "+ New connection...": switch to form mode
- `q`: quit the application
- While connecting, show "Connecting..." status message
- On connection failure, show error message in red

**Keybindings:**

| Key     | Action                          |
|---------|---------------------------------|
| `Up`/`k`    | Move selection up           |
| `Down`/`j`  | Move selection down         |
| `Enter` | Connect to selected / open form |
| `q`     | Quit application                |

#### 5.1.2 Form Mode

```
  Connect to OpenFGA Server

  Server URL:   [http://localhost:8080                              ]
  Auth Type:    [None v]



  [Enter] Connect   [Esc] Back to saved
```

When auth type is "API Key":
```
  Server URL:   [http://localhost:8080                              ]
  Auth Type:    [API Key v]
  API Key:      [                                                   ]
```

When auth type is "OIDC":
```
  Server URL:   [https://api.example.com                           ]
  Auth Type:    [OIDC v]
  Token URL:    [https://auth.example.com/oauth/token              ]
  Client ID:    [my-client-id                          ]
  Client Secret:[my-client-secret                                  ]
  Audience:     [https://api.example.com/ (optional)               ]
```

**Behavior:**
- `Tab`/`Shift+Tab` cycles through input fields
- Auth Type is a select/dropdown with options: None, API Key, OIDC
- Changing auth type shows/hides the relevant fields
- `Enter` tests the connection (calls `GET /stores?page_size=1` or falls back to basic auth check)
- On success, switches to save prompt mode
- `Esc` returns to picker mode (only if saved connections exist)

**Keybindings:**

| Key          | Action                      |
|--------------|-----------------------------|
| `Tab`        | Next field                  |
| `Shift+Tab`  | Previous field              |
| `Enter`      | Test and connect            |
| `Esc`        | Back to saved connections   |

#### 5.1.3 Save Prompt Mode

```
  Connection successful!

  Save this connection for quick access?

  Connection name:  [e.g. local, staging, prod            ]

  [Enter] Save & continue   [Esc] Skip
```

**Behavior:**
- Shown after a successful connection test from the form
- User can enter a name and press `Enter` to save the connection to config
- `Esc` skips saving and connects directly
- If a name is entered, the connection is persisted to the config file
- After save or skip, navigate to stores (or store-overview if storeId is set)

#### 5.1.4 Connection Test Logic

1. Try `GET /stores?page_size=1` with auth headers
2. If that succeeds, connection is valid
3. If it fails (e.g., 403 on FGA Cloud with scoped credentials), fall back to:
   - `GET {serverUrl}` with auth headers
   - Any response except 401 means the server is reachable and auth is valid

---

### 5.2 Stores Screen

```
  Stores

  Name                          ID                             Created
  ──────────────────────────────────────────────────────────────────────────
  my-store                      01HXY1234567890ABCDEF          2024-01-15
> production-store              01HXY2345678901BCDEFG          2024-02-20
  test-store                    01HXY3456789012CDEFGH          2024-03-10
```

**Behavior:**
- On mount, fetch stores via `GET /stores`
- Display in a table with columns: Name (30 chars), ID (30 chars), Created (16 chars)
- Selected row is highlighted with a distinct background color
- Show full store IDs (do not truncate)
- Created date formatted as `YYYY-MM-DD`
- If no stores exist: "No stores found. Press 'c' to create one."

**Scoped store mode**: If the connection has a `storeId`, instead of calling the API, show a single synthetic entry with just the store ID and navigate directly when selected.

**Keybindings:**

| Key     | Action                         |
|---------|--------------------------------|
| `Up`    | Move selection up              |
| `Down`  | Move selection down            |
| `Enter` | Select store -> Store Overview |
| `c`     | Create new store               |
| `d`     | Delete selected store          |
| `r`     | Refresh list                   |

#### 5.2.1 Create Store Modal

```
  New store name: [my-store                                ]
```

- Inline input field appears above the table
- `Enter` submits (calls `POST /stores` with `{ "name": "..." }`)
- After creation, refresh the store list
- `Esc` cancels

#### 5.2.2 Delete Store Confirmation

```
  Delete store 'production-store'? (y/N)
```

- Inline confirmation prompt
- `y` confirms deletion (calls `DELETE /stores/{storeId}`)
- `n` or `Esc` cancels
- After deletion, refresh the store list

---

### 5.3 Store Overview Screen

```
  Store: production-store
  ID: 01HXY2345678901BCDEFG  Created: 2024-02-20  Updated: 2024-03-15

  ╭──────────────────╮  ╭──────────────────╮  ╭──────────────────╮
  │   [m] Models     │  │   [t] Tuples     │  │   [q] Queries    │
  │   3 models       │  │   42 tuples      │  │   4 operations   │
  ╰──────────────────╯  ╰──────────────────╯  ╰──────────────────╯
```

**Behavior:**
- On mount, fetch in parallel:
  1. `GET /stores/{storeId}` - store details (may fail on FGA Cloud, handle gracefully)
  2. `GET /stores/{storeId}/authorization-models?page_size=100` - count models
  3. `POST /stores/{storeId}/read` with `{ "page_size": 1 }` - verify tuples exist
- Display store name, full ID, created and updated dates
- Show three navigation cards with item counts
- Queries card always shows "4 operations" (static)
- If `getStore` fails (e.g., on FGA Cloud), display the store ID as the name instead

**API calls:**

| Purpose       | Method | Endpoint                                           | Body                    |
|---------------|--------|----------------------------------------------------|-------------------------|
| Store details | GET    | `/stores/{storeId}`                                | -                       |
| Model count   | GET    | `/stores/{storeId}/authorization-models?page_size=100` | -                   |
| Tuple check   | POST   | `/stores/{storeId}/read`                           | `{ "page_size": 1 }`   |

**Keybindings:**

| Key   | Action          |
|-------|-----------------|
| `m`   | Go to Models    |
| `t`   | Go to Tuples    |
| `q`   | Go to Queries   |
| `Esc` | Back to Stores  |

---

### 5.4 Model Viewer Screen

```
  Authorization Model                                Model 1/3  ID: 01HXYZ12345678...

  ──────────────────────────────────────────────────────────────────────────────
    1  model
    2    schema 1.1
    3
    4  type user
    5
    6  type document
    7    relations
    8      define owner: [user]
    9      define viewer: [user] or owner
  ──────────────────────────────────────────────────────────────────────────────
  [e]dit  [c]reate  [[] prev  []] next  [y]ank  [r]efresh
```

**Behavior:**
- On mount, fetch all models via `GET /stores/{storeId}/authorization-models?page_size=100`
- Models are returned newest-first; index 0 = latest model
- Display the selected model as DSL text with:
  - Line numbers (right-aligned, 3 chars wide, gray)
  - Syntax highlighting (see Section 9)
- Show model position indicator: "Model {n}/{total}" and truncated model ID
- Content area is scrollable for long models
- If no models exist, show empty state with prompt to create

**Empty state:**
```
  Authorization Model
  ──────────────────────────────────────────────────────────────────────────────

  No authorization models found.
  Press [c] to create a new model or [e] to open the editor.

  [c]reate  [e]dit  [r]efresh
```

**Keybindings:**

| Key   | Action                            |
|-------|-----------------------------------|
| `[`   | Previous model version            |
| `]`   | Next model version                |
| `e`   | Open inline editor                |
| `c`   | Open inline editor (create new)   |
| `y`   | Copy DSL to clipboard             |
| `r`   | Refresh model list                |
| `Esc` | Back to Store Overview            |

**Clipboard**: Copy uses platform-specific commands:
- macOS: `pbcopy`
- Linux: `xclip -selection clipboard` or `xsel --clipboard --input`
- Windows: `clip`

**API calls:**

| Purpose      | Method | Endpoint                                               |
|--------------|--------|--------------------------------------------------------|
| List models  | GET    | `/stores/{storeId}/authorization-models?page_size=100` |

---

### 5.5 Model Editor Screen

```
  Model Editor                                                    Valid
  ──────────────────────────────────────────────────────────────────────────────
    Editor                              Preview
  ┌─────────────────────────────────┐ ┌─────────────────────────────────────┐
  │ model                           │ │  1  model                           │
  │   schema 1.1                    │ │  2    schema 1.1                    │
  │                                 │ │  3                                  │
  │ type user                       │ │  4  type user                       │
  │                                 │ │  5                                  │
  │ type document                   │ │  6  type document                   │
  │   relations                     │ │  7    relations                     │
  │     define owner: [user]        │ │  8      define owner: [user]        │
  │     define viewer: [user]       │ │  9      define viewer: [user]       │
  └─────────────────────────────────┘ └─────────────────────────────────────┘
  ──────────────────────────────────────────────────────────────────────────────
  Ctrl+S Save   Esc Close   9 lines   Valid
```

**Behavior:**
- Split-pane layout: left half is a text editor, right half is a syntax-highlighted read-only preview
- Left pane: plain text editing area with free-form text input
- Right pane: same text rendered with syntax highlighting and line numbers
- **Validation**: After each edit, validate the DSL with a 500ms debounce
  - Show `Valid` (green) or `Invalid` (red) in both header and footer
  - Validation: parse DSL to JSON model format; if parsing succeeds, the model is valid
- **Saving**: `Ctrl+S` sends the model to the API
  - Parse DSL to JSON model
  - Call `POST /stores/{storeId}/authorization-models` with the JSON body
  - On success: close editor, refresh model list
  - On failure: show error message in footer
- When opening editor on existing model: pre-populate with current model's DSL
- When creating new (no models exist): pre-populate with a default template

**Default template:**
```
model
  schema 1.1

type user

type document
  relations
    define viewer: [user]
    define editor: [user]
    define owner: [user]
```

**Keybindings:**

| Key      | Action                  |
|----------|-------------------------|
| `Ctrl+S` | Save model to server    |
| `Esc`    | Close editor (no save)  |

**API calls:**

| Purpose     | Method | Endpoint                                        | Body                                |
|-------------|--------|-------------------------------------------------|-------------------------------------|
| Write model | POST   | `/stores/{storeId}/authorization-models`        | `{ "schema_version": "1.1", "type_definitions": [...] }` |

---

### 5.6 Tuples Screen

```
  Tuples                                                        42 tuples (more available)

  Filter: user:anne

  ┌────────────────────────────────────────────────────────────────────────┐
  │ User                     Relation         Object                      │
  ├────────────────────────────────────────────────────────────────────────┤
  │ user:anne                 owner            document:budget             │
  │ user:anne                 viewer           document:report             │
  │>user:bob                  editor           document:budget             │
  └────────────────────────────────────────────────────────────────────────┘

  Press 'n' for next page
```

**Behavior:**
- On mount, fetch tuples via `POST /stores/{storeId}/read` with `{ "page_size": 50 }`
- On mount, also fetch the latest authorization model (for placeholders in add form)
- Display tuples in a table with columns: User (24 chars), Relation (16 chars), Object (24 chars)
- Show tuple count and "(more available)" if continuation token exists
- Selected row is highlighted
- Supports **server-side filtering** via the Read API's `tuple_key` parameter (user, relation, object fields)
- Supports pagination via continuation tokens (pages are accumulated, not replaced)

**Keybindings:**

| Key   | Action                             |
|-------|------------------------------------|
| `Up`  | Move selection up                  |
| `Down`| Move selection down                |
| `a`   | Open add tuple form                |
| `d`   | Delete selected tuple (confirm)    |
| `r`   | Refresh tuple list                 |
| `/`   | Open filter input                  |
| `n`   | Load next page (if available)      |
| `x`   | Clear active filter                |
| `Esc` | Close modal, or clear error, or navigate back |

**Header inline state indicator:** When entering a form mode (add or filter), the header row changes to show the mode as a suffix rather than rendering a separate title line:
- Normal: `Tuples                          42 tuples`
- Adding: `Tuples / Add Tuple              42 tuples`
- Filtering: `Tuples / Filter (all optional)  42 tuples`

**Active filter indicator:** When a server-side filter is active, a yellow line appears below the header:
```
  Filter: user=user:anne, relation=owner  [x] clear  [/] edit
```

#### 5.6.1 Add Tuple Form

```
  Tuples / Add Tuple                                          42 tuples
  User:      [user:anne                                      ]
  Relation:  [owner                                          ]
  Object:    [document:budget                                ]
  [Tab] next field  [Enter] submit  [Esc] cancel
```

- Appears as an inline form below the header (no separate title line, no border)
- Three input fields: User, Relation, Object (all required)
- Placeholder values are derived from the authorization model (see Section 8)
- `Tab` moves between fields
- `Enter` on last field (or any field) submits if all fields are filled
- On submit: `POST /stores/{storeId}/write` with `{ "writes": { "tuple_keys": [{ "user": "...", "relation": "...", "object": "..." }] } }`
- After success: clear fields, close form, refresh tuple list
- `Esc` cancels and closes the form

#### 5.6.2 Delete Tuple Confirmation

```
  Delete tuple 'user:anne owner document:budget'? (y/N)
```

- On confirm: `POST /stores/{storeId}/write` with `{ "deletes": { "tuple_keys": [{ "user": "...", "relation": "...", "object": "..." }] } }`
- After success: refresh tuple list

#### 5.6.3 Filter Mode (Server-Side)

```
  Tuples / Filter (all optional)                              42 tuples
  User:      [user:anne (optional)                             ]
  Relation:  [owner (optional)                                 ]
  Object:    [document: (optional)                             ]
  [Tab] next  [Enter] apply  [Esc] cancel
```

- Three optional fields: User, Relation, Object
- `Tab`/`Shift+Tab` cycles between fields
- `Enter` applies the filter by calling the Read API with the filled fields as `tuple_key`
- `Esc` cancels filter editing (preserves the previously active filter)
- `/` re-opens the filter form pre-populated with current active filter values
- `x` clears the active filter and reloads all tuples
- **When a filter is active**, subsequent operations (add, delete, refresh, next page) use the active filter

**API calls:**

| Purpose       | Method | Endpoint                      | Body                                                        |
|---------------|--------|-------------------------------|-------------------------------------------------------------|
| Read tuples   | POST   | `/stores/{storeId}/read`      | `{ "tuple_key": { ... }, "page_size": 50, "continuation_token": "..." }` |
| Write tuple   | POST   | `/stores/{storeId}/write`     | `{ "writes": { "tuple_keys": [{ user, relation, object }] } }` |
| Delete tuple  | POST   | `/stores/{storeId}/write`     | `{ "deletes": { "tuple_keys": [{ user, relation, object }] } }` |
| Fetch model   | GET    | `/stores/{storeId}/authorization-models?page_size=1` | -                                         |

---

### 5.7 Queries Screen

```
  [1] Check   [2] Read   [3] List Objects   [4] List Users
  ──────────────────────────────────────────────────────────────────────────────

  (active tab content here)
```

**Behavior:**
- Four tabs, switchable with number keys `1`-`4`
- Active tab is highlighted (bold blue), inactive tabs are gray
- On mount, fetch the latest authorization model for placeholder values
- `Esc` navigates back to store overview

**Keybindings (shared):**

| Key   | Action                   |
|-------|--------------------------|
| `1`   | Switch to Check tab      |
| `2`   | Switch to Read tab       |
| `3`   | Switch to List Objects   |
| `4`   | Switch to List Users     |
| `Esc` | Back to Store Overview   |

#### 5.7.1 Check Tab

```
  Check

  User:      [user:anne                                      ]
  Relation:  [owner                                          ]
  Object:    [document:budget                                ]


  ALLOWED
```

**Fields:** User, Relation, Object (all required)

**Behavior:**
- `Tab`/`Shift+Tab` cycles fields
- `Enter` runs the check query
- Show "Running check..." while in progress
- Result: `ALLOWED` (green, bold) or `DENIED` (red, bold)
- If the response includes `resolution`, display it below the result

**API call:**
```
POST /stores/{storeId}/check
{
  "tuple_key": {
    "user": "user:anne",
    "relation": "owner",
    "object": "document:budget"
  }
}
```

**Response:** `{ "allowed": true, "resolution": "..." }`

#### 5.7.2 Read Tab

```
  Read

  User:      [user:anne (optional)                           ]
  Relation:  [owner (optional)                               ]
  Object:    [document:budget (optional)                     ]


  3 tuples (more available - press n)
  ┌────────────────────────────────────────────────────────────────────────┐
  │ User                     Relation         Object                      │
  ├────────────────────────────────────────────────────────────────────────┤
  │ user:anne                 owner            document:budget             │
  │ user:anne                 owner            document:report             │
  │ user:anne                 owner            document:proposal           │
  └────────────────────────────────────────────────────────────────────────┘
```

**Fields:** User, Relation, Object (all **optional** - placeholders show "(optional)" suffix)

**Behavior:**
- All fields are optional. Empty fields are omitted from the request.
- If all fields are empty, reads ALL tuples (equivalent to the Tuples screen's initial load)
- `Enter` runs the read query
- Results displayed in a table (same format as Tuples screen)
- Supports pagination: `n` loads next page, results are appended
- Show count and "(more available - press n)" if continuation token exists

**API call:**
```
POST /stores/{storeId}/read
{
  "tuple_key": {               // omitted entirely if all fields empty
    "user": "user:anne",       // omit if empty
    "relation": "owner",      // omit if empty
    "object": "document:budget" // omit if empty
  },
  "page_size": 50,
  "continuation_token": "..."  // omit on first request
}
```

**Response:** `{ "tuples": [{ "key": { "user", "relation", "object" }, "timestamp": "..." }], "continuation_token": "..." }`

#### 5.7.3 List Objects Tab

```
  List Objects

  User:      [user:anne                                      ]
  Relation:  [owner                                          ]
  Type:      [document                                       ]


  3 objects found
  document:budget
  document:report
  document:proposal
```

**Fields:** User, Relation, Type (all required)

**Behavior:**
- `Enter` runs the query
- Results displayed as a simple list of object identifiers (format: `type:id`)

**API call:**
```
POST /stores/{storeId}/list-objects
{
  "user": "user:anne",
  "relation": "owner",
  "type": "document"
}
```

**Response:** `{ "objects": ["document:budget", "document:report"] }`

#### 5.7.4 List Users Tab

```
  List Users

  Object Type:      [document                                ]
  Object ID:        [budget                                  ]
  Relation:         [owner                                   ]
  User Filter Type: [user                                    ]


  2 users found
  user:anne
  user:bob
```

**Fields:** Object Type, Object ID, Relation, User Filter Type (all required)

**Behavior:**
- `Enter` runs the query
- Results displayed as a formatted list
- User formatting:
  - Object user: `{type}:{id}` (e.g., `user:anne`)
  - Userset user: `{type}:{id}#{relation}` (e.g., `group:engineering#member`)
  - Wildcard user: `{type}:*` (e.g., `user:*`)

**API call:**
```
POST /stores/{storeId}/list-users
{
  "object": {
    "type": "document",
    "id": "budget"
  },
  "relation": "owner",
  "user_filters": [
    { "type": "user" }
  ]
}
```

**Response:**
```json
{
  "users": [
    { "object": { "type": "user", "id": "anne" } },
    { "userset": { "type": "group", "id": "eng", "relation": "member" } },
    { "wildcard": { "type": "user" } }
  ]
}
```

---

## 6. OpenFGA API Reference

All API calls use the server's base URL. Requests include `Content-Type: application/json` and appropriate auth headers.

### 6.1 Endpoints Summary

| Operation                | Method | Path                                              |
|--------------------------|--------|---------------------------------------------------|
| List stores              | GET    | `/stores`                                         |
| Create store             | POST   | `/stores`                                         |
| Get store                | GET    | `/stores/{store_id}`                              |
| Delete store             | DELETE | `/stores/{store_id}`                              |
| List authorization models| GET    | `/stores/{store_id}/authorization-models`         |
| Get authorization model  | GET    | `/stores/{store_id}/authorization-models/{id}`    |
| Write authorization model| POST   | `/stores/{store_id}/authorization-models`         |
| Read tuples              | POST   | `/stores/{store_id}/read`                         |
| Write tuples             | POST   | `/stores/{store_id}/write`                        |
| Check                    | POST   | `/stores/{store_id}/check`                        |
| Expand                   | POST   | `/stores/{store_id}/expand`                       |
| List Objects             | POST   | `/stores/{store_id}/list-objects`                 |
| List Users               | POST   | `/stores/{store_id}/list-users`                   |

### 6.2 Pagination

Several endpoints support pagination via query parameters or request body:

- **Query parameter pagination** (GET endpoints): `?page_size=N&continuation_token=TOKEN`
- **Body pagination** (POST endpoints): `{ "page_size": N, "continuation_token": "TOKEN" }`

When a `continuation_token` is present in the response, more results are available. Pass it in the next request to fetch the next page.

### 6.3 Error Response Format

```json
{
  "code": "error_code",
  "message": "Human-readable error description"
}
```

Non-2xx responses should be parsed for error details and displayed to the user.

---

## 7. Authentication

### 7.1 No Auth

No additional headers are sent.

### 7.2 API Key

Add header: `Authorization: Bearer {apiKey}`

### 7.3 OIDC Client Credentials

1. Obtain an access token from the token endpoint:
   ```
   POST {tokenUrl}
   Content-Type: application/x-www-form-urlencoded

   grant_type=client_credentials
   &client_id={clientId}
   &client_secret={clientSecret}
   &audience={audience}     (optional, only if configured)
   ```
2. Cache the token until `expires_in - 60` seconds (refresh 60 seconds before expiry)
3. Add header: `Authorization: Bearer {accessToken}`
4. On token expiry, automatically fetch a new token before the next API request

---

## 8. Model-Aware Placeholders

Form fields for adding tuples and running queries display placeholder values that match the actual authorization model.

### 8.1 Placeholder Extraction Algorithm

Given the latest authorization model:

1. Iterate through `type_definitions` in order
2. For each type, iterate through `metadata.relations`
3. For each relation, check `directly_related_user_types`
4. Find the first relation that has a **concrete** directly-assignable user type:
   - Skip entries with `wildcard` set (e.g., `type:*`)
   - Skip entries with `relation` set (userset references like `group#member`)
   - Use the first entry that has only `type` set
5. Once found, build placeholders:
   - `user`: `{userType}:anne` (e.g., `user:anne`)
   - `relation`: the relation name (e.g., `owner`)
   - `object`: `{objectType}:example` (e.g., `document:example`)
   - `objectType`: the type name (e.g., `document`)
   - `objectId`: `example`
   - `userType`: the user's type name (e.g., `user`)

### 8.2 Default Placeholders

If no model exists or no suitable relation is found:

| Field        | Default Value      |
|--------------|--------------------|
| `user`       | `user:anne`        |
| `relation`   | `reader`           |
| `object`     | `document:budget`  |
| `objectType` | `document`         |
| `objectId`   | `budget`           |
| `userType`   | `user`             |

---

## 9. FGA DSL Syntax Highlighting

The model viewer and editor display FGA DSL with syntax highlighting. Each line is parsed into colored segments.

### 9.1 Token Categories and Colors

| Category       | Examples                                              | Color       | Bold |
|----------------|-------------------------------------------------------|-------------|------|
| Keywords       | `model`, `schema`, `type`, `define`, `relations`, `condition`, `with`, `from` | Red `#ef4444` | Yes |
| Operators      | `or`, `and`, `but`, `not`                             | Purple `#a855f7` | Yes |
| Type names     | The name after `type` keyword                         | Green `#22c55e` | Yes |
| Type references| `type#relation` patterns                              | Green `#22c55e` | No  |
| Built-in types | `string`, `int`, `bool`, `uint`, `timestamp`, `duration`, `double`, `ipaddress`, `map`, `list` | Cyan `#06b6d4` | No |
| Version numbers| e.g., `1.1` after `schema`                            | Yellow `#eab308` | No |
| Comments       | Lines starting with `#`                               | Gray `#6b7280` | No  |
| Wildcards      | `type:*` patterns                                     | Yellow `#eab308` | No |
| Plain text     | Everything else                                       | Light gray `#e5e7eb` | No |

### 9.2 Line Number Display

- Line numbers are displayed to the left of each line
- Right-aligned in a 3-character-wide column
- Followed by a space
- Color: dark gray `#555555`

---

## 10. DSL-to-JSON Conversion

The model editor requires converting between FGA DSL text and the JSON format expected by the API.

### 10.1 DSL Format

```
model
  schema 1.1

type user

type document
  relations
    define owner: [user]
    define viewer: [user] or owner
```

### 10.2 JSON Format (API)

```json
{
  "schema_version": "1.1",
  "type_definitions": [
    { "type": "user" },
    {
      "type": "document",
      "relations": {
        "owner": { "this": {} },
        "viewer": {
          "union": {
            "child": [
              { "this": {} },
              { "computedUserset": { "relation": "owner" } }
            ]
          }
        }
      },
      "metadata": {
        "relations": {
          "owner": {
            "directly_related_user_types": [{ "type": "user" }]
          },
          "viewer": {
            "directly_related_user_types": [{ "type": "user" }]
          }
        }
      }
    }
  ]
}
```

### 10.3 Key Conversion Rules

| DSL                    | JSON Userset                                               |
|------------------------|------------------------------------------------------------|
| `[type]`               | `{ "this": {} }` with metadata `directly_related_user_types` |
| `[type:*]`             | Metadata entry: `{ "type": "type", "wildcard": {} }`      |
| `[type#relation]`      | Metadata entry: `{ "type": "type", "relation": "relation" }` |
| `relation_name`        | `{ "computedUserset": { "relation": "relation_name" } }`  |
| `A or B`               | `{ "union": { "child": [A, B] } }`                        |
| `A and B`              | `{ "intersection": { "child": [A, B] } }`                 |
| `A but not B`          | `{ "difference": { "base": A, "subtract": B } }`          |
| `rel from parent`      | `{ "tupleToUserset": { "tupleset": { "relation": "parent" }, "computedUserset": { "relation": "rel" } } }` |

An implementation can use the [OpenFGA DSL parser](https://github.com/openfga/language) or implement its own converter. The converter must work bidirectionally (JSON-to-DSL for display, DSL-to-JSON for saving).

---

## 11. Error Handling Patterns

### 11.1 Loading States

Every screen that fetches data shows a loading spinner with a descriptive label:
- "Loading stores..."
- "Loading store details..."
- "Loading models..."
- "Loading tuples..."
- "Running check..."
- "Querying..."
- "Reading tuples..."

### 11.2 Error Display

- Errors are shown as red text with the error message
- Below the error, show a hint: "Press 'r' to retry" (where applicable)
- Connection errors on the connect screen are shown inline below the form

### 11.3 Graceful Degradation

- `GET /stores/{storeId}` may fail on FGA Cloud (scoped credentials) - handle by showing store ID as the display name instead
- Connection test falls back from `listStores` to basic auth verification
- Always show full error messages from the API to help users diagnose issues

---

## 12. Re-Implementation Notes

These notes capture important pitfalls discovered during implementation and testing. If any point below conflicts with an earlier simplified statement in this spec, treat this section as the source of truth.

### 12.1 Model Conversion Safety

- DSL-to-JSON conversion must preserve `conditions` (name, expression, parameters, generic parameter types).
- JSON-to-DSL conversion must emit condition blocks as valid FGA DSL.
- Round-tripping (JSON -> DSL -> JSON) must not drop conditions or change semantics.

### 12.2 OIDC Token Cache Scope

- OIDC token caching must be scoped per connection/auth config (at least by server URL + token URL + client credentials + audience).
- Do not use a single global token cache entry across different saved connections.

### 12.3 Connection Validation

- First probe should be `GET /stores?page_size=1`.
- Fallback validation must still target a known OpenFGA endpoint (not server root `/`), otherwise non-OpenFGA servers can be treated as valid.
- For scoped credentials, `403` on `/stores` can still indicate valid auth/connectivity.

### 12.4 Config File Security and Robustness

- Persist config in `~/.config/openfga-tui/config.json` with restrictive permissions:
  - directory mode: `0700`
  - file mode: `0600`
- Invalid config JSON must surface a parse error to the user; do not silently treat malformed config as empty.
- Save failures should be shown inline in the connect workflow.

### 12.5 Pagination Requirements

- Store listing must follow continuation tokens until exhaustion (not just first page).
- Authorization model listing must follow continuation tokens until exhaustion.
- Avoid hardcoding a single page (`page_size=100`) as a complete result set.

### 12.6 Store Overview Tuples Card

- Do not display tuple counts in Store Overview.
- Tuple cardinality is expensive/ambiguous from lightweight probes and should not be represented there.
- Show action-oriented copy for the tuples card instead (for example, "Manage tuples").

### 12.7 Keyboard Interaction Edge Cases

- Confirm prompts:
  - confirm only on `y`
  - cancel only on explicit cancel keys (`n`, `Esc`, `Enter`)
  - ignore unrelated keys
- Global keyboard help should toggle with `?` and be dismissible with `?`/`Esc`.

### 12.8 OpenFGA Read API: `type:id` Format Requirement

- The Read API's `tuple_key.user` and `tuple_key.object` fields **must** use `type:id` format (e.g., `user:anne`, `document:budget`).
- If the user enters just a type name without a colon (e.g., `document`), the API returns a validation error: _"the tuple_key field was provided but the object type field is required and both the object id and user cannot be empty"_.
- **Auto-correction**: When building a filter for the Read API, if the user or object value does not contain a `:`, automatically append one (e.g., `document` becomes `document:`, meaning "all objects of this type"). This is valid and returns all matching tuples of that type.
- The `relation` field does not need this treatment — it's a plain string.

### 12.9 Error State Navigation

- When an error occurs (e.g., from a bad filter), pressing `Esc` should **not** navigate back to the parent view — that would be confusing since the user was already on this view.
- Instead, `Esc` from an error state should clear the filter and reload tuples, returning the user to a working state.
- `r` should also retry from error states.

### 12.10 Keyboard Modifier Handling (TUI Framework Note)

- In most terminal TUI frameworks, keyboard events deliver modifier keys (Shift, Ctrl, Meta) as **separate boolean properties** on the event object, NOT as part of the key name string.
- Example: Shift+Tab arrives as `{ name: "tab", shift: true }`, NOT `{ name: "shift+tab" }`.
- When checking for modified keys, always check the modifier **before** the plain key to avoid shadowing:
  ```
  // CORRECT order:
  if (key.name === 'tab' && key.shift) { /* shift+tab */ }
  else if (key.name === 'tab') { /* plain tab */ }

  // WRONG order (shift+tab never matches):
  if (key.name === 'tab') { /* catches both! */ }
  else if (key.name === 'tab' && key.shift) { /* dead code */ }
  ```
- This applies to all modifier combinations: Ctrl+S, Shift+G, etc.

### 12.11 TUI Layout: Text Elements in Column Layouts

- In many TUI frameworks, bare text elements inside a vertical (column) flex container may not reliably reserve their own row, causing text to overlap with adjacent elements.
- **Solution**: Wrap standalone text elements in a box with explicit `height=1` to guarantee they occupy a full row.
- Alternatively, avoid standalone title text elements by incorporating titles into existing header rows (e.g., "Tuples / Add Tuple" in the header instead of a separate "Add Tuple" title line).

### 12.12 Quality Gates

- Keep `bun test` and strict typecheck (`tsc --noEmit`) green.
- Include the typecheck script in project scripts and run it in CI for regression prevention.
