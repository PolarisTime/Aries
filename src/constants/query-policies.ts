/**
 * 查询缓存策略分层。
 *
 * 按数据变化频率把 `staleTime` 归入若干层级，业务代码统一引用常量而非裸数值：
 * - `STALE_REALTIME`：实时业务数据，列表/详情/状态，变化频繁；
 * - `STALE_LONG`：运行时配置与应用/后端版本，随发布节奏变化；
 * - `STALE_MASTER_OPTIONS`：主数据选项，供应商/客户/仓库/结算主体等基础资料；
 * - `STALE_STATIC`：静态数据，本地元数据、模板、字典等几乎不变化。
 */

/** 实时业务数据：列表/详情/状态等变更频繁，短窗口内允许复用缓存。 */
export const STALE_REALTIME = 5_000

/** 长周期运行时配置/版本信息：随发布节奏变化，通常整个会话内无需重复拉取。 */
export const STALE_LONG = 30 * 60_000

/** 主数据选项：基础资料下拉选项，新增/停用后即可容忍几分钟延迟。 */
export const STALE_MASTER_OPTIONS = 300_000

/** 静态数据：本地元数据、模板、字典等，会话内视为不变。 */
export const STALE_STATIC = Number.POSITIVE_INFINITY
