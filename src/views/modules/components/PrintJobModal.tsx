import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useQuery } from '@tanstack/react-query'
import { Form, Modal } from 'antd'
import { useMemo, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import {
  listPrintRecordItems,
  type PrintRecordItem,
  type SalesOrderPrintXlsxOptions,
} from '@/api/system/print-template'
import { rowDragKeyboardCodes } from '@/components/table/row-drag'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { PrintRenderOptions } from '@/hooks/useBusinessGridPrintActions'
import type { PrintActionMode, PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { supportsSalesOrderPrintOption } from '@/utils/print-module-config'
import { PrintJobModalBody } from '@/views/modules/components/PrintJobModalBody'
import { PrintJobModalFooter } from '@/views/modules/components/PrintJobModalFooter'
import { recordProjectId } from '@/views/modules/components/print-job-modal-format'
import {
  INITIAL_PRINT_JOB_MODAL_STATE,
  type PrintJobFormValues,
  printJobModalReducer,
  resolveSplitPieceCount,
} from '@/views/modules/components/print-job-modal-state'
import { createPrintJobOutputActions } from '@/views/modules/components/print-job-output-actions'
import { usePrintJobModalItems } from '@/views/modules/components/use-print-job-modal-items'
import { usePrintTemplatePreference } from '@/views/modules/components/use-print-template-preference'

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

/**
 * 打印作业弹窗：查询待打印明细、编排打印选项与输出动作。
 *
 * <p>本轮重构的目标是同时摘掉 no-giant-component (>300 行) 与
 * no-high-complexity-react-function 两个告警，做法是把内容区拆成
 * PrintJobModalBody、页头拆成 PrintJobHeader、明细派生状态抽成
 * usePrintJobModalItems、模板偏好抽成 usePrintTemplatePreference。
 * 弹窗自身只保留「查询 + 表单选项 + 输出动作 + Modal 外壳」，
 * 关闭确认、防重入与拆分件数校验的语义完全不变。</p>
 */
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
      // 拾起/放下/取消的键位与行上 aria-keyshortcuts 同源(row-drag-config 的单一键位模型)
      keyboardCodes: rowDragKeyboardCodes(),
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const {
    data: fetchedPrintItems,
    isError: printItemsError,
    refetch: refetchPrintItems,
  } = useQuery<PrintRecordItem[]>({
    queryKey: QUERY_KEYS.printRecordItems(moduleKey, selectedRowKeys),
    queryFn: async ({ signal }) => {
      return listPrintRecordItems(moduleKey, selectedRowKeys, signal)
    },
    enabled: open && selectedRowKeys.length > 0,
    staleTime: 30 * 1000,
  })
  const printItems = fetchedPrintItems ?? EMPTY_PRINT_ITEMS
  const printOptionsFromForm =
    Form.useWatch('printOptions', form) ?? EMPTY_PRINT_OPTIONS
  const splitPieceCountFromForm = Form.useWatch('splitPieceCount', form)
  const mergeModeFromForm = Form.useWatch('mergeMode', form)
  const printOptionSet = useMemo(
    () => new Set(printOptionsFromForm),
    [printOptionsFromForm],
  )
  const hideUnitPrice = printOptionSet.has('hideUnitPrice')
  const hideRemark = printOptionSet.has('hideRemark')
  const brandOverrideEnabled = printOptionSet.has('enableBrandOverride')
  const itemSelectionEnabled = printOptionSet.has('enableItemSelection')
  const splitPrintEnabled = printOptionSet.has('enableSplitPrint')
  const splitPieceCount = resolveSplitPieceCount(
    printOptionsFromForm,
    splitPieceCountFromForm,
  )
  const splitPieceCountInvalid =
    splitPrintEnabled && splitPieceCount === undefined
  const mergeEquivalentItems = (mergeModeFromForm ?? 'merge') === 'merge'
  const mergeEquivalentItemsAvailable = supportsSalesOrderPrintOption(moduleKey)

  const primaryRecord = selectedRows[0]
  const projectId = recordProjectId(primaryRecord)
  const { selectedTemplate, rememberTemplateUsed } = usePrintTemplatePreference(
    {
      form,
      moduleKey,
      open,
      projectId,
      templates,
    },
  )

  const itemState = usePrintJobModalItems({
    brandOverrideEnabled,
    brandOverridesByItemId: state.brandOverridesByItemId,
    dispatch: dispatchPrintJobModal,
    excludedPrintItemIds: state.excludedPrintItemIds,
    itemSelectionEnabled,
    mergeEquivalentItems,
    mergeEquivalentItemsAvailable,
    orderedPrintItemIds: state.orderedPrintItemIds,
    outputPrintItemIds: state.outputPrintItemIds,
    printItems,
    splitItemIds: state.splitItemIds,
    splitPieceCount,
    splitPrintEnabled,
  })

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
    onTemplateUsed: rememberTemplateUsed,
    orderedPrintItemIds: itemState.orderedPrintItemIds,
    selectedItemIds: itemState.selectedPrintItems.map((item) => item.id),
    selectedTemplate,
    splitItemIds: itemState.effectiveSplitItemIds,
    splitPieceCount,
  })

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

  const ensureValidSplitPieceCount = () => {
    if (!splitPieceCountInvalid) return true
    message.warning(t('modules.print.splitPieceCountPlaceholder'))
    return false
  }

  const canExportPrintXlsx =
    mergeEquivalentItemsAvailable && Boolean(onExportPrintXlsx)
  const pendingOutputAction = state.pendingOutputAction
  const hasSelectedPrintItems =
    !itemSelectionEnabled ||
    printItems.length === 0 ||
    itemState.selectedPrintItems.length > 0

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
            if (!ensureValidSplitPieceCount()) return
            void handleExportPrintXlsx()
          }}
          onRequestClose={handleRequestClose}
          onPrint={(mode) => {
            if (!ensureValidSplitPieceCount()) return
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
      <PrintJobModalBody
        brandOverrideEnabled={brandOverrideEnabled}
        brandOverridesByItemId={state.brandOverridesByItemId}
        dispatch={dispatchPrintJobModal}
        form={form}
        itemSelectionEnabled={itemSelectionEnabled}
        itemState={itemState}
        mergeEquivalentItems={mergeEquivalentItems}
        moduleKey={moduleKey}
        moduleTitle={moduleTitle}
        onDragEnd={itemState.handleDragEnd}
        onRetryPrintItems={() => {
          void refetchPrintItems()
        }}
        primaryRecord={primaryRecord}
        printItems={printItems}
        printItemsError={printItemsError}
        sensors={sensors}
        selectedTemplate={selectedTemplate}
        templates={templates}
      />
    </Modal>
  )
}
