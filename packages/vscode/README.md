# Database Tool (fdb2) — VSCode Extension

> A full-featured database management extension for Visual Studio Code, bringing the `fdb2` desktop tool right into your editor. Manage connections, browse schemas, run SQL, and edit table data **without ever leaving VSCode**.

![Database Tool (fdb2) running in VSCode](https://raw.githubusercontent.com/fefeding/fdb2/main/public/fdb2.png)

The extension embeds the `fdb2` web UI inside a VSCode Webview. The native **Activity Bar tree** is used for navigation, while the rich content (connection overview, database detail, table data/structure) is rendered by the same Vue UI reused from the desktop app. The host (`TypeScript`) talks to the webview through `postMessage`, and reuses the `db_tool/server` backend (`TypeORM` + per-database dialects).

---

## ✨ Features

- **Connection management** — Add / edit / delete / test connections from the Activity Bar's **Database Tool** view. Connection config is shared with the desktop `fdb2` app under `~/.fdb2/connections.json` (overridable via the `dbtool.dataDir` setting).
- **Remote proxy connections** — Point a connection at a remote `fdb2` server over HTTP and work with the databases that server exposes, even when they are unreachable from this machine (see *Connect through a remote service* below).
- **Object explorer tree** — A native VSCode tree: **Connection → Database → Table → Column**. Click any node to open the related panel.
- **Per-connection tabs** — Clicking the *same* connection (or its databases/tables) reuses the same editor tab; clicking a *different* connection opens a brand-new tab, so you can compare multiple databases side by side.
- **SQL query** — A dedicated query panel that executes arbitrary SQL and renders results as a sortable, paginated table (`Ctrl/Cmd+Enter` to run).
- **Data browsing & editing** — Paginated table data with WHERE filtering, row insert/edit/delete, and CSV export.
- **Table structure** — Inspect columns, types, primary keys, indexes, foreign keys and relationships.
- **Supported databases** — MySQL, PostgreSQL, SQL Server, SQLite, Oracle, CockroachDB, MongoDB, SAP HANA, ClickHouse. (Oracle / SQLite / SAP HANA require native drivers — see *Native drivers* below.)

---

## 📥 Installation

### From the Marketplace (recommended)
Search for **"Database Tool (fdb2)"** in the VSCode Extensions view (`Ctrl/Cmd+Shift+X`) and click **Install**.

### From source (for development)
```bash
# 1. Install extension dependencies (esbuild, typescript, native drivers…)
cd packages/vscode && npm install

# 2. Build host + webview
cd packages/vscode && npm run build      # equals esbuild + root vite build

# 3. Press F5 in VSCode to launch the "Extension Development Host"
```

Equivalent scripts from the repo root:
- `npm run build:vscode` — webview only
- `npm run build:vscode:extension` — host only
- `npm run vscode:dev` — host in watch mode
- `npm run vscode:package` — package a `.vsix`

---

## 🚀 Getting Started

### 1. Open the Database Tool view
Click the **Database Tool** icon in the Activity Bar (left side). If you don't see it, open the Command Palette (`Ctrl/Cmd+Shift+P`) and run **`Database Tool: Add Connection`** — that will reveal the view automatically.

The tree starts empty with a welcome view: *"No database connections yet."* plus an **Add Connection** button.
You can also collapse/expand everything with the tree's **Collapse All** action.

### 2. Add a connection
There are three ways to open the **Add Connection** form:
- Click the **`+`** button at the top of the Database Tool view.
- Right-click empty space in the tree and choose **Add Connection**.
- Run the command **`Database Tool: Add Connection`** from the Command Palette.

Fill in:
| Field | Description |
| --- | --- |
| Name | A friendly label (shown in the tree and tab title). |
| Type | `mysql`, `postgres`, `sqlserver`, `sqlite`, `oracle`, `mongodb`, `clickhouse`, `cockroachdb`, `sap`, `remote` … |
| Host / Port | Server address (ignored for SQLite file-based databases). |
| User / Password | Credentials. |
| Database | Optional default database. |
| (SQLite) File | Absolute path to the `.db` / `.sqlite` file. |
| (ClickHouse) Auth | Uses the HTTP interface (default port `8123`) with Basic auth and the default user `default`. |
| (remote) Service URL | Base URL of a remote `fdb2` server, e.g. `http://10.0.0.5:9800` — the service **root**, no trailing `/api`. |
| (remote) Access Token | Optional. Only needed when the remote server runs with `DB_TOOL_REMOTE_TOKEN`. |

Then click **Save**. The connection appears in the tree and the form panel closes.

> 💡 Connections are stored at `~/.fdb2/connections.json` and are **shared** with the desktop `fdb2` app by default.

### 2b. Connect through a remote service (HTTP proxy)

If the database is **not reachable from this machine** (corporate VPN, private subnet, bastion host…), run `fdb2` on a machine that *can* reach it and let the extension talk to that service over HTTP:

1. **On the machine that can reach the database** — start the service and make sure it is reachable from here:
   ```bash
   fdb2 start -p 9800
   # then open http://<remote-ip>:9800 in a browser to confirm
   ```
2. **On that remote service** — add the real database connections as usual.
3. **Here in the extension** — *Add Connection* → **Type: `remote`** → fill **Service URL** (and **Access Token** if the remote server requires one) → **Save**.

The remote server's connections are then merged into your local connection list, and everything (schema browsing, SQL, DDL, data CRUD, export, plus editing/deleting the connection config) is forwarded to the remote server and executed there. The remote database password stays on the remote server and is never sent to this client.

> 🔒 To protect a remote server, start it with `DB_TOOL_REMOTE_TOKEN=<secret>`; it then rejects HTTP requests without a matching `x-db-tool-token` header. Put the same value in the proxy connection's **Access Token** field. Set the token **only on the remote server** — setting it locally would lock out your own client. The check guards the HTTP entry point only; in-process calls from the extension host are unaffected.

> ℹ️ Proxying is one level deep (`A → B → C` is not supported), and the remote service must be reachable from this machine.

### 3. Test a connection
Right-click a connection → **Test Connection** (or use the inline `✓` action). A success/error toast appears.

### 4. Browse the schema
Expand a connection to see its **databases**, expand a database to see its **tables**, expand a table to see its **columns**. Each level is loaded lazily from the live database.

### 5. Open the workbench (content area)
Click a **connection / database / table** node (or use the inline `$(database)` / `$(table)` actions) to open the **workbench** webview on the right:
- **Connection node** → connection overview: quick actions, database list, and tabs for *Databases / SQL Query*.
- **Database node** → database detail: tables, views, stored procedures, and structure tabs.
- **Table node** → table detail with *Data / Structure / Indexes / Relationships / SQL* tabs.

The webview's left sidebar tree is hidden inside the editor — all navigation is driven by the **native Activity Bar tree**, which is the single source of truth.

### 6. Tab behavior (important)
- Clicking the **same connection** (or any of its databases/tables) keeps you in the **same editor tab**; the tab title updates to reflect the current object, e.g. `server.jm47.com · db_account · users`.
- Clicking a **different connection** opens a **new editor tab**. Close a tab anytime; reopening that connection creates a fresh tab (no conflict).

### 7. Work with table data
Open a table → **Data** tab:
- **Pagination** — the bottom bar shows `total records · < prev 1 2 3 … next > · page size` all on **one line**. Change page size via the dropdown (10/20/50/100).
- **Sorting** — click a column header to cycle `ASC → DESC → none`.
- **Filtering** — use the filter controls to add `WHERE` conditions.
- **Edit / Delete** — use the row action buttons (`✏️` / `🗑️`); `✏️` opens an inline editor.
- **Insert** — the **Insert Data** toolbar button adds a new row.
- **Export** — the **Export** dropdown supports CSV (and other formats).
Inside VSCode a native **Save** dialog opens (the webview itself cannot write files); once the export finishes, a notification offers **Open File** / **Reveal in Explorer**.

Column headers use a fixed light theme so names are always readable regardless of your VSCode color theme.

### 8. Inspect table structure
The **Structure** tab lists columns (name, type, nullable, default, primary key, comment). Additional tabs show **Indexes**, **Foreign Keys / Relationships**, and the generated **SQL** DDL.

### 9. Run SQL
From a connection's inline `$(terminal)` action (or the command **`Database Tool: New Query`**), open the **SQL Query** panel:
- Write SQL in the editor (syntax highlighting + snippets).
- Press `Ctrl/Cmd+Enter` to execute.
- Results render in a sortable, paginated grid.

### 10. Context menu quick actions
Right-click tree items for context actions:

| Node | Actions |
| --- | --- |
| Connection | Open Database Browser, New Query, Edit, Test Connection, Delete |
| Table | Copy Table Name, Copy SELECT, View Data, View Structure |

> 💡 All commands are also available from the Command Palette; if the argument is not a tree node, a **quick pick** lets you choose the connection.

---

## ⚙️ Settings

Open **Settings → Extensions → Database Tool** (or add to `settings.json`):

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `dbtool.queryLimit` | number | `200` | Default page size for table data (used when the page does not specify one). |
| `dbtool.dataDir` | string | `""` (empty) | Directory for connection config & cache. Empty = reuse the desktop `db_tool` `~/.fdb2` (so existing connections are shared). |

Example:
```json
{
  "dbtool.queryLimit": 100,
  "dbtool.dataDir": "/custom/path/.fdb2"
}
```

---

## 🧩 Native drivers

The host marks `oracledb`, `better-sqlite3`, `sqlite3`, and `@sap/hana-client` as **external** and loads them from this extension's `node_modules` at runtime. To use **Oracle / SQLite / SAP HANA**, these native modules must be compiled against the Node ABI that VSCode's host uses. From the `packages/vscode` directory:

```bash
npm rebuild            # recompile native modules for the current Node ABI
# or reinstall under VSCode's Node:
npm install --runtime=electron --target=<vscode-node-version>
```

**MySQL / PostgreSQL / SQL Server / ClickHouse / MongoDB / CockroachDB** use pure-JS drivers and work out of the box.

---

## 🏗️ Architecture

```
packages/vscode/
├── package.json            # extension manifest (viewsContainers/views/commands/menus/configuration)
├── esbuild.js             # host bundler (bundles server + drivers, externalizes native modules)
├── tsconfig.json
├── src/
│   ├── extension.ts        # entry: registers tree view, commands, webview providers
│   ├── prelude.ts          # sets data dir + reflect-metadata before loading server
│   ├── protocol.ts         # host <-> webview message protocol + result normalization
│   ├── service/DatabaseBridge.ts     # bridges handleDatabaseRoutes
│   └── providers/
│       ├── DatabaseTreeProvider.ts   # Activity Bar tree (native navigation)
│       └── WebViewProvider.ts        # panels + message routing
└── resources/
    ├── activity-icon.svg
    ├── icon.png            # Marketplace icon (256x256)
    └── webview/            # built by vite.config.vscode.ts (main.js)
```

**Communication** — Host and webview exchange `postMessage`s. The protocol lives in `src/protocol.ts`; the webview bridge layer is `src/platform/vscode/bridge.ts`. A `ready` handshake flushes the first navigation so the panel never opens blank.

---

## 🔧 Build & Debug

The host and the webview are built separately:

```bash
# 1. Install extension deps
cd packages/vscode && npm install

# 2A. One-shot build (host + webview)
cd packages/vscode && npm run build          # esbuild + root vite build

# 2B. Watch mode (dev) — host only; rebuild webview with npm run build:webview
cd packages/vscode && npm run watch

# 3. Press F5 in VSCode -> "Extension Development Host"
```

---

## 📦 Publishing

### Manual
```bash
cd packages/vscode && npm install
cd packages/vscode && npm run vscode:prepublish   # production build (esbuild + vite)
../../node_modules/.bin/vsce package               # produce .vsix
../../node_modules/.bin/vsce publish -p <PAT>      # VS Code Marketplace
../../node_modules/.bin/ovsx publish *.vsix -p <OVSX_TOKEN>   # Open VSX
```

### Automated via GitHub Actions
`.github/workflows/build-vsix.yml` (aligned with `vscode-pptx`):
- **Every push/PR to `main`** — builds the `.vsix` and uploads it as a CI artifact.
- **Tagging `dbtool-v*` (e.g. `dbtool-v1.0.1`)** — creates a GitHub Release (with the `.vsix`) and publishes to **VS Code Marketplace** *and* **Open VSX** independently.

Required repository secrets (`Settings → Secrets and variables → Actions`):

| Name | Type | Purpose |
| --- | --- | --- |
| `VSCODE_TOKEN` | Secret | Azure DevOps PAT with `Marketplace > Manage`, owned by the `publisher` in `package.json`. |
| `OVSX_TOKEN` | Secret / Variable | Open VSX access token. |

> The tag must match the `version` field in `packages/vscode/package.json` (auto-validated). Bump `version` before releasing.
> `dbtool-v*` tags are independent from the Electron app's `v*` release tags to avoid cross-triggering.

---

## 📄 License

MIT — fully open source and free to use.
