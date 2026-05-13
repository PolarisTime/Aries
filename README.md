# Aries Web

Aries 是 Leo ERP 的 React 前端工作台，基于 `Vite 8 + React 19 + TypeScript + Ant Design 6`。

## 技术栈

- React 19
- TypeScript
- Vite 8
- TanStack Router
- TanStack Query
- Ant Design 6
- Zustand
- Day.js
- Biome
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

如果需要同时启动前后端，优先在工作区根目录执行：

```bash
bash scripts/start-local.sh
```

## 常用命令

```bash
pnpm lint
pnpm lint:fix
pnpm format
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

## 工程约定

- 使用 `Biome` 统一处理 lint 和 format，不再单独使用 ESLint / Prettier。
- 使用 `TanStack Query` 管理服务端状态与缓存。
- 不引入 `ant-design-pro` 脚手架，不切换到 `Umi`。
- 如需 Pro 风格组件，只局部引入 `@ant-design/pro-components`。

## 提交前检查

1. 确认 `.env.local` 未被跟踪。
2. 确认测试或调试代码没有写死真实账号、密码、API Key。
3. 运行以下检查：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build-only
```
