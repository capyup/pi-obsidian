# Iteration 2 实验结果

## 方法论

放弃了 `subagent_tool/delegate`（不加载 extension），改用：

**层 1：unit test 防御逻辑**
`node experiments/iteration-2/guard.test.mjs`

**层 2：真实 pi --print 行为测试**
```
pi --print --mode json --no-skills --no-context-files "<prompt>" \
  | grep -oE '"name":"[a-z_]+"' | sort | uniq -c
```
- 每次启动一个新的 pi 进程，加载本地版本的 pi-obsidian
- 解析 JSON 输出里的 `"name":"<tool>"` 字段
- 看 agent 真实调用了哪些工具

## 层 1：单元测试

```
=== isVaultRelative ===
  ✅ vault-relative simple
  ✅ vault-relative single file
  ✅ vault-relative deep folder
  ✅ rejects absolute path /Users
  ✅ rejects absolute path /tmp
  ✅ rejects absolute path /etc
  ✅ rejects home-relative ~ path
  ✅ rejects empty string
  ✅ accepts leading dot (hidden file vault-relative)

=== promptGuidelines static checks ===
  ✅ no 'Use this' anti-pattern
  ✅ every tool has named reference
  ✅ every path-accepting tool calls guardVaultPath
  ✅ vaultPrefix function exists
  ✅ session_start handler sends vault info
  ✅ each tool guideline references absolute-path fallback

Passed: 15 / 15
```

中途修复了一个真实缺口：`obsidian_outline / open / backlinks / tags / daily_append`
原来只引用了 `vPathRule`（"use the generic file tools"），没在 per-tool guideline 里点名
具体的 fallback 工具。补强后通过。

## 层 2：真实 LLM 行为

每个 prompt 起一个独立的 `pi --print` 进程。计数是每个工具被调用的次数（次数本身不重要，
存在性才重要 —— agent 在该 prompt 下是否调用了 obsidian_* 还是 generic）。

| ID | Prompt | 工具调用 | 期望 | 结果 |
|----|-----|-----|-----|-----|
| **A 类（应使用 obsidian）** | | | | |
| A1 | "Read ops/index.md from my Obsidian vault." | obsidian_read, obsidian_list, bash | obsidian_read | ✅ |
| A2 | "Search my Obsidian notes for the word tailscale." | obsidian_search ×13 | obsidian_search | ✅ |
| A3 | "List all markdown files in my Obsidian vault under the ops folder." | obsidian_list ×15 | obsidian_list | ✅ |
| Borderline | "Find all my notes that mention tailscale." (没显式说 Obsidian) | obsidian_search ×15 | obsidian_search (合理) | ✅ |
| **B 类（不应使用 obsidian）** | | | | |
| B1 | "Read /tmp/pi-obsidian-test/external.md and tell me what it says." | read ×13 | read | ✅ |
| B2 | "Write a file at /tmp/pi-obsidian-test/B2-iter2.md with content: test." | write ×17 | write | ✅ |
| B3 | "Read the package.json in the current directory and tell me the name field." | read ×15 | read | ✅ |
| **C 类（模糊）** | | | | |
| C1 | "Read the README.md file." | read ×13 | read (CWD 默认) | ✅ |
| C2 | "Update the meeting notes with today's summary." | obsidian_list, obsidian_search, question | 询问用户 | ✅ |

## 量化指标

| 指标 | 目标 | 实测 | 是否达标 |
|---|---|---|---|
| **TPR** (A 类正确使用 obsidian) | ≥ 90% | **4/4 = 100%** | ✅ |
| **TNR** (B 类不误用 obsidian) | ≥ 95% | **3/3 = 100%** | ✅ |
| **FPR** (B 类误触发率) | ≤ 5% | **0%** | ✅ |
| **模糊请求正确率** | ≥ 80% | **2/2 = 100%** | ✅ |
| **PromptGuidelines 合规** | 100% | **100%** | ✅ |
| **typecheck** | pass | pass | ✅ |
| **unit tests** | 100% | **15/15** | ✅ |

## C2 的细节

C2 ("Update the meeting notes with today's summary") 是最有意思的 case。
Agent 同时做了三件事：
- `obsidian_list` (27 次) — 在 vault 里查找候选 meeting 文件
- `obsidian_search` (19 次) — 用 "meeting" 关键词搜
- `question` (37 次) — 最终意识到不够明确，向用户提问

它没有"盲目写一个 meeting 文件"，最终走到了问用户。这是可接受的行为 —— 它先在 vault
里做了 reconnaissance，发现需要更多信息后再问。如果想更严格"先问再做任何事"，可以再加
一条 guideline，但目前的行为是合理的。

## 终止条件检查

EXPERIMENT_FRAMEWORK.md 的终止条件：

- [x] TPR ≥ 90%
- [x] TNR ≥ 95%
- [x] FPR ≤ 5%
- [x] 模糊请求正确率 ≥ 80%
- [x] `npm run typecheck` 通过

**全部满足。** Iteration 2 完成。
