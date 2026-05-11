# pi-obsidian 实验体系 — 总结

## 体系结构

```
experiments/
├── EXPERIMENT_FRAMEWORK.md      # 实验流程、可量化标准、终止条件
├── test-cases.json              # A/B/C 三类测试用例
├── SUMMARY.md                   # ← 本文件，总览
├── baseline/
│   ├── ANALYSIS.md              # 当前代码问题诊断
│   └── index.ts.original        # 修改前的 index.ts 快照
├── iteration-1/
│   ├── CHANGELOG.md             # 第一轮修改内容
│   ├── RESULTS.md               # 第一轮结果 + 方法论失败记录
│   └── raw-outputs/             # subagent 测试原始输出
└── iteration-2/
    ├── PLAN.md                  # 方法论修正
    ├── guard.test.mjs           # 单元测试（15/15 pass）
    ├── llm-runs/                # 真实 pi --print 行为日志
    └── RESULTS.md               # 第二轮结果 ✅ 全部达标
```

## 可量化标准（来自 EXPERIMENT_FRAMEWORK.md）

| 指标 | 目标 | 最终实测 |
|---|---|---|
| TPR (该用 obsidian 时正确使用) | ≥ 90% | **100% (4/4)** |
| TNR (不该用时不误用) | ≥ 95% | **100% (3/3)** |
| FPR (误触发率) | ≤ 5% | **0%** |
| 模糊请求正确率 | ≥ 80% | **100% (2/2)** |
| promptGuidelines 合规 | 100% | **100%** |
| typecheck | pass | pass |
| unit tests | all pass | **15/15** |

## 关键修改（提交进 extensions/obsidian/index.ts）

1. **promptGuidelines 全部点名工具**：消除 "Use this" 反模式（pi 官方文档明确禁止）
2. **注入 vault 路径**：`vaultPrefix()` / `vaultPathGuideline()` 把实际 vault 路径
   写进每个工具的 guideline，让 agent 能用绝对路径作判断
3. **session_start steer message**：会话启动时发一条系统级提示，告诉 agent vault 位置
4. **严格触发条件**：每条 guideline 加 "ONLY when... AND vault-relative path"
5. **每个工具都指出 generic fallback**：明确"绝对路径 / vault 外文件请用 read/edit/write/grep/ls"
6. **防御性 guardVaultPath**：在 17 个执行点拦截绝对路径，抛出清晰错误把 agent 推回 generic

## 方法论教训

- ❌ `subagent_tool/delegate` 不加载 extension，不能用来测 LLM 工具选择
- ✅ `pi --print --mode json --no-skills --no-context-files` + `grep "name":"..."` 是
  最干净的 LLM 行为测试方式
- ✅ 单元测试 + 静态检查捕捉了真实代码缺口（5 个工具原先没显式指 fallback 工具）
- ✅ 两层验证：unit test (确定性) + pi --print (LLM 行为) 互相补充

## 如何重跑实验

```bash
# 层 1：unit tests
cd /Users/lucas/Developer/pi-obsidian
npm run typecheck
node experiments/iteration-2/guard.test.mjs

# 层 2：单个 LLM 行为测试
timeout 90 pi --print --mode json --no-skills --no-context-files \
  "Read ops/index.md from my Obsidian vault." 2>&1 \
  | grep -oE '"name":"[a-z_]+"' | sort | uniq -c
```

## 当前 install 状态

`pi list` 显示当前加载的是本地 dev 版（`/Users/lucas/Developer/pi-obsidian`），
而不是 npm 上的 `@capyup/pi-obsidian`。如要切回 npm 版：

```bash
pi remove /Users/lucas/Developer/pi-obsidian
pi install npm:@capyup/pi-obsidian
```

如要把改动发到 npm，按 pi-package-release skill 走标准发版流程。
