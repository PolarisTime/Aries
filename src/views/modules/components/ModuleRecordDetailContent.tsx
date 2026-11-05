import { ReloadOutlined } from '@ant-design/icons'
import type { DescriptionsProps } from 'antd'
import { Button, Descriptions, Empty, Flex, Spin } from 'antd'
import { createElement } from 'react'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { resolveModuleActionIcon } from '@/module-system/presentation/module-action-icons'
import type {
  ModuleDetailField,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import {
  DETAIL_FIELD_WIDE_TEXT_LENGTH,
  ModuleDetailFieldGrid,
  ModuleRecordDetailFieldValue,
} from './ModuleDetailFieldGrid'
import { hasDetailHeaderStatus, ModuleDetailHeader } from './ModuleDetailHeader'
import { ModuleDetailSummaryRow } from './ModuleDetailSummaryRow'
import { ModuleItemGroupsView } from './ModuleItemGroupsView'
import { ModuleItemsPanel } from './ModuleItemsPanel'
import { buildModuleItemGroups } from './module-item-groups'
import { buildDetailItemColumns } from './module-record-detail-columns'

/**
 * 详情弹窗的内容区：加载中 / 加载失败 / 无数据 / 详情字段 + 只读明细。
 *
 * <p>从 ModuleRecordDetailOverlay 抽出的原因有两条：一是弹窗外壳（标题、关闭）
 * 与内容加载态是两件独立的事；二是原来「三态嵌套三元 + 字段网格的
 * 五层嵌套三元」让这个函数的嵌套深度达到 5，超出 react-doctor 阈值
 * (no-high-complexity-react-function)。这里改成早返回 + 每个字段一个取值组件，
 * 嵌套深度回到 1~2。</p>
 *
 * <p>本轮（设计稿「方案 B」）把内容区拆成**两张白卡**：信息卡（顶栏 + 指标条 + 字段区）
 * 与明细卡（只读明细 + 表尾合计行）。三态分支仍然在进卡之前早返回，因此加载中 / 加载失败 /
 * 无数据时不会出现任何空卡。字段取值与「长文本」口径统一在
 * {@link ModuleRecordDetailFieldValue} / {@link DETAIL_FIELD_WIDE_TEXT_LENGTH}，
 * 两种信息区布局共用同一份。</p>
 */

interface Props {
  config: ModulePageConfig
  error: unknown
  loading: boolean
  onClose: () => void
  onRetry: () => void
  record: ModuleRecord | null
  canPrint?: boolean
}

function getDetailErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }
  return fallback
}

interface FieldGridProps {
  config: ModulePageConfig
  fields: ModuleDetailField[]
  formatCellValue: (value: unknown, columnType?: string) => string
  record: ModuleRecord
}

/** 详情字段网格最多几列（与改造前的 24 栅格上限一致）。 */
const DETAIL_FIELD_MAX_COLUMNS = 4

/**
 * 单个字段占几列：`fullRow` 占满整行，长文本占两列，其余一列。
 *
 * <p>跨列是安全的：网格现在是 `table-layout: fixed` + `width: 100%`，列宽由第一行决定，
 * 后面行即使有 `colspan` 也不会反过来按内容重分布（之前 auto 布局下就会，把 18 位单号
 * 挤进 100px 的内容格里折行）。</p>
 */
export function resolveDetailFieldSpan({
  fullRow,
  textLength,
  columnCount,
}: {
  fullRow?: boolean
  textLength: number
  columnCount: number
}) {
  if (fullRow) return columnCount
  if (textLength > DETAIL_FIELD_WIDE_TEXT_LENGTH)
    return Math.min(2, columnCount)
  return 1
}

/**
 * 详情字段网格（**缺省布局**）：用 antd `Descriptions`（`bordered` + `size="small"`）呈现。
 *
 * <p>此前是「每个字段一个带边框的小卡片」：一屏八九个等重的方块，标签还用全角空格右补白，
 * 左缘参差、长文本（项目名称）在窄卡片里折成三行，整块读起来像表单而不是"单据详情"。
 * 换成 Descriptions 后是 antd 标准的「标签列 + 内容列」表格：标签统一右对齐、等宽、
 * 底色区分，值按列宽自动换行，整屏只剩一套边框。</p>
 *
 * <p>列数按字段数收敛（1~4），并对长文本让出双列：长文本按字面长度判断，纯展示口径，
 * 不涉及任何业务计算。</p>
 *
 * <p>**未配置 `detailLayout: 'inline'` 的模块永远走这里**，DOM 与类名保持与改造前逐字一致。</p>
 */
function ModuleRecordDetailDescriptions({
  config,
  fields,
  formatCellValue,
  record,
}: FieldGridProps) {
  const columnCount = Math.max(
    1,
    Math.min(DETAIL_FIELD_MAX_COLUMNS, fields.length),
  )
  const items: DescriptionsProps['items'] = fields.map((field) => {
    const value = (
      <ModuleRecordDetailFieldValue
        key={field.key}
        config={config}
        field={field}
        formatCellValue={formatCellValue}
        record={record}
      />
    )
    return {
      key: field.key,
      label: field.label,
      children: value,
      span: resolveDetailFieldSpan({
        fullRow: field.fullRow,
        textLength: String(record[field.key] ?? '').length,
        columnCount,
      }),
    }
  })
  return (
    <Descriptions
      className="module-record-detail-descriptions"
      bordered
      size="small"
      /* 窄屏逐级降列：详情弹层在小屏上不再横向挤成一条 */
      column={{ xs: 1, sm: 2, md: 2, lg: 3, xl: columnCount, xxl: columnCount }}
      items={items}
    />
  )
}

export function ModuleRecordDetailContent({
  config,
  error,
  loading,
  onClose,
  onRetry,
  record,
  canPrint = false,
}: Props) {
  const { t } = useTranslation()
  const { formatCellValue } = useModuleDisplaySupport()

  if (loading) {
    return (
      <Flex justify="center" align="center" className="py-64">
        <Spin />
      </Flex>
    )
  }

  if (error != null) {
    return (
      <AppResult
        className="app-result--workspace"
        status="error"
        title={t('api.loadFailed')}
        subTitle={getDetailErrorMessage(error, t('result.error.subTitle'))}
        extra={
          <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
            {t('errorBoundary.retry')}
          </Button>
        }
      />
    )
  }

  if (!record) {
    return <Empty description={t('modules.detail.noData')} />
  }

  const detailItemColumns = config.detailItemColumns || config.itemColumns || []
  const detailFields = config.detailFields || []
  const detailItems = record.items || []
  const detailItemGroups = buildModuleItemGroups(config.key, detailItems)
  const detailTableColumns = buildDetailItemColumns({
    columns: detailItemColumns,
    formatCellValue,
  })

  /*
   * 指标条与合计行都是**可选插槽**：页面没配置时这里一个节点都不渲染，
   * 不留下空 div、也不改变详情面原有的间距。
   *
   * 合计口径由 `config.detailSummary` 一处产出（销售订单即 sumLineItemsBy 的投影），
   * 本组件只负责把结果放进表格 footer，不重复求和、不重复格式化。
   */
  const detailMetricsSlot = config.detailMetricsSlot
  const detailSummaryCells = config.detailSummary
    ? config.detailSummary({ items: detailItems })
    : null
  /*
   * 没有明细行、或合计投影返回 null / 空数组时不渲染合计行 ——
   * footer 里一条只有边框的空行比不显示更糟。
   *
   * 注意分组：ModuleItemGroupsView 分组渲染时每张分组表都会调用 summary（base-slot 已在
   * 该 prop 上注明这是「分组小计」语义）。当前只有销售订单配置了 detailSummary，它不分组，
   * 所以不会出现「每个分组都重复一遍整单合计」。
   */
  const hasDetailSummary =
    detailItems.length > 0 && (detailSummaryCells?.length ?? 0) > 0

  /*
   * 方案 B 的两个开关，都必须**显式配置**才生效：
   *
   * - `isPlanB`（`detailLayout === 'inline'`）决定顶栏与信息区布局。当前只有销售订单声明，
   *   其余 18 个模块继续走 antd Descriptions，外观逐字不变。
   * - `showItemsCard` 决定明细是否独立成第二张白卡。这一条**全局生效**（视觉统一、风险低），
   *   但只在真有明细列时成立 —— 没配明细列的模块不会多出一张只有表头的空卡。
   */
  const isPlanB = config.detailLayout === 'inline'
  /*
   * 方案 B 的顶栏已经用状态标签呈现了 `status`，信息区不再重复同一个值（同一张卡里
   * 上下两处「完成销售」）。判定与顶栏共用 `hasDetailHeaderStatus`：顶栏没渲染标签时
   * （记录本身没有 status）保留该字段，状态不会凭空消失。
   */
  const infoFields =
    isPlanB && hasDetailHeaderStatus(record)
      ? detailFields.filter((field) => field.key !== 'status')
      : detailFields
  const showItemsCard = detailItemColumns.length > 0
  /*
   * 信息卡是否有内容：顶栏 / 指标条 / 字段区 / 模块附加节点任一存在即可。
   * 明细不独立成卡时，信息卡同时承担「关闭 / 打印」按钮的落点，所以仍然渲染
   * （与改造前「按钮在卡片里」的 DOM 位置一致）。
   */
  const showInfoCard =
    !showItemsCard ||
    isPlanB ||
    infoFields.length > 0 ||
    detailMetricsSlot !== undefined ||
    config.renderDetailExtras !== undefined

  const detailActions = (
    <div className="module-detail-actions">
      <Button
        className="overlay-action-button"
        icon={resolveModuleActionIcon('关闭')}
        onClick={onClose}
      >
        {t('modules.detail.close')}
      </Button>
      {canPrint ? (
        <Button
          className="overlay-action-button"
          icon={resolveModuleActionIcon('打印')}
        >
          {t('modules.detail.print')}
        </Button>
      ) : null}
    </div>
  )

  return (
    <div className="module-detail-surface">
      {showInfoCard ? (
        <div className="module-detail-card module-detail-card--info">
          {/* 只读详情面的模块级附加节点(如销售订单网价核查): 无 UI, 只负责准备派生展示的数据。 */}
          {config.renderDetailExtras?.({ record })}
          {/*
            顶栏（方案 B 第一段）：标题 + 单号 + 状态标签，右侧是可选动作插槽。
            未配置 `detailLayout: 'inline'` 的模块不渲染 —— 它们的标题在弹层外壳上即可。
          */}
          {isPlanB ? (
            <ModuleDetailHeader config={config} record={record} />
          ) : null}
          {/*
            指标条：由页面通过 detailMetricsSlot 提供（销售订单是项目销售汇总的四项指标）。
            插槽未配置时整块不渲染，不留空 div。
          */}
          {detailMetricsSlot
            ? createElement(detailMetricsSlot, { record })
            : null}
          {infoFields.length ? (
            isPlanB ? (
              /* 方案 B 的流式「标签：值」网格 */
              <ModuleDetailFieldGrid
                config={config}
                fields={infoFields}
                formatCellValue={formatCellValue}
                record={record}
              />
            ) : (
              <ModuleRecordDetailDescriptions
                config={config}
                fields={infoFields}
                formatCellValue={formatCellValue}
                record={record}
              />
            )
          ) : null}
          {showItemsCard ? null : detailActions}
        </div>
      ) : null}

      {/*
        明细卡（方案 B 第四段）：与信息卡同宽、8px 圆角、1px 边框的第二张白卡，
        表尾合计行沿用原实现。空明细由表格自己的 emptyText 呈现，不会出现「空卡」——
        整张卡只在真有明细列时挂载。
      */}
      {showItemsCard ? (
        <div className="module-detail-card module-detail-card--items">
          <ModuleItemsPanel
            title={config.detailItemTitle}
            className="module-detail-items-panel"
            items={detailItems}
            itemColumns={detailItemColumns}
            // 表尾已有 Table.Summary 合计行时，标题行的内联合计必须关掉（同一个口径不能两个出口）。
            showSummary={!hasDetailSummary}
            actions={detailActions}
          >
            <ModuleItemGroupsView
              groups={detailItemGroups}
              moduleKey={config.key}
              columns={detailTableColumns}
              emptyText={t('modules.detail.noDetailItems')}
              /*
                合计行：列定义与明细表用同一份 detailTableColumns，合计数字才能逐列对齐
                到上面的明细；cells 由 config.detailSummary 一处产出。插槽未配置、
                没有明细行或插槽返回 null 时传 undefined，表格 footer 完全不出现。
              */
              summary={
                hasDetailSummary
                  ? () => (
                      <ModuleDetailSummaryRow
                        columns={detailTableColumns}
                        cells={detailSummaryCells ?? []}
                      />
                    )
                  : undefined
              }
            />
          </ModuleItemsPanel>
        </div>
      ) : null}
    </div>
  )
}
