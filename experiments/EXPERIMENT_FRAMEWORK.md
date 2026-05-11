# pi-obsidian 插件实验框架

## 问题定义

当前插件的 `promptGuidelines` 过于宽泛，导致 agent 在操作任何 `.md` 文件时都倾向于使用 obsidian 工具，即使这些文件：
- 不在 Obsidian vault 内
- 路径是绝对路径（如 `/Users/lucas/Developer/project/README.md`）
- agent 根本不知道 vault 的边界在哪里

## 可量化标准

| 指标 | 代号 | 目标值 | 测量方式 |
|---|---|---|---|
| **真阳性率 (TPR)** | 当文件明确在 vault 内时，使用 obsidian 工具的比例 | ≥ 90% | 统计 vault-relative 路径请求的工具选择 |
| **真阴性率 (TNR)** | 当文件明确不在 vault 内时，不使用 obsidian 工具的比例 | ≥ 95% | 统计绝对路径/外部文件请求的工具选择 |
| **模糊请求正确率** | 路径不明确时，agent 先确认再操作的比例 | ≥ 80% | 观察无路径信息的请求处理方式 |
| **PromptGuidelines 合规性** | 所有 guidelines 命名具体工具 | 100% | 静态代码检查 |
| **误触发率 (FPR)** | 不应使用 obsidian 时错误使用的比例 | ≤ 5% | 1 - TNR |

## 测试用例分类

### A 类 — 应使用 Obsidian 工具（TPR 测试）
1. "Read ops/index.md from my vault" → 期望: obsidian_read
2. "Search my Obsidian notes for 'tailscale'" → 期望: obsidian_search
3. "Append to today's daily note" → 期望: obsidian_daily_append
4. "Show me the outline of projects/big-project.md in Obsidian" → 期望: obsidian_outline
5. "List all markdown files in my Obsidian vault under folder 'recipes'" → 期望: obsidian_list

### B 类 — 不应使用 Obsidian 工具（TNR 测试）
1. "Read /Users/lucas/Developer/some-project/README.md" → 期望: read (generic)
2. "Edit /etc/hosts file" → 期望: edit (generic)
3. "Write a new file /tmp/test.md" → 期望: write (generic)
4. "Read the package.json in current directory" → 期望: read (generic)
5. "Search for 'TODO' in all files under /Users/lucas/Developer" → 期望: grep (generic)

### C 类 — 模糊场景测试
1. "Read that markdown file I mentioned earlier" → 期望: 先确认路径，再选择工具
2. "Update the meeting notes" → 期望: 先确认位置（vault 内还是外部）
3. "Create a new note called 'ideas.md'" → 期望: 询问用户放在哪里

## 实验方法

每轮实验包含：
1. **修改 (Modify)**：调整 promptGuidelines、description、或增加运行时提示
2. **构建 (Build)**：`npm run typecheck` 确保代码正确
3. **测试 (Test)**：用 subagent 执行实际文件操作任务，观察工具选择
4. **记录 (Record)**：记录每个测试用例的实际工具选择和 reasoning
5. **分析 (Analyze)**：计算 TPR、TNR、FPR
6. **决策 (Decide)**：是否满足标准？否 → 下一轮修改；是 → 完成

## 实验轮次记录

- `baseline/` — 当前代码的基线测试结果
- `iteration-1/` — 第一轮修改后的结果
- `iteration-N/` — 后续轮次

## 终止条件

同时满足以下所有条件：
- TPR ≥ 90%
- TNR ≥ 95%
- FPR ≤ 5%
- 模糊请求正确率 ≥ 80%
- 所有代码通过 `npm run typecheck`
