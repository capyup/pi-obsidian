# Iteration 1 实验结果

## 实验执行汇总

| ID | 类型 | 期望工具 | 实际工具 | 结果 |
|----|----|---|---|---|
| B1 | 绝对路径读取 | read | read | ✅ pass |
| B2 | 绝对路径写入 | write | write | ✅ pass |
| B3 | CWD-relative 读取 | read | read | ✅ pass |
| A1 | vault 内 read | obsidian_read | Read_tool | ❌ fail |
| A2 | vault 内 search | obsidian_search | (卡死,被 SIGTERM 终止) | ⚠️ stuck |
| C1 | 模糊 README | read | read | ✅ pass |
| C2 | 模糊 meeting notes | ASK_USER | ASK_USER | ✅ pass |

**字面计算**：TNR = 100% (3/3)，TPR = 0% (0/2)，FPR = 0%。

## 关键发现：实验方法论失败 ❗

A1 任务的 subagent 在它自己的回复里坦诚地写道：

> "obsidian_read was not present in this subagent's exposed function definitions.
> The available tools were: Read_tool, Grep_tool, Find_tool, Ls_tool, Bash_tool, Edit_tool, Write_tool."

**这意味着 `delegate` subagent 不会加载 extension。**

这把所有结果的可信度都重新洗牌了：

- **B 类全部 pass**：但不是因为我的 promptGuidelines 修改起了作用 —— 而是因为 subagent 根本没有 `obsidian_*` 工具可以误用。这只能证明默认 pi agent 在没有任何 obsidian 工具时会正确路由。
- **A 类全部 fail / stuck**：因为 subagent 没有 `obsidian_read` 可选。A2 卡死 41 分钟，是因为 subagent fallback 到 bash 调用 `obsidian --help` 直接，GUI app 启动 hang。
- **C 类 pass**：模糊场景下"先 ASK_USER"是 pi 默认 agent 的基线行为，跟我的修改无关。

## 实际验证了什么？

虽然方法论失败，但这一轮**确实**验证了几件事：

1. **静态合规性 100%**：
   - `grep "Use this" extensions/obsidian/index.ts` → 0 matches
   - `grep "Use obsidian_" extensions/obsidian/index.ts` → 19 命名引用
   - `grep "guardVaultPath" extensions/obsidian/index.ts` → 17 防御调用

2. **`npm run typecheck` 通过**。

3. **副产物发现**：obsidian binary 在没有正确 `vault=<id> <command>` 参数时会启动 GUI 并 hang。我的 extension 始终传 `vault=<id>` 在前面，并且有 `RUN_TIMEOUT_MS = 30_000` 兜底，所以不会卡死。但 subagent 直接 bash 调用会卡死。

## 验证不到什么？

- **真正的 TPR/TNR 数字**：因为测试环境里 obsidian_* 工具不存在。
- **promptGuidelines 是否真的影响 LLM 工具选择**：subagent 看不到这些 guidelines。

## 防御性保护层（确实有效）

即使 LLM 在生产环境里被 promptGuidelines 误导调用了 `obsidian_read("/absolute/path")`，
`guardVaultPath` 会立刻抛出明确错误，把 LLM 推回到 generic read。

这一层是**确定性**的、**可单元测试**的，比依赖 LLM 服从 prompt 更可靠。

## 下一轮（Iteration 2）实验方法论修正

必须在一个**真正加载了 extension 的环境**里测：

**方案 A：pi 子进程 print mode**
```bash
pi --print --no-stream "Read /tmp/external.md" 2>&1 | tee transcript.log
```
然后 grep transcript 看 agent 调用了哪个工具。

**方案 B：unit test 防御逻辑**
直接 import `guardVaultPath` / `isVaultRelative`，用 Node test runner 验证。

**方案 C：人工 + 在当前 pi 会话**
- 当前我（pi agent）确实加载了这个 extension（npm 版本 → 现在是本地版本）
- 我看到的 system prompt Guidelines 区域应该包含我刚写的那些 "Use obsidian_X only when…" 句子
- 但用我自己测自己是有偏差的

下一轮我会优先做 **方案 B（unit test）+ 方案 A（pi print 模式）**。

## 决策

不算完成。本轮**没有触达终止条件**（因为 TPR 无法测量）。下一轮换方法论。
