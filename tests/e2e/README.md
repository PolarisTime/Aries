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

## 诊断

`debug-*.spec.ts` 诊断用例已随退役模块移除。如需新增，请放入独立文件并使用
`--grep` 显式运行，避免污染主套件。
