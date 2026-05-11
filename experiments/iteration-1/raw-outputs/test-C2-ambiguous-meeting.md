# Test C2: Ambiguous Meeting Notes Request

## Request
"Update the meeting notes with today summary."

## Analysis
The request is ambiguous on multiple axes:

1. **Target file/location unspecified**
   - The vault may contain many candidate notes (e.g., a `Meetings/` folder, daily notes, project notes).
   - No path, filename, title, or tag was provided.
   - Searching and picking one would be guessing.

2. **"Today summary" is underspecified**
   - Summary of what? A meeting that occurred today? The day's activities?
   - No source content was supplied (no transcript, no agenda, no bullet points).
   - I have no access to today's meeting content; fabricating it would hallucinate facts.

3. **Update semantics unclear**
   - Append a new section, overwrite, edit an existing "Summary" heading?
   - Where in the file should the summary land?

## Decision
Ask the user for clarification before touching any file. Picking a random "meeting"-looking note and writing a fabricated summary would be a destructive guess.

## Clarifying questions I would ask the user
- Which note should I update? (path or title in the vault)
- What is the content of today's summary, or where can I find the source material (transcript, bullets, calendar event)?
- Should I append a new dated section, or replace an existing one?

## Tool calls made before asking
None. No `obsidian_*` search, read, or edit was issued. The only tool used was `write` to record this findings file as required by the task harness.

## Result
TOOL_USED: ASK_USER | EXPECTED: ASK_USER | OUTCOME: pass | NOTES: Request lacks target file and source content; asked for clarification instead of guessing.
