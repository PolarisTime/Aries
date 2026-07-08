<!-- antd-cli setup start -->
## Ant Design CLI Skill

Use the shared Ant Design skill at `.agents/skills/antd/SKILL.md` before working on Ant Design code in this repository.

The skill teaches agents when and how to call `@ant-design/cli` commands such as `antd info`, `antd doc`, `antd demo`, `antd token`, `antd semantic`, and `antd changelog`.

<!-- antd-cli setup end -->

## Skill Policy

Use only the skills listed below for this repository. Treat every unlisted skill as disabled unless the user explicitly names it for the current turn.

Frontend skills:
- `antd`, `react-best-practices`, `react-patterns`, `react-state-management`
- `typescript-expert`, `typescript-pro`, `frontend-api-integration-patterns`
- `frontend-dev-guidelines`, `senior-frontend`
- `react-component-performance`, `web-performance-optimization`
- `ui-a11y`, `accesslint-audit`, `wcag-audit-patterns`
- `e2e-testing`, `playwright-skill`, `javascript-testing-patterns`, `test-automator`

Backend skills:
- `backend-architect`, `backend-dev-guidelines`, `backend-development-feature-development`
- `backend-security-coder`, `api-design-principles`, `api-patterns`, `api-endpoint-builder`
- `openapi-spec-generation`, `api-documentation`
- `database-design`, `database-migration`, `database-migrations-sql-migrations`
- `postgresql`, `postgres-best-practices`, `postgresql-optimization`
- `sql-pro`, `sql-optimization-patterns`
- `test-driven-development`, `unit-testing-test-generate`, `testing-patterns`

Full-stack, architecture, and quality skills:
- `architecture`, `software-architecture`, `architecture-patterns`, `improve-codebase-architecture`
- `production-code-audit`, `codebase-audit-pre-push`
- `security-audit`, `api-security-best-practices`, `security-scanning-security-sast`
- `application-performance-performance-optimization`, `performance-engineer`
- `docker-expert`, `deployment-engineer`, `deployment-procedures`
- `bash-defensive-patterns`, `bash-pro`, `mcp-builder`, `mcp-tool-developer`

## Mandatory Pre-Development Check

在开始任何前端代码修改、调试、重启服务、提交或部署前，必须先完成开发前检查；检查未完成时不得改文件、启动长任务或执行提交/部署。

- 执行 `git status --short --branch`，确认当前分支、是否有未提交改动、是否 ahead/behind/diverged。
- 如果仓库落后上游且工作区干净，必须先执行 `git pull --ff-only`，把本地快进到远端最新提交；禁止产生 merge commit。
- 如果仓库存在未提交改动、分支分叉、rebase/merge 进行中，必须先向用户说明状态并等待明确处理指令；不得自动覆盖、回滚或强推。
- release 后继续开发前，必须先拉取 `semantic-release` 生成的版本提交，例如 `chore(release): x.y.z`，确保本地 `package.json` 与 `CHANGELOG.md` 和远端一致。
- 检查完成后，在工作更新中说明分支、同步结果和工作区是否干净，再继续开发。
