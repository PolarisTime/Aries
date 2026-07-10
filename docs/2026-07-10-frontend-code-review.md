# Aries 前端代码审查报告

## 1. 审查概况

- 审查日期：2026-07-10
- 审查仓库：`aries`
- 审查基线：`main@bf3882f`
- 工作区状态：审查开始时为 `main...origin/main`，无未提交改动
- 技术栈：React 19、TypeScript 6、Vite 8、Ant Design 6、TanStack Query、Zustand
- 审查方式：静态代码审查、自动化质量检查、Ant Design CLI 扫描、依赖安全审计
- 审查原则：仅记录具有明确代码证据、可说明触发条件和影响的问题，不将纯风格偏好或工具误报列为缺陷

## 2. 结论摘要

审查基线不建议直接发布。审查确认存在以下主要风险，整改后的状态见第 8 节：

- 打印模板可绕过黑名单并执行任意同源 JavaScript。
- React Query 缓存未在身份切换时清理，可能造成跨账号数据泄漏。
- 账号编辑和 2FA 管理存在迟到响应覆盖当前目标的竞态。
- 软删除父单仍可被选择和导入。
- 当前生产依赖包含多个高危已知漏洞。
- 通用 Excel 导出、批量附件绑定、父单分页和错误恢复存在确定的功能缺陷。

建议优先处理安全与数据完整性问题，再处理错误恢复、分页一致性和可访问性问题。

## 3. 主要问题

### 3.1 严重：打印模板可执行任意同源 JavaScript

#### 证据

- `src/utils/clodop.ts:320-324`：只要模板包含 `var`、`let`、`if` 等控制结构，就进入动态执行路径。
- `src/utils/clodop.ts:326-349`：仅通过关键字黑名单和 `LODOP.*` 方法名称进行文本检查，没有限制其他 JavaScript 语句。
- `src/utils/clodop.ts:358-368`：使用 `new Function` 编译并执行模板。
- `src/utils/print-output-runner.ts:141-166`：后端返回的模板经渲染后直接传入 `execPrintCode`。

使用相同检测正则进行的安全本地验证表明，攻击者可以通过属性名拆分等方式绕过关键字检测，并访问全局对象及 Web Storage。实际凭据和业务数据均未在报告中记录。

#### 触发条件

- 具有模板编辑权限的账号保存恶意模板；或
- 后端模板数据、数据库或传输链路被污染；且
- 用户执行模板预览或打印。

#### 影响

- 读取 access token 和业务数据。
- 以受害者身份调用同源 API。
- 形成持久化同源任意代码执行。

#### 修复建议

1. 删除 `new Function` 执行路径。
2. 将模板解析为严格的 LODOP 指令 AST，只允许明确的方法、参数类型和表达式。
3. 逐条反射调用允许的方法，不执行模板中的任意 JavaScript。
4. 服务端同步执行模板校验，并检查、清理已有模板。
5. 增加针对属性拆分、全局对象访问和非 LODOP 语句的安全回归测试。

### 3.2 高：React Query 缓存可能跨账号复用

#### 证据

- `src/lib/query-client.ts:3-14`：全局 QueryClient 的 `staleTime` 为 60 秒，`gcTime` 为 10 分钟。
- `src/stores/authStore.ts:145-155`：注销仅清理 token、用户和认证状态，没有取消请求或清空 QueryClient。
- `src/constants/query-keys.ts:4-115`：业务、会话、API Key 等查询键未包含用户、租户或会话维度。
- 生产代码未发现身份切换时调用 `queryClient.cancelQueries()` 或 `queryClient.clear()`。

#### 触发条件

用户 A 查看业务数据后，在同一 SPA 标签页中注销；随后用户 B 登录并访问相同页面。

#### 影响

- 用户 B 可能直接收到用户 A 的缓存数据。
- 用户 A 注销前尚未完成的请求，可能在注销后继续写入共享缓存。
- 在双方数据权限不同的情况下构成跨账号信息泄漏。

#### 修复建议

1. 身份切换前取消所有进行中的用户态查询。
2. 注销和新身份登录时清空用户态缓存。
3. 为用户相关查询键增加用户、租户或 session epoch。
4. 查询函数统一传递并响应 `AbortSignal`。
5. 增加“A 注销、B 登录”的缓存隔离测试。

### 3.3 高：账号编辑与 2FA 管理请求可跨目标回写

#### 证据

- `src/views/system/useUserAccountEditor.tsx:163-178`：编辑详情请求没有取消或请求代次校验。
- `src/views/system/useUserAccountEditor.tsx:105-120`：迟到响应会直接覆盖表单及 `editingId`。
- `src/views/system/useUserAccountEditor.tsx:62-68`：保存操作依赖当前 `editorMode` 和 `editingId` 决定写入目标。
- `src/views/system/useUserAccountTwoFactor.tsx:42-54`：2FA 详情请求同样没有取消或目标校验。
- `src/views/system/useUserAccountTwoFactor.tsx:128-133`：关闭弹窗只清理状态，不会使旧请求失效。

#### 触发条件

用户 A 的详情请求较慢时关闭弹窗，随即打开用户 B；用户 A 的响应最后返回。

#### 影响

- 用户 B 的弹窗被用户 A 的数据覆盖。
- 后续保存可能更新错误账号。
- 可能为错误用户生成、启用或禁用 2FA。

#### 修复建议

1. 每次打开弹窗时创建 `AbortController` 或递增 requestId。
2. 关闭、切换目标或卸载时取消旧请求并使旧代次失效。
3. 响应写入前同时校验 requestId 和目标用户 ID。
4. 保存及 2FA 操作前再次校验当前目标。
5. 增加迟到响应顺序反转的单元测试。

### 3.4 高：软删除父单仍可被选择和导入

#### 证据

- `src/views/modules/components/module-parent-selector-utils.ts:46-83`：候选过滤只判断原始业务状态和数量，没有调用 `isDeletedModuleRecord`。
- `src/views/modules/components/useModuleParentSelectorOverlay.tsx:699-727`：删除状态只被派生为“已删除”用于显示。
- `src/views/modules/components/useModuleParentSelectorOverlay.tsx:734-749`：软删除记录仍可加入选择。
- `src/views/modules/components/useModuleParentSelectorOverlay.tsx:820-829`：导入前没有再次验证删除状态。
- `src/views/modules/components/ModuleParentSelectorOverlay.spec.ts:1104-1135`：现有测试构造软删除记录并验证其能够被选中，固化了错误行为。

#### 影响

软删除但保留“已审核”等原始业务状态的父单，可能被导入新业务单据，造成无效关联或数据完整性问题。

#### 修复建议

1. 候选过滤首先排除软删除记录。
2. 详情加载完成后再次检查删除状态。
3. 执行 `onSelect` 前进行最终校验，防止并发删除和跨页缓存绕过。
4. 将现有测试改为验证软删除记录不可见、不可选且不可导入。

### 3.5 高：生产依赖存在已知漏洞

使用官方 npm Registry 执行 `pnpm audit --prod`，报告 11 个漏洞：9 个高危、1 个中危、1 个低危。

#### Axios

- 位置：`package.json:48`、`pnpm-lock.yaml` 中的 `axios@1.15.2`。
- 包含 ReDoS、资源分配、代理凭据泄漏和原型污染相关公告。
- 审计建议升级至 `axios >= 1.16.0`。

#### SheetJS/xlsx

- 位置：`package.json:57`、`pnpm-lock.yaml` 中的 `xlsx@0.18.5`。
- 包含原型污染和 ReDoS 公告。
- 当前生产源码未发现 `xlsx` 导入，优先删除该未使用依赖；如确需使用，应选择包含修复的可信分发版本并完成兼容性验证。

#### 修复结果

- `axios` 已从 1.15.2 升级至 1.18.1。
- 未使用的 `xlsx` 及其传递依赖已从 `package.json` 和 lockfile 删除。
- Axios 的传递依赖 `form-data` 已从 4.0.5 刷新至修复版本 4.0.6。
- 使用官方 npm Registry 重新执行 `pnpm audit --prod`，生产依赖审计结果从 11 个已知漏洞降至 0 个。

### 3.6 中高：通用 Excel 导出响应契约错误

#### 证据

- `src/api/http.ts:14-26`：注释和封装明确说明响应拦截器会剥离 `response.data`，有效返回类型是响应体本身。
- `src/api/auth/auth-interceptor.ts:124-125`：成功拦截器返回 `response.data`。
- `src/api/common-export.ts:13-21`：绕过封装调用 `http.instance.post`，随后再次读取 `response.data`。
- `src/api/common-export.spec.ts:33-55`：测试错误地将 Mock 设置为 `{ data: blob }`，没有覆盖真实拦截器契约。

#### 影响

运行时 `response` 已经是 Blob，再读取 `.data` 得到 `undefined`；`URL.createObjectURL` 无法生成有效下载链接，通用业务列表导出失败。

#### 修复建议

使用 `http.post<Blob>()` 并直接将返回值传给 `downloadBlob`，同时将测试 Mock 改为直接返回 Blob。

### 3.7 中高：批量粘贴附件存在丢失绑定的竞态

#### 证据

- `src/views/modules/components/useModuleAttachmentModal.ts:172-184`：每个附件执行“读取当前绑定列表、追加 ID、整表覆盖”。
- `src/views/modules/components/useModuleAttachmentModal.ts:388-391`：多个粘贴文件通过 `Promise.allSettled` 并发上传和绑定。

两个任务可能读取同一旧列表，分别写入 `[old, A]` 和 `[old, B]`；后写请求会覆盖先写结果。

#### 修复建议

1. 批量上传全部完成后一次性提交合并后的绑定列表；或
2. 在前端串行化绑定操作；并
3. 优先在后端提供原子 append 接口，从根本上消除读改写竞态。

### 3.8 中：父单选择器分页与过滤顺序错误

#### 证据

- `src/views/modules/components/useModuleParentSelectorOverlay.tsx:643-697`：服务端先按 `page/pageSize` 返回一页及全量 `total`。
- `src/views/modules/components/useModuleParentSelectorOverlay.tsx:699-704`：前端随后过滤未审核或不可导入记录，但继续使用原始 `total`。
- `src/config/business-pages/operations/purchase-contract-page.ts:253-280`：采购合同等场景使用通用列表接口，而不是已过滤的候选接口。

#### 影响

页面可能显示少于 pageSize 的记录、空页和错误总数；符合条件的记录可能位于后续页面，用户难以找到。

#### 修复建议

将可导入条件下推至专用后端分页接口，由服务端返回过滤后的记录和 total。避免在大数据集上先拉取全量数据再前端分页。

### 3.9 中：编辑器详情加载失败后列表永久保持 loading

#### 证据

- `src/views/modules/use-business-grid-editor.ts:88-109`：失败时 `catch` 重新抛出异常，后续清理 loading 的 `.then` 不执行。
- `src/views/modules/BusinessGridRouteContent.tsx:75`：`editorLockLoading` 被合并到整个业务列表的 loading 状态。
- `src/views/modules/BusinessGridRouteContent.tsx:124`：调用方通过 `void` 丢弃 Promise，形成未处理拒绝。
- `src/views/modules/use-business-grid-editor.spec.ts:324-338`：测试明确断言失败后 loading 仍为 `true`，固化了错误状态。

#### 修复建议

使用 `try/catch/finally` 保证当前请求代次始终清理 loading；由 hook 统一处理错误，或要求调用方显式捕获。

### 3.10 中：页面错误边界不会随路由切换重置

#### 证据

- `src/layouts/AppLayout.tsx:104-110`：`key={openPageKey}` 设置在 `Outlet`，而不是 `AppErrorBoundary`。
- `src/components/AppErrorBoundary.tsx:24-39`：边界捕获错误后持续保持 error 状态，只有内部“重试”按钮会清理。
- `src/components/AppResult.tsx:58-70`：“返回”和“首页”只执行导航，不会重置错误边界。

#### 影响

页面发生渲染异常后，即使导航到首页或其他页面，用户仍可能停留在旧错误页。

#### 修复建议

按 `openPageKey` 重建错误边界，或增加 `resetKey` 并在变化时清除 error 状态。

### 3.11 中：认证状态初始化与 2FA 持久化不一致

#### 认证初始化

- `src/main.tsx:42-49`：调用 `hydrate()` 后仍使用调用前 `getState()` 返回的旧对象判断 `isAuthenticated`。
- `src/utils/storage.ts:93-96`：过期 token 被清除时，持久化用户仍可能存在。
- `src/stores/authStore.ts:72-80`：hydrate 会将“只有用户、没有 token”的状态标记为已认证，但 `authReady` 仍为 `false`。

这可能导致启动流程跳过 `restoreSession()`，让应用长期处于半初始化状态。

#### 2FA“记住我”状态丢失

- `src/views/auth/LoginView.tsx:43-47`：`remember` 只保存在内存 ref 中，默认值为 `true`。
- `src/views/auth/login-view-utils.ts:11-19`：TOTP 临时会话没有保存 `remember`。
- `src/views/auth/LoginView.tsx:83-87`：刷新 TOTP 页面后使用默认 `true` 完成验证。

用户取消“记住我”后进入 TOTP 页面并刷新，最终可能仍将登录凭据写入 localStorage。

#### 修复建议

1. hydrate 后重新读取最新 store 状态。
2. 明确 token、user、isAuthenticated、authReady 的状态机约束。
3. TOTP 临时会话保存并严格解析 `remember`，完成、过期或取消后统一清理。
4. 长期建议将 access token 保存在内存，将刷新或会话凭据放入 `HttpOnly + Secure + SameSite` Cookie。

## 4. 可访问性与体验问题

### 4.1 嵌套 WorkspaceOverlay 的焦点陷阱相互冲突

- `src/views/modules/components/WorkspaceOverlay.tsx:96-103`：Escape 只由最顶层 Overlay 处理。
- `src/views/modules/components/WorkspaceOverlay.tsx:104-127`：Tab 分支没有相同的最顶层判断。
- `src/views/modules/components/ModuleEditorWorkspace.tsx:176-244` 与 `src/views/modules/components/ModuleEditorItemsSection.tsx:161-183` 会形成嵌套 Overlay。

两个 document 级键盘监听器会同时处理 Tab，造成焦点跳跃或落回被遮挡的编辑器。Tab 与 Escape 应共用最顶层判断，底层 Overlay 应设置 `inert` 或 `aria-hidden`。

### 4.2 首次渲染被网络初始化阻塞

- `src/main.tsx:33-64`：在 `createRoot().render()` 前等待会话恢复和 setup 状态请求。
- `src/api/http.ts:4-7`：请求超时为 30 秒。
- `index.html` 的应用根节点没有初始加载内容。

后端缓慢或不可达时，用户可能看到接近 30 秒的空白页。建议立即挂载应用级启动页或骨架，将网络恢复逻辑移入可渲染的启动状态。

### 4.3 搜索与筛选控件缺少可访问名称

- `src/components/SystemTableToolbar.tsx:45-56` 的 `Input.Search` 只有 `id`、`name` 和 placeholder。
- `src/views/system/ApiKeyListToolbar.tsx:61-93` 的多个 Select 也仅依赖 placeholder。
- `src/views/system/ApiKeyListToolbar.spec.tsx:24-89` 的测试 Mock 额外添加了生产代码不存在的 `aria-label`，掩盖了真实缺陷。

应为工具栏控件提供可见 label 或本地化 `aria-label`，测试不应在 Mock 中凭空补齐语义。

## 5. 自动化验证结果

### 5.1 通过项

- `pnpm typecheck`
- `pnpm lint`：Biome 检查 995 个文件，无错误
- HTTP/认证相关定向测试：153 项通过
- `pnpm test:unit`：448 个测试文件通过、1 个跳过；5901 个测试通过、4 个跳过
- `pnpm build-only`：生产构建成功
- `pnpm audit --prod --registry=https://registry.npmjs.org`：无已知生产依赖漏洞
- `git diff --check`：通过
- 10 个本轮涉及的 Ant Design 生产文件逐文件执行 `antd lint --format json`，均为 0 issue
- React Doctor：97/100；报告的 semantic-release 未使用依赖为配置文件识别误报

### 5.2 Ant Design CLI 扫描

- 扫描 933 个文件。
- 未发现 deprecated API。
- 未发现 CLI 可识别的 a11y 问题。
- 唯一提示为 `OssSettingsView` 的 Select 使用 `virtual={false}`。该 Select 仅有 14 个固定 Provider 选项，性能成本可忽略，且完整 option DOM 对读屏更友好，因此不列为缺陷。

### 5.3 未通过项

`pnpm eslint` 返回 4 个 error、1 个 warning：

- `src/api/business-types.ts:39`：字符串字面量被 `string` 覆盖，联合类型退化。
- `tests/e2e/business-pending-invoice-report.spec.ts:100`：无用赋值及未使用变量。
- `tests/e2e/support/e2e-coverage.ts:97`：不必要的类型断言。

当前 `.github/workflows/ci.yml:38-39` 仅运行 `pnpm lint`，而该脚本只执行 Biome；ESLint 规则不在 CI 门禁内。建议增加 `pnpm eslint`，或合并为统一 lint 脚本。

### 5.4 未执行项

本次未执行依赖真实后端、浏览器和测试数据环境的完整 E2E 套件。

## 6. 技术实施细节与验收标准

### 6.1 打印模板执行模型

当前问题的根因不是某个遗漏的黑名单关键字，而是把不可信模板当作 JavaScript 程序执行。继续扩充正则黑名单无法建立可靠安全边界，修复目标应是让模板数据与可执行代码彻底分离。

建议把坐标模板编译为结构化命令，例如：

```ts
type LodopCommand = {
  method: AllowedLodopMethod
  args: Array<string | number | boolean>
}

type CompiledPrintTemplate = {
  version: 1
  commands: LodopCommand[]
}
```

执行器只允许以下流程：

1. 使用 Zod 或等价 schema 解析模板结构。
2. 校验 `method` 是否属于显式白名单。
3. 按方法分别校验参数数量、类型、长度和数值范围。
4. 使用 `lodop[command.method](...command.args)` 逐条调用。
5. 打印控制命令由应用代码统一追加，模板不能直接触发打印或预览。

字符串占位符替换必须发生在参数值上，而不是先拼接成 JavaScript 源码。即使业务字段包含引号、换行、模板标记或 JavaScript 片段，也只能作为普通字符串传给 LODOP。

验收条件：

- 生产源码不存在 `eval`、`new Function` 或等价动态代码执行。
- 非白名单方法、额外语句和非法参数会在执行前被拒绝。
- 恶意业务字段只能原样进入打印内容，不能改变命令结构。
- 现有标准模板的打印结果与迁移前一致。
- 服务端和前端对同一模板 schema 使用一致的版本规则。

### 6.2 身份切换与 QueryClient 生命周期

QueryClient 是进程级单例，而业务数据属于用户或租户级状态。身份切换必须被视为缓存安全边界，不能仅清理 Zustand 中的 token 和 user。

建议建立单一的会话协调入口，严格执行以下顺序：

```ts
await queryClient.cancelQueries()
queryClient.clear()
clearAuthStorage()
resetAuthStore()
resetPermissionAndMenuStores()
await navigateToLogin()
```

登录成功时，应先原子写入新的认证状态，再加载新用户的权限、菜单和业务查询。不要让 auth store、Web Storage、QueryClient 和权限 store 分别维护互不通知的身份状态。

如果确实需要保留公开缓存，应把公开查询和用户态查询放在不同 key namespace，只清理用户态 namespace；默认选择清空全部缓存更简单且更安全。

验收条件：

- A 用户查询的数据在注销完成后不再存在于 QueryCache。
- A 用户的未完成请求在注销后不能写回缓存。
- B 用户登录后首次读取相同 query key 时必须发起 B 身份下的新请求。
- 权限、菜单、Query 数据和当前用户在任何时刻属于同一 session epoch。
- 覆盖同一标签页 A→注销→B，以及多标签页注销同步测试。

### 6.3 异步弹窗采用 latest-request-wins

仅依赖 `AbortController` 不足以解决迟到响应：部分请求可能已经完成、底层客户端可能未正确传播 signal，或者 Promise 在取消前已进入回调队列。因此需要同时使用请求代次校验。

推荐模式：

```ts
const requestVersionRef = useRef(0)

async function openTarget(targetId: string) {
  const version = ++requestVersionRef.current
  const detail = await loadDetail(targetId)
  if (version !== requestVersionRef.current) return
  if (String(detail.id) !== String(targetId)) return
  applyDetail(detail)
}

function closeTarget() {
  requestVersionRef.current += 1
  abortCurrentRequest()
  resetState()
}
```

保存、启用或禁用 2FA 时，应在操作开始时捕获不可变的 `targetId`，避免异步确认框或后续 await 再读取可能变化的 React state。

验收条件：

- 以 deferred Promise 模拟 A 请求晚于 B 返回，最终界面和写操作目标必须始终是 B。
- 关闭弹窗后返回的旧响应不能重新打开弹窗或修改表单。
- 从编辑模式切换到创建模式后，旧详情不能写入创建表单。
- 2FA 生成、启用、禁用请求必须携带当前弹窗显示用户的 ID。

### 6.4 父单候选查询与软删除约束

“可导入”是服务端业务约束，不应由分页后的前端数组过滤来定义。建议为父单选择器提供专用候选分页接口，统一处理：

- `deleted = false`；
- 允许的业务状态；
- 剩余可导入数量；
- 当前用户的数据权限；
- 已建立关系或唯一性约束；
- 过滤后的 `totalElements`。

前端仍应在显示和提交前使用统一的 `isImportableParentRecord` 做防御性检查，但不能把它作为唯一数据完整性边界。最终创建或更新接口必须在同一事务内再次验证父单仍未删除且仍可导入，防止列表加载后发生并发变更。

验收条件：

- 任何软删除记录都不出现在候选响应中。
- 候选接口返回的 `total` 与所有页面可见记录总数一致。
- 某一页没有符合条件记录时，不会因为前端二次过滤产生伪空页。
- 父单在选择后、提交前被删除或耗尽数量时，服务端拒绝写入并返回明确业务错误。

### 6.5 HTTP 客户端响应契约

当前 `http` 封装约定响应拦截器直接返回响应体 `T`，业务 API 层不应绕过封装访问 `http.instance`。建议把该约束固化为以下规则：

- 普通 JSON：`http.get<ApiResponse<T>>()` 返回 `ApiResponse<T>`。
- Blob：`http.post<Blob>(url, body, { responseType: 'blob' })` 返回 `Blob`。
- 只有拦截器初始化和底层基础设施允许访问原始 AxiosInstance。
- 单元测试 Mock 必须模拟拦截后的有效返回值，而不是 AxiosResponse。

可在 ESLint 架构边界规则中禁止 `src/api` 业务模块直接访问 `http.instance`，防止同类错误再次出现。

验收条件：

- 导出接口测试直接返回 Blob，`downloadBlob` 收到同一个 Blob 实例。
- 浏览器集成测试验证下载事件、文件名和非空文件内容。
- 4xx/5xx 以及 Blob 错误响应仍通过统一错误归一化流程。

### 6.6 附件绑定的原子性

当前附件绑定属于典型的 read-modify-write 丢失更新。首选后端提供原子接口，例如单条 append 或一次提交多个新增 attachment ID；服务端在事务内基于唯一约束完成合并。

如果短期不能修改后端，前端至少需要：

1. 完成所有文件上传并收集成功的 attachment ID。
2. 只读取一次最新绑定。
3. 使用 `Set` 合并旧 ID 和全部新 ID。
4. 只提交一次更新请求。
5. 更新失败时明确展示“上传成功但绑定失败”的文件列表，支持重试绑定。

串行化每个“上传并绑定”任务可以缓解当前竞态，但吞吐较低，且不能处理多个浏览器客户端同时绑定；因此它只能作为临时方案。

验收条件：

- 同时粘贴多个文件后，所有成功上传的附件都只绑定一次。
- 任意上传失败不会删除已有绑定，也不会阻止其他成功项绑定。
- 两个客户端并发追加附件时不会互相覆盖。

### 6.7 Loading、错误传播与错误边界

异步状态清理应使用 `finally`，同时避免旧请求清理新请求的 loading：

```ts
const version = ++openVersionRef.current
setLoading(true)
try {
  const result = await loadEditorData()
  if (version !== openVersionRef.current) return
  applyResult(result)
} catch (error) {
  if (version === openVersionRef.current) showError(error)
} finally {
  if (version === openVersionRef.current) setLoading(false)
}
```

事件处理器不能通过 `void` 丢弃一个可能拒绝且内部未处理的 Promise。应由 hook 完整消费异常，或由调用方显式 `.catch()`。

错误边界应接收与路由页面一致的 `resetKey`。当 key 变化时清除 error，或者直接将 `key={openPageKey}` 放在 `AppErrorBoundary` 上，而不是只放在其子节点上。

验收条件：

- 详情和关联锁请求失败后，列表 loading 必须结束且用户收到单次错误提示。
- 较旧请求完成时不能关闭较新请求的 loading。
- 页面 A 渲染异常后，导航至页面 B 能正常渲染 B。
- “首页”“返回”和“重试”三个入口均有自动化回归测试。

### 6.8 认证状态机与 2FA 临时会话

建议明确以下状态不变量：

- `hydrating`：`authReady=false`，路由不得根据残留 user 判定已认证。
- `authenticated`：必须同时存在有效 token 和 user，且 `authReady=true`。
- `anonymous`：token 和 user 均为空，`authReady=true`。
- `refreshing`：继续使用当前有效 session，但只有同一 session epoch 的响应可以更新状态。

`isAuthenticated` 不应由 `Boolean(token || user)` 推导。hydrate 后的判断必须读取最新 store，而不是调用前保存的状态对象。刷新成功时，应原子更新内存 token、持久化状态、Zustand 用户、权限和刷新定时器。

TOTP 临时会话需要保存 `remember`，并采用严格 schema 校验：

```ts
type SavedTotpSession = {
  token: string
  deadline: number
  loginName: string
  remember: boolean
}
```

验收条件：

- 过期 token 加残留 user 的启动场景最终进入明确的 authenticated 或 anonymous 状态，不会永久停留在 `authReady=false`。
- 用户选择“不记住我”，在 TOTP 页面刷新后仍只能写入 sessionStorage。
- TOTP 成功、取消、过期和校验失败路径都按既定策略清理临时 token。

### 6.9 嵌套弹层与首屏启动

WorkspaceOverlay 应建立统一的弹层栈，只有栈顶弹层响应 Escape 和 Tab。栈下方容器应设置 `inert`，并按浏览器兼容策略补充 `aria-hidden`。焦点恢复目标必须仍然存在且属于当前可交互页面。

应用启动时应先同步挂载启动壳，再异步执行 session restore 和 setup 检查。启动壳至少提供可访问的 loading 文本或骨架，网络错误应在 30 秒超时前进入可重试状态，不能让根节点保持空白。

验收条件：

- 编辑器内打开父单选择器后，Tab/Shift+Tab 始终停留在顶层选择器内且不会跳过元素。
- 关闭顶层选择器后，焦点恢复至打开按钮或合理的编辑器控件。
- 断网和慢网下首屏立即出现启动反馈，并最终进入重试或错误页面。

### 6.10 回归测试矩阵

| 风险 | 测试层级 | 最低验收场景 |
|---|---|---|
| 打印模板执行 | 单元 + 安全测试 | 非白名单命令、附加语句和属性拆分全部被拒绝 |
| 跨账号缓存 | QueryClient 集成测试 | A 查询后注销，B 不读取 A 缓存且 A 请求不能回填 |
| 账号弹窗竞态 | Hook 单元测试 | A/B Promise 反序完成后只保留 B |
| 软删除父单 | API 契约 + 组件测试 | 删除记录不可见、不可选、不可提交 |
| Excel 导出 | API 单元 + 浏览器测试 | 拦截后直接返回 Blob，浏览器收到非空下载 |
| 附件绑定 | 并发集成测试 | 多文件和多客户端追加均无丢失更新 |
| 编辑器错误恢复 | Hook + 组件测试 | 请求失败后 loading 清理且无未处理拒绝 |
| 错误边界 | 路由组件测试 | 页面异常后切换路由自动恢复 |
| 认证初始化 | Store + 启动集成测试 | 过期、缺失、刷新成功和刷新失败均收敛到合法状态 |
| 嵌套弹层 | Playwright 键盘测试 | Tab 循环、Escape 关闭和焦点恢复符合预期 |

## 7. 建议修复顺序

1. 立即停止动态执行打印模板。
2. 修复跨账号 Query 缓存和账号管理跨目标竞态。
3. 阻止软删除父单导入，修复依赖漏洞。
4. 修复 Excel 导出、批量附件绑定和父单分页。
5. 修复编辑器 loading、错误边界和认证状态机。
6. 完成嵌套弹层、控件标签和首屏加载体验修复。
7. 将 ESLint 纳入 CI，并为上述竞态、身份切换和安全边界补充回归测试。

## 8. 修复实施状态（2026-07-10）

| 审查项 | 状态 | 本轮实现 | 剩余边界 |
|---|---|---|---|
| 3.1 打印模板动态执行 | 已完成（前端） | 新增严格 LODOP 指令解析器；渲染时按字符串/数值上下文绑定数据，数值只接受有限值；完整脚本仅接受 own-property 白名单中的低能力绘制/样式方法、受控字符串字面量、有限数值表达式及精确参数类型/数量；删除 `new Function`；方法缺失或任一调用失败时禁止预览/打印 | 后端保存侧仍需复用同等白名单，并审计数据库中的历史自定义模板 |
| 3.2 跨账号 Query 缓存 | 已完成（前端） | 身份变化和注销时先 `cancelQueries()`，再 `queryClient.clear()`；注销在调用后端接口前完成取消；新增身份隔离集成测试 | 后续可为全部 queryFn 统一透传 `AbortSignal`，并按多租户模型引入 session epoch |
| 3.3 账号编辑与 2FA 竞态 | 已完成 | 详情请求使用 `AbortSignal`；关闭、切换和卸载使请求代次失效；详情、登录名检查、保存前校验及 2FA 生成/启用/禁用均校验不可变目标 ID 与当前代次 | 已发送的服务端写请求无法由前端撤回，但迟到响应不会污染新会话 |
| 3.4 软删除父单 | 已完成（前端） | 候选过滤首先排除软删除；详情解析后及 `onSelect` 前再次校验 | 服务端仍应在事务内验证父单未删除 |
| 3.5 依赖漏洞 | 已完成 | `axios` 升级至 1.18.1；移除未使用的 `xlsx`；传递依赖 `form-data` 刷新至 4.0.6；官方生产审计从 11 项降至 0 项 | 后续依赖升级仍应持续执行审计和全量回归 |
| 3.6 Excel 导出 | 已完成 | 改用 `http.post<Blob>()`，直接消费拦截器返回的 Blob；测试 Mock 同步为真实响应契约 | 建议补真实浏览器下载 E2E |
| 3.7 批量附件绑定 | 已完成（前端防御） | 粘贴多文件改为串行上传和绑定，避免同一客户端内并发读改写覆盖 | 多客户端并发仍需后端原子 append/版本控制接口彻底解决 |
| 3.8 父单分页过滤 | 待后端契约 | 未采用前端全量拉取等高成本规避方案 | 需新增服务端候选分页接口并返回过滤后的 `total` |
| 3.9 编辑器 loading | 已完成 | 当前请求使用 `try/catch/finally` 收敛 loading，hook 内消费拒绝，旧代次不清理新请求状态 | 可按产品需求补充显式错误提示或遥测 |
| 3.10 错误边界 | 已完成 | `AppErrorBoundary` 新增 `resetKey`，`AppLayout` 传入当前 `openPageKey`；路由变化自动清除旧错误 | 无 |
| 3.11 认证初始化与 TOTP | 已完成 | hydrate 后重新读取最新 store；TOTP 临时会话保存并恢复 `remember`，旧格式安全降级为非持久登录 | 长期仍建议改为内存 access token + HttpOnly Cookie 会话模型 |
| 4.1 嵌套 Overlay | 已完成 | Tab 与 Escape 共用最顶层判定，底层 Overlay 不再重复处理键盘事件 | 后续可补 `inert`/`aria-hidden` 和 Playwright 真浏览器焦点回归 |
| 4.2 首屏空白 | 已完成 | React Root 立即渲染带 `role="status"` 的启动壳，网络初始化完成后再切换到应用 | 初始化异常的独立错误态可继续完善 |
| 4.3 控件可访问名称 | 已完成 | 通用搜索框及 API Key 用户/状态/范围筛选增加本地化 `aria-label`；测试 Mock 不再凭空生成语义 | 无 |

本轮已完成上述前端代码与依赖整改，官方生产依赖审计已清零。剩余事项均需要后端配合：提供父单候选分页接口、提供附件原子追加或版本控制接口、实施服务端打印模板白名单，以及在创建或更新事务内校验父单未被软删除。

本轮没有修改后端、数据库、Git 历史或本地测试 API Key，也没有执行提交或推送。
