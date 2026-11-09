import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { FormInstance } from 'antd'
import { Flex, Space, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PrintRecordItem } from '@/api/system/print-template'
import type { PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'
import { getPrintJobLayout } from '@/utils/print-job-layout'
import { getPrintItemFields } from '@/utils/print-module-config'
import { PrintJobHeader } from '@/views/modules/components/PrintJobHeader'
import { PrintJobItemsSection } from '@/views/modules/components/PrintJobItemsSection'
import {
  PrintJobModalSummaryBar,
  type PrintJobSummaryInfoItem,
  type PrintJobSummaryTotalItem,
} from '@/views/modules/components/PrintJobModalSummaryBar'
import { PrintJobTemplateOptionsForm } from '@/views/modules/components/PrintJobTemplateOptionsForm'
import { buildPrintJobDragAccessibility } from '@/views/modules/components/print-job-item-drag-a11y'
import {
  fieldText,
  formatAmount,
  formattedTotal,
  numericAmountTotal,
  numericTotal,
  projectSummary,
  recordCounterparty,
  recordOrderNo,
  summaryDateText,
  templateTypeLabel,
} from '@/views/modules/components/print-job-modal-format'
import type { PrintJobFormValues } from '@/views/modules/components/print-job-modal-state'
import type {
  PrintJobItemsState,
  PrintJobModalDispatch,
} from '@/views/modules/components/use-print-job-modal-items'

/**
 * 打印作业弹窗的内容区。
 *
 * <p>从 PrintJobModal 抽出：整段弹窗内容约 95 行，是 no-giant-component
 * (>300 行) 的主要行数来源；同时它内部的计数文案、合并模式切换与
 * 「运费结算才限高滚动」等条件也贡献了弹窗一半的分支。这里改为「传入明细派生
 * 状态 + 主单据」后自行推导页头/统计/字段，父组件不再为内容区准备十几份派生值。</p>
 *
 * <p>结构保持不变：Flex(vertical, margin-middle) 内依次是页头 / 模板表单 /
 * 统计条 / 计数与合并切换 / 拖拽明细区，类名与 aria 契约不动。</p>
 */

interface Props {
  /** 打开明细选择时才向明细区下发选中集合(与改造前一致)。 */
  brandOverrideEnabled: boolean
  brandOverridesByItemId: Record<string, string>
  dispatch: PrintJobModalDispatch
  form: FormInstance<PrintJobFormValues>
  itemSelectionEnabled: boolean
  itemState: PrintJobItemsState
  moduleKey: string
  moduleTitle?: string
  onRetryPrintItems: () => void
  primaryRecord: ModuleRecord | undefined
  printItems: PrintRecordItem[]
  printItemsError: boolean
  selectedTemplate?: PrintTemplateRecord
  templates: PrintTemplateRecord[]
  /** 拖拽结束回调由父组件提供(状态归属弹窗 reducer)。 */
  onDragEnd: (event: DragEndEvent) => void
  /** 拖拽传感器由父组件创建(与改造前一致)。 */
  sensors: React.ComponentProps<typeof DndContext>['sensors']
}

export function PrintJobModalBody({
  brandOverrideEnabled,
  brandOverridesByItemId,
  dispatch,
  form,
  itemSelectionEnabled,
  itemState,
  moduleKey,
  moduleTitle,
  onRetryPrintItems,
  primaryRecord,
  printItems,
  printItemsError,
  selectedTemplate,
  templates,
  onDragEnd,
  sensors,
}: Props) {
  const { t } = useTranslation()
  // 模块布局是打印作业所有区域（Header/汇总/选项/明细列）的唯一差异来源。
  const layout = getPrintJobLayout(moduleKey)
  const printItemFields = useMemo(
    () => getPrintItemFields(moduleKey),
    [moduleKey],
  )
  const templateOptions = useMemo(
    () =>
      templates.map((template) => ({
        label: (
          <Space size={8}>
            <span>{template.templateName}</span>
            <Tag>{templateTypeLabel(template, t)}</Tag>
          </Space>
        ),
        value: template.id,
      })),
    [t, templates],
  )

  const totalQuantity = useMemo(
    () =>
      layout.summary.quantity
        ? numericTotal(
            itemState.selectedPrintItems.map((item) => item.quantity),
          )
        : null,
    [itemState.selectedPrintItems, layout.summary.quantity],
  )
  const totalWeight = useMemo(
    () =>
      layout.summary.weight
        ? numericTotal(
            itemState.selectedPrintItems.map((item) => item.weightTon),
          )
        : null,
    [itemState.selectedPrintItems, layout.summary.weight],
  )
  /*
   * 金额合计：优先逐行金额求和（与单据行级舍入同口径），明细没有金额时
   * 回退到表头字段（物流单 totalFreight、对账单 salesAmount、收付款单 amount）。
   */
  const totalAmount = useMemo(() => {
    if (!layout.summary.amount) return null
    const fromItems = numericAmountTotal(
      itemState.selectedPrintItems.map((item) => item.amount),
    )
    if (fromItems != null) return fromItems
    const headerValue = layout.summary.amount.headerFields
      .map((field) => primaryRecord?.[field])
      .find((value) => value != null && String(value).trim() !== '')
    return numericAmountTotal(headerValue == null ? [] : [headerValue])
  }, [itemState.selectedPrintItems, layout.summary.amount, primaryRecord])

  const infoItems = useMemo<PrintJobSummaryInfoItem[]>(() => {
    const items: PrintJobSummaryInfoItem[] = []
    if (layout.summary.date) {
      items.push({
        label: t(layout.summary.date.labelKey),
        value: summaryDateText(primaryRecord, layout.summary.date),
        maxWidth: 260,
      })
    }
    if (layout.summary.remark) {
      items.push({
        label: t('modules.print.recordRemark'),
        value: fieldText(primaryRecord?.remark),
        maxWidth: 320,
      })
    }
    if (layout.summary.settlementCompany) {
      items.push({
        label: t('modules.print.currentSettlementCompany'),
        value: fieldText(primaryRecord?.settlementCompanyName),
        maxWidth: 280,
      })
    }
    return items
  }, [layout.summary, primaryRecord, t])

  const totals = useMemo<PrintJobSummaryTotalItem[]>(() => {
    const items: PrintJobSummaryTotalItem[] = []
    if (layout.summary.quantity) {
      items.push({
        label: t('modules.print.totalQuantity'),
        value: formattedTotal(totalQuantity, 0),
      })
    }
    if (layout.summary.weight) {
      items.push({
        label: t('modules.print.totalWeight'),
        value: formattedTotal(totalWeight),
      })
    }
    if (layout.summary.amount) {
      items.push({
        label: t(layout.summary.amount.labelKey),
        value: totalAmount == null ? '-' : formatAmount(totalAmount),
      })
    }
    return items
  }, [layout.summary, t, totalAmount, totalQuantity, totalWeight])
  /*
   * 明细区 DndContext 的读屏产物: 中文操作说明 + 只播报「第 N 行 + 物料名 + 位次」的
   * 播报器(dnd-kit 默认文案会把 19 位雪花 id 念出来, 用户对不回是哪一行)。
   */
  const dragAccessibility = useMemo(
    () =>
      buildPrintJobDragAccessibility(
        itemState.orderedPrintItems,
        t,
        printItems,
      ),
    [itemState.orderedPrintItems, printItems, t],
  )

  return (
    <Flex vertical gap="middle">
      <PrintJobHeader
        counterpartyName={recordCounterparty(
          primaryRecord,
          layout.counterpartyFields,
        )}
        moduleTitle={moduleTitle}
        orderNo={recordOrderNo(primaryRecord)}
        projectSummaryText={projectSummary(primaryRecord)}
        selectedTemplate={selectedTemplate}
        t={t}
      />
      <PrintJobTemplateOptionsForm
        form={form}
        options={layout.options}
        templates={templates}
        templateOptions={templateOptions}
      />
      <PrintJobModalSummaryBar infoItems={infoItems} totals={totals} />
      <Flex justify="space-between" align="center" gap="small" wrap="wrap">
        <Typography.Text type="secondary">
          {itemSelectionEnabled
            ? t('modules.print.selectedItemsCount', {
                count: itemState.selectedPrintItems.length,
              })
            : t('modules.print.totalItemsCount', {
                count: printItems.length,
              })}
        </Typography.Text>
      </Flex>
      <DndContext
        accessibility={dragAccessibility}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={itemState.orderedPrintItemIds}
          strategy={verticalListSortingStrategy}
        >
          <div
            className={
              layout.scrollableItems ? 'print-job-items-scroll' : undefined
            }
          >
            <PrintJobItemsSection
              moduleKey={moduleKey}
              printItems={printItems}
              orderedPrintItems={itemState.orderedPrintItems}
              orderedPrintItemIds={itemState.orderedPrintItemIds}
              selectedPrintItems={itemState.selectedPrintItems}
              outputPrintItemIdSet={itemState.outputPrintItemIdSet}
              mergeMarkersByItemId={itemState.mergeMarkersByItemId}
              showMergeGroup={itemState.showMergeGroup}
              brandOverrideEnabled={brandOverrideEnabled}
              brandOverridesByItemId={brandOverridesByItemId}
              dispatch={dispatch}
              isStatementPrintModule={layout.statementGrouped}
              itemSelectionEnabled={itemSelectionEnabled}
              printItemFields={printItemFields}
              printItemsError={printItemsError}
              onRetryPrintItems={onRetryPrintItems}
              splitColumnEnabled={itemState.splitColumnEnabled}
              splitPieceCount={itemState.splitPieceCount}
              splitItemIds={itemState.effectiveSplitItemIds}
              onToggleSplitItem={itemState.handleToggleSplitItem}
            />
          </div>
        </SortableContext>
      </DndContext>
    </Flex>
  )
}
