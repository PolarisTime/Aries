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

/**
 * 筛选区默认可见的字段数：每行 4 个 × 2 行。
 *
 * <p>列宽由 CSS 的 4 列等宽网格决定，这里只控制「渲染几个」——多出来的字段
 * 整个不挂载，因此不会因为 `display:none` 留下空网格单元把第三行撑出来。</p>
 */
const FILTER_VISIBLE_LIMIT = 8

/** 每行显示的字段数（与 CSS 的 grid 列数一致）。 */
const FILTER_COLUMNS = 4

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
   * 筛选区的折叠：每行 4 个等宽字段、默认显示 2 行（8 个），超出的收进「展开」。
   *
   * <p>折叠只在字段数超过 {@link FILTER_VISIBLE_LIMIT} 时生效；未超出时与改造前完全一致，
   * 不渲染切换按钮，也不会因为多一层容器改变外观。</p>
   *
   * <p>顺序按「文本 → 日期区间 → 选择/按钮」的分组渲染，因此这里按同一口径拼出**渲染顺序**的
   * 字段数组，再决定哪 8 个可见 —— 否则折叠会按配置顺序切片、渲染却按分组，切出来的
   * 前 8 个与屏幕上多出来的那几个对不上。</p>
   */
  const renderedFieldCount =
    (hasConfigKeywordFilter || config.hideKeywordFilter ? 0 : 1) +
    pillFilters.length +
    dateRangeFilters.length +
    chipFilters.length
  const collapsible = renderedFieldCount > FILTER_VISIBLE_LIMIT
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const visibleLimit =
    collapsible && !filtersExpanded
      ? FILTER_VISIBLE_LIMIT
      : Number.POSITIVE_INFINITY

  /*
   * 每个字段带「渲染序位」，按序位判断是否落在可见区内。
   * 统一用 `isVisible(slot)` 而不是各自切片，避免三处各写一份「前 8 个」。
   */
  const keywordVisible =
    !config.hideKeywordFilter && !hasConfigKeywordFilter && 0 < visibleLimit

  /*
   * 渲染顺序 = 配置顺序（`row` 升序、同 row 内按声明顺序），**不再按控件类型分组**。
   *
   * <p>分组渲染会让配置里的 `row` 失效：销售订单的「项目名称」标了 `row: 2`，
   * 但因为它属于 select 分组，实际被排到了日期区间之后、落进第一行。改成单次有序遍历后，
   * 页面配置写第几个就渲染第几个，`row` 也真正决定它落在第几行。</p>
   */
  const orderedFields = sortedFilters
  const isVisible = (slot: number) => slot < visibleLimit
  const fieldSlot = (field: (typeof orderedFields)[number]) =>
    (keywordVisible ? 1 : 0) + orderedFields.indexOf(field)
  const hiddenCount = collapsible
    ? Math.max(0, renderedFieldCount - FILTER_VISIBLE_LIMIT)
    : 0
  /*
   * 展开按钮的显示条件：有被折叠的条件，或者字段本身就铺满两行（此时按钮不额外增高）。
   * 单行字段（≤4 个条件）不显示，否则卡片会为一个用不上的按钮多出一行。
   */
  const showToggle = collapsible || renderedFieldCount > FILTER_COLUMNS

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
      {/*
        卡片分两段：上面是字段网格（每行 4 个等宽、默认 2 行、超出折叠），
        下面是动作行（快捷筛选 / 查询 / 重置），右对齐。
        动作行独立成行而不是挤在第 4 列：挤在一起会让「每行 4 个」在某一行变成 3 个，
        列宽也随之跳动。
      */}
      {/*
        第一行：字段网格 + 行末「重置」。
        重置跟着第一行走：它是「把这一整块条件清空」的动作，贴着条件区比落在
        下面的按钮行更容易被发现；按钮行只留查询类动作。
      */}
      <div className="module-filter-top">
        <div className="module-filter-fields">
          {keywordVisible
            ? renderTextField(
                'keyword',
                t('common.keyword'),
                t('common.pleaseInput'),
                asString(submittedFilters.keyword),
              )
            : null}
          {orderedFields.map((field) =>
            isVisible(fieldSlot(field)) ? (
              field.type === 'input' ? (
                renderTextField(
                  field.key,
                  field.label,
                  field.placeholder ||
                    t('modules.filter.inputPlaceholder', {
                      label: field.label,
                    }),
                  asString(submittedFilters[field.key]),
                )
              ) : field.type === 'dateRange' ? (
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
              ) : (
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
              )
            ) : null,
          )}
        </div>
        {/*
          右侧动作列：重置在上、展开/收起在下方，样式与重置完全一致（同一层次的次级动作）。
          展开按钮**默认显示**：只要字段铺满两行就出现（此时它不额外撑高卡片）；
          没有可展开内容时置灰并给出说明。字段只有一行时（≤4 个条件的模块）不渲染 ——
          否则会为了放下一个用不上的按钮凭空多出一行高度，字段下方留一片空白。
        */}
        <div className="module-filter-top-actions">
          {showResetButton ? <ModuleResetButton onClick={onReset} /> : null}
          {showToggle ? (
            <Button
              className="module-filter-toggle-button"
              disabled={!collapsible}
              aria-expanded={collapsible ? filtersExpanded : false}
              title={
                collapsible ? undefined : t('modules.filter.noMoreFilters')
              }
              onClick={() => setFiltersExpanded((expanded) => !expanded)}
            >
              {filtersExpanded && collapsible
                ? t('common.collapse')
                : collapsible
                  ? t('modules.filter.expandMore', { count: hiddenCount })
                  : t('common.expand')}
            </Button>
          ) : null}
        </div>
      </div>
      {/*
        第二行：折叠开关 + 快捷筛选 + 查询。
        展开按钮单独放这里，与「重置（第一行）」「查询（第二行右侧）」各归其位。
        这一行没有任何内容时不渲染 —— 否则条件少（不折叠、无快捷筛选、无查询按钮）的
        模块会在卡片底部多出一条空白带。
      */}
      {quickFilters.length > 0 || showSubmitButton ? (
        <div className="module-filter-form-row">
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
        </div>
      ) : null}
    </Form>
  )
}
