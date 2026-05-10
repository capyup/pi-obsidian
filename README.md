# pi-obsidian

A [pi](https://pi.dev) extension that wraps the [Obsidian CLI](https://help.obsidian.md/cli) and exposes a typed family of `obsidian_*` tools the agent can call directly. Lets pi read, list, search, outline, create, append, and open notes in your active Obsidian vault — without dropping into shell.

## Why

The raw `obsidian` CLI requires a `vault=<id>` prefix on every call (see your `obsidian.json` config). That id is opaque, the CLI has dozens of subcommands, and the agent has to remember argument shapes across turns. This extension does three things:

1. **Auto-resolves the active vault** from `obsidian.json` (or `PI_OBSIDIAN_VAULT_ID` override).
2. **Surfaces a curated subset of CLI commands as typed tools** — clean parameter schemas, no string-glue.
3. **Tells the model when to use them**: each tool has a `promptSnippet` and `promptGuidelines` so pi prefers `obsidian_read` over the generic file-read tool when the file lives inside an Obsidian vault.

## Tools

| Tool | What it does | Maps to |
|---|---|---|
| `obsidian_read` | Read a note by vault-relative path | `obsidian read path=…` |
| `obsidian_list` | List files in a folder, optionally filtered by extension | `obsidian files folder=… ext=…` |
| `obsidian_search` | Grep-style content search with line context, optional folder scope | `obsidian search:context query=… path=… limit=…` |
| `obsidian_outline` | Heading tree of a note | `obsidian outline path=…` |
| `obsidian_create` | Create a new note (optional content / overwrite / open) | `obsidian create path=… content=…` |
| `obsidian_append` | Append content to a note | `obsidian append path=… content=…` |
| `obsidian_prepend` | Prepend content (after frontmatter) | `obsidian prepend path=… content=…` |
| `obsidian_open` | Open a note in the Obsidian app, optional new tab | `obsidian open path=…` |
| `obsidian_backlinks` | List backlinks to a note | `obsidian backlinks path=…` |
| `obsidian_tags` | List vault tags or per-note tags, optional counts | `obsidian tags …` |
| `obsidian_daily_append` | Append to today's daily note | `obsidian daily:append content=…` |

## Install

```bash
pi install /Users/lucas/Developer/pi-obsidian       # local dev path
pi install git:github.com/lulucatdev/pi-obsidian    # later, from git
```

## Prerequisites

- **Obsidian 1.12+** with the CLI enabled: Settings → General → Command line interface
- **Obsidian app must be running** with at least one vault open
- macOS: Obsidian binary at `/Applications/Obsidian.app/Contents/MacOS/obsidian` (auto-detected)
- Linux / Windows: `obsidian` must be on `PATH`, or set `PI_OBSIDIAN_BIN`

## Vault selection

The extension auto-detects the active vault by reading `obsidian.json`:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/obsidian/obsidian.json` |
| Linux | `~/.config/obsidian/obsidian.json` |
| Windows | `%APPDATA%/obsidian/obsidian.json` |

Selection logic:

1. `PI_OBSIDIAN_VAULT_ID` env var, if set
2. The vault marked `"open": true` in `obsidian.json`
3. Most recently opened vault (highest `ts`)

## Environment variables

| Var | Effect |
|---|---|
| `PI_OBSIDIAN_VAULT_ID` | Force a specific vault id |
| `PI_OBSIDIAN_VAULT_PATH` | Optional companion to the above (for diagnostics) |
| `PI_OBSIDIAN_BIN` | Override the path to the `obsidian` binary |

## Examples (what pi does for you)

```
pi> read ops/index.md from my vault
agent calls obsidian_read { path: "ops/index.md" } → returns markdown

pi> what notes mention "tailscale exit node"?
agent calls obsidian_search { query: "tailscale exit node" } → grep-style hits

pi> log this decision into today's daily note
agent calls obsidian_daily_append { content: "- decided to ..." }

pi> open the new playbook tab in Obsidian
agent calls obsidian_open { path: "ops/tailscale/tailscale-add-windows.md", newtab: true }
```

## Development

```bash
cd /Users/lucas/Developer/pi-obsidian
npm install
npm run typecheck         # tsc --noEmit
npm run pack:check        # npm pack --dry-run (verify files glob)
```

## Limitations / future

- Currently does not expose `properties:*` (frontmatter property) tools — TODO.
- Does not expose `command id=…` (Obsidian command palette executor) — could add if useful.
- Multi-vault: currently picks one active vault per call. If you want explicit per-call vault selection, use `PI_OBSIDIAN_VAULT_ID`.

## License

MIT
