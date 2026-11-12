import type { TableColumnsType, TableProps } from 'antd'
import type { ReactNode } from 'react'
import type {
  ModuleColumnDefinition,
  ModuleDetailField,
  ModuleDetailSummaryCell,
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { hasDetailHeaderStatus } from './ModuleDetailHeader'
import { ModuleDetailSummaryRow } from './ModuleDetailSummaryRow'
import { buildDetailItemColumns } from './module-record-detail-columns'

/**
 * 只读详情面的**公共正文层**：两个外壳（`ModuleRecordDetailContent` 弹层、
 * `ModuleRecordDetailInline` 列表行展开）真正重复的部分都在这里。
 *
 * <p>重复点来自两个外壳逐字相同的四段逻辑：</p>
 * <ol>
 *   <li>明细列构建：`detailItemColumns || itemColumns` → `buildDetailItemColumns`
 *       （单重占位、单据引用、列自定义渲染、数值列标记的唯一出口）；</li>
 *   <li>合计行：调 `config.detailSummary` 取单元格，再用 `ModuleDetailSummaryRow`
 *       渲染成表尾一行（两壳都把它作为明细表的 `summary` 插槽）；</li>
 *   <li>信息区字段过滤：方案 B 去掉顶栏已呈现的状态/主单号（{@link hasDetailHeaderStatus}）；</li>
 *   <li>只读详情面的模块级附加节点 `renderDetailExtras` 的挂载。</li>
 * </ol>
 *
 * <p><b>刻意不抽的部分</b>（看起来重复、语义不同，抽进来只会制造分支）：</p>
 * <ul>
 *   <li><b>字段区渲染</b>：弹层缺省布局用 antd `Descriptions`，行展开缺省布局用
 *       `Row/Col + bill-detail-item`（标签补白、状态渲染、列自定义 render 的 DOM 都不同）；
 *       方案 B 弹层用 `ModuleDetailFieldGrid`，行展开方案 B 干脆不渲染字段区；</li>
 *   <li><b>明细呈现</b>：弹层是 `ModuleItemsPanel + ModuleItemGroupsView`（带标题行、关闭/打印
 *       动作、行拖动/右键菜单），行展开是四段手写的分组表格（freight-bill / freight-statement /
 *       customer-statement / 默认）。DOM 与语义都不同，合并会改变外观；</li>
 *   <li><b>加载中 / 加载失败 / 无数据</b>三态：弹层用 `Spin / AppResult / Empty`，
 *       行展开用带 `module-record-detail-inline-state` 外壳的轻量版本；</li>
 *   <li><b>顶栏卡 / 指标条 / 业务信息网格</b>：属于弹层（或页面）编排，不是两壳的公共正文。</li>
 * </ul>
 *
 * <p>因此公共层提供两块：{@link buildModuleDetailBodyModel} 产出两壳共用的派生数据，
 * {@link ModuleDetailBody} 只负责把「信息卡 / 明细卡 / 空态」按既有 DOM 包出来 ——
 * 两个外壳的差异（是否显示信息卡、surface 类名、附加节点落点）全部由调用方通过 props 决定。</p>
 */

/** 只读详情面公共正文的派生模型（纯数据，不含任何布局决策）。 */
export interface ModuleDetailBodyModel {
  /** 详情面布局开关：只认页面显式配置的 `detailLayout: 'inline'`（方案 B）。 */
  isPlanB: boolean
  /** 信息区要展示的字段（方案 B 去掉顶栏已经呈现过的内容）。 */
  infoFields: ModuleDetailField[]
  /** 明细行；`record.items` 缺省为空数组。 */
  detailItems: ModuleLineItem[]
  /** 页面声明的明细列（`detailItemColumns || itemColumns || []`）。 */
  detailItemColumns: ModuleColumnDefinition[]
  /** 只读明细表列定义（两壳共用 `buildDetailItemColumns` 唯一出口）。 */
  tableColumns: TableColumnsType<ModuleLineItem>
  /** 是否有明细列（决定是否渲染明细卡）。等价于改造前两壳各自的列数判断。 */
  hasItemColumns: boolean
  /** 合计行渲染函数；没有合计、或没有明细行时为 undefined（表格 footer 不出现）。 */
  summary?: TableProps<ModuleLineItem>['summary']
  /** 模块级附加节点（`renderDetailExtras`）：两壳都必须挂载，否则派生数据不准备。 */
  extras?: ReactNode
}

/**
 * 解析错误文案：`Error` / 非空字符串 / 兜底文案。
 *
 * <p>两个外壳的三态分支 DOM 不同，但「错误对象 → 可读文案」的口径必须只有一处，
 * 否则同一个错误在弹层与行展开会显示不同文字。</p>
 */
export function getModuleDetailErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }
  return fallback
}

/**
 * 构建只读详情面公共正文模型。
 *
 * <p>必须在 `record` 非空之后调用（两壳都在三态分支早返回之后才进入正文）。</p>
 *
 * <p>合计口径只有 `config.detailSummary` 一个出口：这里只负责调用与包成
 * `ModuleDetailSummaryRow`，不做任何求和、不重新格式化。空明细时**不调用**该投影
 * （与两个外壳改造前的行为一致：没有明细就不渲染合计行）。</p>
 */
export function buildModuleDetailBodyModel(args: {
  config: ModulePageConfig
  record: ModuleRecord
  formatCellValue: (value: unknown, columnType?: string) => string
}): ModuleDetailBodyModel {
  const { config, record, formatCellValue } = args
  const isPlanB = config.detailLayout === 'inline'

  /*
   * 方案 B 的信息区字段：去掉顶栏已经呈现过的内容，避免同一张单的同一串数字在上下两处打架。
   * - 状态：顶栏已经用标签呈现（判定与顶栏共用 `hasDetailHeaderStatus`，顶栏没渲染标签时保留字段）；
   * - 其余（如主单号）由页面通过 `config.detailInfoHiddenKeys` 显式声明，不在这里猜字段名。
   * 未配置 `detailLayout: 'inline'` 的模块一个字段都不动。
   */
  const hiddenInfoKeys = isPlanB
    ? new Set(config.detailInfoHiddenKeys ?? [])
    : null
  const infoFields = config.detailFields.filter((field) => {
    if (hiddenInfoKeys?.has(field.key)) return false
    if (isPlanB && hasDetailHeaderStatus(record) && field.key === 'status') {
      return false
    }
    return true
  })

  const detailItems = record.items || []
  const detailItemColumns = config.detailItemColumns || config.itemColumns || []
  const tableColumns = buildDetailItemColumns({
    columns: detailItemColumns,
    formatCellValue,
  })

  const detailSummaryCells: ModuleDetailSummaryCell[] | null =
    config.detailSummary && detailItems.length
      ? config.detailSummary({ items: detailItems })
      : null
  const summary: TableProps<ModuleLineItem>['summary'] =
    detailSummaryCells?.length
      ? () => (
          <ModuleDetailSummaryRow
            columns={tableColumns}
            cells={detailSummaryCells ?? []}
          />
        )
      : undefined

  return {
    isPlanB,
    infoFields,
    detailItems,
    detailItemColumns,
    tableColumns,
    hasItemColumns: tableColumns.length > 0,
    summary,
    extras: config.renderDetailExtras?.({ record }),
  }
}

export interface ModuleDetailBodyProps {
  /**
   * `module-detail-surface` 外壳的完整类名。
   *
   * <p>弹层与行展开的差异（`--plan-b` / `--compact` / `module-record-detail-inline`）
   * 全部由调用方给，公共层不判断「我是哪种壳」。</p>
   */
  className: string
  /**
   * 信息卡内容；`null` / `undefined` 表示该壳这一侧不渲染信息卡。
   *
   * <p>信息卡里放什么（顶栏 / 指标条 / 字段区 / 关闭打印动作）由各壳自己决定，
   * 公共层只负责 `module-detail-card--info` 这层包装与出现时机。</p>
   */
  info?: ReactNode | null
  /** 明细卡内容；`null` / `undefined` 表示不渲染明细卡（没有明细列的模块不出现空卡）。 */
  items?: ReactNode | null
  /**
   * 直接挂在 surface 下、两张卡之前的节点。
   *
   * <p>目前只有行展开的方案 B 用到：`renderDetailExtras` 在那里是 surface 级节点，
   * 不能塞进信息卡（该壳不渲染信息卡）。</p>
   */
  leading?: ReactNode
  /** 两张卡都不存在时的兜底空态（行展开缺省布局在无表头字段、无明细列时使用）。 */
  emptyFallback?: ReactNode
}

/**
 * 只读详情面的公共正文外壳：`surface` 容器 + 信息卡 + 明细卡 + 兜底空态。
 *
 * <p>DOM 与改造前两个外壳各自手写的结构逐字一致（类名、卡片顺序、空态位置都不变），
 * 只是把这段重复的包装收敛到一处。</p>
 */
export function ModuleDetailBody({
  className,
  info,
  items,
  leading,
  emptyFallback,
}: ModuleDetailBodyProps) {
  const hasInfo = info !== null && info !== undefined
  const hasItems = items !== null && items !== undefined

  return (
    <div className={className}>
      {leading}
      {hasInfo ? (
        <div className="module-detail-card module-detail-card--info">
          {info}
        </div>
      ) : null}
      {hasItems ? (
        <div className="module-detail-card module-detail-card--items">
          {items}
        </div>
      ) : null}
      {!hasInfo && !hasItems ? emptyFallback : null}
    </div>
  )
}
