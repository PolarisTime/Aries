import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { FormInstance } from 'antd'
import { Button, Flex, Space, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PrintRecordItem } from '@/api/system/print-template'
import type { PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'
import { formatDate } from '@/utils/formatters'
import {
  getPrintItemFields,
  isStatementPrintModule,
  supportsSalesOrderPrintOption,
} from '@/utils/print-module-config'
import { PrintJobHeader } from '@/views/modules/components/PrintJobHeader'
import { PrintJobItemsSection } from '@/views/modules/components/PrintJobItemsSection'
import { PrintJobModalSummaryBar } from '@/views/modules/components/PrintJobModalSummaryBar'
import { PrintJobTemplateOptionsForm } from '@/views/modules/components/PrintJobTemplateOptionsForm'
import { buildPrintJobDragAccessibility } from '@/views/modules/components/print-job-item-drag-a11y'
import {
  fieldText,
  numericTotal,
  projectSummary,
  recordCounterparty,
  recordOrderNo,
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
  mergeEquivalentItems: boolean
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
  mergeEquivalentItems,
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
  const isSalesOrder = supportsSalesOrderPrintOption(moduleKey)
  const statementPrintModule = isStatementPrintModule(moduleKey)
  const printItemFields = useMemo(
    () => getPrintItemFields(moduleKey),
    [moduleKey],
  )
  const mergeEquivalentItemsAvailable = isSalesOrder
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

  const totalQuantity = numericTotal(
    itemState.selectedPrintItems.map((item) => item.quantity),
  )
  const totalWeight = numericTotal(
    itemState.selectedPrintItems.map((item) => item.weightTon),
  )
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
        counterpartyName={recordCounterparty(primaryRecord)}
        moduleTitle={moduleTitle}
        orderNo={recordOrderNo(primaryRecord)}
        projectSummaryText={projectSummary(primaryRecord)}
        selectedTemplate={selectedTemplate}
        t={t}
      />
      <PrintJobTemplateOptionsForm
        form={form}
        templates={templates}
        templateOptions={templateOptions}
        isSalesOrder={isSalesOrder}
      />
      <PrintJobModalSummaryBar
        recordDeliveryDate={formatDate(primaryRecord?.deliveryDate, '-')}
        recordRemark={fieldText(primaryRecord?.remark)}
        settlementCompanyName={fieldText(primaryRecord?.settlementCompanyName)}
        totalQuantity={totalQuantity}
        totalWeight={totalWeight}
      />
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
        {mergeEquivalentItemsAvailable ? (
          <Flex gap="small">
            <Button
              size="small"
              type={mergeEquivalentItems ? 'primary' : 'default'}
              onClick={() => form.setFieldValue('mergeMode', 'merge')}
            >
              {t('modules.print.mergeEquivalentItems')}
            </Button>
            <Button
              size="small"
              type={mergeEquivalentItems ? 'default' : 'primary'}
              onClick={() => form.setFieldValue('mergeMode', 'split')}
            >
              {t('modules.print.splitEquivalentItems')}
            </Button>
          </Flex>
        ) : null}
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
              statementPrintModule ? 'print-job-items-scroll' : undefined
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
              isStatementPrintModule={statementPrintModule}
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
