/**
 * 构建时刻的单一来源：注入（vite / vitest）、运行时取值（env.ts）与展示格式化（底栏）
 * 都从这里取，任何新出口都不许另写一份算式。
 *
 * 背景：线上出现过「编译时间 1980年02月01日 08:00:00」—— 那是 Maven 可复现构建的
 * 固定哨兵 `1980-02-01T00:00:00Z` 被当成真实时刻渲染（UTC+8 正好 08:00）。
 * 因此这里对注入值做校验：只有"可解析、晚于 2020-01-01、不在未来、且不等于任何占位常量"
 * 的值才被采信，否则回退到构建/运行时的真实时刻。
 */

/** 展示时区：与后端「X年X月X日」口径一致，固定业务时区，不随浏览器时区漂移。 */
export const BUILD_TIME_ZONE = 'Asia/Shanghai'

/** 早于该日期一律视为占位/无效值。 */
export const MIN_BUILD_DATE = '2020-01-01'

/** 已知占位/哨兵常量（Unix 纪元、Maven 可复现构建 ZIP 纪元、Spring Boot DATE_MIN 等）。 */
export const PLACEHOLDER_BUILD_MOMENTS = [
  '1970-01-01T00:00:00Z',
  '1980-01-01T00:00:00Z',
  '1980-01-01T00:00:02Z',
  '1980-02-01T00:00:00Z',
  '0001-01-01T00:00:00Z',
  'unknown',
  '0',
] as const

const DATE_PART = /^\d{4}-\d{2}-\d{2}$/
const NAIVE_MOMENT = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/
const OFFSET_SUFFIX = /([zZ]|[+-]\d{2}:?\d{2})$/

function datePartOf(value: string) {
  return value.slice(0, 10)
}

/** 当前日期 + 1 天（UTC 日历日）：给"未来"判定留出时区/时钟偏差余量。 */
function upperBoundDate(now: Date) {
  const bound = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return bound.toISOString().slice(0, 10)
}

export function isPlaceholderBuildMoment(value: string) {
  const normalized = value.trim().toLowerCase()
  return PLACEHOLDER_BUILD_MOMENTS.some(
    (placeholder) => placeholder.toLowerCase() === normalized,
  )
}

/**
 * 该值能否当作"真实构建时刻"采信。
 * 接受两种形态：带时区偏移的 ISO-8601（后端/`new Date()` 产物）与
 * `YYYY-MM-DD HH:mm:ss` 本地墙钟（本仓 vite 注入的形态）。
 */
export function isUsableBuildMoment(
  value: unknown,
  now: Date = new Date(),
): value is string {
  if (typeof value !== 'string') {
    return false
  }
  const trimmed = value.trim()
  if (!trimmed || isPlaceholderBuildMoment(trimmed)) {
    return false
  }
  const datePart = datePartOf(trimmed)
  if (!DATE_PART.test(datePart)) {
    return false
  }
  if (datePart < MIN_BUILD_DATE) {
    return false
  }
  if (datePart > upperBoundDate(now)) {
    return false
  }
  if (OFFSET_SUFFIX.test(trimmed)) {
    return !Number.isNaN(Date.parse(trimmed))
  }
  return NAIVE_MOMENT.test(trimmed)
}

/** 按业务时区格式化为 `YYYY-MM-DD HH:mm:ss`。 */
export function formatBuildMoment(
  date: Date,
  timeZone: string = BUILD_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')}`
}

/**
 * 构建期注入口径：`VITE_APP_BUILD_TIME` 只在它是真实时刻时才采信，否则用本次构建时刻。
 * 这样即便 CI/环境变量塞进哨兵，产物里也不会再出现 1980。
 */
export function resolveBuildMoment(
  envValue: string | null | undefined,
  now: Date = new Date(),
): string {
  return isUsableBuildMoment(envValue, now)
    ? envValue.trim()
    : formatBuildMoment(now)
}

/** 运行期取值口径：注入值不可信时退化为 `unknown`，让底栏显示"未记录"而不是错误年份。 */
export function resolveInjectedBuildMoment(
  injected: string | null | undefined,
  now: Date = new Date(),
): string {
  return isUsableBuildMoment(injected, now) ? injected.trim() : 'unknown'
}

/** `YYYY-MM-DD HH:mm:ss` → `YYYY年MM月DD日 HH:mm:ss`(用户可见日期口径)。 */
function toChineseMoment(formatted: string) {
  return formatted.replace(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2})$/,
    '$1年$2月$3日 $4',
  )
}

/**
 * 展示口径：带偏移的 ISO 时刻换算到业务时区；本地墙钟串原样显示；空/占位值用兜底文案。
 * 唯一出口 —— 底栏与新增展示位都调它。
 */
export function formatBuildMomentForDisplay(
  value: string | null | undefined,
  fallback: string,
  timeZone: string = BUILD_TIME_ZONE,
): string {
  const trimmed = value?.trim()
  if (!trimmed || trimmed === 'unknown') {
    return fallback
  }
  if (OFFSET_SUFFIX.test(trimmed)) {
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return toChineseMoment(formatBuildMoment(parsed, timeZone))
    }
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2}:\d{2})/)
  return match ? `${match[1]}年${match[2]}月${match[3]}日 ${match[4]}` : trimmed
}
