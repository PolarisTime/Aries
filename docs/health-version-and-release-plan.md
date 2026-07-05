# Health、版本展示与发布验证开发计划

> 本文是后续开发计划书，目标是一次性开发到位，**不考虑向后兼容**：不保留迁移期兜底，不保留 `/health.version` 过渡读取，直接把版本、健康、链路追踪三条职责拆干净。

## 背景

当前前端工作台页脚展示前端版本和后端版本。前端版本来自前端构建配置（`aries/src/layouts/AppVersionFooter.tsx:2,15`，读取 `@/utils/env` 的 `frontendVersion`），后端版本来自后端 `/health` 响应的 `version` 字段。

最新自动发布配置已合入 `main`，但第一次真实 `frontend-release` workflow 在 `Validate release token` 阶段失败，原因是仓库未配置 `SEMANTIC_RELEASE_TOKEN`（`aries/.github/workflows/release.yml:43-51`）。因此当前远端最新 tag 仍为 `v1.1.1`（`aries/package.json:4` 为 `1.1.1`），版本号尚未自动步进。

## 当前实现现状（含代码核对）

### 1. 版本号存在三个独立来源，互不一致

| 来源 | 位置 | 当前值 |
| --- | --- | --- |
| Maven 构建版本 | `leo/pom.xml:16` | `1.1.2` |
| 前端 npm 包版本 | `aries/package.json:4` | `1.1.1` |
| 后端运行时展示版本 | `leo/src/main/resources/application.yml:157` → `leo.version: ${LEO_VERSION:1.1.0}` | 默认 `1.1.0` |

后端 `/health.version` 的取值链是：`HealthService` 注入 `@Value("${leo.version:1.1.0}")`（`leo/src/main/java/com/leo/erp/common/web/service/HealthService.java:31`）→ 实际由 `application.yml:157` 的 `leo.version` 提供 → 未注入 `LEO_VERSION` 环境变量时回退到 `1.1.0`。

> 更正原文档断言：`leo.version` **已在配置中存在**（`application.yml:157`，`application-prod.yml` 未覆盖 version 字段），并非“仓库未发现 `leo.version` 配置”。真正的问题是：`@Value` 里的 `:1.1.0` 默认值几乎永不触发（yml 一定提供值），运行时版本实际固定在 yml 默认的 `1.1.0`，与 Maven 的 `1.1.2` 脱节。

根因：三个版本号各自维护，没有单一事实源（single source of truth）。前端 semantic-release 只会步进 `package.json` 与 tag，不会触动 Maven 版本，也不会触动 `LEO_VERSION`。

### 2. 前端存在重复探活，且已保存的版本未被复用

- `aries/src/views/dashboard/DashboardView.tsx:35-39` 用 `fetchBackendHealth` 每 `120000ms` 请求 `/health`，页脚 `AppVersionFooter` 读 `backendHealth?.version`（`DashboardView.tsx:80`）。
- `aries/src/layouts/useBackendStatus.ts:4` 定义 `HEALTH_CHECK_INTERVAL_MS = 30_000`，登录后（依赖 token）每 30 秒请求 `/health` 判断在线，并保存 `backendVersion`（`useBackendStatus.ts:36,85`），还带指数退避重试（最多 5 次，`useBackendStatus.ts:5`）。
- 但 `useBackendStatus` 返回的 `backendVersion` 无人使用：唯一调用方 `aries/src/layouts/AppLayout.tsx:182` 只解构了 `{ backendOnline }`。

结论：`/health` 被两处独立探活。用户停留在工作台时，`/health` 同时被 120s（版本用途）和 30s（在线用途）两条链路请求，版本展示和在线探活的刷新频率、失败语义、缓存策略混在同一接口上。

两个前端接口都指向同一个 `fetchBackendHealth`，其响应类型见 `aries/src/api/auth.ts:24-33`（`HealthResponse` 含 `status/app/version?/traceId/timestamp/db?/redis?/disk?`）。

### 3. 公开 JSON `/health` 暴露字段偏多

`HealthService.health()`（`HealthService.java:38-53`）返回：`status`、`app`、`version`、`traceId`、`timestamp`、`db`、`redis`、`disk`。其中：

- `db`/`redis` 是真实探活（`SELECT 1` / Redis `PING`，`HealthService.java:59-77`）。
- `disk` 返回根分区剩余/总容量 GB，`freeGb < 1` 标记 `WARN`（`HealthService.java:79-85`）。
- `traceId` 取自 MDC（`HealthService.java:87-90`），详见第 5 节。

访问控制：`SecurityConfig.java:71` 对 `/health` **无条件 `permitAll`**，与 `leo.surface.health.public-access-enabled` 开关无关。即便关闭 HTML 健康页，JSON `/health` 仍公开。

HTTP 语义：`HealthController.java:20-23` 始终返回 `ApiResponse.success(...)`，即使 body 状态是 `DEGRADED`，HTTP status 仍是 `200`。前端可读 body 判断，但负载均衡 / Kubernetes readiness / 外部探活只看状态码时会误判。

### 4. HTML `/system/health` 现状（含两个开关，生产已收敛）

`/system/health` 由 `HealthPageController` 提供（`leo/src/main/java/com/leo/erp/system/web/HealthPageController.java:21`，`@GetMapping(value = "/system/health", produces = TEXT_HTML)`），受两个独立开关控制：

1. `leo.health.page.enabled`（`HealthPageController` 上 `@ConditionalOnProperty(..., matchIfMissing = true)`）——整个页面 Bean 是否装配。
2. `leo.surface.health.public-access-enabled`（`SecurityConfig.java:72-76`）——是否允许匿名访问，否则要求 `authenticated()`。

页面内容来自 `HealthPageRenderer`：

- 公开页 `renderPublic`（`HealthPageRenderer.java:23-51`）：服务名、检查时间、运行时长、Java 版本、访问路径。注意应用状态是**硬编码 `UP`**（`HealthPageRenderer.java:46`），不反映真实健康。
- 详细页 `renderDetailed`（`HealthPageRenderer.java:53-104`）：JVM（Java 版本、VM 名、运行时长、堆/非堆内存、线程数、处理器）、PostgreSQL（主机端口、数据库名、版本、连接数、活跃连接、数据库大小、表数量、启动时间）、Redis（主机端口/DB、版本、已用/峰值内存、Key 数量、客户端数、运行时长、命中率），外加 Debug 输出。详细页应用状态同样硬编码 `UP`（`HealthPageRenderer.java:92`）。

默认值与生产收敛：

- 默认（`application.yml:338,342`）：`health.page.enabled=true`、`surface.health.public-access-enabled=true`，即本地默认公开。
- `SurfaceAccessProperties.java:34` 中 `Health.publicAccessEnabled` 字段默认 `true`。
- 生产（`application-prod.yml:8-15`）：`leo.health.page.enabled=false`、`leo.surface.health.public-access-enabled=false`；`docs.public-access-enabled` 生产与默认都是 `false`（`application-prod.yml:18`、`application.yml:345`）。

> 更正原文档预期：阶段目标“生产环境默认将 `leo.surface.health.public-access-enabled` 设为 `false`” **已经实现**。生产环境 HTML 健康页当前已既不装配、也不公开。剩余问题集中在 JSON `/health` 公开字段，以及默认（非 prod）profile 仍然公开。

### 5. TraceId 现状（更正原文档描述）

后端已引入 `micrometer-tracing-bridge-otel`（`pom.xml:87-89`）和 `opentelemetry-exporter-otlp`（`pom.xml:90-93`），日志 pattern 已输出 MDC 中的 `traceId/spanId`（`application.yml:417` `correlation: "[%X{traceId:-},%X{spanId:-}] "`）。采样率本地 `1.0`、生产 `0.1`（`application.yml:404`、`application-prod.yml:55`），OTLP 导出默认关闭（`application.yml:409` `export.enabled` 默认 `false`）。

`TraceIdFilter`（`leo/src/main/java/com/leo/erp/common/config/TraceIdFilter.java`）实际逻辑：

1. 先读 MDC 中的 `traceId`（`TraceIdFilter.java:29`）。Micrometer 激活时，这里就是 Micrometer/OTel 生成的 trace id。若存在，直接写入响应头 `X-Trace-Id` 并放行（`TraceIdFilter.java:30-34`）。
2. 仅当 MDC 无值时，才回退到把请求头传入的 `X-Trace-Id` 原样回显（`TraceIdFilter.java:36-39`）。
3. 它**不会**把客户端传入的 `X-Trace-Id` 写入 MDC，也不会创建 Micrometer span。

> 更正原文档断言：`TraceIdFilter` 并非“只回显 `X-Trace-Id`”。它的主路径是**回显 MDC（Micrometer）trace id**，因此在 Micrometer 生效时，`X-Trace-Id` 响应头与日志里的 `traceId` 一致、可查。只有在“MDC 无 trace id 且客户端自带 `X-Trace-Id`”的边界情况下，才是纯回显、不可查。

CORS 现状：`SecurityConfig.java:100` 已经 `setExposedHeaders(List.of(TraceIdFilter.TRACE_ID_HEADER))`。

> 更正原文档建议：“如果浏览器需要读取 `X-Trace-Id` 响应头，CORS 需要暴露该 header” **已经满足**，无需新增。

`/health.version` 里的 `traceId`（`HealthService.java:87-90`）读的也是 MDC，属于对健康探活附带 trace id，与职责无关，应移除。

### 6. 发布流水线现状

前端发布相关 workflow（`aries/.github/workflows/`）：

- `release.yml`（workflow 名 `frontend-release`）：`push` 到 `main`（忽略 `**/*.md`、`docs/**`）或手动触发；已包含 `Validate release token` 步骤（`release.yml:43-51`，缺 `SEMANTIC_RELEASE_TOKEN` 时报错退出），支持 `workflow_dispatch` 的 `dry_run` 输入。发布用 `secrets.SEMANTIC_RELEASE_TOKEN || secrets.GITHUB_TOKEN`。
- `deploy-production.yml`（workflow 名 `frontend-production-deploy`）：由 `push` tag `v*.*.*` 触发（`deploy-production.yml:5-7`），或手动触发。打包时 tag 场景 `release_id=aries-frontend-${GITHUB_REF_NAME}`（`deploy-production.yml:104`），生成 `aries-frontend-<tag>.tar.gz` 与 `manifest.json`（含 `releaseId/ariesRef/ariesSha/...`，`deploy-production.yml:112-135`）。
- 另有 `rollback-production.yml`（回滚）、`ci.yml`、`react-doctor.yml`。

semantic-release 配置 `aries/.releaserc`：`branches: ["main"]`、`tagFormat: "v${version}"`、插件含 commit-analyzer / release-notes-generator / changelog / npm（`npmPublish:false`）/ git（提交 `CHANGELOG.md`+`package.json`）/ github。

关键点：`release.yml` 用 `SEMANTIC_RELEASE_TOKEN` 而非默认 `GITHUB_TOKEN` 推 tag，是为了让 tag push 能触发 `deploy-production.yml`（`GITHUB_TOKEN` 推的 tag 不会触发下游 workflow，`release.yml:49` 注释已说明）。

### 7. 尚不存在的能力（需新建）

- 后端无 `/version` 或 `/info` 业务端点（代码全库无匹配）。
- `spring-boot-maven-plugin` 未配置 `build-info`，因此无 `BuildProperties`（`pom.xml:373-384`）。
- 无 git 版本插件，因此无 `git.properties` / `GitProperties`。
- Actuator 已引入（`pom.xml:82-85`），但 `management` 段（`application.yml:400-412`）只配了 tracing / otlp，未配置 `management.endpoints.web.exposure.include`，故仅默认暴露 `/actuator/health`，`/actuator/info` 尚未启用。

## 目标

1. 建立**单一版本事实源**：以 Maven 构建版本为准，注入运行时和构建产物，消除 `1.1.0/1.1.1/1.1.2` 三值分裂。
2. 版本号、Git SHA、构建时间从 health 中解耦，迁移到专用应用信息接口 `/version`。
3. 前端页脚读取稳定的 `/version`，`/health` 只用于在线判断，去掉重复探活。
4. 公开 `/health` 只暴露最小必要状态，敏感运维信息全部下沉到受保护端点。
5. `TraceId` 统一由 Micrometer/OTel 承担，`TraceIdFilter` 收敛，`/health`、`/version` 不再返回 traceId。
6. 前后端发布流程都能通过自动化版本源生成真实可追溯版本。

> 不考虑兼容性原则：以下方案直接改造，不设迁移期、不保留旧字段兜底。前端一次性切到 `/version`；后端一次性收敛 `/health` 输出并删除 `@Value` 硬编码版本。

## 端点职责决策

拆分而非合并，三个端点各司其职：

| 端点 | 使用者 | 职责 | 访问控制 |
| --- | --- | --- | --- |
| `/health` | 机器（LB、容器探针、外部监控、前端在线判断） | 最小 JSON 探活 | 公开 |
| `/version` | 前端页脚、版本核对 | 构建元数据（app/version/gitCommit/buildTime） | 公开（仅非敏感构建信息） |
| `/system/health` | 人（运维诊断） | HTML 诊断页 | 生产默认关闭+鉴权 |

`/version` 目标响应：

```json
{
  "app": "leo",
  "version": "1.1.2",
  "gitCommit": "abcdef123456",
  "buildTime": "2026-07-05T03:30:00Z"
}
```

框架分工（现有框架优先）：

- Spring Boot Actuator：`BuildProperties` / `GitProperties` 提供版本与 SHA 注入能力；内部诊断走 `/actuator/health`、`/actuator/info`（不对公网）。
- Micrometer + OTel：负责 trace 生成、传播、采样、导出（已引入，见现状第 5 节）。
- 自研端点只保留公开、字段可控的 `/version`。JVM/DB/Redis 详细诊断保留在受保护的 `/system/health` 或后续下沉到 Actuator。

为何自研 `/version` 而非直接暴露 `/actuator/info`：`/actuator/info` 配好 info contributors 后可零业务代码输出同样字段，但它位于 `/actuator` 命名空间下，公开它需单独放行并谨慎隔离同命名空间的其他敏感端点。本项目 `/actuator/**` 默认不打算对公网开放，自研 `/version` 可让公开契约字段完全可控、与 `/actuator` 安全边界天然隔离，因此对本项目更干净。

metrics 前置条件：当前仅 trace 链路就绪（`opentelemetry-exporter-otlp` 导出 trace）。`pom.xml` 尚缺 `micrometer-registry-prometheus`，因此 `/actuator/prometheus` 目前不可用。若后续要做指标导出，需先补该依赖（版本随 Spring Boot BOM）。注意 trace 走 OTLP、metrics 走 Prometheus registry（拉模型）或 OTLP metrics（推模型）是两条独立链路，需明确二选一，不要与 trace 混为一谈。

## 开发方案

### 阶段 1：配置发布 token 并验证前端自动发布

- 在 GitHub 仓库配置 `SEMANTIC_RELEASE_TOKEN`（PAT 或 GitHub App token），需允许向 `PolarisTime/Aries` 推送 commit/tag 并创建 Release。
- 重跑 `release.yml`。由于 `v1.1.1` 之后存在 `feat(react)!` 破坏性提交，前端应自动发布为 `v2.0.0`。
- 验收：
  - 新 tag `v2.0.0` 创建；`package.json` 由 release commit 更新为 `2.0.0`；`CHANGELOG.md` 生成 release notes。
  - tag push 触发 `deploy-production.yml`（`deploy-production.yml:5-7`）。
  - 归档名 `aries-frontend-v2.0.0.tar.gz`、`manifest.json` 的 `releaseId` 含 `v2.0.0`。

### 阶段 2：后端建立单一版本源 + 新增 `/version`

构建侧（消除版本分裂）：

1. `spring-boot-maven-plugin` 增加 `build-info` 执行，生成 `META-INF/build-info.properties`，使 `BuildProperties` 可用（版本取自 `pom.xml` 的 `1.1.2`）。
2. 启用 `git-commit-id-maven-plugin` 生成 `git.properties`，使 `GitProperties` 可用。该插件由 Spring Boot BOM 统一管理版本（当前 `9.0.2`，Spring Boot 官方在 `spring-boot-dependencies` 中维护），**无需手动指定版本号**，直接继承 parent 即可。

代码侧：

3. 新增 `VersionController`（公开 `GET /version`），注入 `BuildProperties`（version、buildTime）与 `GitProperties`（gitCommit 短 SHA），组装上表 JSON。
4. **删除** `HealthService` 的 `@Value("${leo.version:1.1.0}")`（`HealthService.java:31`）及其在响应中的 `version` 字段（见阶段 3）。
5. `SecurityConfig` 放行 `/version`（与 `/health` 并列 `permitAll`，`SecurityConfig.java:71`）。
6. 清理 `application.yml:155-157` 的 `leo.version`（不再作为版本源）。

要点：`/version` 只暴露非敏感构建元数据；JVM/DB/Redis 等一律不放入。

### 阶段 3：收敛公开 JSON `/health`

`HealthController` / `HealthService` 改造：

- 公开响应收敛为最小状态：

```json
{ "status": "UP", "timestamp": "2026-07-05T03:30:00Z" }
```

- 如需向公网监控暴露粗粒度依赖状态，最多到布尔/枚举级别，不带容量、主机、版本等细节：

```json
{ "status": "DEGRADED", "checks": { "db": "UP", "redis": "DOWN" } }
```

- 移除公开输出中的 `app`、`version`、`traceId`、`disk` 明细，以及 `db`/`redis` 的详细信息。
- HTTP 语义修正：`DEGRADED`/`DOWN` 时返回非 `200`（如 `503`），供 LB / readiness 依据状态码判断（改造 `HealthController.java:20-23`，不再无条件 `ApiResponse.success`）。若确定 `/health` 仅作业务健康摘要、readiness 另走 `/actuator/health`，则在文档中明确说明并保持 `200`。

不得公开：Java 版本、JVM 名称、运行时长、主机/端口/库名、PG/Redis 版本、连接数/表数/Key 数/命中率、磁盘容量、Debug 输出。

### 阶段 4：收敛 HTML `/system/health`

- 默认 profile 也将 `leo.surface.health.public-access-enabled` 收敛为 `false`（`application.yml:342`），与生产对齐；`SurfaceAccessProperties.java:34` 默认值改为 `false`。
- 详细页要求认证 + 明确权限（角色）。
- 公开页（若保留）只显示 `UP` 与检查时间，去掉 Java 版本、运行时长等。
- 中长期：将详细 JVM/DB/Redis 诊断下沉到 Actuator，逐步废弃自研 HTML 详细页，避免重复维护。运维 UI 有两种选择：① Actuator 端点 + Grafana 直连（更轻，单体应用优先考虑）；② Spring Boot Admin（**可选**，面向多服务统一看板，对单体偏重，且会新增一个需认证/网络隔离的 Web 服务）。Spring Boot Admin 版本与 Boot 强绑定（`3.5.x` 对应 Boot 3.5、`4.0.x` 对应 Boot 4.x），是否引入建议与后端 Boot 版本升级一并决策，不单独提前引入（见风险章节）。

### 阶段 5：TraceId 收敛，对齐 Micrometer

- Micrometer/OTel 为唯一 trace 体系；日志经 MDC 输出 `traceId/spanId`（已具备）。
- `TraceIdFilter` 收敛（`TraceIdFilter.java`）：
  - 保持“优先从 MDC（Micrometer）读取 trace id 并写入 `X-Trace-Id` 响应头”的主路径。
  - 客户端自带的 `X-Trace-Id` 仅作为 legacy correlation id，不覆盖 OTel trace id，不再作为主 trace 来源。
- `/health`、`/version` 不返回 traceId（阶段 3 已移除 health 的 traceId）。
- 失败响应体统一携带当前 traceId，便于用户反馈定位日志。
- CORS 暴露 `X-Trace-Id` 已就绪（`SecurityConfig.java:100`），无需改动。

### 阶段 6：前端改造（切 `/version` + 去重探活）

- 新增 `fetchBackendInfo` 调用 `/version`（新增 `aries/src/api` 方法），返回 `{ app, version, gitCommit, buildTime }` 类型。
- 新增 query key `QUERY_KEYS.backendInfo`（`aries/src/constants/query-keys.ts`）。
- `AppVersionFooter` 改为读取 `/version` 的 query 结果（不再接收 `backendHealth?.version`）。缓存策略：`staleTime` 30 分钟~1 小时，`refetchInterval` 关闭，`refetchOnWindowFocus` 关闭（构建期内版本不变）。
- 去重探活：
  - `DashboardView.tsx:35-39` 移除为“取版本”而发起的 `/health` 查询。
  - `/health` 只保留在线判断职责，统一由 `useBackendStatus` 承担；`useBackendStatus` 移除 `backendVersion` 相关状态与返回（`useBackendStatus.ts:11,15-17,36,43-44,85`）。
- 更新 `aries/src/api/auth.ts` 的 `HealthResponse` 类型，去掉 `version/traceId/db/redis/disk`，与收敛后的 `/health` 对齐。
- 不保留 `/health.version` 兜底（不考虑兼容性）。

### 阶段 7：测试与验收

后端测试：

- `/version` 返回真实构建版本（来自 `BuildProperties`），version 与 `pom.xml` 一致；无构建信息时有明确 fallback，但**不得伪装成旧正式版本**。
- `/health` 公开响应契约：只含最小字段，不含敏感信息。
- `/health` 在 `DEGRADED`/`DOWN` 时的 HTTP status 行为（按阶段 3 的最终决策断言）。
- `/system/health` 详细页需认证 + 权限；默认/生产 profile 下的公开性符合预期。
- `TraceIdFilter`：MDC 有值时 `X-Trace-Id` 与 MDC 一致；`/health`、`/version` 不含 traceId。

前端测试：

- 页脚显示前端版本 + `/version.version`；`/version` 失败时显示 `--` 或 fallback（`common.versionUnknown`）。
- 在线状态只依赖 `/health`，不依赖 `/version`。
- 复用现有前端测试并更新：`aries/src/layouts/useBackendStatus.spec.ts`（移除 backendVersion 断言）、`aries/src/views/dashboard/DashboardView.spec.tsx`、`aries/src/layouts/AppLayout.spec.tsx`。

发布验证：

- `release.yml` 成功创建新 tag；tag 触发 `deploy-production.yml`。
- 部署后前端页脚“前端版本”与 tag 一致。
- 后端版本只随后端发布变化，不因前端单独发布变化（阶段 2 版本源独立于 semantic-release）。

## 风险与注意事项

- 不考虑兼容性意味着前后端需要协调上线：`/health` 收敛与前端切 `/version` 应同批发布，否则页脚版本会短暂缺失。
- 若公开 `/health` 保留依赖状态，攻击者可推断 DB/Redis/磁盘状态；生产公网环境只暴露粗粒度 `status`。
- 前端自动版本发布不推动后端版本。后端版本来自 Maven 构建（阶段 2），需在后端发布流程中确保 `build-info` 被打进制品。
- 真实发布会触发 tag 和生产部署，必须在 `SEMANTIC_RELEASE_TOKEN`、回滚流程（已有 `rollback-production.yml`）和监控确认后执行。
- 修改 `HealthController` 的 HTTP status 语义会影响现有 LB / 探针配置，上线前需同步运维确认探针路径与期望状态码。
- Spring Boot 3.5（当前 parent `3.5.16`）开源支持已于 2026-06-30 结束（EOL）。本计划书的核心改造（Actuator / `git-commit-id-maven-plugin` / Micrometer）在 3.5 与 4.x 上均成立，可照常推进；但中长期引入 Spring Boot Admin、`micrometer-registry-prometheus` 等新组件时，应优先按 Boot 4.x 兼容版本选型，避免在 3.5 线叠加新依赖后再做双重迁移。

## 推荐执行顺序

1. 配置 `SEMANTIC_RELEASE_TOKEN`，重跑 `release.yml`，验证前端自动版本步进（阶段 1）。
2. 后端建立单一版本源并新增 `/version`，删除 `@Value` 硬编码版本（阶段 2）。
3. 前端页脚切换到 `/version`，同批收敛 `/health` 输出与前端在线探活（阶段 3 + 阶段 6）。
4. 收敛 HTML `/system/health` 默认公开性（阶段 4）。
5. 收敛 `TraceIdFilter`，移除 health 的 traceId（阶段 5）。
6. 补齐测试并完成发布验证（阶段 7）。
