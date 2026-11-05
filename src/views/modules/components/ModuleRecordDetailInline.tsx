import type { TableColumnsType } from 'antd'
import { Alert, Button, Col, Empty, Row, Spin } from 'antd'
import { createElement } from 'react'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { renderModuleRecordStatus } from '@/components/ModuleRecordStatus'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { padLabel } from '@/utils/label-utils'
import { groupCustomerStatementItems } from '@/views/modules/customer-statement-item-groups'
import {
  groupFreightBillItems,
  groupFreightStatementItems,
} from '@/views/modules/freight-statement-item-groups'
import { CustomerStatementItemGroupHeader } from './CustomerStatementItemGroupHeader'
import {
  FreightStatementItemGroupHeader,
  FreightStatementProjectGroupHeader,
} from './FreightStatementItemGroupHeader'
import { ModuleDetailFieldGrid } from './ModuleDetailFieldGrid'
import { hasDetailHeaderStatus, ModuleDetailHeader } from './ModuleDetailHeader'
import { ModuleDetailSummaryRow } from './ModuleDetailSummaryRow'
import { ModuleItemsTable } from './ModuleItemsTable'
import { buildDetailItemColumns } from './module-record-detail-columns'

interface Props {
  config: ModulePageConfig
  record: ModuleRecord | null
  loading: boolean
  error: unknown
  onRetry: () => void
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }
  return fallback
}

/** 列表行展开后的轻量详情视图；不创建新的浮层，避免打断列表上下文。 */
export function ModuleRecordDetailInline({
  config,
  record,
  loading,
  error,
  onRetry,
}: Props) {
  const { t } = useTranslation()
  const { formatCellValue } = useModuleDisplaySupport()
  /* 指标条插槽：页面未配置时为 undefined，详情面不渲染任何占位节点。 */
  const detailMetricsSlot = config.detailMetricsSlot
  const itemColumns = config.detailItemColumns || config.itemColumns || []
  /*
   * 列构建**复用详情弹层那一个出口** `buildDetailItemColumns`，不再在这里手写第二份
   * map（原本两处逻辑逐字重复：单重占位、单据引用、列自定义渲染、通用格式化）。
   *
   * <p>复用的关键收益是数值列会带上 `module-detail-table-cell--numeric` 标记：
   * 少了它，行内展开的金额/重量既拿不到等宽数字、也拿不到右对齐，
   * 合计行的数值单元格更不会命中 `tfoot` 的 `white-space: nowrap`（金额被折成两行）。</p>
   */
  const tableColumns: TableColumnsType<ModuleLineItem> = buildDetailItemColumns(
    {
      columns: itemColumns,
      formatCellValue,
    },
  )

  if (loading) {
    return (
      <div className="module-record-detail-inline-state">
        <Spin size="small" />
        <span>{t('common.loading')}</span>
      </div>
    )
  }

  if (error != null) {
    return (
      <div className="module-record-detail-inline-state">
        <Alert
          type="error"
          showIcon
          title={t('api.loadFailed')}
          description={getErrorMessage(error, t('result.error.subTitle'))}
          action={
            <Button size="small" type="primary" onClick={onRetry}>
              {t('errorBoundary.retry')}
            </Button>
          }
        />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="module-record-detail-inline-state">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('modules.detail.noData')}
        />
      </div>
    )
  }

  /*
   * 表头（detailFields）与明细（itemColumns）**两块都要渲染**，不再二选一。
   *
   * 历史行为是 `if (!tableColumns.length)` 才渲染表头，导致所有「既有明细列、又配了
   * detailFields」的模块（客户/物流对账单等）在行内展开详情里一个表头字段都看不到：
   * 对账期间、结算主体、金额合计、审核状态全部缺失（审查记录据此判定 P1）。
   * 现在固定顺序为「表头在上、明细在下」，与浮层详情（ModuleRecordDetailContent）一致。
   */
  const renderHeaderFields = () => (
    <div className="module-record-detail-inline-fields">
      {config.detailFields.length ? (
        <Row gutter={[12, 12]}>
          {config.detailFields.map((field) => {
            const column = config.columns.find(
              (item) => item.dataIndex === field.key,
            )
            const fieldType = column?.type || field.type
            const value = record[field.key]
            return (
              <Col key={field.key} span={field.fullRow ? 24 : 6}>
                <div className="bill-detail-item">
                  <span className="bill-detail-label">
                    {padLabel(field.label)}
                  </span>
                  <span className="bill-detail-value">
                    {fieldType === 'status'
                      ? renderModuleRecordStatus({
                          record,
                          statusKey: field.key,
                          statusMap: config.statusMap,
                          renderFallback: (status) =>
                            formatCellValue(status, fieldType),
                        })
                      : column?.render
                        ? column.render(value, record)
                        : formatCellValue(value, fieldType)}
                  </span>
                </div>
              </Col>
            )
          })}
        </Row>
      ) : (
        <AppResult
          status="info"
          title={t('modules.detail.noDetailItems')}
          className="module-record-detail-inline-empty"
        />
      )}
    </div>
  )

  const hasHeaderFields = config.detailFields.length > 0
  const hasItemColumns = tableColumns.length > 0
  /*
   * 与详情弹层（ModuleRecordDetailContent）**同一份判定口径**：
   * - `isPlanB` 只认显式配置的 `detailLayout: 'inline'`（当前只有销售订单）；
   * - 信息卡与明细卡各自独立挂载，任一侧没有内容就不出现，避免行展开里多出空卡。
   */
  const isPlanB = config.detailLayout === 'inline'
  /*
   * 与详情弹层同一口径：方案 B 的信息区去掉顶栏已经呈现过的内容（状态标签、主单号等），
   * 顶栏没渲染标签（记录没有 status）时保留字段，状态不会凭空消失。
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
  const showItemsCard = hasItemColumns
  const showInfoCard =
    hasHeaderFields ||
    isPlanB ||
    detailMetricsSlot !== undefined ||
    config.renderDetailExtras !== undefined

  const items = record.items || []
  /*
   * 合计行：四处明细表（freight-bill / freight-statement / customer-statement / 默认）
   * 共用**同一个** summary 函数，不逐处复制。口径来自 `config.detailSummary`（唯一出口），
   * 这里只负责渲染；列定义就是明细表自己的 tableColumns，合计数字才能逐列对齐。
   *
   * 插槽未配置、没有明细行、或插槽返回 null / 空数组时 `buildSummary` 为 undefined ——
   * 表格 footer 完全不出现，与改动前的 DOM 一致。
   *
   * 分组分支（freight-bill / freight-statement / customer-statement）里每张分组表会各调用一次
   * summary，语义上是「分组小计」；当前只有销售订单配置了 detailSummary 且走默认分支，
   * 因此不会出现每个分组都重复一遍整单合计。
   */
  const summaryCells =
    config.detailSummary && items.length
      ? config.detailSummary({ items })
      : null
  /*
   * 合计行直接吃明细表的列定义（不再 `as` 收窄）：`ModuleDetailSummaryColumn.align`
   * 现在与 antd 的 `AlignType` 同宽，`TableColumnsType` 原样传入即可。
   */
  const buildSummary = summaryCells?.length
    ? () => (
        <ModuleDetailSummaryRow columns={tableColumns} cells={summaryCells} />
      )
    : undefined
  const renderItems = () => {
    if (config.key === 'freight-bill') {
      const groups = groupFreightBillItems(items)
      if (!groups.length) {
        return (
          <ModuleItemsTable
            columns={tableColumns}
            dataSource={items}
            emptyText={t('modules.detail.noDetailItems')}
            summary={buildSummary}
          />
        )
      }
      return (
        <div className="module-items-groups">
          {groups.map((group) => (
            <div className="module-items-group" key={group.key}>
              <div className="module-items-project-group">
                <FreightStatementProjectGroupHeader group={group} />
                <ModuleItemsTable
                  columns={tableColumns}
                  dataSource={group.items}
                  emptyText={t('modules.detail.noDetailItems')}
                  summary={buildSummary}
                />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (config.key === 'freight-statement') {
      const groups = groupFreightStatementItems(items)
      if (!groups.length) {
        return (
          <ModuleItemsTable
            columns={tableColumns}
            dataSource={items}
            emptyText={t('modules.detail.noDetailItems')}
            summary={buildSummary}
          />
        )
      }
      return (
        <div className="module-items-groups">
          {groups.map((group) => (
            <div className="module-items-group" key={group.key}>
              <FreightStatementItemGroupHeader group={group} />
              {group.projectGroups.map((projectGroup) => (
                <div
                  className="module-items-project-group"
                  key={projectGroup.key}
                >
                  <FreightStatementProjectGroupHeader
                    group={projectGroup}
                    showSubtotal={false}
                  />
                  <ModuleItemsTable
                    columns={tableColumns}
                    dataSource={projectGroup.items}
                    emptyText={t('modules.detail.noDetailItems')}
                    summary={buildSummary}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )
    }

    if (config.key === 'customer-statement') {
      const groups = groupCustomerStatementItems(items)
      if (!groups.length) {
        return (
          <ModuleItemsTable
            columns={tableColumns}
            dataSource={items}
            emptyText={t('modules.detail.noDetailItems')}
            summary={buildSummary}
          />
        )
      }
      return (
        <div className="module-items-groups">
          {groups.map((group) => (
            <div className="module-items-group" key={group.key}>
              <CustomerStatementItemGroupHeader group={group} />
              <ModuleItemsTable
                columns={tableColumns}
                dataSource={group.items}
                emptyText={t('modules.detail.noDetailItems')}
                summary={buildSummary}
              />
            </div>
          ))}
        </div>
      )
    }

    return (
      <ModuleItemsTable
        columns={tableColumns}
        dataSource={items}
        emptyText={t('modules.detail.noDetailItems')}
        summary={buildSummary}
      />
    )
  }

  /*
   * 行展开容器：`module-record-detail-inline` 留在外层（它携带行展开条带的底色与上边框，
   * 并让 `.module-record-detail-inline .module-items-table-shell { border: 0 }` 等既有
   * 选择器继续命中），与 `module-detail-surface` 放在**同一个元素**上 —— 两者的留白不会
   * 叠加两次；内层 `module-detail-card` 才是白卡，结构与详情弹层保持一致。
   *
   * `module-detail-surface--compact` 是方案 B 在窄容器里的退化开关：行展开的可用宽度由
   * 列表列数决定、与视口无关，所以指标条与信息区固定 2 列，不能靠 `@media` 断点判断。
   */
  /*
   * 明细卡：与详情弹层共用同一段 JSX（`renderItems` 已按模块分组），
   * plan B 与缺省布局都把它作为最后一张白卡。
   */
  const itemsCard = showItemsCard ? (
    <div className="module-detail-card module-detail-card--items">
      {renderItems()}
    </div>
  ) : null

  /*
   * 行展开的方案 B 形态（`detailLayout: 'inline'`，当前仅销售订单）：
   *
   * 1. 顶栏卡：顶栏（标题 / 单号 / 状态 / 关联项目）+ 四张指标卡；
   * 2. 业务信息卡：标题栏 + 「标签：值」网格（容器窄，固定 2 列）；
   * 3. 明细卡。
   *
   * 行展开是列表内嵌视图：**不渲染返回箭头、关闭按钮与单据动作按钮**（顶栏在 compact 下
   * 自动略过），否则点一下就会把列表挤走或弹出一个覆盖层。
   */
  if (isPlanB) {
    return (
      <div className="module-detail-surface module-detail-surface--plan-b module-detail-surface--compact module-record-detail-inline">
        <div className="module-detail-card module-detail-card--summary">
          {/* 只读详情面的模块级附加节点(如销售订单网价核查): 无 UI, 只负责准备派生展示的数据。 */}
          {config.renderDetailExtras?.({ record })}
          <ModuleDetailHeader config={config} record={record} compact />
          {detailMetricsSlot
            ? createElement(detailMetricsSlot, { record })
            : null}
        </div>
        {infoFields.length ? (
          <div className="module-detail-card module-detail-card--info">
            <ModuleDetailFieldGrid
              config={config}
              fields={infoFields}
              formatCellValue={formatCellValue}
              record={record}
              compact
              title={config.detailInfoTitle}
            />
          </div>
        ) : null}
        {itemsCard}
      </div>
    )
  }

  /*
   * 缺省布局（未配置 `detailLayout: 'inline'` 的 18 个模块）：DOM 与改造前逐字一致。
   *
   * `module-record-detail-inline` 留在外层（它携带行展开条带的底色与上边框，并让
   * `.module-record-detail-inline .module-items-table-shell { border: 0 }` 等既有选择器
   * 继续命中），与 `module-detail-surface` 放在**同一个元素**上 —— 两者的留白不会叠加两次。
   */
  return (
    <div className="module-detail-surface module-record-detail-inline module-detail-surface--compact">
      {showInfoCard ? (
        <div className="module-detail-card module-detail-card--info">
          {/* 只读详情面的模块级附加节点(如销售订单网价核查): 无 UI, 只负责准备派生展示的数据。 */}
          {config.renderDetailExtras?.({ record })}
          {/*
            指标条：由页面通过 detailMetricsSlot 提供（销售订单是项目销售汇总的四项指标）。
            插槽未配置时整块不渲染，不留空 div。
          */}
          {detailMetricsSlot
            ? createElement(detailMetricsSlot, { record })
            : null}
          {infoFields.length ? renderHeaderFields() : null}
        </div>
      ) : null}
      {itemsCard}
      {!showInfoCard && !showItemsCard ? (
        <AppResult
          status="info"
          title={t('modules.detail.noDetailItems')}
          className="module-record-detail-inline-empty"
        />
      ) : null}
    </div>
  )
}
