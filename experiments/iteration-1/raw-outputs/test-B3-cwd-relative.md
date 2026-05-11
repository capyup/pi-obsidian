# Test B3: CWD-Relative Path Read

## Task
Read the `package.json` in the current directory and report the package name.

## Findings

- **File read:** `/Users/lucas/Developer/pi-obsidian/package.json`
- **Package name:** `@capyup/pi-obsidian`
- **Version:** `0.1.0`
- **Description:** pi extension that wraps the Obsidian CLI as typed tools — read, list, search, outline, create, append, open, backlinks, tags, and daily-append against the active vault.

## Tool Selection Rationale

The request asked to read `package.json` in the current working directory (`/Users/lucas/Developer/pi-obsidian`), which is an absolute path outside the active Obsidian vault (`/Users/lucas/Dropbox/Vaults/Obsidian`). Per the system instructions, `obsidian_*` tools require vault-relative paths; absolute paths outside the vault must use the generic `read`/`edit`/`write` tools. Therefore, the correct tool was the generic `Read_tool`.

## Result

TOOL_USED: read | EXPECTED: read | OUTCOME: pass | NOTES: package.json is outside the Obsidian vault, so generic read was the correct choice; package name resolved to @capyup/pi-obsidian.
