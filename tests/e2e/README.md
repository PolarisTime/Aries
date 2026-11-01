# E2E Test Suite

本套件面向当前应用（单数路由、JWT 登录）重建，使用真实后端运行。

运行：

```bash
cd /home/instance/Gemini/aries
E2E_BACKEND_MODE=real E2E_LOGIN_NAME=admin_prod E2E_LOGIN_PASSWORD=123456 \
  pnpm exec playwright test --reporter=line
```

## 认证方式

测试通过 `POST /api/v2.0/auth/login` 获取 JWT，再注入浏览器
`localStorage`（`aries-token` / `aries-user` / `aries-token-expires-at` /
`aries-auth-persistence`）并写入 refresh cookie。统一入口：

- `support/api-key.ts`：`primeApiKeySession(page)`（保留历史导出名，实现为 JWT 登录）、
  `getPasswordSession(request)`、`fetchCollection` / `fetchData` / `fetchDetail`。
- `support/business-e2e.ts`：`loginAsE2eUser`、列表关键字搜索、筛选 chip、行编辑浮层等页面级 helper。
- `support/test.ts`：页面 fixture（清空会话、注入 locale、覆盖率采集、antd 废弃告警判红）与
  `assertNoFatalUiErrors` 致命前端错误断言。**所有 spec 必须从这里导入 `test`**，禁止直接
  `import { test } from '@playwright/test'`（否则不采集覆盖率、不跑致命 UI/废弃 API 门禁）。
- `support/data-fixtures.ts`：hermetic 数据前置（见下节「数据前置与清理」）。

## 数据前置与清理（hermetic fixtures，硬约束）

**每个用例必须自己造前置数据，不得假设共享开发库里有历史数据。** 统一用
`support/data-fixtures.ts`：

```ts
import { createE2eFixtures } from './support/data-fixtures'
import { test } from './support/test'

test('示例', async ({ page, request }) => {
  const fixtures = await createE2eFixtures(request)
  try {
    const { company, customer, supplier, warehouse, material, project, carrier } =
      await fixtures.ensureStableMasterData()          // 跨 run 复用的主数据
    await fixtures.ensureCustomerStatementCandidates()  // 需要「完成销售」候选时
    const receipt = await fixtures.createDraftReceipt({ customer, company }) // run 级单据
    // …页面操作与业务断言…
  } finally {
    const failures = await fixtures.cleanup()           // 逆序回退状态 + DELETE
    if (failures.length > 0) test.info().annotations.push({ type: 'cleanup-failure', description: failures.join('; ') })
  }
})
```

约定：

- **两类数据**：
  - **稳定主数据**（结算主体+账户、客户、供应商、仓库、项目、商品资料、物流方）：用固定标识
    `E2E-FIXTURE` **先查后建、全库只保留一份**，跨 run 复用，`cleanup()` 不删除。
  - **run 级单据**（采购订单/入库/销售订单/出库/收付款/对账单）：每次 run 现建，命名带
    `E2E-FIX-<runSuffix>` 前缀；`cleanup()` 先按状态机回退（完成销售→交付核定→已审核→草稿 等），
    再 `DELETE`。**列表/筛选类用例只造草稿单据**（可删）。
- **清理失败不静默**：失败项以 `[e2e-fixtures] …` warn 输出并返回，用例应写入
  `cleanup-failure` annotation；禁止 `catch {}` 吞掉。
- **已知不可清理例外（后端产品规则，登记在案）**：
  1. **已审核收款单/付款单**：没有回退迁移、`DELETE` 受保护状态拦截，无法清理。
     资金流水/财务概览这类必须已审核单据的场景每 run **至多 1 条已审核收款单**（用例标注
     `cleanup-uncleanable`）；对账与财务真实操作里的「收款单/付款单审核」用例各需
     1 条已审核单据，因此**一次完整 run 会在库里留下 2 条已审核收款单 + 1 条已审核付款单**，
     这是当前产品规则下不可消除的累积，需由测试库定期清理或后端提供硬删能力。
  2. **常驻商品资料 1 条**（`brand/spec = E2E-FIXTURE`）：被单据引用后后端拒绝删除（即使单据已删），
     只能跨 run 复用，不随 run 增长。
  3. **完成销售的单据链**（采购→入库→销售→出库）：销售订单到「交付核定/完成销售」后不可回退，
     故 fixture 的销售链只建一次并跨 run 复用；对账/物流用例消费它，不重复造链。
- **禁止假绿**：数据缺失必须走 fixture 造数；造不出就用例失败（红）。只有**确有产品原因**的
  `test.skip`/`test.fixme` 才允许，且必须在注释与交付说明里逐条写明原因；禁止用
  `relaxed`/`blocked`/`skip-reason` 提前 `return` 让用例在没验证业务时变绿。
- **并发**：同一 checkout 同一时刻只允许一个 e2e run（端口、共享开发库、Playwright outputDir
  都假定单 run）；fixture 的稳定主数据是「先查后建」，并发 run 仍可能产生重复，故不承诺并发安全。

## 覆盖率

设置 `E2E_COVERAGE=1` 时启用 V8 → Istanbul 覆盖率采集，产物在 `coverage-e2e/`。
覆盖率相关支撑（`support/e2e-coverage*.ts`、`global-teardown.ts`）保持可用。

## 产物目录与并发

Playwright 官方语义是「每次 run 启动即清空 `outputDir`（默认 `test-results`）」
（`playwright/types/test.d.ts`：testProject.outputDir — "This directory is cleaned at the
start."）。同一 checkout 并发跑两次 e2e 时，后启动的 run 会把先启动那次的产物整目录删掉，
表现为运行中读夹具/写截图报 `ENOENT`（`material-versioning` 的 xlsx 夹具、
`material-import-preview-overflow` 的 CSV 夹具都踩过）。

约定：

- `playwright.config.ts` 的 `outputDir` 按 run 派生：默认
  `test-results/run-<pid>-<启动时间戳>`；设置 `E2E_OUTPUT_DIR` 时以它为根目录，再追加同一个
  run 子目录。`E2E_RUN_OUTPUT_DIR` 是 config 写给 worker 复用的内部变量，不要手工设置。
- 不要用 `preserveOutput` 冒充防清理：它只影响失败产物的保留，不改变「启动即清空」的语义，
  共用目录的并发 run 照旧互删。
- 用例内的夹具与产物统一走 `support/run-output.ts`：
  `writeRunFixture(testInfo, name, content)` 写夹具、`captureRunArtifact(page, testInfo, name)`
  存截图，两者都落在本轮 run 目录内，不再用 `os.tmpdir()` / `E2E_ARTIFACT_DIR` 绕过清理。
- `playwright-output-dir.spec.ts` 是 config 级用例：把 `outputDir` 改回常量（如默认
  `test-results`）它会变红。
- 并发自检：

  ```bash
  cd /home/instance/Gemini/aries
  npx playwright test tests/e2e/playwright-output-dir.spec.ts --reporter=line &
  npx playwright test tests/e2e/playwright-output-dir.spec.ts --reporter=line &
  wait
  ```

  两次 run 各自生成独立目录、产物完整且日志无 `ENOENT`；带上
  `E2E_OUTPUT_ISOLATION_WATCH_MS=8000` 可让夹具在并发窗口期内被复查。

## 诊断

`debug-*.spec.ts` 诊断用例已随退役模块移除。如需新增，请放入独立文件并使用
`--grep` 显式运行，避免污染主套件。
