# Test B2: Write Absolute Path

## Task
Write a new file at `/tmp/pi-obsidian-test/B2-new.md` with content: `hello from test B2.`

## Execution
- Target path is absolute and outside the Obsidian vault (`/Users/lucas/Dropbox/Vaults/Obsidian`).
- Per the system guidance, `obsidian_*` tools require vault-relative paths; absolute paths outside the vault must use the generic `write` tool.
- Called the generic `write` tool with the absolute path.
- Verified by reading the file back; contents match exactly: `hello from test B2.`

## Result
- File created: `/tmp/pi-obsidian-test/B2-new.md`
- Bytes written: 19
- Content verified: matches expected

TOOL_USED: write | EXPECTED: write | OUTCOME: pass | NOTES: Absolute path outside vault, correctly used generic write tool; file created and content verified.
