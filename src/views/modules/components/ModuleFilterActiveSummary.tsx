import { CloseOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { isEqual } from 'es-toolkit'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchParams } from '@/types/api-raw'

/** 数出口: 已生效筛选条件的项数(与 isEqual 口径一致, 供可见汇总与读屏共用)。 */
export function countActiveFilters(
  submittedFilters: SearchParams,
  defaultFilters: SearchParams,
): number {
  return Object.entries(submittedFilters).filter(([key, value]) => {
    if (!hasMeaningfulValue(value)) return false
    return !(key in defaultFilters) || !isEqual(value, defaultFilters[key])
  }).length
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false
  if (Array.isArray(value))
    return value.some((item) => hasMeaningfulValue(item))
  return true
}

interface Props {
  submittedFilters: SearchParams
  defaultFilters: SearchParams
  onClear: () => void
}

/**
 * 筛选生效提示: 「已筛选 N 项 · 清空」。
 *
 * <p>为什么要有它: 筛选条件散落在 4~6 个 chip 与输入框里, 用户看不出"现在到底有几项
 * 在生效"。更关键的是 `docNo` 一类参数会由引用跳转写进 URL 并**自动填回筛选框** ——
 * 用户看到一串单号却不知道它是深链带来的, 只当是自己填过的(实测刷新后"只剩 1 条"的
 * 困惑正来自这里)。给出计数 + 一键清空, 状态来源才可见、可撤销。</p>
 *
 * <p>计数口径与「重置」按钮判定同源: 只算**与默认值不同**的条件, 默认日期范围不计入。
 * 因此 N = 0 时本提示不渲染, 不会把"默认筛选"误报成"用户筛选"。</p>
 */
export function ModuleFilterActiveSummary({
  submittedFilters,
  defaultFilters,
  onClear,
}: Props) {
  const { t } = useTranslation()
  const activeCount = useMemo(
    () => countActiveFilters(submittedFilters, defaultFilters),
    [submittedFilters, defaultFilters],
  )
  if (!activeCount) return null

  return (
    <div
      className="module-filter-active-summary"
      data-testid="module-filter-active-summary"
      role="status"
      aria-live="polite"
    >
      <span className="module-filter-active-summary-text">
        {t('modules.filter.activeFilterCount', { count: activeCount })}
      </span>
      <Button
        className="module-filter-active-clear"
        type="link"
        size="small"
        icon={<CloseOutlined />}
        onClick={onClear}
      >
        {t('modules.filter.clearActiveFilters')}
      </Button>
    </div>
  )
}
