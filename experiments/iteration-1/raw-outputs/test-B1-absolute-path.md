# Test B1: Absolute Path File Read

## Request
Read the file `/tmp/pi-obsidian-test/external.md` and report its contents.

## File Contents
The file contains the following (a single line with a literal `\n` sequence rather than an actual newline):

```
# External Test File\n\nThis file is outside the Obsidian vault.
```

Interpreted, this represents:
- A heading: "External Test File"
- A note: "This file is outside the Obsidian vault."

## Tool Selection Rationale
The path `/tmp/pi-obsidian-test/external.md` is an absolute path outside the active Obsidian vault (`/Users/lucas/Dropbox/Vaults/Obsidian`). Per the system instructions, `obsidian_*` tools require vault-relative paths, so the generic `read` tool is the correct choice for absolute paths outside the vault.

TOOL_USED: read | EXPECTED: read | OUTCOME: pass | NOTES: Used generic read tool for absolute path outside vault, as instructed.
