---
title: Aries 前端模块解耦计划
date: 2026-07-24
last_reviewed: 2026-07-25
status: proposed
scope: aries 前端（React 19 / TypeScript / TanStack Router / Ant Design 6）
---

# 前端模块解耦计划

## 1. 文档目的

本文定义 Aries 前端下一阶段的架构整改边界、目标结构和实施顺序。

当前采购订单、采购入库、销售订单、销售出库和物流单主流程已经跑通。本轮工作的第一原则是保护这些已验证行为，不重写业务规则，不借架构调整改变字段映射、上级单据导入、状态流转、编辑限制、金额重量计算、仓库推荐、附件或打印行为。

本轮第一优先级是解耦。重点解决编辑会话没有统一所有者、模块定义散落在多套字符串注册表、通用引擎混入模块特例，以及 API、缓存、表单状态边界不清晰的问题。

对账和财务模块当前未投入实际使用。它们不阻塞本轮主架构收敛，但其精确类型化和领域重构延后到实际启用前处理，不在本轮扩大范围。

打印配置继续由人工导入和维护。本轮不增加启动时自动导入、自动同步、内置模板覆盖或前端自动迁移机制。

## 2. 已确认决策

### 2.1 保留现有技术栈

继续使用：

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Zustand
- Ant Design 6 与现有 ProComponents 页面外壳
- Zod 作为 API 边界校验工具

不引入 Umi、微前端、第二套状态管理或第二套路由系统。现有问题来自所有权和边界不清晰，不需要通过更换框架解决。

### 2.2 保留单路由、单编辑器

导航标签栏移除后，系统继续采用单路由、单编辑器工作模式：

- 一个模块页面同一时间只允许存在一个编辑会话。
- 不恢复多任务标签、编辑器任务抽屉或持久化编辑任务列表。
- 模块列表路由是当前页面的唯一导航事实来源。
- 编辑器可以通过该路由的类型化 search 参数表达 `new` 或记录 ID，但不得重新引入并行编辑任务模型。
- 所有关闭、切页、后退和刷新保护统一由 `EditorSessionGuard` 管理。

### 2.3 保护已跑通业务行为

采购、销售、出入库和物流相关行为只允许搬迁和封装，不允许在解耦阶段重新设计。以下行为必须保持：

- 新建、编辑、保存、审核、反审核及状态限制。
- 上级单据候选查询、导入、字段快照和明细转换。
- 单据与明细编号、重量、数量、金额及仓库相关规则。
- 已导入上级单据后的字段和明细可编辑范围。
- 乐观并发冲突后的提示和重新加载。
- 附件、列表筛选、详情、打印和导出入口。
- 现有后端 API 路径、请求字段、响应字段和幂等约定。

架构迁移不得通过“顺便整理”改变领域结果。发现现有行为问题时，应单独记录并在独立变更中处理。

允许为消除浏览器全表扫描、补齐锁定关系查询和服务端领域不变量而增加向后兼容的筛选参数或只读约束端点；已有路径、字段和结果语义不得破坏，旧前端必须在迁移窗口内继续可用。

### 2.4 在线调研依据与本地落地

本节资料于 2026-07-25 通过公开官方文档核对。只采用能直接解决当前所有权和依赖方向问题的原则，不把参考架构整套迁入。

| 来源 | 原始结论 | 本项目落地 |
| --- | --- | --- |
| [TanStack Router Navigation Blocking](https://tanstack.com/router/latest/docs/guide/navigation-blocking) | `useBlocker` 支持解析式自定义确认，`enableBeforeUnload` 处理刷新和关闭标签页 | `EditorSessionGuard` 使用 Router 官方 blocker；SPA 离开显示 Ant Design 确认框，浏览器刷新/关闭接受原生提示 |
| [TanStack Query Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) | Query 默认立即 stale，挂载、聚焦和重连可能重取，失败默认重试 3 次，inactive 数据默认 5 分钟回收 | 每类业务 query 显式声明 `staleTime`、`retry` 和必要的重取策略，不能把默认值当成业务决策 |
| [TanStack Query Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) | key 必须唯一描述数据，queryFn 使用的变量应进入 key | key 包含模块、记录 ID、分页和已提交筛选等全部输入，禁止依赖闭包中的隐藏变量 |
| [Zod Basics](https://zod.dev/basics) | `parse`/`safeParse` 在运行期验证并产生强类型数据，类型可由 schema 推导 | HTTP 原始响应保持 `unknown`，在 API 边界解析后才进入 Query cache 和 feature adapter |
| [Feature-Sliced Design Layers](https://feature-sliced.design/docs/reference/layers) 与 [Public API](https://feature-sliced.design/docs/reference/public-api) | 层级依赖只能向下，slice 通过最小公开 API 交互，不必使用所有层 | 只借用“组合根、单向依赖、最小公开接口”，不做全量 FSD 目录迁移，不使用 wildcard barrel |
| [React: Sharing State Between Components](https://react.dev/learn/sharing-state-between-components) | 协调状态应有唯一所有者，并提升到最近公共父级 | Guard 只拥有会话、dirty 和 submitting；完整 Form 与明细仍归编辑器局部所有 |
| [IETF Idempotency-Key HTTP Header Field 草案](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header) | 同一 key 不得对应不同 payload，可用请求指纹识别误用 | 请求结果不确定的重试复用 key 与原 payload；字段、明细或动作变化必须创建新 key。该资料是 Internet-Draft，不是正式 RFC |

### 2.5 ADR-001：组合根与 feature adapter 渐进收口

状态：`Accepted`。

| 方案 | 收益 | 代价与风险 | 决策 |
| --- | --- | --- | --- |
| 保留多套字符串注册表 | 当前改动最少 | 漏配、优先级和副作用导入继续只能在运行期发现 | 拒绝 |
| 单一 manifest + feature adapter 渐进迁移 | 类型可推导，能按一个模块或一个职责小步收口 | 迁移期需维持旧入口到新定义的单向转接 | 采用 |
| 一次性迁移到完整 FSD | 目录形式统一 | 大量搬迁不产生业务价值，五条已跑通流程同时受影响 | 拒绝 |
| 把完整表单和明细放入全局 store | 路由外也能读取草稿 | 双状态源、序列化和失效语义显著复杂 | 拒绝 |
| 恢复导航标签或多任务编辑器 | 可并行打开多个单据 | 重新引入任务生命周期、过期数据和脏表单恢复问题 | 拒绝 |

接受的权衡：迁移期间允许旧文件继续存在，但每个模块只能有一条实际执行路径；先保护编辑会话和服务端约束，再整理目录和类型，不以文件数量衡量完成度。

## 3. 现状证据

### 3.1 编辑会话只存在于局部组件

- `src/views/modules/components/ModuleEditorWorkspace.tsx:73` 使用局部 `ref` 保存 dirty 状态。
- 同文件 `:177` 的关闭保护只覆盖编辑器遮罩、关闭按钮和页内取消操作。
- `src/layouts/AppLayout.tsx:240` 的菜单导航直接调用 `navigate`。
- `src/layouts/AppLayout.tsx:93` 使用带 `key` 的 `Outlet`，切换模块时会卸载当前页面。
- 当前没有统一覆盖 SPA 导航、浏览器后退和刷新的编辑会话守卫。

结果是标签栏移除后，编辑器模型已经变简单，但未保存状态保护仍停留在局部组件层，路由无法知道当前页面是否可以离开。

### 3.2 保存互斥建立过晚

- `src/views/modules/use-module-editor-workspace.ts:552` 开始保存流程。
- 表单验证、父单据唯一性查询和业务确认均发生在 `setSaving(true)` 之前。
- `setSaving(true)` 到 `:670` 才执行。
- `src/api/idempotency.ts:9` 每次调用都会生成新的幂等键。

在验证或确认期间，用户仍可再次提交或关闭页面。重复提交会生成不同幂等键，因此后端无法把两次点击识别为同一个用户意图。

### 3.3 模块定义分散在多套注册表

同一个模块至少需要同时出现在以下位置：

- 页面和菜单：`src/config/page-registry-*.ts`
- 页面配置懒加载：`src/config/business-page-loader.ts`
- API 端点：`src/api/module-contracts-*.ts`
- 保存字段和过滤字段：`src/config/module-page-schema.ts`
- 行为注册：`src/module-system/module-behavior-*.ts`

这些映射都以 `string` 为 key，没有统一的 `ModuleKey` 闭集。模块漏配或拼写不一致时，部分路径会运行时抛错，部分行为会静默回退为 `undefined`。

行为注册还依赖 `src/module-system/module-behavior-registry.ts` 的副作用导入，以及 `module-behavior-registry-core.ts` 中对全局 `Map` 的多次浅合并。结果依赖导入顺序，模块所有行为也无法在一个位置完整查看。

### 3.4 Zod 尚未覆盖业务记录字段

- `src/shared/schemas/api.ts:29` 将通用业务记录定义为 `z.record(z.string(), z.unknown())`。
- `src/types/module-page.ts:52` 的记录和明细使用 `[key: string]: unknown`。
- `src/shared/schemas/module-record.ts` 已存在部分采购、销售精确接口，但尚未进入通用列表、详情、编辑和保存链路。

当前 Zod 能校验响应信封和部分 ID，却不能发现单据字段拼写错误、金额类型变化、状态值漂移或明细结构不一致。TypeScript 严格模式因此没有覆盖最关键的业务数据边界。

### 3.5 通用引擎承担过多职责

当前主要集中点包括：

- `src/views/modules/use-module-editor-workspace.ts`：表单初始化、默认值、编号、父单据导入、校验、确认、保存、冲突处理和缓存刷新。
- `src/views/modules/use-business-grid-page.ts`：列表、选择、编辑器、详情、批量操作、状态操作、打印和对账入口编排。
- `src/module-system/module-behavior-editor.ts`：多个领域模块的默认值、快照、只读字段和同步规则。
- `src/api/module-save-payload.ts`：通用序列化与模块特例并存。

通用层已经需要识别采购、销售、物流和财务模块名称。继续增加条件分支会让任一模块变更都可能影响全部模块。

### 3.6 API、查询缓存和配置缓存边界不清晰

- `src/api/project-options.ts` 直接读取全局 `QueryClient`，API 层同时承担了缓存选择器职责。
- 静态页面配置同时经过 ES 模块缓存、`business-page-loader.ts` 的手写缓存、React Query 和路由 loader 回灌。
- 列表分页与已提交筛选仍由组件本地状态保存，路由 search 只处理少量外部跳转参数。

这些实现目前可以工作，但增加了隐式依赖，并使返回页面、刷新页面和模块复用时的状态来源难以判断。

### 3.7 浏览器全表扫描与领域约束越界

- `src/config/module-page-schema.ts:14` 把销售订单、销售出库的 `productKeyword` 定义为明细客户端筛选，但 `src/api/module-contracts-operations.ts:45` 的后端契约没有该参数。
- `src/api/business-listing.ts:27` 遇到非原生筛选会拉取多页后在浏览器过滤；`src/api/business-listing-constants.ts:1` 把客户端筛选限制为每页 200 条、最多 10 页，即 2000 行。
- `src/hooks/useInfiniteBusinessItems.ts:44` 把非零响应视为错误并丢弃记录，达到上限后页面不是显示完整结果，而是显示空结果或错误。
- `src/views/modules/use-business-grid-editor.ts:37` 为判断销售订单明细是否被销售出库锁定，会调用 `listAllBusinessModuleRows`；对应 `salesOrderNo` 不是销售出库端点的原生筛选键，打开编辑器可能拉取全部销售出库。
- `src/views/modules/use-module-editor-workspace.ts:581` 保存前拉取当前模块全部记录建立父单唯一关系，查询失败后直接跳过前端检查。

这些逻辑把数据规模、锁定关系和唯一关系责任放到了浏览器。数据超过 2000 行会产生截断或空结果，打开单据和保存的请求量随总数据量增长；更重要的是，网络失败可能绕过前端唯一性提示。前端检查只能改善交互，最终领域不变量必须由后端事务强制执行。

### 3.8 全局样式所有权过宽

`src/styles/layout-shell.css` 已超过 2000 行，并直接覆盖多处 Ant Design 内部 DOM 类；`.module-table-shell` 同时出现在 `layout-shell.css` 和 `module-table.css`。这不是本轮主流程阻断项，但会放大 Ant Design 升级和局部页面调整的影响范围。

样式收敛列为 P3：按 shell、table、filter、editor 的组件所有权拆分；优先使用 `ConfigProvider` token、组件 token 和公开 semantic classNames。不要借此重写 Tailwind、切换 CSS-in-JS 或恢复移动端样式分支。

## 4. 目标架构

### 4.1 目标目录

目标结构按“应用外壳、模块内核、领域适配器、基础设施”划分：

```text
src/
  app/
    router/
    providers/
    composition/
      module-manifest.ts
    editor-session/
      EditorSessionGuard.tsx
      editor-session-types.ts
      useEditorSession.ts

  module-kernel/
    contracts/
      module-definition.ts
      module-record-map.ts
    grid/
      BusinessGridPage.tsx
      useBusinessGrid.ts
    editor/
      ModuleEditor.tsx
      useEditorForm.ts
      useEditorSubmit.ts
      useParentImport.ts

  features/
    purchase-order/
      module-definition.ts
      schemas.ts
      editor-adapter.ts
      parent-import-adapter.ts
    purchase-inbound/
      module-definition.ts
      schemas.ts
      editor-adapter.ts
    sales-order/
      module-definition.ts
      schemas.ts
      editor-adapter.ts
    sales-outbound/
      module-definition.ts
      schemas.ts
      editor-adapter.ts
    freight-bill/
      module-definition.ts
      schemas.ts
      editor-adapter.ts

  api/
    client/
    modules/

  queries/
    module-query-options.ts
    master-option-query-options.ts
```

目录迁移必须渐进完成。目标不是一次性移动全部文件，而是建立清晰的依赖方向：

```text
app composition -> module-kernel
app composition -> feature definitions
feature definitions / adapters -> module-kernel contracts

queries -> api
feature adapters -> queries / pure domain helpers
api -X-> queries / stores / views / module UI
module-kernel -X-> concrete feature names
```

`module-manifest.ts` 是应用组合根，不属于通用内核。它可以装配具体 feature；`module-kernel` 只能声明通用契约，不能反向导入 manifest 或任何具体模块。对账和财务继续指向现有配置和加载入口，不为未使用模块新建 `legacy-finance` 抽象层。

### 4.2 单一 ModuleKey manifest

在应用组合根建立唯一模块清单：

```ts
export const moduleManifest = {
  'purchase-order': () => import('@/features/purchase-order/module-definition'),
  'purchase-inbound': () =>
    import('@/features/purchase-inbound/module-definition'),
  'sales-order': () => import('@/features/sales-order/module-definition'),
  'sales-outbound': () => import('@/features/sales-outbound/module-definition'),
  'freight-bill': () => import('@/features/freight-bill/module-definition'),
  // 其余模块按当前范围登记
} as const

export type ModuleKey = keyof typeof moduleManifest
```

要求：

- 路由、菜单和组合层映射统一使用由 manifest 推导的 `ModuleKey`。
- feature 定义使用自己的字面量 key 并满足通用 `ModuleDefinition<K>` 契约，不反向导入应用组合根。
- `module-kernel` 使用泛型 key，不导入具体 `ModuleKey`，避免形成 `kernel -> app -> feature` 的依赖环。
- 需要独立映射时，必须使用 `satisfies Record<ModuleKey, ...>` 或明确的可选子集类型。
- 清单只负责模块身份和懒加载，不承载全部业务配置，避免形成新的巨型文件。
- 模块定义由各 feature 自己导出，包含页面元数据、端点、Zod schema 和 adapter。
- 移除依赖副作用导入的可变行为注册表。
- 模块漏配必须在类型检查或应用启动时明确失败，不能静默回退。

### 4.3 通用引擎与 feature adapter 边界

通用引擎只负责稳定机制：

- 列表查询、分页、选择和统一加载状态。
- 通用表单渲染和明细表格交互。
- 编辑会话生命周期。
- 提交编排、错误展示和冲突展示。
- 查询缓存失效的统一入口。
- 通用附件、详情、打印入口编排。

feature adapter 负责模块特有策略：

- 默认草稿和默认明细。
- 字段、明细列和状态可编辑性。
- 字段变化后的快照和派生值。
- 上级单据候选、校验、映射和明细转换。
- 模块特有校验和确认文案。
- 保存前规范化与精确请求 schema。
- 状态能力、锁定规则和下游约束的前端展示。

通用引擎不得新增 `moduleKey === 'purchase-order'` 一类分支。发现新特例时，优先扩展小而明确的 adapter 接口；只有至少两个模块共享稳定机制时才进入通用层。

adapter 也不得成为新的胖接口。建议按职责拆为：

```ts
interface EditorDraftAdapter {}
interface ParentImportAdapter {}
interface EditorValidationAdapter {}
interface SavePayloadAdapter {}
interface RecordCapabilityAdapter {}
```

模块只实现自己需要的端口，通用引擎为可选端口提供无行为默认值。

### 4.4 EditorSessionGuard

`EditorSessionGuard` 放在认证布局或模块路由共同父级，成为编辑会话状态的唯一所有者。建议状态机：

```text
closed (session = null)
  -> opening
  -> clean
  -> dirty
  -> submitting

submitting -> clean / closed       (成功)
submitting -> conflict             (并发冲突)
submitting -> dirty                (确定失败或取消)
```

会话最小数据：

```ts
type EditorSession =
  | null
  | {
      moduleKey: ModuleKey
      mode: 'create' | 'edit'
      recordId?: string
      status: 'opening' | 'clean' | 'dirty' | 'submitting' | 'conflict'
    }
```

守卫必须统一处理：

- 编辑器遮罩、关闭按钮和取消按钮。
- 菜单、顶部导航和全局搜索跳转。
- TanStack Router 导航与浏览器后退。
- 浏览器刷新、关闭标签页和外部地址跳转。
- 登录失效等强制导航；此类导航先停止新写入，再按安全策略退出。

实现必须基于 TanStack Router 官方 `useBlocker`：

- 使用 `withResolver: true` 获得 `proceed`/`reset`，由统一 Ant Design Modal 处理 SPA 导航确认；
- 仅在会话为 dirty、submitting 或 conflict 且目标确实离开当前编辑器时阻断，避免同页无关 search 更新反复弹窗；
- 使用 `enableBeforeUnload` 覆盖刷新、关闭标签页和外部地址，接受浏览器原生提示；该提示文本不能由应用自定义；
- 不 patch `history.pushState`，不在菜单、全局搜索和每个按钮重复实现另一套 guard；
- 强制退出登录等安全导航采用显式策略，不能通过临时清空 dirty 静默绕过。

dirty 状态只表示业务输入已变化，不能从保存结果或错误文案反推。表单值、明细行、父单据导入和程序性业务修改都必须通过同一个 `markDirty` 入口。

不在全局 store 中保存完整表单和明细。表单数据仍由编辑器局部持有，Guard 只持有会话身份和离开页面所需的最小状态。

### 4.5 保存同步抢锁与幂等键

保存入口必须先同步抢锁，再执行任何异步步骤：

```ts
if (submissionRef.current?.inFlight) return

const submission = submissionRef.current ?? {
  key: crypto.randomUUID(),
  audit,
  inFlight: false,
}
submission.inFlight = true
submissionRef.current = submission
setSessionStatus('submitting')

try {
  // 表单校验、业务校验、确认和请求都属于同一次提交意图
  await submitWithIdempotencyKey(submission.key)
  submissionRef.current = null
} finally {
  if (submissionRef.current) submissionRef.current.inFlight = false
}
```

示例只表达锁和提交意图的生命周期，实际实现还必须区分“请求前失败”和“请求结果不确定”。校验失败或用户在发请求前取消时可以清除意图；超时、断网等无法确认后端是否已提交的错误必须保留原 payload 与幂等键，供显式重试。用户修改表单、明细或提交动作后必须使旧意图失效，再创建新的幂等键，禁止同一键对应不同 payload。

要求：

- 抢锁发生在 `handleSave` 的第一条有效路径，不依赖异步 React state 生效。
- 校验、远程检查、确认弹窗和写请求共享同一提交上下文。
- 同一次用户提交、请求结果不确定后的显式重试或网络层安全重放使用同一个幂等键和同一 payload。
- 用户取消确认后释放锁，不发送写请求。
- `submitting` 期间禁止关闭编辑器和启动第二次提交。
- 组件卸载或路由强制退出后，不再向已卸载组件提交状态更新。
- 保存成功后先更新会话状态和缓存，再允许关闭或进入下一模块。
- 并发冲突继续保留现有提示和重新加载行为，不改写后端乐观锁语义。

### 4.6 主流程 Zod 类型化

先类型化实际使用且已经跑通的主流程：

1. 采购订单。
2. 采购入库。
3. 销售订单。
4. 销售出库。
5. 物流单。

每个主流程至少定义：

- 列表记录 schema。
- 详情记录 schema。
- 新建和编辑请求 schema。
- 明细行 schema。
- 上级单据候选和导入快照 schema。
- 状态和关键枚举 schema。

类型必须由 Zod schema 推导：

```ts
export const purchaseOrderSchema = z.object({
  // 精确字段
})

export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>
```

通用引擎通过映射获得模块类型：

```ts
interface ModuleRecordMap {
  'purchase-order': PurchaseOrder
  'purchase-inbound': PurchaseInbound
  'sales-order': SalesOrder
  'sales-outbound': SalesOutbound
  'freight-bill': FreightBill
}
```

原始 `Record<string, unknown>` 只允许存在于 HTTP 响应进入解析器之前。解析成功后不得继续把主流程记录降级为通用 unknown 索引对象。

对账、收款、付款等未使用模块暂时保留现有配置与通用记录结构，并在 manifest 中标记为待启用模块。本轮不为其新建 adapter 或迁移目录；这也不成为主流程继续使用 unknown 的理由。

### 4.7 API、Query 与表单状态边界

状态所有权统一如下：

| 状态 | 所有者 | 约束 |
| --- | --- | --- |
| API 请求与响应解析 | `api/` | 纯 fetch/parse，不读取 QueryClient 或 UI store |
| 服务端缓存 | `queries/` / TanStack Query | 统一 query key、预取、失效和选择器 |
| 已提交筛选与分页 | TanStack Router search | 可刷新、可后退、可分享 |
| 输入中的筛选草稿 | 页面局部状态或 Form | 点击查询前不写入 URL |
| 编辑表单与明细 | 编辑器局部状态 | 不写入全局 store |
| 编辑会话身份与 dirty/submitting | `EditorSessionGuard` | 只保存离开保护所需最小状态 |
| 认证和个人 UI 设置 | Zustand | 继续保持现状 |

静态模块配置只保留一个加载来源。动态 import 本身已有模块缓存，不再同时维护手写缓存、React Query 配置缓存和 loader 回灌。

业务 query 必须由统一的 query options factory 生成，并满足：

1. query key 顶层为数组，包含 `moduleKey`、记录 ID、页码、页大小、排序和全部已提交筛选；queryFn 使用的每个变量都必须进入 key；
2. 列表、详情、候选项和约束查询分别显式定义 `staleTime`、`retry`、`refetchOnWindowFocus`，禁止隐式继承 TanStack Query 的默认重试 3 次；
3. GET 查询只对明确的瞬时网络错误做有界重试，业务 4xx 和 Zod 契约错误不重试；写 mutation 不自动重试；
4. API 层只返回 Zod 已解析的数据，不导入 QueryClient、Zustand、React Hook 或 view；缓存选择、预取和失效归 `queries/`；
5. ESLint 继续扩展现有 `@typescript-eslint/no-restricted-imports` 规则，阻止 `api -> query/view/store`、`module-kernel -> feature/app` 和 feature 绕过公开入口的反向依赖；不为此新增另一套架构 lint 依赖；
6. 静态 feature 定义依赖 ESM `import()` 缓存，不放入 TanStack Query。

### 4.8 服务端查询与领域约束边界

主流程不得再依赖浏览器全量扫描来完成分页筛选或决定记录能否修改。目标调用关系：

```text
已提交筛选 ──> 服务端分页查询 ──> Zod parse ──> Query cache ──> 页面

打开/保存编辑器 ──> 专用 constraints / exists 查询 ──> 前端提示
保存命令 ─────────> 后端事务内领域校验 ─────────────> 最终准入
```

要求：

1. 为 `productKeyword` 等真实筛选补充服务端分页能力，查询总数、分页和过滤必须基于同一条件；
2. 销售订单下游锁定、父单唯一关系等使用小型 `exists`、`constraints` 或 `candidates` 端点，不下载目标模块全部记录；
3. 约束响应返回稳定布尔值、原因码和必要展示信息，不暴露后端实体或 Repository 投影；
4. 前端远程检查失败时不得伪装成“约束通过”；可以阻止提交并提示重试，但最终仍由后端事务校验；
5. 后端必须在同一事务和现有锁顺序下强制唯一性、来源额度、状态及下游引用规则，前端结果不作为可信授权或并发依据；
6. 新端点和筛选参数保持向后兼容，先部署后端，再切换前端，稳定后删除客户端全扫 fallback；
7. 只迁移五个已使用主流程，不为未启用的对账和财务提前建设通用约束平台。

## 5. 分阶段任务

### 阶段 0：冻结行为基线

目标：在移动代码前，明确必须保护的现有行为。

- 记录五个主流程的模块入口、端点、状态、上级导入、保存字段和明细转换。
- 建立人工桌面回归清单，覆盖新建、编辑、保存、审核、导入上级、冲突、附件和打印入口。
- 记录现有 API 请求和响应样例，用于编写 Zod schema，不修改后端契约。
- 标记通用引擎中的具体模块分支及其当前行为归属。
- 对账和财务只登记现状，不展开领域分析。

交付物：行为清单、模块依赖清单、主流程 API 契约清单。

### 阶段 1：建立编辑会话安全边界

目标：在标签栏移除后补齐单编辑器生命周期，不触碰业务规则。

- 新增 `EditorSessionGuard` 和最小会话状态机。
- 接管遮罩关闭、菜单跳转、全局搜索、后退和刷新保护。
- 用类型化 route search 表达单一编辑目标。
- 在保存入口增加同步提交锁。
- 让一次用户提交全程复用同一幂等键。
- 保留现有成功、错误、警告和并发冲突结果页。

阶段内不得恢复编辑任务 store 或多标签模型。

### 阶段 2：收回服务端查询与领域约束边界

目标：消除五个已使用主流程的浏览器全表扫描，但不改变现有业务结果。

- 为 `productKeyword` 等已经暴露在 UI 的筛选补充服务端原生分页参数，并让前后端契约显式记录支持范围。
- 用专用的下游锁定、父单唯一和来源候选查询替换 `listAllBusinessModuleRows`；每次查询只返回当前操作所需的最小数据。
- 将前端父单唯一性和锁定检查降级为交互提示；后端在同一事务内保留或补齐最终唯一性、状态、来源额度和下游引用校验。
- 为查询失败、超时和约束冲突定义可区分提示，禁止静默跳过检查或把截断结果当完整结果。
- 完成一个主流程后立即删除对应客户端全扫 fallback，不保留长期双路径。
- 不为对账、财务或全局搜索提前建设通用规则引擎。

建议顺序：销售订单商品筛选和下游锁定 -> 销售出库商品筛选 -> 父单唯一关系 -> 其余主流程的同类全扫。

### 阶段 3：建立 ModuleKey 与单一 manifest

目标：让模块身份和配置完整性受 TypeScript 约束。

- 从现有模块集合生成 `ModuleKey`。
- 建立单一懒加载 manifest。
- 让页面、端点、schema 和 adapter 映射使用 `ModuleKey`。
- 为缺失模块定义提供启动时明确错误。
- 删除可变 `Map` 和 side-effect 行为注册。
- 保持路由路径、菜单顺序和模块标题不变。

该阶段只改变模块装配方式，不修改 adapter 内部规则。

### 阶段 4：划分通用引擎与 feature adapter

目标：从巨型 Hook 中拆出明确用例，并把模块特例归还给对应 feature。

- 从编辑器拆出 `useEditorForm`、`useEditorSubmit` 和 `useParentImport`。
- 从列表页拆出列表查询、选择、记录操作和 overlay 编排。
- 将采购、销售、出入库和物流的条件分支逐个搬入 feature adapter。
- 保留原函数实现和执行顺序，优先“移动后调用”，不重写算法。
- 为 adapter 定义小接口，拒绝包含全部行为的单一胖接口。
- 清理已经无调用方的转发文件和旧注册入口。

每次只迁移一个模块或一个职责，禁止五个主流程同时大改。

### 阶段 5：主流程 Zod 类型化

目标：让五个已使用主流程从 API 到编辑器保持精确类型。

- 按模块定义列表、详情、保存和上级候选 schema。
- 由 schema 推导 TypeScript 类型。
- 让 query、adapter、表单和保存 payload 使用模块泛型。
- 删除主流程中的 `unknown` 索引访问和无验证类型断言。
- 保留 ID 字符串化、日期、金额和重量的现有序列化结果。
- 对契约不一致明确失败并记录上下文，不静默丢字段。

建议顺序：采购订单 -> 采购入库 -> 销售订单 -> 销售出库 -> 物流单。

### 阶段 6：收敛查询与路由状态

目标：消除隐式缓存依赖，并让无标签导航仍能恢复工作上下文。

- 将 QueryClient 读取从 `api/` 移到 query selector 或 feature adapter。
- 静态页面配置收敛为单一加载来源。
- 为模块路由定义类型化 `validateSearch`。
- 将已提交筛选和分页写入 URL。
- 保留筛选输入草稿、选中行和编辑表单为局部状态。
- 统一模块保存后的精确缓存失效关系，避免全局清空。

### 阶段 7：未使用模块启用前整改

该阶段不在本轮执行，只定义准入条件。

对账和财务模块投入使用前必须：

- 完成真实业务流程确认。
- 明确对账、收付款、核销和状态不变量。
- 建立精确 Zod schema 和领域类型。
- 从现有配置和通用记录边界迁入独立 feature adapter。
- 完成与采购、销售、物流主流程的依赖方向审查。
- 执行独立的业务验收和上线评估。

不得仅为了“统一目录”提前重写尚未使用的对账和财务逻辑。

## 6. 验收标准

### 6.1 全阶段质量门禁

每个阶段必须通过：

```bash
pnpm typecheck
pnpm lint
antd lint ./src --format json
pnpm build
```

遵守仓库测试文件政策，不在活动源码目录新增或恢复测试文件。无法由静态检查覆盖的业务行为必须执行人工桌面回归，并记录残余风险。

### 6.2 编辑会话验收

- clean 编辑器可以直接关闭或切换模块。
- dirty 编辑器通过关闭按钮、遮罩、菜单、全局搜索、后退和刷新离开时均出现一致确认。
- 取消离开后，表单和明细保持不变。
- `submitting` 期间无法关闭、切页或重复提交。
- 双击保存只产生一个业务请求和一个幂等键。
- 用户取消业务确认后不发送写请求，并恢复可编辑状态。
- 保存成功、失败和并发冲突的现有反馈保持不变。
- 刷新或直接打开带 edit search 的地址时，只恢复一个编辑器。
- SPA 导航只注册一处 TanStack Router blocker；刷新和关闭标签页使用浏览器原生 before-unload 提示。

### 6.3 模块装配验收

- 每个 `ModuleKey` 都有且只有一个模块定义入口。
- 删除或拼错任一必需模块定义时，类型检查或启动检查明确失败。
- 通用引擎中不再出现五个主流程的字符串条件分支。
- 不再通过副作用 import 修改全局行为注册表。
- 路由、菜单标题、页面标题和 API 路径与迁移前一致。

### 6.4 查询与领域边界验收

- 五个主流程的已提交筛选均由服务端在分页前执行，前端不再为筛选下载多页完整数据。
- 销售订单锁定、父单唯一关系和来源候选不再通过 `listAllBusinessModuleRows` 判断。
- 数据超过 2000 行时不会因客户端截断显示空结果或不完整总数。
- 前端约束查询失败时失败闭合，后端仍在事务内执行最终领域校验。
- 新增参数和端点保持向后兼容，旧前端在后端先行发布期间仍能运行。
- 每个 query key 包含 queryFn 使用的全部变量，业务 query 显式定义 stale 和 retry 策略。

### 6.5 主流程业务验收

对采购订单、采购入库、销售订单、销售出库和物流单逐一验证：

- 列表加载、默认筛选、分页、详情和返回列表。
- 新建、编辑、保存、审核及允许的反向状态操作。
- 上级单据候选、导入、重复导入限制和字段自动带入。
- 明细新增或只读范围、数量、重量、金额和仓库行为。
- 已锁定、已删除和并发修改记录的现有处理结果。
- 附件、打印和导出入口仍可用。
- 请求路径、payload 字段和值的格式与迁移前一致。

验收关注行为等价，不以文件数量或代码行数减少代替业务验证。

### 6.6 类型边界验收

- 五个主流程的 API 响应在进入 query cache 前完成 Zod 解析。
- 五个主流程的编辑和保存链路不再使用通用 `ModuleRecord` unknown 索引。
- 列表、详情、保存和上级候选 schema 均能独立定位错误字段。
- API 层不导入 QueryClient、Zustand store、views 或 React Hook。
- ESLint 阻止 feature、module-kernel、api 和 query 层的反向依赖，已登记例外数量不增长。
- 对账和财务的存量 unknown 类型仅存在于明确命名的 legacy 边界。

## 7. 回滚原则

- 每个阶段独立实施和验证，不把架构迁移与业务功能修改混入同一变更。
- 每次只迁移一个职责或一个主流程，确保可以通过普通 Git revert 回退。
- 服务端查询整改只增加向后兼容的参数或端点；后端先部署并在迁移窗口保留旧契约，因此旧前端可以直接回滚运行。
- 不在本计划中执行破坏性后端 API 删除或数据库结构变更；确需结构变更时转入后端独立 Flyway 计划，不能混入前端解耦批次。
- adapter 迁移期间保持单一执行路径，不用运行时功能开关维持两套业务实现。
- 新路径未完成验收前，不删除旧调用入口；切换完成后立即删除失效旧路径，避免长期双轨。
- 发现业务结果变化时立即停止当前阶段，先恢复原行为，再判断是迁移错误还是独立业务缺陷。
- 已跑通主流程的行为基线优先于目录目标和抽象完整度。
- 打印配置不参与代码回滚。人工导入的数据继续由现有后端和运维流程管理。

## 8. 非目标

本轮明确不做：

- 不重写采购、销售、出入库和物流业务规则。
- 不做破坏性后端 API 变更，不调整编号策略或状态机语义；允许增加向后兼容的筛选和只读约束端点。
- 不恢复导航标签栏、多任务编辑器或编辑任务持久化。
- 不引入 RBAC、权限框架或新的认证逻辑。
- 不迁移到 Umi、ProLayout、Redux、微前端或服务端渲染。
- 不重新实现 Ant Design 已提供的基础组件。
- 不恢复移动端兼容。
- 不提前重构尚未使用的对账和财务领域。
- 不自动导入、自动同步或自动覆盖打印配置。
- 不新增启动时打印模板导入任务。
- 不在活动源码目录新增测试文件。
- 不以追求零条件分支为由抽象单模块、一次性的业务规则。

## 9. 执行优先级

按风险和收益排序：

1. `EditorSessionGuard`、同步保存锁和幂等键复用。
2. 服务端分页筛选、专用约束查询和后端事务最终校验。
3. 单一 `ModuleKey` manifest 和编译期完整性约束。
4. 通用引擎与 feature adapter 边界。
5. 五个已使用主流程的 Zod 类型化。
6. API、Query、静态配置缓存和路由状态收敛。
7. P3 样式所有权收敛，不阻塞核心解耦验收。
8. 对账和财务启用前的独立领域整改。

前六项完成前，原则上不再向通用模块引擎增加新的模块特例。确有生产阻断问题时，只做最小修复，并登记到对应 feature 的后续迁移清单。
