# Iteration 2 方法论修正

Iteration 1 暴露了一个关键问题：`delegate` subagent 不加载 extension，所以 LLM 是否真的服从 promptGuidelines 没法用 subagent 测。

Iteration 2 改用**两层、可重复的方式**：

## 层 1：确定性 unit test（必须 pass）

直接 import `guardVaultPath` / `isVaultRelative`，针对所有边界 case 验证。
这一层验证防御性兜底 —— 即使 LLM 完全无视 promptGuidelines，也会被这层挡住。

通过标准：所有 case 100% 通过。

## 层 2：LLM 行为测试（用真的 pi --print）

用 `pi --print --mode json` 启动一个真实 agent 会话，加载本地 extension，给它一句话，
然后 grep 输出里的 tool 名字。可用 `--no-skills` / `--no-context-files` 隔离干扰。

通过标准：TPR ≥ 90%, TNR ≥ 95%（如 EXPERIMENT_FRAMEWORK.md）。

## 这一轮先做层 1

层 2 需要：
- 一个干净的、能命中所有测试用例的 prompt 集
- 让 pi --print 跑出可解析的 JSON 工具调用日志
- 每次 ~30-60 秒的实际 LLM 调用

先把层 1 跑通，沉淀好测试基础设施，层 2 在 iteration 3。
