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
bash scripts/env-local.sh
```

启动开发服务器：

```bash
pnpm dev --host 0.0.0.0
```

默认通过 `.env.local` 中的 `VITE_PROXY_TARGET` 代理 Leo 后端。

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
pnpm build-only
pnpm test:e2e
```

如需运行依赖登录态的 E2E 调试脚本，请通过环境变量注入测试账号：

```bash
E2E_LOGIN_NAME=your_user E2E_LOGIN_PASSWORD=your_password pnpm test:e2e
```

## 环境变量

本地环境文件为 `.env.local`，已被 `.gitignore` 忽略，不应提交真实地址、令牌或其他敏感数据。

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
