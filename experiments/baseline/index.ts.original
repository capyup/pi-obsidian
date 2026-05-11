/**
 * pi-obsidian — typed tool wrapper around the Obsidian CLI.
 *
 * Registers a family of obsidian_* tools the agent can call directly:
 *
 *   obsidian_read         read a note by vault-relative path
 *   obsidian_list         list files in a folder (optional ext filter)
 *   obsidian_search       grep-style search with line context
 *   obsidian_outline      heading tree of a note
 *   obsidian_create       create a new note (optional content / overwrite)
 *   obsidian_append       append content to a note
 *   obsidian_prepend      prepend content (after frontmatter) to a note
 *   obsidian_open         open a note in the Obsidian app (focuses or new tab)
 *   obsidian_backlinks    list backlinks to a note
 *   obsidian_tags         list tags (optionally for a single note, with counts)
 *   obsidian_daily_append append content to today's daily note
 *
 * Vault selection is automatic: the active vault is read from
 * `~/Library/Application Support/obsidian/obsidian.json` (mac), with platform
 * fallbacks for Linux/Windows. Override via PI_OBSIDIAN_VAULT_ID env var.
 *
 * Requirements:
 *   - Obsidian 1.12+ with CLI enabled (Settings → General → Command line interface)
 *   - The Obsidian app must be running for tool calls to work
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// ---------- vault discovery ----------

interface VaultInfo {
	id: string;
	path: string;
}

function obsidianConfigPath(): string {
	const home = homedir();
	if (process.platform === "darwin") {
		return join(home, "Library/Application Support/obsidian/obsidian.json");
	}
	if (process.platform === "win32") {
		return join(process.env.APPDATA ?? join(home, "AppData/Roaming"), "obsidian/obsidian.json");
	}
	return join(home, ".config/obsidian/obsidian.json");
}

function findActiveVault(): VaultInfo | undefined {
	// Manual override wins
	const override = process.env.PI_OBSIDIAN_VAULT_ID;
	if (override) {
		return { id: override, path: process.env.PI_OBSIDIAN_VAULT_PATH ?? "" };
	}
	const cfg = obsidianConfigPath();
	if (!existsSync(cfg)) return undefined;
	try {
		const data = JSON.parse(readFileSync(cfg, "utf-8"));
		const vaults: Record<string, { path: string; ts?: number; open?: boolean }> = data.vaults ?? {};
		// prefer vault marked open=true
		for (const [id, v] of Object.entries(vaults)) {
			if (v.open) return { id, path: v.path };
		}
		// fallback: most recently opened
		const entries = Object.entries(vaults).sort((a, b) => (b[1].ts ?? 0) - (a[1].ts ?? 0));
		if (entries.length > 0) {
			return { id: entries[0][0], path: entries[0][1].path };
		}
	} catch {
		// fallthrough to undefined
	}
	return undefined;
}

// ---------- CLI binary discovery ----------

function obsidianBin(): string {
	if (process.env.PI_OBSIDIAN_BIN) return process.env.PI_OBSIDIAN_BIN;
	if (process.platform === "darwin") {
		const macPath = "/Applications/Obsidian.app/Contents/MacOS/obsidian";
		if (existsSync(macPath)) return macPath;
	}
	// Linux / Windows / fallback: rely on PATH
	return "obsidian";
}

// ---------- spawn helper ----------

interface RunResult {
	stdout: string;
	stderr: string;
	code: number;
}

const RUN_TIMEOUT_MS = 30_000;

function runObsidian(args: string[]): Promise<RunResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(obsidianBin(), args, { stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => {
			stdout += d.toString();
		});
		child.stderr.on("data", (d) => {
			stderr += d.toString();
		});
		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`obsidian CLI timed out after ${RUN_TIMEOUT_MS}ms`));
		}, RUN_TIMEOUT_MS);
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ stdout, stderr, code: code ?? -1 });
		});
		child.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
	});
}

async function obsCmd(args: string[]): Promise<string> {
	const vault = findActiveVault();
	if (!vault) {
		throw new Error(
			"No Obsidian vault found. Make sure the Obsidian app is running with a vault open, " +
				"or set PI_OBSIDIAN_VAULT_ID.",
		);
	}
	const fullArgs = [`vault=${vault.id}`, ...args];
	const { stdout, stderr, code } = await runObsidian(fullArgs);
	if (code !== 0) {
		const detail = stderr.trim() || stdout.trim() || `exit ${code}`;
		throw new Error(`obsidian CLI failed: ${detail}`);
	}
	const out = stdout.trim() || stderr.trim();
	return out;
}

function trimEmpty(s: string | undefined): string | undefined {
	if (s === undefined) return undefined;
	const t = s.trim();
	return t.length === 0 ? undefined : t;
}

function ok(text: string, details: Record<string, unknown> = {}) {
	return { content: [{ type: "text" as const, text }], details };
}

// ---------- tools ----------

export default function obsidianExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "obsidian_read",
		label: "Obsidian: Read",
		description:
			"Read the contents of a markdown note from the active Obsidian vault. " +
			"The path must be vault-relative (e.g. 'ops/index.md'); leading slashes are not allowed.",
		promptSnippet: "Read a note from the active Obsidian vault by vault-relative path.",
		promptGuidelines: [
			"Use this instead of the generic file-read tool when the file lives inside an Obsidian vault — it goes through Obsidian's index and respects vault aliasing.",
			"Path is always vault-relative, e.g. 'folder/note.md'. Do not pass absolute paths.",
		],
		parameters: Type.Object({
			path: Type.String({ description: "Vault-relative path to the note, e.g. 'ops/index.md'" }),
		}),
		async execute(_id, params) {
			const text = await obsCmd(["read", `path=${params.path}`]);
			return ok(text, { tool: "obsidian_read", path: params.path });
		},
	});

	pi.registerTool({
		name: "obsidian_list",
		label: "Obsidian: List files",
		description:
			"List files in the active Obsidian vault. Optional folder filter (vault-relative) " +
			"and extension filter (e.g. 'md', 'canvas').",
		promptSnippet: "List notes in an Obsidian vault, optionally scoped by folder or extension.",
		promptGuidelines: [
			"Default lists all files in the entire vault — pass `folder` to scope.",
			"Use `ext='md'` to restrict to markdown notes.",
		],
		parameters: Type.Object({
			folder: Type.Optional(Type.String({ description: "Vault-relative folder, e.g. 'ops/tailscale'" })),
			ext: Type.Optional(Type.String({ description: "Extension filter without dot, e.g. 'md'" })),
		}),
		async execute(_id, params) {
			const args = ["files"];
			if (trimEmpty(params.folder)) args.push(`folder=${params.folder}`);
			if (trimEmpty(params.ext)) args.push(`ext=${params.ext}`);
			const text = await obsCmd(args);
			return ok(text || "(no files)", { tool: "obsidian_list", folder: params.folder, ext: params.ext });
		},
	});

	pi.registerTool({
		name: "obsidian_search",
		label: "Obsidian: Search",
		description:
			"Search note contents in the active Obsidian vault and return grep-style matching lines " +
			"with their context (path:line: text). Optional folder scope and result limit.",
		promptSnippet: "Grep-style content search across an Obsidian vault.",
		promptGuidelines: [
			"Use this for content discovery; do not read the whole vault to find a string.",
			"`limit` defaults to 50 matches. Pass a higher value only if needed.",
		],
		parameters: Type.Object({
			query: Type.String({ description: "Substring or phrase to search for" }),
			path: Type.Optional(Type.String({ description: "Vault-relative folder to scope the search" })),
			limit: Type.Optional(Type.Number({ description: "Max number of matches (default 50)", minimum: 1 })),
			caseSensitive: Type.Optional(Type.Boolean({ description: "Case-sensitive match (default false)" })),
		}),
		async execute(_id, params) {
			const args = ["search:context", `query=${params.query}`];
			if (trimEmpty(params.path)) args.push(`path=${params.path}`);
			args.push(`limit=${params.limit ?? 50}`);
			if (params.caseSensitive) args.push("case");
			const text = await obsCmd(args);
			return ok(text || "(no matches)", {
				tool: "obsidian_search",
				query: params.query,
				path: params.path,
				limit: params.limit ?? 50,
			});
		},
	});

	pi.registerTool({
		name: "obsidian_outline",
		label: "Obsidian: Outline",
		description: "Show the heading outline (tree of headings) of a note in the active Obsidian vault.",
		promptSnippet: "Show the heading outline of an Obsidian note.",
		promptGuidelines: [
			"Use this to understand a note's structure before reading it in full.",
			"Format defaults to a tree; pass `format='md'` for markdown headings or `format='json'` for structured data.",
		],
		parameters: Type.Object({
			path: Type.String({ description: "Vault-relative path to the note" }),
			format: Type.Optional(
				Type.Union([Type.Literal("tree"), Type.Literal("md"), Type.Literal("json")], {
					description: "Output format",
				}),
			),
		}),
		async execute(_id, params) {
			const args = ["outline", `path=${params.path}`];
			if (params.format) args.push(`format=${params.format}`);
			const text = await obsCmd(args);
			return ok(text, { tool: "obsidian_outline", path: params.path, format: params.format });
		},
	});

	pi.registerTool({
		name: "obsidian_create",
		label: "Obsidian: Create note",
		description:
			"Create a new markdown note in the active Obsidian vault. Pass `overwrite=true` to replace " +
			"an existing file. Pass `open=true` to open the new note in the app.",
		promptSnippet: "Create a new note in the active Obsidian vault.",
		promptGuidelines: [
			"Use vault-relative path. Parent folders are created as needed.",
			"Default behavior is to fail if the file exists; pass `overwrite=true` to replace.",
		],
		parameters: Type.Object({
			path: Type.String({ description: "Vault-relative path of the new note, e.g. 'inbox/idea.md'" }),
			content: Type.Optional(Type.String({ description: "Initial content of the note" })),
			overwrite: Type.Optional(Type.Boolean({ description: "Replace if file exists (default false)" })),
			open: Type.Optional(Type.Boolean({ description: "Open the file in Obsidian after creating" })),
		}),
		async execute(_id, params) {
			const args = ["create", `path=${params.path}`];
			if (params.content !== undefined) args.push(`content=${params.content}`);
			if (params.overwrite) args.push("overwrite");
			if (params.open) args.push("open");
			const text = await obsCmd(args);
			return ok(text || `Created: ${params.path}`, {
				tool: "obsidian_create",
				path: params.path,
				overwrite: params.overwrite ?? false,
			});
		},
	});

	pi.registerTool({
		name: "obsidian_append",
		label: "Obsidian: Append",
		description:
			"Append content to a note in the active Obsidian vault. By default a newline is added before " +
			"the new content; pass `inline=true` to append on the same line.",
		promptSnippet: "Append content to an Obsidian note.",
		promptGuidelines: [
			"Prefer this over read-modify-write for adding to logs, daily notes, or running task lists.",
			"Path is vault-relative.",
		],
		parameters: Type.Object({
			path: Type.String({ description: "Vault-relative path to the note" }),
			content: Type.String({ description: "Content to append (use \\n for newlines)" }),
			inline: Type.Optional(Type.Boolean({ description: "Skip leading newline (default false)" })),
		}),
		async execute(_id, params) {
			const args = ["append", `path=${params.path}`, `content=${params.content}`];
			if (params.inline) args.push("inline");
			const text = await obsCmd(args);
			return ok(text || `Appended to ${params.path}`, {
				tool: "obsidian_append",
				path: params.path,
				bytes: params.content.length,
			});
		},
	});

	pi.registerTool({
		name: "obsidian_prepend",
		label: "Obsidian: Prepend",
		description:
			"Prepend content to a note in the active Obsidian vault. Content is inserted after any " +
			"frontmatter so YAML metadata stays at the top.",
		promptSnippet: "Prepend content to an Obsidian note (after frontmatter).",
		promptGuidelines: [
			"Use for inserting new entries at the top of running logs or topic notes.",
			"Frontmatter (--- YAML ---) is preserved automatically.",
		],
		parameters: Type.Object({
			path: Type.String({ description: "Vault-relative path to the note" }),
			content: Type.String({ description: "Content to prepend (use \\n for newlines)" }),
			inline: Type.Optional(Type.Boolean({ description: "Skip trailing newline (default false)" })),
		}),
		async execute(_id, params) {
			const args = ["prepend", `path=${params.path}`, `content=${params.content}`];
			if (params.inline) args.push("inline");
			const text = await obsCmd(args);
			return ok(text || `Prepended to ${params.path}`, {
				tool: "obsidian_prepend",
				path: params.path,
				bytes: params.content.length,
			});
		},
	});

	pi.registerTool({
		name: "obsidian_open",
		label: "Obsidian: Open",
		description: "Open a note in the active Obsidian app — optionally in a new tab.",
		promptSnippet: "Open an Obsidian note in the app.",
		promptGuidelines: [
			"Use after editing a note to surface it for the user to review.",
			"`newtab=true` opens in a new tab without closing existing tabs.",
		],
		parameters: Type.Object({
			path: Type.String({ description: "Vault-relative path to the note" }),
			newtab: Type.Optional(Type.Boolean({ description: "Open in a new tab (default false)" })),
		}),
		async execute(_id, params) {
			const args = ["open", `path=${params.path}`];
			if (params.newtab) args.push("newtab");
			const text = await obsCmd(args);
			return ok(text || `Opened: ${params.path}`, {
				tool: "obsidian_open",
				path: params.path,
				newtab: params.newtab ?? false,
			});
		},
	});

	pi.registerTool({
		name: "obsidian_backlinks",
		label: "Obsidian: Backlinks",
		description: "List backlinks to a note in the active Obsidian vault.",
		promptSnippet: "List backlinks to an Obsidian note.",
		promptGuidelines: [
			"Useful for impact analysis before renaming, deleting, or restructuring a note.",
		],
		parameters: Type.Object({
			path: Type.String({ description: "Vault-relative path to the note" }),
			counts: Type.Optional(Type.Boolean({ description: "Include reference counts" })),
		}),
		async execute(_id, params) {
			const args = ["backlinks", `path=${params.path}`];
			if (params.counts) args.push("counts");
			const text = await obsCmd(args);
			return ok(text || "(no backlinks)", { tool: "obsidian_backlinks", path: params.path });
		},
	});

	pi.registerTool({
		name: "obsidian_tags",
		label: "Obsidian: Tags",
		description:
			"List tags in the active Obsidian vault, or for a single note when `path` is provided. " +
			"Pass `counts=true` to include occurrence counts.",
		promptSnippet: "List tags across the vault or in a single note.",
		promptGuidelines: ["Pass `path` for note-scoped tags; omit it for vault-wide tag inventory."],
		parameters: Type.Object({
			path: Type.Optional(Type.String({ description: "Vault-relative path (note-scoped)" })),
			counts: Type.Optional(Type.Boolean({ description: "Include tag occurrence counts" })),
		}),
		async execute(_id, params) {
			const args = ["tags"];
			if (trimEmpty(params.path)) args.push(`path=${params.path}`);
			if (params.counts) args.push("counts");
			const text = await obsCmd(args);
			return ok(text || "(no tags)", { tool: "obsidian_tags", path: params.path });
		},
	});

	pi.registerTool({
		name: "obsidian_daily_append",
		label: "Obsidian: Daily append",
		description:
			"Append content to today's daily note in the active Obsidian vault. Creates the daily " +
			"note if it does not exist (per the vault's Daily Notes plugin settings).",
		promptSnippet: "Append a line to today's daily note.",
		promptGuidelines: [
			"Use for journaling, decision logs, or end-of-session summaries.",
			"Daily Notes core plugin must be enabled in the vault.",
		],
		parameters: Type.Object({
			content: Type.String({ description: "Content to append (use \\n for newlines)" }),
			inline: Type.Optional(Type.Boolean({ description: "Skip leading newline (default false)" })),
			open: Type.Optional(Type.Boolean({ description: "Open the daily note after appending" })),
		}),
		async execute(_id, params) {
			const args = ["daily:append", `content=${params.content}`];
			if (params.inline) args.push("inline");
			if (params.open) args.push("open");
			const text = await obsCmd(args);
			return ok(text || "Appended to daily note", {
				tool: "obsidian_daily_append",
				bytes: params.content.length,
			});
		},
	});
}
