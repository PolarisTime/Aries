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
- `support/test.ts`：页面 fixture（清空会话、注入 locale、覆盖率采集）与
  `assertNoFatalUiErrors` 致命前端错误断言。

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
