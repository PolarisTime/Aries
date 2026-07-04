# 前端手搓轮子扫描与迁移计划（技术扩写版）

> 当前状态（2026-07-04）：第一阶段选项缓存迁移和第二阶段 UI persist 试点已完成并复验通过；Vitest 全量覆盖率 Statements / Branches / Functions / Lines 均为 100%。

## 1. 背景

本计划基于 `aries` 前端代码只读扫描结果编写，目标是识别可以由现有依赖或成熟开源方案承接的自研基础设施，降低维护成本和回归风险。

**项目基线**（截至 2026-07-04）：

| 维度 | 当前值 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite |
| UI 库 | Ant Design 6 (`antd`) |
| 数据请求 | TanStack Query 5 (`@tanstack/react-query`) |
| 路由 | TanStack Router 1 |
| 表格 | TanStack Table 8 |
| 状态管理 | Zustand 5（5 个 store，但无 persist 使用） |
| 校验 | Zod 4 |
| 工具库 | `es-toolkit` 1.47 |
| 国际化 | i18next + react-i18next |
| 测试 | Vitest + Playwright |
| Lint | Biome 2 + ESLint 10 |
| 包管理 | pnpm 10 |

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
- **回归绿基线前置**：第一批合入前先跑 `pnpm test:unit` + `pnpm test:e2e:mock`，记录基线覆盖率。

## 3. 非目标

- 不重写业务模块系统。
- 不替换 Ant Design、TanStack、Zustand 这类现有核心依赖。
- 不在本计划内调整后端接口。
- 不迁移安全敏感认证逻辑到未经评估的第三方服务。

## 4. 高优先级迁移项

### 4.1 选项缓存迁移到 TanStack Query

#### 4.1.1 当前实现

**两套缓存并存冲突**：

**套件 A：`createCachedOptions`**（`src/lib/create-cached-options.ts`）——基于闭包的单例缓存：

```typescript
export function createCachedOptions<T, TRaw = T>(
  config: CachedOptionsConfig<T, TRaw>,
): CachedOptionsReturn<T> {
  const { endpoint, normalizer } = config

  let cached: T[] | null = null       // ← 闭包变量，无用户隔离
  let fetchFailed = false
  let loading: Promise<T[]> | null = null

  const fetchOptions = async (): Promise<T[]> => {
    if (cached !== null) return cached  // ← 命中即返回，无 stale-while-revalidate
    if (loading) return loading         // ← 并发 miss 去重（但仅防 promise 级）

    loading = (async () => {
      const response = await http.get<ApiResponse<TRaw[]>>(endpoint)
      const data = response.data || []
      cached = normalizer ? normalizer(data) : (data as unknown as T[])
      return cached
    })()
    try { return await loading }
    catch { fetchFailed = true; return [] }
    finally { loading = null }
  }

  const getOptions = (): T[] => {
    if (cached === null && !loading && !fetchFailed) {
      void fetchOptions()  // ← 同步 get() 触发异步 fetch，调用方拿到的是空数组
    }
    return cached || []
  }
}
```

被以下 **6 个 api 文件**引用：

| api 文件 | 用途 |
|---|---|
| `src/api/customer-options.ts` | 客户下拉选项 |
| `src/api/supplier-options.ts` | 供应商下拉选项 |
| `src/api/carrier-options.ts` | 物流公司下拉选项 |
| `src/api/warehouse-options.ts` | 仓库下拉选项 |
| `src/api/material-categories.ts` | 物料分类下拉选项 |
| `src/api/company-settings.ts` | 结算公司下拉选项 |

**套件 B：`useMasterOptions`**（`src/hooks/useMasterOptions.ts`）——使用 TanStack Query 的范本：

```typescript
export function useMasterOptions(requirements: MasterOptionRequirements = {}, enabled = true) {
  const token = useAuthStore((s) => s.token)
  const queryEnabled = enabled && !!token

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.supplier,  // ['master-options', 'supplier']
    queryFn: fetchSupplierOptions,
    enabled: queryEnabled && normalizedRequirements.suppliers,
    staleTime: 300_000,  // ← 5 分钟 stale，与 createCachedOptions 的"永久缓存"行为不同，但更合理
  })
  // ... 共 7 个 useQuery（supplier / customer / carrier / settlementCompany /
  //     warehouse / materialCategories / materials），模式一致
}
```

**queryClient 全局配置**（`src/lib/query-client.ts`）：

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,         // 1 分钟全局 stale
      gcTime: 10 * 60_000,       // 10 分钟缓存保留
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: { retry: 0 },
  },
})
```

**queryKey 命名约定**：`src/constants/query-keys.ts` 集中管理，`masterOptions.*` 下 7 个 sub-key。

#### 4.1.2 现存问题

| 问题 | 详情 |
|---|---|
| **双重缓存来源** | 同一数据可能同时被 `createCachedOptions` 的闭包缓存和 TanStack Query 的 `queryClient` 缓存命中，失效行为不一致 |
| **无用户隔离** | `createCachedOptions` 的 `cached` 是模块级闭包，切账号不清空 → 用户 A 看到用户 B 的选项数据 |
| **无 stale-while-revalidate** | 缓存命中后永不主动刷新，数据可能在后台过期 |
| **同步 get 触发异步 fetch** | `getOptions()` 同步返回空数组，触发 `fetchOptions()` 但不等待，调用方首次渲染拿到空数组 |
| **无错误重试策略** | `fetchFailed` 设为 `true` 后需要显式 `reload()` 才能恢复，不会自动重试 |
| **并发 miss 竞态** | `if (loading) return loading` 仅防 promise 级重复，不防 `fetchFailed=true` 后多个 `reload()` 并发 |

#### 4.1.3 目标方案

**将 6 个 api 文件的选项缓存全部迁到 TanStack Query**，以 `useMasterOptions` 为范本：

```typescript
// 迁移前（customer-options.ts）
import { createCachedOptions } from '@/lib/create-cached-options'
export const customerOptions = createCachedOptions<CustomerOption>({ endpoint: '/api/customers/options' })

// 组件中使用：
const options = customerOptions.get()  // ← 同步取，可能为空

// 迁移后（customer-options.ts）
export function fetchCustomerOptions(): Promise<CustomerOption[]> { /* 原 createCachedOptions 中的 fetch 逻辑 */ }

// 组件中使用：
const { data: options = [] } = useQuery({
  queryKey: QUERY_KEYS.masterOptions.customer,
  queryFn: fetchCustomerOptions,
  staleTime: 300_000,
})
```

**关键 API 映射**：

| 旧 API | 新 API |
|---|---|
| `createCachedOptions({...}).get()` | `useQuery({ queryKey, queryFn, staleTime }).data` |
| `createCachedOptions({...}).fetch()` | `queryClient.ensureQueryData({ queryKey, queryFn })` |
| `createCachedOptions({...}).reload()` | `queryClient.invalidateQueries({ queryKey })` |
| 页面预取 | `queryClient.prefetchQuery({ queryKey, queryFn })` |
| 主数据变更后失效 | `queryClient.invalidateQueries({ queryKey: QUERY_KEYS.masterOptions.supplier })` |

#### 4.1.4 迁移步骤

1. **确认 `useMasterOptions` 为范本**：它的 7 个 `useQuery` 就是迁移目标模式
2. **逐文件迁移**：从 `customer-options.ts` 开始，改造为导出 `fetch* + useQuery` 模式
3. **更新引用点**：将所有 `XxxOptions.get()` 改为 `useQuery(...)`；`XxxOptions.reload()` 改为 `queryClient.invalidateQueries(...)`
4. **删除 `createCachedOptions`**：所有 6 个 api 文件迁移完毕后删除
5. **回滚窗口**：同步读取路径保留一个版本周期的兼容 wrapper

#### 4.1.5 验收标准

- 选项 API 只有 TanStack Query 一套缓存。
- 主数据新增、编辑、禁用后相关选项能正确刷新。
- 登录用户切换后不会读取上一个用户的选项缓存（≤ 100ms 内失效）。
- 原有 `useMasterOptions` 测试覆盖缓存命中、失效和禁用状态。
- 6 个 api 文件的单测从 mocked `http` 改写为 mocked `queryClient`，保持断言等价。
- 切账号后旧缓存可见 = 0 起；失效延迟 ≤ 100ms。

#### 4.1.6 执行记录（2026-07-04）

状态：已完成第一阶段兼容迁移。

- 新增 `src/lib/query-cached-options.ts`，将同步兼容 wrapper 的 `get/reload` 统一接入 `queryClient.getQueryData/prefetchQuery/invalidateQueries/fetchQuery`。
- 6 个 API 文件已从 `createCachedOptions` 切换到 `createQueryCachedOptions`，并绑定 `QUERY_KEYS.masterOptions.*`。
- 保留 `fetch*Options/get*Options/reload*Options` 原导出，继续支持现有配置层同步读取；后续版本可逐步移除同步 wrapper 和旧 `create-cached-options` 文件。
- `option-resolvers` 的物料分类兼容预热在请求失败时保持 fallback，不向测试或运行时泄漏未处理 Promise。
- 验证命令：`pnpm vitest run --coverage --maxWorkers=50%`。
- 验证结果：442 个测试文件通过、1 个测试文件跳过；5798 个测试通过、4 个跳过；Statements / Branches / Functions / Lines 均为 100%。

---

### 4.2 非敏感 UI 持久化收敛到 Zustand persist

#### 4.2.1 当前实现

**现状盘点**：

| 组件 | 当前状态 | 持久化方式 |
|---|---|---|
| **5 个 Zustand store** | `authStore` / `permissionStore` / `setupStore` / `systemMenuStore` / `auth-user-sync` | **0 个使用 persist middleware** |
| **`storage.ts`** | 200 行工具函数 | 99% auth 相关（token / user / expires / session），含 `getPersonalSettings` / `setPersonalSettings` 两个非 auth 函数 |
| **`useThemeMode`** (`hooks/useThemeMode.ts`) | 管理 `themeMode`（light/dark/system），含自己的 `window.matchMedia` 监听 + 跨 tab `storage` 事件同步 | 直接调 `getPersonalSettings()?.themeMode` → `setPersonalSettings({...})` |
| **`usePersonalSettings`** (`layouts/usePersonalSettings.ts`) | 管理 fontSize/layoutMode/themeMode + UI 面板 | 直接调 `getPersonalSettings()` / `setPersonalSettings()` + 自定义 `'personal-settings-changed'` 事件 |
| **`useColumnSettingsSupport`** (`hooks/useColumnSettingsSupport.ts`, 299 行) | 管理 table 列排序 + 可见性 + 本地/远端同步 | 直接调 `getListColumnSettings()` / `setListColumnSettings()` + 手写指数退避重试 + 远端 `saveUserColumnSettings` |

**`storage.ts` 的非 auth 函数**：

```typescript
export function getPersonalSettings(): PersonalSettings | null  // localStorage + JSON.parse + schema check
export function setPersonalSettings(settings: PersonalSettings)  // localStorage.setItem(JSON.stringify)
export function getListColumnSettings(pageKey, userKey?)        // localStorage with userKey:pageKey composite key
export function setListColumnSettings(pageKey, settings, userKey?) // localStorage.setItem(JSON.stringify)
```

**`useThemeMode` 的现状亮点**（已具备 DI 化前的优秀模式）：

```typescript
export function useThemeMode() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initial)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  // 监听系统主题变化
  useEffect(() => { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handler) }, [])

  // 跨 tab 同步
  useEffect(() => { window.addEventListener('storage', onStorage) }, [])

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
    setPersonalSettings({ ...current, themeMode: mode })  // ← 手动 write-through
  }
}
```

#### 4.2.2 现存问题

| 问题 | 详情 |
|---|---|
| **`persist` 零使用** | 项目已有 5 个 Zustand store 但无一使用 `persist` middleware——本迁移是**首次引入 persist 模式**，不是"统一已有方式" |
| **`storage.ts` 职责混乱** | 同时承载 auth token、personal settings、list column settings 三类不同安全级别的数据，key 定义在 `constants/storage.ts` 集中但读写散在 3 个 hook |
| **theme 跨 tab 同步手写** | `useThemeMode` 自己监听 `window storage` 事件——这正是 `zustand/middleware/persist` 的 `syncAcrossTabs` 提供的 |
| **手动 write-through** | 每个 hook 自己调 `setPersonalSettings(getPersonalSettings() ?? {} + newField)`——store 的 `subscribe` + persist 自动完成 |
| **坏数据恢复分散** | `getPersonalSettings` 和 `getListColumnSettings` 各有一套 try-catch + removeItem 逻辑——persist middleware 的 `onRehydrate` + `migrate` 统一处理 |

#### 4.2.3 目标方案

**分两步走，setupStore 试点先行**：

```
Step 1: setupStore 试点 persist
  → 验证刷新一致性、坏数据恢复、SSR 无闪烁
  → 积累 persist middleware 的配置模板

Step 2: 推广到 permissionStore / systemMenuStore
  → authStore 保持现状（安全敏感，不迁入通用 persist）
  → useThemeMode / usePersonalSettings 迁入独立的 UI settings store
```

**示例迁移**（setupStore 当前 → persist 版）：

```typescript
// 迁移前
export const useSetupStore = create<SetupState>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
  clearStatus: () => set({ status: null }),
}))

// 迁移后
export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      status: null,
      setStatus: (status) => set({ status }),
      clearStatus: () => set({ status: null }),
    }),
    {
      name: 'aries-setup',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
```

**UI 设置 store（新建，收敛非敏感持久化）**：

```typescript
interface UISettingsState {
  fontSize: number
  layoutMode: 'sider' | 'top'
  themeMode: 'light' | 'dark' | 'system'
  setFontSize: (size: number) => void
  setLayoutMode: (mode: 'sider' | 'top') => void
  setThemeMode: (mode: UISettingsState['themeMode']) => void
}
```

#### 4.2.4 验收标准

- `setupStore` 试点 persist 后刷新一致性通过。
- 个人设置（fontSize / layoutMode / themeMode）刷新页面保持一致。
- 列设置离线时可本地保存，恢复网络后可重新同步。（列设置同步在 5.3 另迁 Query/Mutation）
- auth 行为不发生语义变化（`authStore` 不迁入 persist）。
- 坏数据（破损 JSON）恢复降级到默认值，不抛异常。

#### 4.2.5 执行记录（2026-07-04）

状态：已完成 UI persist 试点与个人显示设置迁移。

- `setupStore` 已接入 `zustand/middleware/persist`，存储 key 为 `aries-setup-status`，仅持久化 `status`。
- 新增 `src/stores/uiSettingsStore.ts`，将 `fontSize` / `layoutMode` / `themeMode` 纳入独立 UI settings store，并复用 `aries-personal-settings` 存储 key。
- `getPersonalSettings` / `setPersonalSettings` 保留为兼容 façade，底层读写已切换到 `uiSettingsStore`。
- `useThemeMode`、`usePersonalSettings`、`AppAntdProvider` 已改为直接订阅 `uiSettingsStore`，不再依赖各自手写读取入口。
- `useThemeMode` 仍保留系统主题监听与 storage 事件触发的 `persist.rehydrate()`；`usePersonalSettings` 仍保留兼容事件通知，持久化读写职责已收敛到 store。
- 兼容旧版裸 JSON 格式与新版 persist 包装格式；破损 JSON 会移除并降级到默认值。
- `authStore` 未迁入 persist，认证存储语义不变。
- 定向验证命令：`pnpm vitest run src/hooks/useThemeMode.spec.ts src/layouts/usePersonalSettings.spec.ts src/components/AppAntdProvider.spec.tsx src/stores/setupStore.spec.ts src/stores/uiSettingsStore.spec.ts src/utils/__tests__/storage.spec.ts src/constants/storage.spec.ts`。
- 定向验证结果：7 个测试文件通过、111 个测试通过（该数字为定向命令总用例数；本批新增核心覆盖包含 `uiSettingsStore.spec.ts` 13 个用例与 `setupStore.spec.ts` 3 个 persist 用例）。

---

### 4.3 编辑器草稿与异常自动保存持久化升级

#### 4.3.1 当前实现

**草稿存储**（`src/views/modules/module-editor-draft-storage.ts`）：

```typescript
const STORAGE_PREFIX = 'aries-module-editor-draft:'
const DRAFT_VERSION = 1
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 天

export interface ModuleEditorDraftSnapshot {
  version: 1
  userKey: string
  moduleKey: string
  recordId: string
  values: ModuleRecord
  items: ModuleLineItem[]
  authoritativePrimaryNo: string
  updatedAt: number
}
```

- Key 格式：`aries-module-editor-draft:{userKey}:{moduleKey}:{recordId}`（`encodeURIComponent` 编码）
- 写入：`localStorage.setItem(key, JSON.stringify(snapshot))`
- 读取：`JSON.parse` → `parseDraftSnapshot` 校验（类型守卫检查 version/userKey/moduleKey/recordId/updatedAt/items 等字段）
- TTL：读取时检查 `now - updatedAt > 7天`，过期则 `removeItem` + 返回 null
- **无容量检查、无 size 上限、无 QuotaExceededError 处理**

**自动保存 registry**（`src/utils/client-autosave-registry.ts`）：

```typescript
type ClientAutosaveReason =
  | 'editor-change' | 'error-boundary' | 'items-change' | 'pagehide'
  | 'parent-import' | 'unhandled-rejection' | 'visibility-hidden' | 'window-error'

const handlers = new Set<ClientAutosaveHandler>()

export function registerClientAutosaveHandler(handler) { handlers.add(handler); return () => handlers.delete(handler) }
export function flushClientAutosaveHandlers(reason) { handlers.forEach(h => h(reason)) }

export function installClientAutosaveFlushListeners() {
  window.addEventListener('error', handleWindowError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  window.addEventListener('pagehide', handlePageHide)
  document.addEventListener('visibilitychange', handleVisibilityChange)
}
```

#### 4.3.2 现存问题

| 问题 | 详情 |
|---|---|
| **localStorage 配额** | 大单据（>100 行明细 × 1000 条草稿）→ `QuotaExceededError`，当前无 catch + 降级策略 |
| **全局 registry 无生命周期边界** | 6 种事件监听器是全局注册的，但不会在编辑器 unmount 时清理，内存泄漏风险 |
| **无 IndexedDB fallback** | 项目未引入 `idb-keyval` 或 `localforage`，草稿 > 1MB 无自动降级 |
| **版本不匹配无迁移** | `DRAFT_VERSION = 1` 校验仅做 `value.version !== DRAFT_VERSION → null`，不提供 migrate 函数 |

#### 4.3.3 目标方案

**分层推进**：

```
Layer 1 (短期): typed draft repository
  → DraftRepository.read/write/delete，隔离 localStorage 细节
  → 加入 try-catch QuotaExceededError → 返回错误而非静默丢失

Layer 2 (中期): IndexedDB 降级
  → 引入 idb-keyval（~1KB，promise API，比 localforage 更轻）
  → 草稿 > 1MB 自动写 IndexedDB，≤ 1MB 保留 localStorage

Layer 3 (长期): 压测验证
  → 5MB 草稿压测基线，保证不触发 QuotaExceededError
  → registry 生命周期绑定编辑器 mount/unmount
```

**推荐依赖**：`idb-keyval`（npm: `idb-keyval`，~1KB gzipped，promise-based API），不选 `localforage`（偏重，API 体量比 idb-keyval 大 10×）。

#### 4.3.4 验收标准

- 浏览器异常、`pagehide`、`visibilitychange` 下仍能保存当前草稿。
- 大明细草稿（> 1MB）不会因为 localStorage 配额直接导致编辑器异常，自动降级到 IndexedDB。
- 草稿版本、TTL、用户隔离、模块隔离均有测试覆盖。
- 大于 5MB 的草稿作为压测基线，验证不触发 `QuotaExceededError`。

---

## 5. 中优先级迁移项

### 5.1 WorkspaceOverlay 焦点管理迁移到 AntD Modal/Drawer 能力

#### 5.1.1 当前实现

**`WorkspaceOverlay`** (`src/views/modules/components/WorkspaceOverlay.tsx`, 177 行 + `src/styles/workspace-overlay.css`, 274 行)：

自研焦点管理清单：

```typescript
const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
].join(',')

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => !el.hasAttribute('disabled'))
    .filter(el => el.getAttribute('aria-hidden') !== 'true')
    .filter(el => !el.hidden)
}

// Esc 只关闭顶层弹层（支持嵌套）
if (e.key === 'Escape') {
  const topOverlay = Array.from(document.querySelectorAll('.workspace-overlay')).at(-1)
  if (!topOverlay?.contains(panelRef.current)) return
  handleClose()
}

// Tab 循环
const nextIndex = e.shiftKey
  ? (currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1)
  : (currentIndex === -1 || currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1)
```

ARIA 语义：
```tsx
<section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
  <header> <span id={titleId}> {title} </span> <button aria-label={closeAria}> <CloseOutlined /> </button> </header>
  <div className="workspace-overlay-body">{children}</div>
  {footer && <div className="workspace-overlay-footer">{footer}</div>}
</section>
```

**引用点**（7 处）：
`ModuleRecordDetailOverlay` / `ModuleFreightPickupListOverlay` / `ModuleEditorWorkspace` / `ModuleParentSelectorOverlay`

#### 5.1.2 现存问题

| 问题 | 详情 |
|---|---|
| 手写 focus trap | FocusableSelector 正则重复了 AntD Modal/Drawer `focusable.trap` + `focusTriggerAfterClose` 的能力 |
| 手写 Esc 嵌套判断 | AntD Modal/Drawer `keyboard` 属性原生处理嵌套 |
| 274 行 CSS 维护 | mask 动画、panel 定位、header/footer 布局、响应式断点——全是 AntD Drawer `styles` + `classNames` 可覆盖的 |
| 可访问性缺失 | 无 `aria-describedby`、无 focus 恢复 fallback（仅 `requestAnimationFrame` + `previousActiveElement`） |

#### 5.1.3 目标方案

**先做独立可行性 spike**（不计入本计划正式 PR），逐项核对 AntD Drawer 能否复刻现有行为：

**Spike Checklist**（6 条）：

1. `placement` / `size` / `footer` / `styles` 能否覆盖 274 行 CSS 的布局与尺寸
2. 嵌套弹层（父单据 → 详情 → 编辑三层）的 z-index 与焦点嵌套是否被 Drawer 原生支持
3. `role="dialog"` / `aria-modal` / `aria-labelledby` 语义是否由 Drawer 原生输出（AntD 6 Drawer 已支持）
4. 父单据选择、详情、编辑三个工作区入口的视觉过渡是否一致
5. 274 行 CSS 有多少能被 Drawer `styles` 内联替代、多少必须保留
6. 关闭后焦点恢复的目标元素能否通过 Drawer API 表达（`focusTriggerAfterClose`）

**spike 结论沉淀为**：`docs/2026-07-xx-workspace-overlay-drawer-spike.md`

如果 Drawer 无法完整承接 → 至少抽出 focus trap + Esc 嵌套 → 迁移到独立 composable（复用 AntD 弹层底座）

#### 5.1.4 验收标准

- Spike 文档交付，结论明确（迁/不迁/部分抽）。
- Esc 只关闭顶层弹层。
- 打开后焦点进入弹层，关闭后焦点恢复。
- Tab 和 Shift+Tab 不逃出当前弹层。
- 父单据选择、详情、编辑三个工作区入口行为一致。

---

### 5.2 打印模板与 LODOP 脚本执行边界收敛

#### 5.2.1 当前实现

**模板语法引擎**（`src/utils/print-template/`）：

| 文件 | 行数 | 内容 |
|---|---|---|
| `syntax.ts` | 63 | `{{placeholder}}`、`{{#each items}}...{{/each}}`、`{{#if field}}...{{else}}...{{/if}}` 三套正则引擎 |
| `renderer.ts` | 28 | 仅支持 `COORD` 模板类型；`escapeJs` 转义输出 |

```typescript
// syntax.ts 核心
const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g
const EACH_BLOCK_RE = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
const IF_BLOCK_RE = /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g
```

**LODOP 执行引擎**（`src/utils/clodop.ts`, 418 行）——**两套执行路径并存**：

```
路径 A: executeLodopCalls(lodop, code)
  → SAFE_METHOD 正则: /^LODOP\.(SET_|ADD_|NEWPAGE|SET_PRINT|SELECT_|DELETE_|...)\s*\(/i
  → 按行解析 + parseArgs → 反射调用 lodop[methodName](...args)
  → 注释自称 "without eval / new Function"

路径 B: executeLodopScript(lodop, code, options)
  → sanitizeExecutableLodopScript(code, printer) → 过滤 CONTROL_PRINT / SCRIPT_METHOD
  → new Function('LODOP', 'parseFloat', 'parseInt', 'isNaN', 'String', 'Number', 'Math', script)
  → fn(lodop, parseFloat, parseInt, Number.isNaN, String, Number, Math)
```

**两套路径的对比**：

| 维度 | 路径 A (executeLodopCalls) | 路径 B (executeLodopScript) |
|---|---|---|
| 执行方式 | 反射调用 | `new Function` |
| 安全性 | 正则白名单 SAFE_METHOD + 反射 | 闭包受限 6 个变量 + ALLOWED_SCRIPT_METHODS |
| 控制流 | 仅简单方法调用 | 支持 if/else/for 等任意 JS 语句 |
| 安全审计面 | 1 条路径 | 2 条路径（维护成本翻倍） |

**`executeLodopScript` 的 `new Function` 细节**：

```typescript
// 闭包受限变量清单（只有这 6 个 + script 字符串进入 new Function 作用域）：
const fn = new Function(
  'LODOP',       // CLodop 实例
  'parseFloat',   // Number.parseFloat（非全局 parseFloat，避免类型转换）
  'parseInt',     // Number.parseInt
  'isNaN',        // Number.isNaN
  'String',
  'Number',
  'Math',
  script,         // 经过 sanitizeExecutableLodopScript 过滤的打印脚本
)
```

#### 5.2.2 现存问题

| 问题 | 详情 |
|---|---|
| **两套执行路径并存** | 安全审计面翻倍，且两条路径的"允许方法"不统一：路径 A 的 `SAFE_METHOD` 正则与路径 B 的 `ALLOWED_SCRIPT_METHODS` Set 独立维护 |
| **`new Function` 本身** | 即使闭包受限 6 个变量，`new Function` 仍能访问全局对象链（如 `this.constructor.constructor`），CSP (Content Security Policy) 下也不可用 |
| **无 CSP 兼容方案** | 如果前端启用 `Content-Security-Policy: script-src 'self'`，`new Function` 会直接失败 |
| **模板引擎缺乏扩展护栏** | `syntax.ts` 的三套正则引擎无冻结注释、无 lint 规则、无 ADR，任何开发者都能新增模板语法 |

#### 5.2.3 目标方案

**三层拆分**（拆而不迁模板引擎）：

```
loader          ← 加载 C-Lodop 插件 + 版本检测（clodop.ts 的 LOAD_* 逻辑）
scriptPolicy    ← ALLOWED_SCRIPT_METHODS 白名单 + CSP 检测 + 危险阻断（可独立单测）
executor        ← 统一执行入口：优先反射调用路径 A，仅 legacy 脚本用路径 B
```

**统一执行路径**：

1. 先评估路径 A 的正则白名单能否覆盖路径 B 的所有实际调用
2. 如果覆盖 → **删除 `executeLodopScript` 及其 `new Function`**
3. 如果无法覆盖 → 在 ADR 中明确两条路径各自适用场景，并给路径 B 加 `Crypto.randomUUID()` nonce 注入

**模板语法冻结护栏**：

- `syntax.ts` 头部加注释：`/* FROZEN: 禁止新增模板语法，需 ADR 审批。截止 2026-07-04 支持的语法: {{}}, {{#each}}, {{#if}} */`
- Biome/ESLint 规则：禁止在 `syntax.ts` 中新增 `const XXX_RE = /` 正则初始化

#### 5.2.4 验收标准

- 所有允许的 LODOP 方法有白名单测试（路径 A 的 SAFE_METHOD + 路径 B 的 ALLOWED_SCRIPT_METHODS 合并为一个 source of truth）。
- `window`、`document`、`eval`、`Function`、`fetch` 等危险能力在脚本执行路径中全部阻断。
- 控制流脚本执行路径有明确单测。
- 打印预览、直接打印、PDF 下载三种模式不回归。
- 路径目标：删除 `executeLodopScript` + `new Function`（如果路径 A 全覆盖），否则 ADR 记录不可删除原因。

---

### 5.3 列设置同步迁移到 Query/Mutation

#### 5.3.1 当前实现

**`useColumnSettingsSupport`** (`src/hooks/useColumnSettingsSupport.ts`, 299 行) 混合了以下职责：

1. **本地状态**：`useState<ColumnOrderState>` + `useState<VisibilityState>`
2. **localStorage 同步**：`setListColumnSettings(pageKey, settings, userKey)`（写）+ `getListColumnSettings(pageKey, userKey)`（读）
3. **远端加载**：`getUserColumnSettings()`（api 调 `ENDPOINTS.USER_ACCOUNT_PREFERENCES`）
4. **远端保存**：`saveUserColumnSettings(payload)`，含手写指数退避重试：

```typescript
const persistWithRetry = async (attempt: number): Promise<void> => {
  try {
    await saveUserColumnSettings(payload)
    remotePagesRef.current = payload.pages
    syncWarningShownRef.current = false
  } catch (error) {
    if (isNetworkError(error) && attempt < PERSIST_MAX_RETRIES) {
      await waitForRetry(PERSIST_BASE_DELAY_MS * 2 ** attempt)  // 指数退避
      return persistWithRetry(attempt + 1)
    }
    throw error
  }
}
```

5. **UI 提示**：`message.warning(t('hooks.columnSettings.syncRetryLater'))`

**`user-preferences.ts`** (`src/api/user-preferences.ts`, 28 行) 仅两个函数：
- `getUserColumnSettings()` → `http.get<ApiResponse<UserColumnSettingsPayload>>(ENDPOINTS.USER_ACCOUNT_PREFERENCES)`
- `saveUserColumnSettings(payload)` → `http.put<ApiResponse<UserColumnSettingsPayload>>(ENDPOINTS.USER_ACCOUNT_PREFERENCES, payload)`

#### 5.3.2 现存问题

| 问题 | 详情 |
|---|---|
| **手写指数退避重试** | TanStack Query 提供 `retry` / `retryDelay`，无需自建 |
| **本地/远端状态耦合在一个 hook** | 299 行难以独立测试本地 fallback vs 远端同步 vs UI 提示三条路径 |
| **端加载无 stale-while-revalidate** | 列设置在用户会话中不变，恰当的 `staleTime: Infinity` 可避免每次 mount 重新拉取 |
| **与 4.1（选项缓存）、4.2（persist）都触及列的本地存储** | 依赖 4.1 的 queryClient 失效约定 + 4.2 的 persist 模式，需明确模块边界 |

#### 5.3.3 目标方案

```typescript
// 迁移后
export function useColumnSettingsSupport(pageKey: string) {
  // 远端列设置用 useQuery（自动重试 / cache / refetch）
  const { data: remoteSettings } = useQuery({
    queryKey: ['column-settings', pageKey],
    queryFn: getUserColumnSettings,
    staleTime: Infinity,  // 列设置在用户会话中不变
  })

  // 本地列设置用 Zustand persist（fallback + optimistic）
  const localSettings = useColumnSettingsStore(s => s.settings[pageKey])

  // 保存用 useMutation，自动复用 Query 的 retry 配置
  const { mutate: saveSettings } = useMutation({
    mutationFn: saveUserColumnSettings,
    onMutate: async (newSettings) => {
      // optimistic update
      await queryClient.cancelQueries({ queryKey: ['column-settings', pageKey] })
      const previous = queryClient.getQueryData(['column-settings', pageKey])
      queryClient.setQueryData(['column-settings', pageKey], newSettings)
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['column-settings', pageKey], context?.previous)
      message.warning(t('hooks.columnSettings.syncRetryLater'))
    },
  })
}
```

**关键变化**：
- 远端加载：`useQuery` 替代 `getUserColumnSettings()` 的原始调用
- 远端保存：`useMutation` + `onMutate` optimistic update 替代手写 `persistWithRetry`
- 本地 fallback：保留 `setListColumnSettings` → 但调用方改为 Zustand persist store
- 重试 / 缓存 / 乐观更新：全部委托给 TanStack Query

#### 5.3.4 依赖关系

- **依赖 4.1**（选项缓存迁移）提供 queryClient 基座和失效约定
- **与 4.2 并行但需错峰**：两者都改 `useColumnSettingsSupport`（本地存储迁移到 persist + 远端迁移到 Query/Mutation），需要协调合入顺序

#### 5.3.5 验收标准

- 初次加载优先使用远端配置。
- 远端失败时回退本地配置。
- 保存失败不丢失本地列设置（optimistic update 在 `onError` 中正确回滚）。
- 网络恢复后可重新同步。

---

## 6. 低优先级或建议保留

| 区域 | 结论 | 原因 |
| --- | --- | --- |
| 表格核心 | 保留 | 已用 AntD Table + TanStack Table，自定义高度、虚拟滚动和列适配属于业务 UI 胶水 |
| 拼音搜索 | 保留 | `src/utils/pinyin-search.ts` 基于 `pinyin-pro`，当前封装较薄（~50 行） |
| 表单体系 | 保留 | 主要使用 AntD Form + zod，没有明显自研表单框架 |
| 路由 | 保留并局部整理 | 已用 TanStack Router，集中式路由配置偏重但不是重复造轮子 |
| xlsx 导入导出 | 保留 | 已使用 `xlsx`，自定义部分主要是业务字段映射 |
| dnd 排序 | 保留 | 已使用 `@dnd-kit`，后续只需补齐键盘坐标和可访问名称 |

---

### 6.1 PR 依赖 DAG

```
第一批 4.1（选项缓存 → TanStack Query）      ← 基座，提供 queryClient 失效约定
   │
   ├── 5.3（列设置 → useQuery/useMutation）   ← 依赖 4.1 的 queryClient 基座
   │
第二批 4.2（非敏感 UI → Zustand persist）    ← 与 4.1 可并行
   │   注意：4.2 与 5.3 都改 useColumnSettingsSupport，需排期错峰合入
   │
   └── 4.3（草稿 → typed repository + IndexedDB）← 依赖 4.2 persist 模式落地后再做

第三批 5.1（WorkspaceOverlay → AntD Drawer）   ← 独立 spike 先行，迁移 PR 自身独立
   │
   └── 5.2（LODOP 拆 loader/policy/executor）  ← 与 5.1 互不依赖，可并行

前置：回归绿基线（pnpm test:unit + pnpm test:e2e:mock）
```

---

## 7. 建议实施顺序

### 第一批：低风险高收益

1. 将 `createCachedOptions` 迁移到 TanStack Query（6 个 api 文件 + 删除 `createCachedOptions`）。
2. 补充主数据变更后的选项缓存失效测试。

当前状态（2026-07-04）：6 个 API 文件已迁移到 TanStack Query 缓存适配器；`createCachedOptions` 作为未引用旧兼容文件暂留，等待同步 wrapper 完整退场后删除。

**预期收益**：删除重复缓存；降低登录态切换和缓存失效风险；统一数据请求状态。

### 第二批：UI 持久化收敛

1. 新增 UI settings store + setupStore 试点 persist。
2. 迁移 theme / layout / fontSize 等非敏感设置。
3. 将列设置同步拆成本地 fallback（persist store）和远端 Query/Mutation（见 5.3）。

当前状态（2026-07-04）：`setupStore` persist 试点已落地；theme / layout / fontSize 已迁入 `uiSettingsStore`；列设置同步仍留在 5.3 批次处理。

**预期收益**：缩小 `storage.ts` 职责；减少 hook 中的异步副作用；统一 UI 状态持久化方式。

### 第三批：弹层和打印基础设施边界

1. `WorkspaceOverlay` vs AntD Drawer 可行性 spike → 决策文档。
2. 拆分 LODOP loader、scriptPolicy、executor。
3. 冻结自研模板语法扩展。

**预期收益**：降低可访问性和嵌套弹层风险；降低打印脚本执行安全风险；明确打印业务和执行基础设施边界。

### 第四批：草稿存储升级

1. 抽出 typed draft repository。
2. 加入 QuotaExceededError 处理。
3. 引入 `idb-keyval` IndexedDB fallback。

**预期收益**：提高大单据草稿可靠性；保留异常自动保存能力；降低 localStorage 配额风险。

---

## 8. 测试策略

| 迁移项 | 必要测试 |
| --- | --- |
| 选项缓存 | query cache 命中、失效、登录态切换、请求失败、切账号旧数据可见 |
| UI persist | 初始读取、写入、坏数据恢复、跨刷新保持、跨 tab 同步（syncAcrossTabs） |
| 列设置 | 远端成功、远端失败、本地 fallback、optimistic update rollback |
| WorkspaceOverlay | dialog 语义、焦点进入、焦点循环、Esc 嵌套、焦点恢复 |
| 打印执行 | 方法白名单、危险脚本阻断（window/document/eval/Function/fetch）、PDF/LODOP 两条输出路径 |
| 草稿 | TTL、版本、用户隔离、模块隔离、QuotaExceededError 降级、异常事件触发保存 |

### 8.1 验收量化阈值

| 迁移项 | 指标 | 阈值 | 采集方式 |
| --- | --- | --- | --- |
| 4.1 选项缓存 | 切账号后旧缓存可见 | 0 起 | 登录态切换 e2e |
| 4.1 选项缓存 | 失效延迟 | ≤ 100ms | mutation 后 invalidate 时序测试 |
| 4.2 UI persist | 刷新前后状态一致 | 100% | 跨刷新单测 |
| 4.2 UI persist | 坏数据恢复 | 降级到默认值，不抛异常 | 损坏 localStorage 单测 |
| 4.3 草稿 | 大草稿不崩（> 1MB） | 0 次 QuotaExceededError | 压测 |
| 4.3 草稿 | 5MB 压测基线 | 0 异常 | 压测 |
| 5.1 WorkspaceOverlay | focus trap 一致 | 100% | 焦点循环 e2e |
| 5.2 打印执行 | 危险 API 阻断 | window/document/eval/Function/fetch 全阻断 | 白名单单测 |
| 全部迁移 | 单测绿基线 | 不低于迁移前 | `pnpm test:unit` |
| 全部迁移 | e2e 覆盖率 | ≥ 60% 门（既有 `test:e2e:coverage`） | `pnpm test:e2e:coverage` |

### 8.2 本轮测试与覆盖率基线（2026-07-04）

| 项 | 结果 |
| --- | --- |
| 回归命令 | `pnpm vitest run --coverage --maxWorkers=50%` |
| 测试文件 | 443 passed, 1 skipped, 444 total |
| 测试用例 | 5814 passed, 4 skipped, 5818 total |
| Statements | 100% (`9907/9907`) |
| Branches | 100% (`7536/7536`) |
| Functions | 100% (`2761/2761`) |
| Lines | 100% (`9474/9474`) |
| 类型检查 | `pnpm run typecheck` 通过 |

---

## 9. 风险控制

- 每批迁移单独提交，避免基础设施和业务行为混改。
- 优先删除重复代码，不提前抽象未来能力。
- 认证链路只做收敛，不直接替换为新第三方方案。
- 打印链路先补测试和拆边界，再考虑替换模板引擎。
- 所有迁移保持现有用户可见行为不变。

### 9.1 回滚链路

| 迁移项 | 回滚策略 | 灰度方式 |
| --- | --- | --- |
| 4.1 选项缓存 | 保留 `createCachedOptions` 一个版本周期，配置开关切回旧实现 | feature flag `VITE_LEGACY_CACHE=true` |
| 4.2 UI persist | persist 写入与旧 storage 并行一周，异常自动切回 | feature flag + setupStore 单 store 试点优先 |
| 4.3 草稿 | typed repository 与旧直写并行，后台双写校验一致 | 双写 7 天后删旧路径 |
| 5.1 WorkspaceOverlay | 一键切回旧组件（保留 177 行 + 274 行 CSS） | feature flag, spike 结论后再启用 |
| 5.2 打印执行 | 保留被删执行路径一个 release 周期，ADR 明确删除时点 | 删除前白名单测试全覆盖 |

### 9.2 回归绿基线前置

- 第一批合入前先跑 `pnpm test:unit` 与 `pnpm test:e2e:mock`，确认全绿并记录基线覆盖率。
- 后续每批合入后必须对比基线，覆盖率不得下降、关键路径不回退。

---

## 10. 依赖调整计划

| 依赖 | 当前状态 | 计划 |
| --- | --- | --- |
| `@tanstack/react-query` 5.x | 已使用，`useMasterOptions` 为范本，全局 `staleTime: 60s` | 4.1 扩大使用面至 6 个 api 文件 |
| `zustand` persist middleware | 已在 `setupStore` 与 `uiSettingsStore` 使用；`useColumnSettingsSupport.ts` 的 `persist` 为本地函数名，不是 middleware | 4.2 已完成试点；5.3 再处理列设置同步 |
| `idb-keyval` | 未引入 | 4.3 引入（推荐，~1KB, promise API） |
| `localforage` | 未引入 | 4.3 评估但不优先（偏重） |
| Handlebars / Mustache | 未引入 | 5.2 评估模板语法扩展时再决策，不提前引入 |
| `xlsx` | 已使用 | 保留 |
| AntD Drawer / Modal | 已使用 | 5.1 spike 后决定 |
| i18n persist | 疑似已用（`src/types/i18n.ts`） | 4.2 先核对现状再决定是否纳入 |
| `pinyin-pro` | 已使用 | 保留 |

---

## 11. 当前建议结论

第一批应优先处理 `createCachedOptions`。这是最明确的重复轮子：项目已经引入并广泛使用 TanStack Query，而选项数据仍有一套模块级闭包缓存。迁移范围清晰（6 个 api 文件 + `useMasterOptions` 为范本）、收益直接（删除 90 行缓存代码 + 消除双重缓存冲突）、回归风险可通过测试控制。注意 6 个 api 文件的单测需同步从 mocked `http` 改写为 mocked `queryClient`。

第二批处理非敏感 UI 持久化。Zustand `persist` 当前几乎零使用，本质是**首次引入 persist 模式**，建议 `setupStore` 单 store 试点先行，验证通过后再推广；auth token 相关存储应暂缓迁移，避免引入安全语义变化。

第三批中 `WorkspaceOverlay` 的可行性 spike 和 LODOP 执行路径统一应优先于草稿存储升级——前者影响开发者安全（`new Function`）和可访问性合规，后者是性能优化。
