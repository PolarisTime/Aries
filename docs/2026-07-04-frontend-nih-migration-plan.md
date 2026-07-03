# 前端手搓轮子扫描与迁移计划

## 1. 背景

本计划基于 `aries` 前端代码只读扫描结果编写，目标是识别可以由现有依赖或成熟开源方案承接的自研基础设施，降低维护成本和回归风险。

当前前端并不是全面 NIH。项目已经使用以下成熟依赖：

- React 19、Vite、TypeScript
- Ant Design、`@ant-design/icons`
- TanStack Query、TanStack Router、TanStack Table
- Zustand
- zod
- `pinyin-pro`
- `xlsx`
- `@dnd-kit`
- i18next、react-i18next

主要问题集中在：已有库可以承接的缓存、持久化、弹层焦点管理、异步状态和打印脚本执行逻辑，项目里仍维护了额外的自研实现。

## 2. 目标

- 删除或收敛可由现有依赖承接的基础设施代码。
- 保留明确属于业务领域的模块编辑、单据链路、打印业务规则。
- 避免一次性大改，按风险和收益分批迁移。
- 每批迁移必须有单元测试或集成测试覆盖。

## 3. 非目标

- 不重写业务模块系统。
- 不替换 Ant Design、TanStack、Zustand 这类现有核心依赖。
- 不在本计划内调整后端接口。
- 不迁移安全敏感认证逻辑到未经评估的第三方服务。

## 4. 高优先级迁移项

### 4.1 选项缓存迁移到 TanStack Query

当前实现：

- `src/lib/create-cached-options.ts`
- `src/api/customer-options.ts`
- `src/api/supplier-options.ts`
- `src/api/carrier-options.ts`
- `src/api/warehouse-options.ts`
- `src/api/material-categories.ts`
- `src/api/company-settings.ts`
- `src/hooks/useMasterOptions.ts`（注意：`useMasterOptions` 在 `src/hooks/` 不在 `src/api/`，已是 TanStack Query 范本）

迁移面说明：

- `createCachedOptions` 当前被以下 6 个 api 文件引用：`customer-options`、`supplier-options`、`carrier-options`、`warehouse-options`、`material-categories`、`company-settings`，迁移需同步改造这 6 个文件，不可只动 `create-cached-options.ts`
- `useMasterOptions` 已使用 7 处 `useQuery`，是本批次迁移的范本，照抄即可

问题：

- `createCachedOptions` 自己维护 `cached`、`loading`、`fetchFailed`，闭包变量无用户隔离，切账号会脏读
- `useMasterOptions` 已经使用 TanStack Query，形成第二套缓存来源
- 缓存失效、预取、错误状态和登录态切换需要重复维护

建议：

- 用 `queryClient.ensureQueryData` 替代同步读取前的隐式拉取。
- 用 `useQuery` 或 `useSuspenseQuery` 作为组件读取入口。
- 用 `queryClient.prefetchQuery` 做页面预取。
- 用 `queryClient.invalidateQueries` 在主数据变更后统一失效。
- 删除 `createCachedOptions`，保留业务 normalizer。

验收标准：

- 选项 API 只有 TanStack Query 一套缓存。
- 主数据新增、编辑、禁用后相关选项能正确刷新。
- 登录用户切换后不会读取上一个用户的选项缓存（≤ 100ms 内失效）。
- 原有 `useMasterOptions` 测试覆盖缓存命中、失效和禁用状态。
- 6 个 `*-options.ts` / `material-categories.ts` / `company-settings.ts` 的单测从 mocked `http` 改写为 mocked `queryClient`，保持断言等价。

### 4.2 非敏感 UI 持久化收敛到 Zustand persist

当前实现：

- `src/utils/storage.ts`
- `src/hooks/useColumnSettingsSupport.ts`
- `src/hooks/useThemeMode.ts`
- `src/layouts/usePersonalSettings.ts`

问题：

- `storage.ts` 当前主要承载 auth token / user / expires / session，职责偏 auth；theme / columnSettings 实际散在各自 hook 内
- 列设置本地存储和远端同步逻辑混在 hook 内。
- 项目已有 5 个 Zustand store（`authStore` / `permissionStore` / `setupStore` / `systemMenuStore` / `auth-user-sync`），但 **persist middleware 当前几乎零使用**（仅 `useColumnSettingsSupport.ts` 1 处），本批次本质是**首次引入 persist 模式而非"统一已用方式"**，需谨慎避免一次改多 store 引入回归。

建议：

- 先以 `setupStore` 单 store 试点 persist，验证刷新一致性、坏数据恢复、SSR/首屏闪烁后再推广到 `permissionStore` / `systemMenuStore`
- 个人设置、主题模式、布局模式迁移到独立 Zustand store 或扩展现有 store。
- 使用 Zustand `persist` 和 `createJSONStorage` 持久化非敏感 UI 状态。
- 列设置保留本地 fallback，但远端读写迁移到 TanStack Query mutation/query。
- auth token 和用户会话先不迁入通用 persist，避免扩大安全风险。
- i18n 语言持久化现状需先核对（`src/types/i18n.ts` 已疑似持 persist），本批次明确是否纳入

验收标准：

- `storage.ts` 不再承载非敏感 UI 状态的主要读写。
- 个人设置刷新页面后保持一致。
- 列设置离线时可本地保存，恢复网络后可重新同步。
- auth 行为不发生语义变化。

### 4.3 编辑器草稿与异常自动保存持久化升级

当前实现：

- `src/views/modules/module-editor-draft-storage.ts`
- `src/utils/client-autosave-registry.ts`
- `src/views/modules/components/ModuleEditorWorkspace.tsx`

问题：

- 草稿直接写 localStorage，容量和大单据风险不可控。
- 自动保存 registry 是全局 Set，缺少更明确的生命周期边界。
- 异常保存能力有业务价值，但基础设施需要更清晰的存储抽象。

建议：

- 短期保留当前业务语义，不做行为重写。
- 增加 typed draft repository，隔离 localStorage 细节。
- 中期引入 `idb-keyval`（约 1KB，promise API，比 localforage 更轻），**推荐 idb-keyval 而非 localforage**（后者偏重），将**单据草稿体积 > 1MB** 的迁到 IndexedDB；其余仍可留 localStorage
- registry 只保留事件分发，具体保存逻辑下沉到编辑器 draft service。

依赖说明：

- `idb-keyval` 为新增依赖，详见新增「依赖调整计划」节；不在本批次提前引入，先验证 typed repository 抽象稳定后再引入

验收标准：

- 浏览器异常、`pagehide`、`visibilitychange` 下仍能保存当前草稿。
- 大明细草稿（> 1MB）不会因为 localStorage 配额直接导致编辑器异常，自动降级到 IndexedDB。
- 草稿版本、TTL、用户隔离、模块隔离均有测试覆盖。
- 大于 5MB 的草稿后续作为压测基线，验证不触发 `QuotaExceededError`。

## 5. 中优先级迁移项

### 5.1 WorkspaceOverlay 焦点管理迁移到 AntD Modal/Drawer 能力

当前实现：

- `src/views/modules/components/WorkspaceOverlay.tsx`
- `src/styles/workspace-overlay.css`

问题：

- 自己实现 focusable selector、Tab 循环、Esc 顶层判断和焦点恢复。
- AntD Modal/Drawer 已提供 `keyboard`、`focusable.trap`、`focusTriggerAfterClose`、mask 等能力。
- 继续手写会增加可访问性和嵌套弹层回归风险。

建议：

- **先做独立可行性 spike**（不计入本计划正式 PR），逐项核对 AntD Drawer 能否复刻当前 177 行组件 + 274 行 CSS 的行为，spike checklist：
  1. `placement` / `size` / `footer` / `styles` 能否覆盖现有布局与尺寸
  2. 嵌套弹层（父单据 → 详情 → 编辑三层）的 z-index 与焦点嵌套是否被 Drawer 原生支持
  3. `role="dialog"` / `aria-modal` / `aria-labelledby` 语义是否由 Drawer 原生输出
  4. 父单据选择、详情、编辑三个工作区入口的视觉过渡是否一致
  5. 现有 `workspace-overlay.css` 274 行有多少能被 Drawer `styles` 内联替代、多少必须保留
  6. 关闭后焦点恢复的目标元素能否通过 Drawer API 表达
- spike 结论先沉淀为独立文档（`docs/2026-07-xx-workspace-overlay-drawer-spike.md`），再决定迁移 / 保留 / 仅抽 focus trap
- 如果视觉结构必须保留，至少抽出 focus trap，改用成熟库或 AntD 弹层底座
- 迁移时保留现有 `role="dialog"`、`aria-modal`、`aria-labelledby` 测试。

验收标准：

- Esc 只关闭顶层弹层。
- 打开后焦点进入弹层，关闭后焦点恢复。
- Tab 和 Shift+Tab 不逃出当前弹层。
- 父单据选择、详情、编辑三个工作区入口行为一致。

### 5.2 打印模板与 LODOP 脚本执行边界收敛

当前实现：

- `src/utils/print-template/syntax.ts`
- `src/utils/print-template/renderer.ts`
- `src/utils/clodop.ts`
- `src/utils/print-output-runner.ts`

问题：

- `syntax.ts` 实现了 `{{placeholder}}`、`{{#each}}`、`{{#if}}` 的简易模板语法。
- `clodop.ts` 同时负责加载 C-Lodop、解析 LODOP 调用、过滤脚本、执行脚本。
- `new Function` 仍存在安全和可维护性风险，即使当前有 allowlist 和关键字阻断。
- **当前两套 LODOP 执行路径并存**：`executeLodopCalls`（注释自称 "without eval / new Function"，正则白名单 `SAFE_METHOD`）与 `executeLodopScript`（仍用 `new Function('LODOP', ...)` 闭包受限变量执行）——边界重叠，维护成本与安全审计面同时翻倍。

建议：

- 短期保留自研模板，因为语法小且有测试。
- **禁止继续扩展模板语法**：新增语法前必须评估 Handlebars/Mustache 并出 ADR；在 `syntax.ts` 头部加冻结注释，配合 lint 规则禁止新增 `EACH_BLOCK_RE` / `IF_BLOCK_RE` 类正则
- 将 LODOP 执行拆成 `loader`、`scriptPolicy`、`executor` 三个边界。
- **删除两套执行路径中的一套**：先评估 `executeLodopCalls` 的正则白名单能否完全覆盖 `executeLodopScript` 的 `new Function` 路径，若覆盖则删除 `executeLodopScript`；若不能覆盖，则在 ADR 中明确两条路径各自适用场景并加单测隔离
- 尽量让模板输出结构化打印指令，而不是可执行 JS 字符串。

验收标准：

- 所有允许的 LODOP 方法有白名单测试。
- 阻断 `window`、`document`、`eval`、`Function`、`fetch` 等危险能力。
- 控制流脚本执行路径有明确测试。
- 打印预览、直接打印、PDF 下载三种模式不回归。

### 5.3 列设置同步迁移到 Query/Mutation

当前实现：

- `src/hooks/useColumnSettingsSupport.ts`
- `src/api/user-preferences.ts`

问题：

- hook 内部同时处理本地状态、localStorage、远端加载、远端保存、网络重试、用户提示。
- 重试逻辑手写，后续会和 Query 的 retry/cache 规则重复。

建议：

- 用 `useQuery` 加载远端列设置。
- 用 `useMutation` 保存远端列设置，复用 Query retry。
- 本地存储只作为 optimistic fallback。
- 异常提示保留在 UI hook，数据同步逻辑移到独立 hook 或 service。

验收标准：

- 初次加载优先使用远端配置。
- 远端失败时回退本地配置。
- 保存失败不丢失本地列设置。
- 网络恢复后可重新同步。

## 6. 低优先级或建议保留

| 区域 | 结论 | 原因 |
| --- | --- | --- |
| 表格核心 | 保留 | 已用 AntD Table 和 TanStack Table，自定义高度、虚拟滚动和列适配属于业务 UI 胶水 |
| 拼音搜索 | 保留 | `src/utils/pinyin-search.ts` 基于 `pinyin-pro`，当前封装较薄 |
| 表单体系 | 保留 | 主要使用 AntD Form 和 zod，没有明显自研表单框架 |
| 路由 | 保留并局部整理 | 已用 TanStack Router，集中式路由配置偏重但不是重复造轮子 |
| xlsx 导入导出 | 保留 | 已使用 `xlsx`，自定义部分主要是业务字段映射 |
| dnd 排序 | 保留 | 已使用 `@dnd-kit`，后续只需补齐键盘坐标和可访问名称 |

### 6.1 PR 依赖 DAG

```
第一批 4.1（选项缓存 → TanStack Query）   ← 基座，提供 queryClient 失效约定
   │
   ├── 5.3（列设置 → useQuery/useMutation）  ← 依赖 4.1 的 queryClient 基座
   │
第二批 4.2（非敏感 UI → Zustand persist）  ← 与 4.1 可并行
   │   注意：4.2 与 5.3 都改 useColumnSettingsSupport，需排期错峰合入
   │
   └── 4.3（草稿 → typed repository + IndexedDB）  ← 依赖 4.2 persist 模式落地后再做

第三批 5.1（WorkspaceOverlay → AntD Drawer）   ← 独立 spike 先行，迁移 PR 自身独立
   │
   └── 5.2（LODOP 拆 loader/policy/executor）  ← 与 5.1 互不依赖，可并行

前置：回归绿基线（pnpm test:unit + pnpm test:e2e:mock）
```

依赖推断：

- 4.1 是 queryClient 基座，必须最先做，5.3 直接复用其失效约定
- 4.2 与 4.1 互不依赖可并行，但 4.2 与 5.3 都触及 `useColumnSettingsSupport`，需错峰避免合并冲突
- 4.3 依赖 4.2 的 persist 模式稳定后再引入 IndexedDB 抽象
- 5.1 必须先有独立 spike 文档结论，再决定是否进入正式 PR
- 5.2 与 5.1 互不依赖，可并行

## 7. 建议实施顺序

### 第一批：低风险高收益

1. 将 `createCachedOptions` 迁移到 TanStack Query。
2. 删除模块级选项单例缓存。
3. 补主数据变更后的选项缓存失效测试。

预期收益：

- 删除重复缓存。
- 降低登录态切换和缓存失效风险。
- 统一数据请求状态。

### 第二批：UI 持久化收敛

1. 新增 personal settings store。
2. 迁移主题、布局、字号等非敏感设置到 Zustand persist。
3. 将列设置同步拆成本地 fallback 和远端 Query/Mutation。

预期收益：

- 缩小 `storage.ts` 职责。
- 减少 hook 中的异步副作用。
- 统一 UI 状态持久化方式。

### 第三批：弹层和打印基础设施边界

1. 评估 `WorkspaceOverlay` 是否迁到 AntD Drawer。
2. 拆分 LODOP loader、policy、executor。
3. 冻结自研模板语法扩展，必要时迁移成熟模板库。

预期收益：

- 降低可访问性和嵌套弹层风险。
- 降低打印脚本执行安全风险。
- 明确打印业务和执行基础设施边界。

### 第四批：草稿存储升级

1. 抽出 draft repository。
2. 加入存储容量异常处理。
3. 评估 IndexedDB 存储库。

预期收益：

- 提高大单据草稿可靠性。
- 保留异常自动保存能力。
- 降低 localStorage 配额风险。

## 8. 测试策略

| 迁移项 | 必要测试 |
| --- | --- |
| 选项缓存 | query cache 命中、失效、登录态切换、请求失败 |
| UI persist | 初始读取、写入、坏数据恢复、跨刷新保持 |
| 列设置 | 远端成功、远端失败、本地 fallback、保存重试 |
| WorkspaceOverlay | dialog 语义、焦点进入、焦点循环、Esc、焦点恢复 |
| 打印执行 | 方法白名单、危险脚本阻断、PDF/LODOP 两条输出路径 |
| 草稿 | TTL、版本、用户隔离、模块隔离、异常事件触发保存 |

### 8.1 验收量化阈值

| 迁移项 | 指标 | 阈值 | 采集方式 |
| --- | --- | --- | --- |
| 4.1 选项缓存 | 切账号后旧缓存可见 | 0 起 | 登录态切换 e2e |
| 4.1 选项缓存 | 失效延迟 | ≤ 100ms | mutation 后 invalidate 时序测试 |
| 4.2 UI persist | 刷新前后状态一致 | 100% | 跨刷新单测 |
| 4.2 UI persist | 坏数据恢复 | 降级到默认值，不抛 | 损坏 localStorage 单测 |
| 4.3 草稿 | 大草稿不崩（> 1MB） | 0 次 QuotaExceededError | 压测 |
| 4.3 草稿 | 5MB 压测基线 | 0 异常 | 压测 |
| 5.1 WorkspaceOverlay | focus trap 一致 | 100% | 焦点循环 e2e |
| 5.2 打印执行 | 危险 API 阻断 | window/document/eval/Function/fetch 全阻断 | 白名单单测 |
| 全部迁移 | 单测绿基线 | 不低于迁移前 | `pnpm test:unit` |
| 全部迁移 | e2e 覆盖率 | ≥ 60% 门（既有 `test:e2e:coverage`） | `pnpm test:e2e:coverage` |

## 9. 风险控制

- 每批迁移单独提交，避免基础设施和业务行为混改。
- 优先删除重复代码，不提前抽象未来能力。
- 认证链路只做收敛，不直接替换为新第三方方案。
- 打印链路先补测试和拆边界，再考虑替换模板引擎。
- 所有迁移保持现有用户可见行为不变。

### 9.1 回滚链路

| 迁移项 | 回滚策略 | 灰度方式 |
| --- | --- | --- |
| 4.1 选项缓存 | 保留 `createCachedOptions` 一周，配置开关切回旧实现 | feature flag `leo.options.legacy-cache` |
| 4.2 UI persist | persist 写入与旧 storage 并行一周，异常自动切回 | feature flag，单 store 试点优先 |
| 4.3 草稿 | typed repository 与旧直写并行，后台任务双写校验一致 | 双写 7 天后删旧路径 |
| 5.1 WorkspaceOverlay | 一键切回旧组件（保留 177 行 + 274 行 CSS 一版本） | feature flag，spike 结论后再启用 |
| 5.2 打印执行 | 保留被删执行路径一个 release 周期，ADR 明确删除时点 | 删除前白名单测试全覆盖 |

### 9.2 回归绿基线前置

- 第一批合入前先跑 `pnpm test:unit` 与 `pnpm test:e2e:mock`，确认全绿并记录基线覆盖率
- 后续每批合入后必须对比基线，覆盖率不得下降、关键路径不回退

## 10. 依赖调整计划

| 依赖 | 当前状态 | 计划 |
| --- | --- | --- |
| `@tanstack/react-query` | 已使用，`useMasterOptions` 为范本 | 4.1 扩大使用面 |
| `zustand` `persist` middleware | 仅 1 处使用 | 4.2 推广，setupStore 试点先行 |
| `idb-keyval` | 未引入 | 4.3 引入（推荐，轻量） |
| `localforage` | 未引入 | 4.3 评估但不优先（偏重） |
| Handlebars / Mustache | 未引入 | 5.2 评估模板语法扩展时再决策，不提前引入 |
| `xlsx` | 已使用，业务映射自定义 | 保留 |
| AntD Drawer / Modal | 已使用，5.1 复核 | 5.1 spike 后决定是否替换 WorkspaceOverlay |
| i18n persist | 疑似已用（`src/types/i18n.ts`） | 4.2 先核对现状再决定是否纳入 |


## 11. 当前建议结论

第一批应优先处理 `createCachedOptions`。这是最明确的重复轮子：项目已经引入并广泛使用 TanStack Query，而选项数据仍有一套模块级缓存。迁移范围清晰、收益直接、回归风险可通过测试控制。注意 6 个 `*-options.ts` / `material-categories.ts` / `company-settings.ts` 的单测需同步从 mocked `http` 改写为 mocked `queryClient`。

第二批处理非敏感 UI 持久化。Zustand `persist` 当前几乎零使用，本质是**首次引入 persist 模式**，建议 `setupStore` 单 store 试点先行，验证通过后再推广；auth token 相关存储应暂缓迁移，避免引入安全语义变化。
