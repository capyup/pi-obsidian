# Iteration 1 修改记录

## 修改时间
2026-05-11

## 修改内容

### 1. 修复 PromptGuidelines 合规性（100%）

**问题**：基线代码中所有工具都用 "Use this..." 而不是具体工具名，违反 pi 官方文档。

**修复**：所有 guidelines 改为 "Use obsidian_XXX when..." 格式。例如：
- Before: `"Use this instead of the generic file-read tool when..."`
- After: `"Use obsidian_read ONLY when the user explicitly references Obsidian AND the path is vault-relative..."`

### 2. 注入 Vault 路径信息

**问题**：agent 不知道 vault 边界，无法判断文件是否在 vault 内。

**修复**：
- 增加 `vaultPrefix()` 和 `vaultPathGuideline()` 辅助函数
- 在 extension 初始化时读取 `findActiveVault()`
- 将 vault 路径动态嵌入每个工具的 `promptGuidelines`
- 在 `session_start` 事件时通过 `sendMessage(..., { deliverAs: "steer" })` 发送 vault 信息

效果示例：
```
The active Obsidian vault is located at: /Users/lucas/Obsidian/Main.
Only use obsidian tools for files inside this vault.
```

### 3. 严格化触发条件

**修复前**：`"Use this when the file lives inside an Obsidian vault"` — 无法判定
**修复后**：`"Use obsidian_read ONLY when the user explicitly references Obsidian AND the path is vault-relative (e.g. 'folder/note.md', not starting with / or ~)"`

每个工具都增加了：
- `ONLY when the user explicitly...` 强调排他性
- `vault-relative` 路径格式要求
- 明确的外部文件指引："For absolute paths... use the generic file tools instead"

### 4. 增加防御性路径守卫

**新增函数**：
- `isVaultRelative(path)`：检查路径不以 `/` 或 `~` 开头
- `guardVaultPath(toolName, path)`：如果检测到绝对路径，抛出明确错误提示使用 generic 工具

**应用范围**：所有接收路径参数的工具（read, list, search, outline, create, append, prepend, open, backlinks, tags）

错误示例：
```
obsidian_read only accepts vault-relative paths (e.g. 'folder/note.md').
The path "/Users/lucas/Developer/project/README.md" looks like an absolute path.
Use the generic file tools (read/edit/write) for files outside the Obsidian vault.
```

### 5. 模糊场景处理

通过强化 promptGuidelines 中的排他性语言，引导 agent 在面对模糊请求时：
- 如果用户没有提到 Obsidian → 不使用 obsidian 工具
- 如果路径是绝对路径 → 明确指引使用 generic 工具
- 如果用户只说 "that markdown file" 没有路径 → 不属于 obsidian 工具的触发条件

## 验证状态

- [x] `npm run typecheck` 通过
- [ ] 行为实验（TPR/TNR/FPR）待执行
