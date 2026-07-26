# API 契约治理

## 状态

已采纳，2026-07-26。

## 背景

Aries 的 JSON API 边界已经使用 Zod 校验运行时响应，并由 schema 推导前端类型。仓库中曾有两套 `openapi-typescript` 入口，但生成目标 `src/types/api-schema.ts` 从未纳入版本历史，也没有源码消费者。

原生成命令还依赖本机运行中的 Leo，并请求 `/api/v3/api-docs`。当前 Leo 默认关闭 springdoc，配置的实际文档路径是 `/api/api-docs`；Aries CI 也不检出或启动 Leo。因此，这条链路既不可复现，也不能作为契约漂移门禁。

## 决策

1. Aries 的前端 wire contract 由 `src/shared/schemas/` 及各 API 模块引用的 Zod schema 表达。JSON 响应进入 Query cache、store 或页面前必须完成解析。
2. Leo 的 Controller、请求/响应 DTO 和错误码仍是服务端行为依据。跨仓契约变更必须在同一变更单中同步审查两侧；当前不存在自动验证 Leo 与 Aries 完全一致的单一真相源。
3. 删除无人消费且不可复现的 OpenAPI 类型生成入口与依赖。`tools/typescript-toolchain` 继续只负责隔离 ESLint 所需的 TypeScript 5.9 工具链。
4. `pnpm contract:check` 作为前端契约边界静态门禁，检查 API 层、Zod schema 和错误码镜像是否符合现有 ESLint 规则。CI 固定运行该命令。

## 变更清单

涉及端点、DTO、分页结构、状态枚举或错误码的变更，必须逐项完成：

- 明确兼容策略和部署顺序。破坏性响应变更应先让 Leo 提供兼容结构，再发布 Aries，最后移除旧结构。
- 在 Leo 更新 Controller、DTO、校验规则或 `ErrorCode`，并同步接口说明。
- 在 Aries 更新对应 Zod schema；业务类型优先通过 `z.infer`/`z.output` 从 schema 推导，不另建手工重复接口。
- 若 Leo `ErrorCode` 变化，同步核对 `src/constants/error-codes.ts`。该文件是人工镜像，不是自动生成物。
- 运行 `pnpm contract:check`、`pnpm typecheck`、`pnpm lint` 和 `pnpm build-only`。
- 联调时覆盖成功响应、业务错误响应和至少一个契约失败场景，并使用 `traceId` 定位两侧日志。

## 门禁边界

`pnpm contract:check` 能发现前端契约代码的 ESLint 违规，并配合 TypeScript 编译保证前端调用形态正确。它不能读取 Leo 源码、不能比较 DTO 与 Zod 字段，也不能发现服务端运行时响应已经漂移。跨仓一致性目前依赖上述清单、代码审查和联调。

## 重新评估条件

满足以下条件时，再评估 OpenAPI 生成和自动 diff：

- Leo 能在无运行服务的构建流程中稳定导出、版本化 OpenAPI 文档；
- 生成类型被实际 API 客户端消费，而不是仅生成未引用文件；
- CI 能取得同一版本的 Leo 契约产物，并对生成结果执行确定性 diff；
- OpenAPI 对当前统一响应信封、字符串化 Long 和业务状态枚举的描述足够精确。

在这些条件满足前，恢复生成脚本只会增加第二套未受约束的类型来源。
