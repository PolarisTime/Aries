import { SearchOutlined } from '@ant-design/icons'
import { Button, Form, Input } from 'antd'
import { type ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModuleResetButton } from '@/components/ModuleResetButton'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import type { SearchParams } from '@/types/api-raw'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { ModuleFilterField } from '@/views/modules/components/ModuleFilterField'
import { buildDateRangePresets } from '@/views/modules/components/module-date-range'
import {
  buildNextFilters,
  normalizeFilters,
} from '@/views/modules/components/module-filter-utils'
import { ModuleFilterChip, ModuleQuickFilterChip } from './ModuleFilterChip'

interface Props {
  config: ModulePageConfig
  filters: SearchParams
  defaultFilters?: SearchParams
  submittedFilters: SearchParams
  /** 显示明确的「查询」主按钮（选单器等独立筛选场景） */
  showSubmitButton?: boolean
  /**
   * 是否在筛选行末尾渲染「重置」。
   *
   * <p>业务列表页传 `false`：重置下移到工具行右侧，与「已选择 / 清除 / 刷新」同组 ——
   * 原先它被 `margin-left: auto` 顶到整行最右端，左边一大片空白、右边孤零零一个按钮，
   * 还和下一行右侧的图标簇上下叠着，这就是"筛选区按钮显示不对"的来源。
   * 选单器这类没有工具行的场景保持默认 `true`。</p>
   */
  showResetButton?: boolean
  onUpdateFilter: (key: string, value: unknown) => void
  onApplyFilters: (filters: SearchParams) => void
  onReset: () => void
}

const EMPTY_FILTERS: SearchParams = {}

/** 文本提交的最小节流间隔(毫秒): 连续回车/失焦不重复触发查询。 */
const TEXT_COMMIT_THROTTLE_MS = 100

/**
 * 文本提交节流器: 间隔内的重复提交直接丢弃。
 * 时间戳与 Date.now() 都封装在闭包里 —— 组件渲染期既不读 ref 也不调用不纯函数,
 * React Compiler 才能优化本组件; 事件回调里的节流口径与原先逐字一致。
 */
function createTextCommitThrottle() {
  let lastCommittedAt = 0
  return (commit: () => void) => {
    const now = Date.now()
    if (now - lastCommittedAt < TEXT_COMMIT_THROTTLE_MS) return
    lastCommittedAt = now
    commit()
  }
}

function isSameFilterPreset(left: SearchParams, right: SearchParams) {
  const leftEntries = Object.entries(normalizeFilters(left)).toSorted()
  const rightEntries = Object.entries(normalizeFilters(right)).toSorted()
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(([key, value], index) => {
      const [rightKey, rightValue] = rightEntries[index]
      return key === rightKey && String(value) === String(rightValue)
    })
  )
}

interface FilterFieldProps {
  /** 字段名（渲染在控件左侧） */
  label: string
  className?: string
  children: ReactNode
}

/**
 * 筛选项外壳：字段名在控件左侧，一整行按「标签 + 控件」等距排开。
 *
 * <p>标签用 `<span>` 而不是 `<label>`：控件自己带 `aria-label`（文案与本处可见标签同一份），
 * 再套一层 `<label>` 会让同一个字段出现两个名字，部分读屏组合会念两遍。</p>
 */
function FilterField({ label, className, children }: FilterFieldProps) {
  return (
    <div
      className={
        className ? `module-filter-field ${className}` : 'module-filter-field'
      }
    >
      <span className="module-filter-field-label">{label}</span>
      {children}
    </div>
  )
}

export function ModuleFilterToolbar({
  config,
  filters,
  defaultFilters = EMPTY_FILTERS,
  submittedFilters,
  showSubmitButton = false,
  showResetButton = true,
  onUpdateFilter,
  onApplyFilters,
  onReset,
}: Props) {
  const { t } = useTranslation()
  // 惰性初始化: 节流时钟在整个生命周期内是同一个实例, 等价于原来的 ref
  const [runThrottledCommit] = useState(createTextCommitThrottle)
  const optionRequirements = resolveMasterOptionRequirements(config.filters)
  const customerId = asString(filters.customerId).trim() || undefined
  const { projects: projectOptions } = useMasterOptions(
    optionRequirements,
    true,
    customerId,
  )
  const [openChipKey, setOpenChipKey] = useState<string | null>(null)
  const toggleChip = (key: string, open: boolean) =>
    setOpenChipKey(open ? key : null)

  const sortedFilters = config.filters.toSorted(
    (left, right) => (left.row || 1) - (right.row || 1),
  )
  const quickFilters = config.quickFilters || []
  const datePresets = useMemo(() => buildDateRangePresets(t), [t])
  const activeQuickFilterKey = quickFilters.find((filter) =>
    isSameFilterPreset(submittedFilters, {
      ...defaultFilters,
      ...filter.values,
    }),
  )?.key
  const commitFilter = (
    key: string,
    value: unknown,
    resetKeys: readonly string[] = [],
  ) => {
    onUpdateFilter(key, value)
    onApplyFilters(buildNextFilters(submittedFilters, key, value, resetKeys))
  }
  const commitTextFilter = (key: string, value: string) => {
    runThrottledCommit(() => {
      const normalizedValue = value.trim()
      onUpdateFilter(key, normalizedValue)
      onApplyFilters(
        buildNextFilters(
          {
            ...submittedFilters,
            ...normalizeFilters(
              Object.fromEntries(
                Object.entries(filters).filter(
                  ([filterKey]) =>
                    config.filters.find((field) => field.key === filterKey)
                      ?.type !== 'input',
                ),
              ),
            ),
          },
          key,
          normalizedValue,
        ),
      )
    })
  }

  const hasConfigKeywordFilter = config.filters.some(
    (field) => field.key === 'keyword',
  )
  const pillFilters = sortedFilters.filter((field) => field.type === 'input')
  const dateRangeFilters = sortedFilters.filter(
    (field) => field.type === 'dateRange',
  )
  const chipFilters = sortedFilters.filter(
    (field) => field.type !== 'input' && field.type !== 'dateRange',
  )

  /*
   * 文本筛选：字段名在控件左侧（表单式），控件是 32px 直角控件而不是药丸。
   * 控件自带 aria-label，可见标签与它同一份文案，读屏不会重复念。
   */
  const renderTextField = (
    key: string,
    label: string,
    placeholder: string,
    committedValue: string,
  ) => (
    <FilterField key={key} label={label}>
      <Input
        name={key}
        allowClear
        aria-label={label}
        aria-keyshortcuts="Enter"
        className="module-filter-control module-filter-control-input"
        suffix={<kbd className="keyboard-shortcut-hint">Enter</kbd>}
        placeholder={placeholder}
        value={asString(filters[key])}
        onChange={(event) => onUpdateFilter(key, event.target.value)}
        onBlur={(event) => {
          if (event.target.value.trim() === committedValue.trim()) return
          commitTextFilter(key, event.target.value)
        }}
        onPressEnter={(event) =>
          commitTextFilter(key, event.currentTarget.value)
        }
      />
    </FilterField>
  )

  return (
    <Form
      colon={false}
      className="module-filter-toolbar"
      aria-label={t('modules.filter.conditions')}
    >
      <div className="module-filter-form-row">
        {!config.hideKeywordFilter && !hasConfigKeywordFilter
          ? renderTextField(
              'keyword',
              t('common.keyword'),
              t('common.pleaseInput'),
              asString(submittedFilters.keyword),
            )
          : null}
        {pillFilters.map((field) =>
          renderTextField(
            field.key,
            field.label,
            field.placeholder ||
              t('modules.filter.inputPlaceholder', { label: field.label }),
            asString(submittedFilters[field.key]),
          ),
        )}
        {dateRangeFilters.map((field) => (
          <FilterField
            key={field.key}
            label={field.label}
            className="module-filter-field-range"
          >
            <ModuleFilterField
              field={field}
              filters={filters}
              submittedFilters={submittedFilters}
              datePresets={datePresets}
              onUpdateFilter={onUpdateFilter}
              onCommitFilter={(key, value) =>
                commitFilter(key, value, field.resetKeysOnChange)
              }
              onCommitTextFilter={commitTextFilter}
              projectOptions={projectOptions}
            />
          </FilterField>
        ))}
        {chipFilters.map((field) => (
          <FilterField key={field.key} label={field.label}>
            <ModuleFilterChip
              field={field}
              filters={filters}
              submittedFilters={submittedFilters}
              projectOptions={projectOptions}
              open={openChipKey === field.key}
              onToggle={(open) => toggleChip(field.key, open)}
              onUpdateFilter={onUpdateFilter}
              onApplyFilters={onApplyFilters}
            />
          </FilterField>
        ))}
        <div className="module-filter-form-tail">
          <ModuleQuickFilterChip
            quickFilters={quickFilters}
            defaultFilters={defaultFilters}
            activeKey={activeQuickFilterKey}
            open={openChipKey === 'quick-filters'}
            onToggle={(open) => toggleChip('quick-filters', open)}
            onApplyFilters={onApplyFilters}
          />
          {showSubmitButton ? (
            <Button
              className="module-filter-submit-button"
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => onApplyFilters(filters)}
            >
              {t('common.search')}
            </Button>
          ) : null}
          {showResetButton ? <ModuleResetButton onClick={onReset} /> : null}
        </div>
      </div>
    </Form>
  )
}
