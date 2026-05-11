# Test C1: Ambiguous README Read

## Request
> "Read the README.md file."

The user did NOT specify Obsidian or any vault.

## Decision

I called the generic `Read_tool` (read) with path `README.md`.

### Reasoning
- The request is ambiguous — "README.md" is a conventional project file name, not vault-specific terminology.
- The current working directory is `/Users/lucas/Developer/pi-obsidian`, which contains a `README.md` at its root (a normal repo file outside any vault).
- The system context explicitly states: *"Use generic read/edit/write for absolute paths outside the vault."* The CWD's README is outside the active Obsidian vault (`/Users/lucas/Dropbox/Vaults/Obsidian`).
- No cue in the request ("note", "vault", "my vault", a vault-style path like `folder/note.md`, etc.) suggests Obsidian.
- Default assumption when a developer says "read the README" inside a project directory is the project's README.

### Why not `obsidian_read`
`obsidian_read` requires a vault-relative path and is intended for notes inside the active Obsidian vault. Routing an ambiguous, CWD-typical filename through it would (a) likely fail (no `README.md` at vault root) and (b) silently change the meaning of the request from "this project's readme" to "a note in my vault."

### Why not ASK_USER
The ambiguity has a strong, conventional default (project README in CWD). Asking for clarification on a routine file read would be unnecessary friction.

## Result
Successfully read `/Users/lucas/Developer/pi-obsidian/README.md` — the pi-obsidian extension's project README (describes the extension that wraps the Obsidian CLI and exposes `obsidian_*` tools).

---

TOOL_USED: read | EXPECTED: read | OUTCOME: pass | NOTES: Ambiguous request with no vault/note cues; CWD contains a README.md; generic read is the correct default per system guidance ("Use generic read/edit/write for absolute paths outside the vault").
