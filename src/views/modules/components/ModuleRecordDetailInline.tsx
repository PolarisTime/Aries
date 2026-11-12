import { Alert, Button, Col, Empty, Row, Spin } from 'antd'
import { createElement } from 'react'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { renderModuleRecordStatus } from '@/components/ModuleRecordStatus'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
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
import {
  buildModuleDetailBodyModel,
  getModuleDetailErrorMessage,
  ModuleDetailBody,
} from './ModuleDetailBody'
import { ModuleItemsTable } from './ModuleItemsTable'

interface Props {
  config: ModulePageConfig
  record: ModuleRecord | null
  loading: boolean
  error: unknown
  onRetry: () => void
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
          description={getModuleDetailErrorMessage(
            error,
            t('result.error.subTitle'),
          )}
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

  /*
   * 公共正文模型：明细列、合计行、信息区字段过滤、模块附加节点都在
   * ModuleDetailBody 里（与详情弹窗壳共用同一份）。
   * 本壳只保留「行展开」的差异：轻量三态、字段区形态、明细分组呈现、是否渲染信息卡。
   */
  const {
    isPlanB,
    infoFields,
    detailItems: items,
    hasItemColumns,
    tableColumns,
    summary,
    extras,
  } = buildModuleDetailBodyModel({ config, record, formatCellValue })
  /*
   * 与详情弹层同一口径：方案 B 的信息区去掉顶栏已经呈现过的内容（状态标签、主单号等），
   * 顶栏没渲染标签（记录没有 status）时保留字段，状态不会凭空消失；
   * 未配置 `detailLayout: 'inline'` 的模块一个字段都不动。
   */
  const hasHeaderFields = config.detailFields.length > 0
  const showInfoCard =
    hasHeaderFields ||
    isPlanB ||
    detailMetricsSlot !== undefined ||
    config.renderDetailExtras !== undefined
  const renderItems = () => {
    if (config.key === 'freight-bill') {
      const groups = groupFreightBillItems(items)
      if (!groups.length) {
        return (
          <ModuleItemsTable
            columns={tableColumns}
            dataSource={items}
            emptyText={t('modules.detail.noDetailItems')}
            summary={summary}
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
                  summary={summary}
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
            summary={summary}
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
                    summary={summary}
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
            summary={summary}
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
                summary={summary}
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
        summary={summary}
      />
    )
  }

  /*
   * 明细卡内容（**不含卡片外壳**，外壳由公共层 ModuleDetailBody 包）：
   * 与详情弹层共用同一段明细表渲染（`renderItems` 已按模块分组），
   * plan B 与缺省布局都把它作为最后一张白卡。
   */
  const itemsContent = hasItemColumns ? renderItems() : null

  /*
   * 行展开的方案 B 形态（`detailLayout: 'inline'`，当前仅销售订单）：**只渲染明细卡**。
   *
   * <p>行展开是「点开看一眼这张单有什么货」的轻量视图：主单号、状态、客户、日期这些字段
   * 列表行本身就有，再在展开区复述一遍顶栏 + 四张指标卡 + 业务信息网格，等于把详情弹层
   * 整页塞进一行里 —— 用户要的是明细，结果先看到一片与列表重复的抬头信息。
   * 因此这里只留明细表；完整的抬头、指标与业务信息仍在详情弹层（`ModuleRecordDetailContent`）
   * 与编辑弹层里。</p>
   *
   * <p>缺省布局的模块（对账单等）不受影响：它们的行展开里表头字段是解读明细的必要上下文
   * （对账期间、结算主体），仍按原样「表头在上、明细在下」。</p>
   */
  if (isPlanB) {
    return (
      <ModuleDetailBody
        className="module-detail-surface module-detail-surface--plan-b module-detail-surface--compact module-record-detail-inline"
        /*
          只读详情面的模块级附加节点(如销售订单网价核查): 无 UI, 只负责准备派生展示的数据 ——
          明细里的「网价匹配」列按行 id 订阅它写入的 store，删掉这段列就全变「未核查」。
          方案 B 的展开区没有信息卡，节点直接挂在 surface 下。
        */
        leading={extras}
        items={itemsContent}
      />
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
    <ModuleDetailBody
      className="module-detail-surface module-record-detail-inline module-detail-surface--compact"
      info={
        showInfoCard ? (
          <>
            {/* 只读详情面的模块级附加节点(如销售订单网价核查): 无 UI, 只负责准备派生展示的数据。 */}
            {extras}
            {/*
              指标条：由页面通过 detailMetricsSlot 提供（销售订单是项目销售汇总的四项指标）。
              插槽未配置时整块不渲染，不留空 div。
            */}
            {detailMetricsSlot
              ? createElement(detailMetricsSlot, { record })
              : null}
            {infoFields.length ? renderHeaderFields() : null}
          </>
        ) : null
      }
      items={itemsContent}
      emptyFallback={
        <AppResult
          status="info"
          title={t('modules.detail.noDetailItems')}
          className="module-record-detail-inline-empty"
        />
      }
    />
  )
}
