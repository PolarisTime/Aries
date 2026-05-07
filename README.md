# Aries Web

Aries 是 Leo ERP 的前端工作台，负责业务单据录入、审批、查询、全局搜索、附件操作和系统设置页面。

## 技术栈

- Vue 3
- TypeScript
- Vite 8
- Pinia
- Vue Router
- TanStack Query
- Ant Design Vue
- TanStack Table
- Vitest
- Playwright

## 本地开发

安装依赖：

```bash
pnpm install
```

生成本地环境文件：

```bash
pnpm env:local
```

启动开发服务器：

```bash
pnpm dev --host 0.0.0.0
```

默认地址：`http://localhost:3100`

默认通过 `.env.local` 中的 `VITE_PROXY_TARGET` 代理后端，脚本默认写入：

- `VITE_API_BASE_URL=/api`
- `VITE_PROXY_TARGET=http://127.0.0.1:11211`

## 常用命令

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e:mock
pnpm test:e2e:real
```

如需重新生成后端 OpenAPI 类型：

```bash
pnpm generate:api
```

## 关键能力

- 业务单据表格工作台与统一操作列
- 双击打开单据的查看/编辑行为
- 附件上传、绑定、预览
- 权限驱动菜单和页面访问控制
- 聚合全局搜索：按权限搜索采购、销售、合同、对账、收付款、开收票等业务单据
- 大量系统开关、通用设置和页面行为配置

## CI 校验

GitHub Actions 当前会执行以下步骤：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
docker build -t aries-web:ci .
```

## 环境变量

本地环境文件为 `.env.local`，已被 `.gitignore` 忽略。

常见变量：

- `VITE_APP_TITLE`
- `VITE_API_BASE_URL`
- `VITE_PROXY_TARGET`

## 提交前建议

1. 确认 `.env.local` 未被跟踪。
2. 确认测试代码没有写入真实账号或密码。
3. 至少执行 `pnpm lint`、`pnpm typecheck`、`pnpm test:unit`。
