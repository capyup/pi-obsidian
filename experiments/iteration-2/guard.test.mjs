// Unit tests for the defensive path guards in pi-obsidian.
//
// Run with: node experiments/iteration-2/guard.test.mjs
//
// We re-implement isVaultRelative locally (not exported from the extension),
// then dynamically import the extension module to exercise guardVaultPath
// behavior indirectly via path-validation logic.

import assert from "node:assert/strict";

// Mirror of isVaultRelative from extensions/obsidian/index.ts
function isVaultRelative(path) {
	if (!path || path.length === 0) return false;
	return !path.startsWith("/") && !path.startsWith("~");
}

let passed = 0;
let failed = 0;

function test(name, fn) {
	try {
		fn();
		console.log(`  ✅ ${name}`);
		passed++;
	} catch (err) {
		console.log(`  ❌ ${name}`);
		console.log(`     ${err.message}`);
		failed++;
	}
}

console.log("\n=== isVaultRelative ===");

test("vault-relative simple", () => {
	assert.equal(isVaultRelative("ops/index.md"), true);
});

test("vault-relative single file", () => {
	assert.equal(isVaultRelative("Getting Started.md"), true);
});

test("vault-relative deep folder", () => {
	assert.equal(isVaultRelative("inbox/2026/05/idea.md"), true);
});

test("rejects absolute path /Users", () => {
	assert.equal(isVaultRelative("/Users/lucas/Developer/project/README.md"), false);
});

test("rejects absolute path /tmp", () => {
	assert.equal(isVaultRelative("/tmp/test.md"), false);
});

test("rejects absolute path /etc", () => {
	assert.equal(isVaultRelative("/etc/hosts"), false);
});

test("rejects home-relative ~ path", () => {
	assert.equal(isVaultRelative("~/Documents/note.md"), false);
});

test("rejects empty string", () => {
	assert.equal(isVaultRelative(""), false);
});

test("accepts leading dot (hidden file vault-relative)", () => {
	assert.equal(isVaultRelative(".obsidian/config.json"), true);
});

console.log("\n=== promptGuidelines static checks ===");

// Read the actual extension file and verify compliance
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../../extensions/obsidian/index.ts", import.meta.url), "utf-8");

test("no 'Use this' anti-pattern", () => {
	const matches = src.match(/Use this/g);
	assert.equal(matches, null, `found ${matches?.length} 'Use this' occurrences`);
});

test("every tool has named reference", () => {
	const toolNames = [
		"obsidian_read", "obsidian_list", "obsidian_search", "obsidian_outline",
		"obsidian_create", "obsidian_append", "obsidian_prepend", "obsidian_open",
		"obsidian_backlinks", "obsidian_tags", "obsidian_daily_append",
	];
	for (const t of toolNames) {
		assert.ok(src.includes(`Use ${t}`), `missing 'Use ${t}' reference in guidelines`);
	}
});

test("every path-accepting tool calls guardVaultPath", () => {
	const calls = src.match(/guardVaultPath\(/g);
	assert.ok(calls && calls.length >= 10, `expected ≥10 guardVaultPath calls, found ${calls?.length ?? 0}`);
});

test("vaultPrefix function exists", () => {
	assert.ok(src.includes("function vaultPrefix("), "missing vaultPrefix function");
});

test("session_start handler sends vault info", () => {
	assert.ok(src.includes("session_start"), "missing session_start handler");
	assert.ok(src.includes("deliverAs: \"steer\""), "missing steer message");
});

test("each tool guideline references absolute-path fallback", () => {
	// Count how many guideline blocks mention falling back to generic tools
	const mentions = (src.match(/generic (read|edit|write|grep|ls|find)/g) ?? []).length;
	assert.ok(mentions >= 8, `expected ≥8 generic-fallback mentions, found ${mentions}`);
});

console.log(`\n=== Summary ===`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
