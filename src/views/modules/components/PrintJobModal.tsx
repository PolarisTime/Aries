import type { DragEndEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useQuery } from '@tanstack/react-query'
import { Button, Flex, Form, Modal, Space, Tag, Typography, theme } from 'antd'
import { Fragment, useEffect, useMemo, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import {
  listPrintRecordItems,
  type PrintRecordItem,
  type SalesOrderPrintXlsxOptions,
} from '@/api/system/print-template'
import { DocumentReferencePopover } from '@/components/DocumentReferencePopover'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { PrintRenderOptions } from '@/hooks/useBusinessGridPrintActions'
import type { PrintActionMode, PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'
import { modal } from '@/utils/antd-app'
import { formatDate } from '@/utils/formatters'
import {
  getPrintItemFields,
  supportsSalesOrderPrintOption,
} from '@/utils/print-module-config'
import {
  fieldText,
  isPdfTemplate,
  numericTotal,
  projectSummary,
  recordCounterparty,
  recordOrderNo,
  templateTypeLabel,
} from '@/views/modules/components/print-job-modal-format'
import {
  INITIAL_PRINT_JOB_MODAL_STATE,
  type PendingOutputAction,
  type PrintJobFormValues,
  printJobModalReducer,
} from '@/views/modules/components/print-job-modal-state'
import { reorderPrintItemIds } from '@/views/modules/components/print-job-modal-utils'
import { usePrintJobItems } from '@/views/modules/use-print-job-items'
import { PrintJobItemsSection } from './PrintJobItemsSection'
import { PrintJobModalFooter } from './PrintJobModalFooter'
import { PrintJobModalSummaryBar } from './PrintJobModalSummaryBar'
import { PrintJobTemplateOptionsForm } from './PrintJobTemplateOptionsForm'

const EMPTY_PRINT_ITEMS: PrintRecordItem[] = []
const EMPTY_PRINT_OPTIONS: PrintJobFormValues['printOptions'] = []

interface Props {
  open: boolean
  moduleKey: string
  moduleTitle?: string
  selectedCount: number
  selectedRowKeys: string[]
  selectedRows: ModuleRecord[]
  templates: PrintTemplateRecord[]
  onClose: () => void
  onPrint: (
    mode: PrintActionMode,
    template: PrintTemplateRecord,
    printOptions?: PrintRenderOptions,
  ) => Promise<boolean>
  onExportPrintXlsx?: (
    printOptions?: SalesOrderPrintXlsxOptions,
  ) => Promise<boolean>
}

function PrintJobHeader({
  counterpartyName,
  moduleKey,
  moduleTitle,
  orderNo,
  projectSummaryText,
  selectedTemplate,
  t,
}: {
  counterpartyName: string
  moduleKey: string
  moduleTitle?: string
  orderNo: string
  projectSummaryText: string
  selectedTemplate?: PrintTemplateRecord
  t: (key: string, values?: Record<string, unknown>) => string
}) {
  const { token } = theme.useToken()
  const summaryParts = [
    { key: 'counterparty', text: counterpartyName },
    { key: 'project', text: projectSummaryText },
  ].filter((part) => part.text)
  return (
    <Flex vertical gap={token.marginXS}>
      <Flex align="center" gap="middle" wrap="wrap">
        <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>
          {moduleTitle || t('modules.print.currentModule')}
        </Typography.Text>
        {orderNo ? (
          <DocumentReferencePopover
            value={orderNo}
            moduleKey={moduleKey}
            documentLabel={moduleTitle || t('modules.print.currentModule')}
          />
        ) : null}
        {selectedTemplate ? (
          <Tag color={isPdfTemplate(selectedTemplate) ? 'blue' : 'green'}>
            {templateTypeLabel(selectedTemplate, t)}
          </Tag>
        ) : null}
      </Flex>
      {summaryParts.length ? (
        <Flex align="center" gap="small" wrap="wrap">
          {summaryParts.map((part, index) => (
            <Fragment key={part.key}>
              {index > 0 ? (
                <Typography.Text type="secondary">/</Typography.Text>
              ) : null}
              <Typography.Text
                ellipsis={{ tooltip: true }}
                style={{ maxWidth: 420 }}
              >
                {part.text}
              </Typography.Text>
            </Fragment>
          ))}
        </Flex>
      ) : null}
    </Flex>
  )
}

interface PrintJobOutputActionsInput {
  brandOverrideEnabled: boolean
  brandOverridesByItemId: Record<string, string>
  dispatch: React.Dispatch<Parameters<typeof printJobModalReducer>[1]>
  hideRemark: boolean
  hideUnitPrice: boolean
  itemSelectionEnabled: boolean
  mergeEquivalentItems: boolean
  mergeEquivalentItemsAvailable: boolean
  onExportPrintXlsx?: Props['onExportPrintXlsx']
  onPrint: Props['onPrint']
  orderedPrintItemIds: string[]
  selectedItemIds: string[]
  selectedTemplate?: PrintTemplateRecord
}

function createPrintJobOutputActions({
  brandOverrideEnabled,
  brandOverridesByItemId,
  dispatch,
  hideRemark,
  hideUnitPrice,
  itemSelectionEnabled,
  mergeEquivalentItems,
  mergeEquivalentItemsAvailable,
  onExportPrintXlsx,
  onPrint,
  orderedPrintItemIds,
  selectedItemIds,
  selectedTemplate,
}: PrintJobOutputActionsInput) {
  const currentBrandOverridesByItemId = () => {
    const normalizedBrandOverridesByItemId: Record<string, string> = {}
    for (const [itemId, value] of Object.entries(brandOverridesByItemId)) {
      const trimmed = value.trim()
      if (trimmed) {
        normalizedBrandOverridesByItemId[itemId] = trimmed
      }
    }
    return brandOverrideEnabled &&
      Object.keys(normalizedBrandOverridesByItemId).length
      ? normalizedBrandOverridesByItemId
      : undefined
  }

  // 三通道共享的打印选项：hideRemark/选中项/行序/品牌覆盖全通道一致，
  // mergeEquivalentItems 仅 LODOP/PDF 渲染通道支持（xlsx 导出无合并语义）。
  const currentOutputOptions = (): PrintRenderOptions &
    SalesOrderPrintXlsxOptions => {
    return {
      hideUnitPrice,
      hideRemark,
      ...(mergeEquivalentItemsAvailable ? { mergeEquivalentItems } : {}),
      ...(itemSelectionEnabled ? { selectedItemIds } : {}),
      ...(orderedPrintItemIds.length ? { itemOrder: orderedPrintItemIds } : {}),
      ...(currentBrandOverridesByItemId()
        ? { brandOverridesByItemId: currentBrandOverridesByItemId() }
        : {}),
    }
  }

  /** xlsx 导出选项：剥离渲染通道专属的合并开关。 */
  const toXlsxOptions = (
    options: PrintRenderOptions,
  ): SalesOrderPrintXlsxOptions => {
    const { mergeEquivalentItems: _mergeEquivalentItems, ...xlsxOptions } =
      options
    void _mergeEquivalentItems
    return xlsxOptions
  }

  const markSelectedPrintItemsOutput = (itemIds: string[]) => {
    if (!itemSelectionEnabled || !itemIds.length) return
    dispatch({ type: 'markPrintItemsOutput', itemIds })
  }

  /**
   * 三通道统一输出入口：preview/print/download 走渲染通道，xlsx 走导出通道。
   * 防重入、已打印标记与状态清理逻辑单一实现。
   */
  const handleOutput = (mode: PendingOutputAction): Promise<void> => {
    const exportHandler = onExportPrintXlsx
    if (mode !== 'xlsx' && !selectedTemplate) {
      return Promise.resolve()
    }
    if (mode === 'xlsx' && !exportHandler) {
      return Promise.resolve()
    }
    // 守卫已保证：xlsx 分支必有 exportHandler、渲染分支必有 template；
    // 先于 dispatch 捕获快照，避免重渲染后引用变化。
    const template = selectedTemplate
    const options = currentOutputOptions()
    dispatch({ type: 'setPendingOutputAction', value: mode })
    const run =
      mode === 'xlsx'
        ? (exportHandler as NonNullable<typeof exportHandler>)(
            toXlsxOptions(options),
          )
        : onPrint(mode, template as NonNullable<typeof template>, options)
    return run
      .then((succeeded) => {
        if (succeeded && mode !== 'preview') {
          markSelectedPrintItemsOutput(selectedItemIds)
        }
      })
      .finally(() => {
        dispatch({ type: 'setPendingOutputAction' })
      })
  }

  return {
    handleExportPrintXlsx: () => handleOutput('xlsx'),
    handlePrint: (mode: PrintActionMode) => handleOutput(mode),
  }
}

function normalizePrintItemOrder(
  currentOrder: string[],
  printItems: PrintRecordItem[],
) {
  const itemIds = printItems.map((item) => item.id)
  const itemIdSet = new Set(itemIds)
  const result: string[] = []
  for (const itemId of currentOrder) {
    if (itemIdSet.has(itemId)) {
      result.push(itemId)
    }
  }
  const existing = new Set(result)
  for (const itemId of itemIds) {
    if (!existing.has(itemId)) {
      result.push(itemId)
    }
  }
  return result
}

export function PrintJobModal({
  open,
  moduleKey,
  moduleTitle,
  selectedRowKeys,
  selectedRows,
  templates,
  onClose,
  onPrint,
  onExportPrintXlsx,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<PrintJobFormValues>()
  const [state, dispatchPrintJobModal] = useReducer(
    printJobModalReducer,
    INITIAL_PRINT_JOB_MODAL_STATE,
  )
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const {
    data: fetchedPrintItems,
    isError: printItemsError,
    refetch: refetchPrintItems,
  } = useQuery<PrintRecordItem[]>({
    queryKey: QUERY_KEYS.printRecordItems(moduleKey, selectedRowKeys),
    queryFn: async () => {
      return listPrintRecordItems(moduleKey, selectedRowKeys)
    },
    enabled: open && selectedRowKeys.length > 0,
    staleTime: 30 * 1000,
  })
  const printItems = fetchedPrintItems ?? EMPTY_PRINT_ITEMS
  const templateIdFromForm = Form.useWatch('templateId', form)
  const printOptionsFromForm =
    Form.useWatch('printOptions', form) ?? EMPTY_PRINT_OPTIONS
  const mergeModeFromForm = Form.useWatch('mergeMode', form)
  const printOptionSet = useMemo(
    () => new Set(printOptionsFromForm),
    [printOptionsFromForm],
  )
  const hideUnitPrice = printOptionSet.has('hideUnitPrice')
  const hideRemark = printOptionSet.has('hideRemark')
  const brandOverrideEnabled = printOptionSet.has('enableBrandOverride')
  const itemSelectionEnabled = printOptionSet.has('enableItemSelection')
  const mergeEquivalentItems = (mergeModeFromForm ?? 'merge') === 'merge'
  const selectedTemplate =
    templates.find((template) => template.id === templateIdFromForm) ??
    templates[0]
  // 模板列表晚于弹窗挂载到达时，补写默认模板，保证 Select 与实际输出一致。
  useEffect(() => {
    if (!open) return
    const currentTemplateId: unknown = form.getFieldValue('templateId')
    if (!currentTemplateId && templates.length) {
      form.setFieldValue('templateId', templates[0].id)
    }
  }, [form, open, templates])

  const primaryRecord = selectedRows[0]
  const orderNo = recordOrderNo(primaryRecord)
  const counterpartyName = recordCounterparty(primaryRecord)
  const projectSummaryText = projectSummary(primaryRecord)
  const recordDeliveryDate = formatDate(primaryRecord?.deliveryDate, '-')
  const recordRemark = fieldText(primaryRecord?.remark)
  const settlementCompanyName = fieldText(primaryRecord?.settlementCompanyName)
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

  const isSalesOrder = supportsSalesOrderPrintOption(moduleKey)
  const isStatementPrintModule =
    moduleKey === 'customer-statement' || moduleKey === 'freight-statement'
  const printItemFields = useMemo(
    () => getPrintItemFields(moduleKey),
    [moduleKey],
  )
  const mergeEquivalentItemsAvailable = isSalesOrder
  const showMergeGroup = mergeEquivalentItemsAvailable && mergeEquivalentItems
  const {
    effectiveOrderedPrintItemIds: orderedPrintItemIds,
    mergeMarkersByItemId,
    orderedPrintItems,
    outputPrintItemIdSet,
    selectedPrintItems,
  } = usePrintJobItems({
    printItems,
    orderedPrintItemIds: state.orderedPrintItemIds,
    excludedPrintItemIds: state.excludedPrintItemIds,
    outputPrintItemIds: state.outputPrintItemIds,
    itemSelectionEnabled,
    brandOverrideEnabled,
    brandOverridesByItemId: state.brandOverridesByItemId,
    showMergeGroup,
  })
  const totalQuantity = numericTotal(
    selectedPrintItems.map((item) => item.quantity),
  )
  const totalWeight = numericTotal(
    selectedPrintItems.map((item) => item.weightTon),
  )
  const { handleExportPrintXlsx, handlePrint } = createPrintJobOutputActions({
    brandOverrideEnabled,
    brandOverridesByItemId: state.brandOverridesByItemId,
    dispatch: dispatchPrintJobModal,
    hideRemark,
    hideUnitPrice,
    itemSelectionEnabled,
    mergeEquivalentItems,
    mergeEquivalentItemsAvailable,
    onExportPrintXlsx,
    onPrint,
    orderedPrintItemIds,
    selectedItemIds: selectedPrintItems.map((item) => item.id),
    selectedTemplate,
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    dispatchPrintJobModal({
      type: 'setOrderedPrintItemIds',
      itemIds: reorderPrintItemIds(
        normalizePrintItemOrder(state.orderedPrintItemIds, printItems),
        String(active.id),
        String(over.id),
      ),
    })
  }

  const handleRequestClose = () => {
    modal.confirm({
      title: t('modules.print.closeConfirmTitle'),
      content: t('modules.print.closeConfirmContent'),
      okText: t('common.close'),
      cancelText: t('modules.print.continueJob'),
      okButtonProps: { danger: true },
      onOk: () => {
        dispatchPrintJobModal({ type: 'reset' })
        onClose()
      },
    })
  }

  const canExportPrintXlsx = isSalesOrder && Boolean(onExportPrintXlsx)
  const pendingOutputAction = state.pendingOutputAction
  const hasSelectedPrintItems =
    !itemSelectionEnabled ||
    printItems.length === 0 ||
    selectedPrintItems.length > 0

  return (
    <Modal
      closable={!pendingOutputAction}
      destroyOnHidden
      footer={
        <PrintJobModalFooter
          canExportPrintXlsx={canExportPrintXlsx}
          hasSelectedPrintItems={hasSelectedPrintItems}
          pendingOutputAction={pendingOutputAction}
          selectedTemplate={selectedTemplate}
          onExportPrintXlsx={() => {
            void handleExportPrintXlsx()
          }}
          onRequestClose={handleRequestClose}
          onPrint={(mode) => {
            void handlePrint(mode)
          }}
        />
      }
      keyboard={!pendingOutputAction}
      mask={{ closable: !pendingOutputAction }}
      onCancel={handleRequestClose}
      open={open}
      title={
        <div className="text-center font-semibold">
          {t('modules.print.jobTitle')}
        </div>
      }
      width={1440}
    >
      <Flex vertical gap="middle">
        <PrintJobHeader
          counterpartyName={counterpartyName}
          moduleKey={moduleKey}
          moduleTitle={moduleTitle}
          orderNo={orderNo}
          projectSummaryText={projectSummaryText}
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
          recordDeliveryDate={recordDeliveryDate}
          recordRemark={recordRemark}
          settlementCompanyName={settlementCompanyName}
          totalQuantity={totalQuantity}
          totalWeight={totalWeight}
        />
        <Flex justify="space-between" align="center" gap="small" wrap="wrap">
          <Typography.Text type="secondary">
            {itemSelectionEnabled
              ? t('modules.print.selectedItemsCount', {
                  count: selectedPrintItems.length,
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
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedPrintItemIds}
            strategy={verticalListSortingStrategy}
          >
            <div
              className={
                isStatementPrintModule ? 'print-job-items-scroll' : undefined
              }
            >
              <PrintJobItemsSection
                moduleKey={moduleKey}
                printItems={printItems}
                orderedPrintItems={orderedPrintItems}
                orderedPrintItemIds={orderedPrintItemIds}
                selectedPrintItems={selectedPrintItems}
                outputPrintItemIdSet={outputPrintItemIdSet}
                mergeMarkersByItemId={mergeMarkersByItemId}
                showMergeGroup={showMergeGroup}
                brandOverrideEnabled={brandOverrideEnabled}
                brandOverridesByItemId={state.brandOverridesByItemId}
                dispatch={dispatchPrintJobModal}
                isStatementPrintModule={isStatementPrintModule}
                itemSelectionEnabled={itemSelectionEnabled}
                printItemFields={printItemFields}
                printItemsError={printItemsError}
                onRetryPrintItems={() => {
                  void refetchPrintItems()
                }}
              />
            </div>
          </SortableContext>
        </DndContext>
      </Flex>
    </Modal>
  )
}
