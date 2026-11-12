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
  buildModuleDetailBodyModel,
  getModuleDetailErrorMessage,
  ModuleDetailBody,
} from './ModuleDetailBody'
import {
  DETAIL_FIELD_WIDE_TEXT_LENGTH,
  ModuleDetailFieldGrid,
  ModuleRecordDetailFieldValue,
} from './ModuleDetailFieldGrid'
import { ModuleDetailHeader } from './ModuleDetailHeader'
import { ModuleItemGroupsView } from './ModuleItemGroupsView'
import { ModuleItemsPanel } from './ModuleItemsPanel'
import { buildModuleItemGroups } from './module-item-groups'

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
        subTitle={getModuleDetailErrorMessage(
          error,
          t('result.error.subTitle'),
        )}
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

  /*
   * 公共正文模型：明细列、合计行、信息区字段过滤、模块附加节点都在
   * ModuleDetailBody 里（与列表行展开壳共用同一份）；
   * 本壳只保留「弹层编排」的差异（顶栏 / 指标条 / 字段区形态 / 关闭打印动作）。
   */
  const {
    isPlanB,
    infoFields,
    detailItems,
    detailItemColumns,
    tableColumns,
    hasItemColumns,
    summary,
    extras,
  } = buildModuleDetailBodyModel({ config, record, formatCellValue })
  const detailItemGroups = buildModuleItemGroups(config.key, detailItems)

  /* 指标条属于弹层编排，不是两壳的公共正文；挂载点仍由本壳决定。 */
  const detailMetricsSlot = config.detailMetricsSlot
  /*
   * 信息卡是否有内容：顶栏 / 指标条 / 字段区 / 模块附加节点任一存在即可。
   * 明细不独立成卡时，信息卡同时承担「关闭 / 打印」按钮的落点，所以仍然渲染
   * （与改造前「按钮在卡片里」的 DOM 位置一致）。
   */
  const showInfoCard =
    !hasItemColumns ||
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

  /*
   * 明细卡内容（**不含卡片外壳**，外壳由公共层 ModuleDetailBody 包）：
   * plan B 与缺省布局共用同一段 JSX，避免「同一个明细面板写两遍」——
   * 两处一旦分叉，合计行/空态就会只在其中一处生效。
   *
   * 合计行渲染函数 `summary` 来自公共层：列定义（`tableColumns`）与合计单元格
   * （`config.detailSummary` 唯一出口）都和列表行展开壳共用同一份。
   */
  const itemsContent = hasItemColumns ? (
    <ModuleItemsPanel
      title={
        /*
         * 方案 B 的明细卡标题带「N 项」计数胶囊（与参考稿一致）；
         * 缺省布局保持原有纯标题，避免 18 个模块的 DOM 变化。
         */
        isPlanB ? (
          <span className="module-detail-items-title">
            {config.detailItemTitle ?? t('modules.itemsPanel.defaultTitle')}
            <span className="module-detail-items-count">
              {t('modules.itemsPanel.count', { count: detailItems.length })}
            </span>
          </span>
        ) : (
          config.detailItemTitle
        )
      }
      className="module-detail-items-panel"
      items={detailItems}
      itemColumns={detailItemColumns}
      // 表尾已有 Table.Summary 合计行时，标题行的内联合计必须关掉（同一个口径不能两个出口）。
      showSummary={summary === undefined}
      /*
       * 「关闭 / 打印」按钮行：方案 B 里关闭已经上移到卡片顶栏（返回箭头 + ×），
       * 明细面板再放一个就是同一动作的第二个入口。缺省布局仍保留在这里
       * （它的 DOM 位置与改造前一致）。
       */
      // 关闭 / 打印按钮固定在明细列表标题行（与改造前一致，也是整个详情面唯一的关闭入口）
      actions={detailActions}
    >
      <ModuleItemGroupsView
        groups={detailItemGroups}
        moduleKey={config.key}
        columns={tableColumns}
        emptyText={t('modules.detail.noDetailItems')}
        /*
          合计行：列定义与明细表用同一份 tableColumns，合计数字才能逐列对齐到上面的明细；
          cells 由 config.detailSummary 一处产出。插槽未配置、没有明细行或插槽返回
          null 时 summary 为 undefined，表格 footer 完全不出现。
        */
        summary={summary}
      />
    </ModuleItemsPanel>
  ) : null

  /*
   * 方案 B（`detailLayout: 'inline'`，当前仅销售订单）的两张卡：
   *
   * 1. 信息卡：顶栏（标题 / 单号 / 状态 / 关联项目 / 动作按钮）+ 指标卡 + 业务信息网格；
   * 2. 明细卡：只读明细 + 表尾合计（与缺省布局共用上面同一段 JSX）。
   *
   * 顶栏与业务信息合并成同一张卡：顶栏当卡头（自带底部 1px 分隔线），信息网格紧接其下。
   * 两张卡之间只隔着标题行时，卡片间隙会变成一块无意义的留白；合并后层级更清楚。
   */
  if (isPlanB) {
    return (
      <ModuleDetailBody
        className="module-detail-surface module-detail-surface--plan-b"
        info={
          <>
            {/* 只读详情面的模块级附加节点(如销售订单网价核查): 无 UI, 只负责准备派生展示的数据。 */}
            {extras}
            {/*
              顶栏只承载「这是哪张单」：标题 / 单号 / 状态 / 关联项目 + 业务按钮组。
              关闭入口统一放在明细列表标题行（与改造前同一个位置），顶栏不再放返回与 ×，
              避免同一动作出现三个入口。
            */}
            <ModuleDetailHeader config={config} record={record} />
            {/*
              指标卡：由页面通过 detailMetricsSlot 提供（销售订单是项目销售汇总的四张卡）。
              插槽未配置时整块不渲染，不留空 div。
            */}
            {detailMetricsSlot
              ? createElement(detailMetricsSlot, { record })
              : null}
            {/*
              业务信息网格：标题栏右侧本可以放「最后更新于 …」，但销售订单接口没有更新时间
              字段（`SalesOrderResponse` 只有 `version` 乐观锁），取不到就不显示，不造假。
            */}
            {infoFields.length ? (
              <ModuleDetailFieldGrid
                config={config}
                fields={infoFields}
                formatCellValue={formatCellValue}
                record={record}
                title={config.detailInfoTitle}
              />
            ) : null}
          </>
        }
        items={itemsContent}
      />
    )
  }

  return (
    <ModuleDetailBody
      className="module-detail-surface"
      info={
        showInfoCard ? (
          <>
            {/* 只读详情面的模块级附加节点(如销售订单网价核查): 无 UI, 只负责准备派生展示的数据。 */}
            {extras}
            {/*
              这里是**缺省布局**（未配置 `detailLayout: 'inline'` 的 18 个模块）：卡片内没有顶栏，
              标题由弹层外壳承担，DOM 与改造前逐字一致（方案 B 的分支在前面已提前 return）。

              指标条仍按 `detailMetricsSlot` 渲染：插槽未配置时整块不渲染，不留空 div。
            */}
            {detailMetricsSlot
              ? createElement(detailMetricsSlot, { record })
              : null}
            {infoFields.length ? (
              <ModuleRecordDetailDescriptions
                config={config}
                fields={infoFields}
                formatCellValue={formatCellValue}
                record={record}
              />
            ) : null}
            {hasItemColumns ? null : detailActions}
          </>
        ) : null
      }
      items={itemsContent}
    />
  )
}
