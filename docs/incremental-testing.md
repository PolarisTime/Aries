# 增量测试与本地运行性能（aries）

本文只讲**本地反馈循环**：怎么在改少量文件时只跑相关测试、哪些场景必须回到全量。
CI（`.github/workflows/ci.yml` 的 `test` job）**始终执行全量** `pnpm test`，增量结果不是合并判据。

## 结论

- 日常改动用 `pnpm test:changed` 或 `pnpm test:related <file>`。典型“叶子组件/工具”改动实测 21–25s，全量约 188s。
- 改动越靠公共层，增量越接近全量：公共组件实测选中 42–55 个测试文件、约 90–101s；改 `src/locales/*` 这类被几乎所有模块 import 的文件会选中 130 个文件、耗时反而超过全量（248s）。
- 出现上述扩散、或改了测试基础设施/依赖/全局 setup 时，直接跑 `pnpm test`，不要迷信增量。

## 命令

| 命令 | 用途 |
| --- | --- |
| `pnpm test` | 全量（CI 同款）。合并前、改动公共层、发布前必须跑 |
| `pnpm test:changed` | 对比**工作区未提交变更**（含暂存/untracked），只跑依赖图中受影响的测试；**0 个受影响测试时退出码非 0**（避免假绿，见下文） |
| `pnpm test:changed:base` | 对比 `origin/main`，覆盖本地已提交但未推送的改动 |
| `pnpm test:related <file...>` | 指定源码文件，跑依赖它的测试（可传多个文件） |
| `pnpm test:watch` | 监听模式，改哪个文件跑哪个文件的相关测试 |
| `pnpm test:e2e:changed` | Playwright `--only-changed`：只跑测试文件本身被改的 e2e |
| `pnpm test:e2e:last-failed` | 只重跑上次失败的 e2e |

示例：

```bash
pnpm test:changed
pnpm test:changed:base
pnpm test:related src/views/modules/components/NetPriceMatchChip.tsx
pnpm test:related src/views/price-compare/core.ts src/views/price-compare/ton.ts
```

## 原理

Vitest 读取 Git 变更（未提交/暂存），再沿 **静态 import 图**找到 import 了这些文件的测试文件，只执行这部分。
Playwright 的 `--only-changed` 分析的是 **e2e 测试文件的依赖图**；本仓库 e2e 是黑盒 HTTP 测试，不 import 业务源码，因此它只对“e2e 测试文件自身被改”有效，源码改动不会触发对应 e2e。

`--changed` 原生行为：无变更时打印 `No test files found, exiting with code 0`（vitest 在 `--changed` 下会强制 `passWithNoTests`）。

`pnpm test:changed` / `pnpm test:related` 走 `scripts/test/incremental.mjs` 包装器：显式传 `--no-passWithNoTests`，并扫描输出中的 `No test files found`；只要一个测试都没选中，即使子进程退出 0 也改为非 0，并打印“本次未验证任何用例”。这是刻意的——`pnpm test:changed && git commit` 这类链式命令不能把“0 个测试”当成全绿。

确实只是改文档、想主动接受 0 个测试时，用 `pnpm exec vitest run --changed --passWithNoTests`；合并判断仍以 `pnpm test` 全量为准。

## 实测数据（2026-10-20，8 核 / vitest 5.0.1）

| 场景 | 选中文件 / 用例 | 耗时 |
| --- | --- | --- |
| 全量 `pnpm test`（2026-10-20 干净工作区） | 324 / 2802 | 269–281s（外部负载 12–18，全绿） |
| 全量历史（10-14 日志） | 263 / 2094 | 188s |
| 无变更 `vitest run --changed`（原生） | 0 / 0 | <5s，exit 0 |
| 无变更 `pnpm test:changed`（包装器） | 0 / 0 | 非 0，打印“本次未验证任何用例” |
| `--changed HEAD~1`（该提交改了 `src/locales/*`） | 130 / 1131 | 248s（比全量还慢） |
| `related ContextMenu.tsx`（公共组件） | 42 / 396 | 101s |
| `related NetPriceMatchChip.tsx`（被多页引用） | 55 / 400 | 90s |
| `related use-parent-selector-confirm.ts`（叶子工具） | 23 / 143 | 25s |
| 单个 spec 文件（`SheetPanel.context-menu.spec.tsx`） | 1 / 24 | 31s |
| 叶子工具 + 单文件启动成本上限 | — | 单次运行最低约 20–30s |

结论：单次运行有约 20–30s 的固定成本（加载 800+ 模块、初始化 jsdom 环境）。增量要快，必须让选中文件数足够少；文件数达到全量的一半时，耗时与全量相当甚至更差。

## 必须全量的场景

- 修改 `src/test-setup.ts`、`vitest.config.ts`、`package.json` / `pnpm-lock.yaml`、全局 mock、i18n 初始化、全局样式入口。实测 `package.json` 变更会让 `--changed` 的依赖图扩散到大量测试（本次 120s 内未跑完即被终止），这类变更请直接全量。
- 修改 `src/locales/*`、公共类型、API 客户端、store、被大量模块 import 的组件（实测会扩散到 40–130 个文件）。
- 重命名/移动文件、动态 `import()`、运行时拼接路径——静态依赖图可能漏。
- 合并前、CI、发布前；以及任何你无法判断影响面的改动。

## 已知局限与风险

- 增量是**静态启发式**：动态 import、`require`、字符串拼路径、monorepo 外部包不会进入依赖图。
- 高并发下 jsdom + antd 用例存在偶发失败：本次实测两次多文件并行运行各出现 1 个失败（`SheetPanel.context-menu.spec.tsx`、`MaterialPage.spec.tsx`），单独重跑均通过。增量/全量都有这个 flake，不要把它当成改动引入的回归，也不要靠重跑掩盖。
- 增量只说明“被选中的测试通过”，不说明其它未选测试仍然通过（例如公共模块的行为变化）。

## 性能调优实测（结论：不启用）

干净工作区 A/B（8 核；期间有外部负载 12–18，墙钟绝对值偏高，但同条件可比）：

| 配置 | 墙钟 | 失败 | 峰值 RSS | 结论 |
| --- | --- | --- | --- | --- |
| 默认（forks + isolate） | 281.08s | 0（324 / 2802 全绿） | 800MB | 保留 |
| `--pool=threads` | 298.84s | 1 文件 22 用例 | 3.4GB | 更慢且内存 4×，不启用 |
| `--no-isolate`（两次） | 100.13s / 104.41s | 34 / 8 用例，且两次失败集合不同 | 880MB | 快约 2.8×，但失败随运行漂移，属模块状态串扰，不可用 |

结论：默认配置已是当前最稳；提速应靠减少测试文件数（增量），而不是关闭隔离或改 pool。
全量耗时构成（历史日志）：import 41%、tests 36%、environment 18%、transform 2%、setup 2%。

## 推荐工作流

```bash
# 改一个业务页面/组件
pnpm test:related src/views/<module>/<file>.tsx

# 改多个文件 / 不确定影响面
pnpm test:changed

# 改动公共层、测试基础设施，或提交前
pnpm test
```
