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
- ESLint
- React Doctor

## 本地开发

安装依赖：

```bash
pnpm install
```

生成开发环境文件：

```bash
bash scripts/env/dev.sh
```

启动开发服务器：

```bash
pnpm dev --host 0.0.0.0
```

也可以使用分层后的启动入口：

```bash
bash scripts/frontend/start-dev.sh
```

默认通过 `.env.local` 中的 `VITE_PROXY_TARGET` 代理 Leo 后端。

如果需要同时启动前后端，优先在工作区根目录执行：

```bash
bash ../leo/scripts/dev.sh start
```

## 常用命令

```bash
pnpm lint
pnpm contract:check
pnpm lint:fix
pnpm format
pnpm typecheck
pnpm build-only
pnpm exec react-doctor . --full --no-score
pnpm release:dry-run
```

自动化测试已归档在 `archive/tests/`，当前活动工程不维护或运行测试套件。

## 环境变量

本地环境文件为 `.env.local`，已被 `.gitignore` 忽略，不应提交真实地址、令牌或其他敏感数据。

常见变量：

- `VITE_APP_TITLE`
- `VITE_API_BASE_URL`
- `VITE_PROXY_TARGET`

## 工程约定

- 使用 `Biome` 与 `ESLint` 执行静态检查，使用 `Biome` 统一格式化。
- 使用 `TanStack Query` 管理服务端状态与缓存。
- JSON API 响应必须在 `src/api/` 边界通过 Zod schema 解析；契约变更流程与门禁边界见 [`docs/api-contract-governance.md`](docs/api-contract-governance.md)。
- 不引入 `ant-design-pro` 脚手架，不切换到 `Umi`。
- 如需 Pro 风格组件，只局部引入 `@ant-design/pro-components`。

## 自动版本发布

- `main` 分支推送会运行 `.github/workflows/release.yml`，由 `semantic-release` 根据 Conventional Commits 自动计算下一个版本。
- 发布流程会更新 `package.json` 版本和 `CHANGELOG.md`，创建 `vX.Y.Z` tag 与 GitHub Release；`package.json` 为 `private`，不会发布到 npm registry。
- 仓库必须配置 `SEMANTIC_RELEASE_TOKEN` secret。该 token 需要能向 `PolarisTime/Aries` 推送 commit/tag 并创建 release；不能只依赖默认 `GITHUB_TOKEN`，否则 workflow 创建的 tag 不会继续触发现有生产部署 workflow。
- `vX.Y.Z` tag 会触发 `.github/workflows/deploy-production.yml`，部署包 manifest 和归档名会携带语义版本号。

## 提交前检查

1. 确认 `.env.local` 未被跟踪。
2. 确认本地环境文件没有写死真实账号、密码、API Key。
3. 运行以下检查：

```bash
pnpm lint
pnpm contract:check
pnpm typecheck
pnpm build-only
pnpm exec react-doctor . --full --no-score
```
