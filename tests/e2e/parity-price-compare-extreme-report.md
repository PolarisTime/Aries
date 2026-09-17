# 报单比价极端场景 E2E 报告

- 仓库：`aries`（前端），后端 `leo` 运行于 `http://127.0.0.1:11211`（真实模式）
- 前端：`http://127.0.0.1:3100`（`E2E_BACKEND_MODE=real`，workers=1）
- 用例：
  - `tests/e2e/parity-price-compare-concurrency.spec.ts`（10 条，全部通过）
  - `tests/e2e/parity-price-compare-edit-lock.spec.ts`（6 条，全部通过，多角色编辑锁与路由释放）
  - 多角色夹具：`tests/e2e/support/multi-role-account.ts`（临时角色 + 用户，用例后清理）
- 修复：
  - `src/views/price-compare/useSheetsStore.ts`（锁定规格数量后撤销/重做的一致性缺陷）
  - 编辑锁：离开 `/price-compare` 路由立即释放并停止续约，返回时重新签出（DEF-2）
- 运行方式：
  `E2E_BACKEND_MODE=real E2E_LOGIN_NAME=admin_prod E2E_LOGIN_PASSWORD=123456 pnpm exec playwright test tests/e2e/parity-price-compare-concurrency.spec.ts tests/e2e/parity-price-compare-edit-lock.spec.ts`

## 1. 极端情况清单（含实现情况）

### A. 乐观并发

| 编号 | 场景 | 状态 | 说明 |
| --- | --- | --- | --- |
| A1 | 旧版本写 → 412 | ✅ 已实现 | API 契约 + 两浏览器上下文 UI 冲突弹窗 |
| A2 | 缺版本前置条件 → 428 | ✅ 已实现 | 原始请求无 `X-Resource-Version` |
| A3 | 「重新加载（丢弃我的改动）」收敛 | ✅ 已实现 | 两上下文 UI 路径，服务端保持对方值 |
| A4 | 「以我的覆盖」收敛 | ✅ 已实现 | 覆盖重发 200，服务端变为本地值 |
| A5 | 同一上下文连续快速写 | ✅ 已实现 | 版本链恰好 +2，无丢失更新、无冲突弹窗 |
| A6 | 数值型雪花 ID 请求体 | ✅ 已实现 | 后端契约强制字符串，返回 400 |

### B. 编辑签出锁

| 编号 | 场景 | 状态 | 说明 |
| --- | --- | --- | --- |
| B1 | A 签出后 B 打开 → 只读 | ✅ 已实现 | 多角色夹具创建临时普通角色/用户，B 只读且顶部横幅显示占用人 |
| B2 | A→B→A 快速切换（迟到响应不误删新锁） | ✅ 已实现 | 用 `page.route` 仅延迟首次签出响应 2.5s，确定性复现竞态 |
| B3 | 签出过期后接管 | ✅ 已实现 | 关闭 A 页面后等待服务端 120s TTL 过期，B 无需 force 接管 |
| B4 | 强制接管（force） | ✅ 已实现 | B 二次确认后 `force=true` 接管成功，A 的后续保存返回 409 |
| B5 | 离开页面/卸载后释放锁 | ✅ 已实现（含修复） | 切到工作台标签立即 `DELETE` 释放，返回比价标签重新签出；见 DEF-2 |
| B6 | 续约请求飞行中关闭 | ✅ 已实现 | `page.clock` 推进 60s 触发续约并挂起请求，关闭页面后锁仅按 TTL 释放 |

### C. 锁定规格数量

| 编号 | 场景 | 状态 | 说明 |
| --- | --- | --- | --- |
| C1 | 锁定后 UI 只读（规格/吨位/增删行/拖拽） | ✅ 已实现 | 断言 `disabled` / `aria-disabled` |
| C2 | 锁定后改规格/加行/删行 → 后端 422 | ✅ 已实现 | 三个入口分别断言 422 |
| C3 | 解锁后放行 | ✅ 已实现 | UI 恢复可编辑，API 改规格返回 200 |
| C4 | 与参照锁互不影响 | ✅ 已实现 | 只锁规格数量时 `locked` 仍为 false |
| C5 | 锁定后撤销/重做被拒绝 | ✅ 已实现（含修复） | 初始失败 → 缺陷 DEF-1 → 修复后通过 |

### D. 保存失败 / 离线

| 编号 | 场景 | 状态 | 说明 |
| --- | --- | --- | --- |
| D1 | 写请求 5xx → 本地编辑不丢 | ✅ 已实现 | `route.fulfill(500)`，输入保持、服务端未写入 |
| D2 | 30s/聚焦刷新不静默覆盖 | ✅ 已实现 | 触发 `focus` 强制刷新路径，本地值保留 |
| D3 | 恢复后补发 | ✅ 已实现 | 解除拦截 + focus，服务端最终写入新值 |
| D4 | 网络中断（`route.abort`）写失败 | ⛔ 未实现 | 拦截层 abort 产生 `ERR_NETWORK`，应用会跳转 `/server-error`（全局离线页），无法在比价页内继续断言；改用 5xx 表达写失败 |

### E. 配置未加载

| 编号 | 场景 | 状态 | 说明 |
| --- | --- | --- | --- |
| E1 | 挂起 `GET /quote-project-configs/*` → 编辑不丢、就绪后补发 | ✅ 已实现 | 注意不能 `abort`（会触发全局离线页），改为挂起路由，就绪后 `route.continue()` |

### F. 边界

| 编号 | 场景 | 状态 | 说明 |
| --- | --- | --- | --- |
| F1 | 空行 / 未选规格 | ⛔ 未实现 | 行不完整时前端仅置脏、不发写；用例价值低于 D/E，未纳入 |
| F2 | 超长备注（>255） | ✅ 已实现 | 422 |
| F3 | 负值吨位 | ✅ 已实现 | 422；极大值未断言（后端未设上限） |
| F4 | 同一行重复品牌现货价 | ✅ 已实现 | 422（UI 无此入口，走 API） |
| F5 | 跨零点日期（orderDate 为本地日期） | ⛔ 未实现 | 需要 `page.clock` 注入接近午夜的时间，存在与其它计时器耦合的风险，未纳入 |
| F6 | 雪花 ID 全程字符串 | ✅ 已实现 | 响应为字符串、数值型请求体 400、表格 `data-ton` 行键、请求路径均为字符串 ID |

## 2. 新增 / 修改文件

| 文件 | 变更 |
| --- | --- |
| `tests/e2e/parity-price-compare-concurrency.spec.ts` | 新增，10 条极端场景 E2E |
| `tests/e2e/parity-price-compare-edit-lock.spec.ts` | 新增，6 条多角色编辑锁 / 路由释放 E2E |
| `tests/e2e/support/multi-role-account.ts` | 新增，临时角色 + 用户夹具（创建/登录/清理） |
| `src/views/price-compare/useSheetsStore.ts` | 修复：规格数量锁定期间禁用撤销/重做；离开路由释放编辑锁并停止续约 |
| `src/views/price-compare/price-compare-view-hooks.ts` | 新增 `usePriceCompareRouteActive()`（依据激活标签路径判断路由） |
| `src/views/price-compare/PriceCompareView.tsx` | 将路由活跃态传入 `useSheetsStore` |
| `tests/e2e/parity-price-compare-extreme-report.md` | 本报告 |

提交：见本次仓库提交（用例、修复与本报告同一 commit）。

## 3. 每条 E2E 的真实结果

| # | 用例 | 结果 |
| --- | --- | --- |
| 1 | API 契约：缺版本 428 / 旧版本 412 / 数字雪花ID 400 / 锁定与边界 422 | PASS |
| 2 | 两上下文并发：旧版本写触发 412 冲突，以我的覆盖收敛 | PASS |
| 3 | 两上下文并发：旧版本写后重新加载丢弃本地改动 | PASS |
| 4 | 同一上下文连续快速写：版本链正确且无丢失更新 | PASS |
| 5 | 编辑锁 A→B→A 快速切换：迟到签出响应不误删新锁 | PASS |
| 6 | 锁定规格数量：UI 只读 + 后端 422，解锁放行且参照锁独立 | PASS |
| 7 | 保存失败(5xx)不丢编辑：本地保留，恢复后补发 | PASS |
| 8 | 项目配置未加载：编辑不丢失，配置就绪后补发 | PASS |
| 9 | 雪花 ID 全程字符串：响应/行键/请求路径均为字符串 ID | PASS |
| 10 | 锁定规格数量后撤销不生效：本地与服务端保持一致 | PASS（修复后） |
| 11 | 他人签出后第二账号只读并显示占用人 | PASS |
| 12 | 强制接管成功后原持有人保存被 409 | PASS |
| 13 | SPA 切换到其它标签页立即释放编辑锁, 返回后重新签出 | PASS（DEF-2 修复后） |
| 14 | 普通用户越权访问受保护报价接口返回 403 | PASS |
| 15 | 锁 TTL 过期后他人无需 force 即可接管 | PASS（约 2.2m） |
| 16 | 续约请求飞行中关闭页面: 不再续约且锁按 TTL 释放 | PASS（约 2.1m） |

汇总：concurrency 10 passed（1.1m）+ edit-lock 6 passed（4.8m）。相关 vitest：`pnpm exec vitest run`
1015 passed（含新增 4 条路由释放/补签出用例，原 1011）；`pnpm typecheck` 通过；
`npx eslint .` 退出码 0；`npx biome check src tests/e2e` 退出码 0（仅既有 core.spec.ts 的 info）。

## 4. 发现的真实缺陷

### DEF-1（P2，已修复）锁定规格数量后撤销回退本地吨位，导致前后端不一致

- 复现：
  1. 打开某批次，把吨位由 5 改为 8、再改为 9（各自落库成功）；
  2. 点击「锁定规格和数量」，服务端 `specQuantityLocked=true`；
  3. 连按两次 `Ctrl+Z`。
- 现象：第二次撤销把本地吨位回退为 8，但输入框此时是 `disabled`；自动保存请求被后端 422 拒绝，
  于是 UI 显示 8、服务端仍为 9，直到刷新前一直不一致。
- 证据：修复前该用例失败——
  `Locator: input[data-ton] ... Expected: "9" Received: "8"`，且 `GET /quote-sheets/{id}` 返回 `ton=9`。
- 根因：`undo/redo` 仅以 `readOnlyRef`（他人签出）为守卫，未考虑 `specQuantityLocked`；
  `preserveLockFields` 只保留锁标志、不阻止回退规格/吨位。
- 修复：`useSheetsStore.ts` 新增 `activeSheetSpecQuantityLocked(snapshot)`，`undo/redo` 命中即直接返回，
  并让 `canUndo/canRedo` 同步为 false。修复后用例 #10 通过，price-compare 73 条单测全绿。

### DEF-2（P3，已修复）离开比价视图不释放编辑锁

- 复现：签出批次后切到工作台标签（SPA 标签页切换，不卸载视图），轮询 `GET /quote-sheets/{id}/edit-locks` 持续为 `locked=true`。
- 现象：SPA 工作区按标签页保活，切换路由不卸载 `PriceCompareView`，因此清理副作用未执行；
  页面可见时续约定时器（60s）继续续约，锁一直被占用，他人只能等待 120s TTL 或强制接管。
- 证据：修复后新增用例「SPA 切换到其它标签页立即释放编辑锁, 返回后重新签出」通过——
  切换标签即观测到 `DELETE /quote-sheets/{id}/edit-locks`（204），返回标签后重新 `POST` 签出。
- 根因/修复：`useSheetsStore` 新增 `routeActive` 入参，`PriceCompareView` 经
  `usePriceCompareRouteActive()`（依据全局激活标签路径而非视图内子 Router location）判断是否仍在
  `/price-compare`；离开时释放当前锁并停止续约（保留页面本地状态），返回时重新签出，
  并沿用既有代次/卸载标记守卫，迟到响应不误删返回后重新签出的锁。
- 衍生缺陷（已修复）：本地新建批次在防抖 `create` 成功后会补签出编辑锁，若在 `create` 返回前已离开
  `/price-compare`，仍会在后台签出并续约。修复为 `create` 成功补签出前校验最新 `routeActive`，
  离开时不签出、返回后由切换 effect 补签；vitest 用例「离开路由后新批次落库不后台签出, 返回后补签出」
  在移除该守卫时稳定失败（`acquireQuoteSheetEditLock` 被调用），加回后通过。

## 5. 未覆盖 / 存疑

- **越权写入（非只读）**：403 用例覆盖了普通用户读取受保护报价接口；写接口（创建/更新/编辑锁）同权限模型，
  未逐条断言，但由 `quote-sheets:update` 权限门禁保证。
- **续约飞行中关闭的「不再续约」直接计数**：关闭页面后无法在浏览器侧直接计数，改为断言锁仅在 120s TTL 后过期
  （若仍续约则不会过期），等价证明不再续约。
- **跨零点日期（F5）**：`orderDate` 默认取本地日期（`dayjs().format`），需要时钟注入才能稳定验证，未做。
- **极大吨位、空行未选规格（F1/F3 部分）**：后端未对吨位设上限、前端对不完整行只置脏不落库，未做专门断言。
- **测试基础设施注意点**：
  - 后端 `DEFAULT_MAX_REFRESH_TOKENS=3`，多次登录会互相驱逐（`SESSION_EVICTED/401`）。
    用例已改为「页面上下文内请求」（`page.request`）并带一次性 401 重登重试，避免跨测试会话驱逐导致误报。
  - `page.route(...).abort()` 会被应用 `auth-interceptor` 识别为 `ERR_NETWORK` 并跳转 `/server-error`，
    因此「网络中断」类场景一律改用 `fulfill(500)` 或挂起（hold）路由表达。
  - 「续约飞行中关闭」使用 Playwright `page.clock` 仅推进**浏览器侧**定时器（服务端 TTL 不受影响），
    在签出前 `clock.install()` 以捕获 60s 续约 interval。
- **数据可重复性**：使用独立测试项目 `900000000000000100`（雪花字符串）承载品牌配置；
  每个用例用唯一批次名创建，`afterEach` 软删除（`DELETE /quote-sheets/{id}`）；多角色夹具创建的角色/用户
  在用例 `finally` 中软删除。运行后已确认无残留批次。
