# Baseline 分析（当前代码 v0.1.0）

## 发现的根本问题

### 1. PromptGuidelines 使用 "Use this" — 违反 pi 最佳实践

pi 官方文档（extensions.md:1227）明确说明：
> "Each guideline must name the tool it refers to — avoid 'Use this tool when...' because the LLM cannot tell which tool 'this' means. Write 'Use my_tool when...' instead."

但当前代码中几乎所有工具都用了 "Use this...":

```typescript
// obsidian_read
promptGuidelines: [
  "Use this instead of the generic file-read tool when the file lives inside an Obsidian vault...",
  "Path is always vault-relative..."
]

// obsidian_list
promptGuidelines: [
  "Default lists all files in the entire vault — pass `folder` to scope.",
  "Use `ext='md'` to restrict to markdown notes."
]
```

**后果**：LLM 看到 Guidelines 中的 "Use this" 时，无法确定指的是哪个工具，可能导致误用。

### 2. 触发条件无法判定

当前 guidelines 说 "when the file lives inside an Obsidian vault"，但：
- Agent 不知道 vault 的路径边界
- 对于一个像 `README.md` 这样的相对路径，agent 不知道这是 vault-relative 还是 cwd-relative
- 对于一个绝对路径 `/Users/lucas/Developer/project/README.md`，agent 也不知道它是否在 vault 内

### 3. 所有 markdown 文件都被暗示使用 obsidian 工具

"when the file lives inside an Obsidian vault" + "Path is always vault-relative" 的组合效果：
- Agent 遇到任何 `.md` 文件时，都会考虑使用 obsidian 工具
- 因为 agent 无法验证文件是否在 vault 内，倾向于"安全地"使用 obsidian 工具
- 但 obsidian 工具要求 vault-relative 路径，而外部文件是 absolute 路径，导致调用失败或混乱

### 4. 缺少防御性边界

工具 execute 函数没有检查传入的路径是否以 `/` 开头（绝对路径）。如果 agent 误传了绝对路径，obsidian CLI 可能产生不可预期的行为。

## 基线预测（未验证）

| 指标 | 预测值 | 依据 |
|---|---|---|
| TPR | ~60% | guidelines 模糊，agent 可能混淆 |
| TNR | ~40% | 大量误触发，绝对路径也被尝试用 obsidian |
| FPR | ~60% | 高误触发率 |
| PromptGuidelines 合规性 | 0% | 所有工具都用 "Use this" |
