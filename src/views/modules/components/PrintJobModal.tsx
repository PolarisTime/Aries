import {
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  HolderOutlined,
  PrinterOutlined,
} from '@ant-design/icons'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Checkbox from 'antd/es/checkbox'
import Empty from 'antd/es/empty'
import Input from 'antd/es/input'
import Modal from 'antd/es/modal'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useMemo, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import {
  listPrintRecordItems,
  type PrintRecordItem,
  type SalesOrderPrintXlsxOptions,
} from '@/api/print-template'
import { getCustomerProjectOptions } from '@/constants/module-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { PrintRenderOptions } from '@/hooks/useBusinessGridPrintActions'
import { shouldDisplayPieceWeightAsDash } from '@/module-system/module-line-item-display'
import type { ModuleRecord } from '@/types/module-page'
import type {
  PrintActionMode,
  PrintTemplateRecord,
} from '@/types/print-template'
import { reorderPrintItemIds } from '@/views/modules/components/print-job-modal-utils'

const EMPTY_PRINT_ITEMS: PrintRecordItem[] = []

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
  ) => void
  onExportPrintXlsx?: (printOptions?: SalesOrderPrintXlsxOptions) => void
}

const SUMMARY_FIELDS = [
  'billNo',
  'orderNo',
  'outboundNo',
  'inboundNo',
  'statementNo',
  'contractNo',
  'receiptNo',
  'paymentNo',
]

const COUNTERPARTY_FIELDS = ['customerName', 'supplierName', 'carrierName']

const PROJECT_ABBR_FIELDS = [
  'projectNameAbbr',
  'projectAbbr',
  'projectShortName',
  'projectShort',
]
const PROJECT_NAME_FIELDS = ['projectName']

function firstText(record: ModuleRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value != null && String(value).trim()) {
      return String(value)
    }
  }
  return ''
}

function recordSummary(record: ModuleRecord) {
  const no = firstText(record, SUMMARY_FIELDS)
  const counterparty = firstText(record, COUNTERPARTY_FIELDS)
  if (no && counterparty) return `${no} / ${counterparty}`
  return no || counterparty || String(record.id)
}

function lookupProjectNameAbbr(record: ModuleRecord) {
  const projectName = firstText(record, PROJECT_NAME_FIELDS)
  if (!projectName) return ''

  const customerName = firstText(record, ['customerName'])
  const options = getCustomerProjectOptions(
    customerName ? { customerName } : {},
  )
  const matched = options.find(
    (option) =>
      String(option.projectName || option.value).trim() === projectName,
  )
  const value = matched?.projectNameAbbr
  return value == null ? '' : String(value).trim()
}

function projectSummary(record?: ModuleRecord) {
  if (!record) return ''
  const projectNameAbbr =
    firstText(record, PROJECT_ABBR_FIELDS) || lookupProjectNameAbbr(record)
  const projectName = firstText(record, PROJECT_NAME_FIELDS)
  if (projectNameAbbr && projectName)
    return `${projectNameAbbr}（${projectName}）`
  return projectNameAbbr || projectName
}

function isPdfTemplate(template?: PrintTemplateRecord) {
  return template?.templateType === 'PDF_FORM'
}

function templateTypeLabel(
  template: PrintTemplateRecord | undefined,
  t: (key: string) => string,
) {
  return isPdfTemplate(template)
    ? t('system.printTemplateEditor.templateTypePdfForm')
    : t('system.printTemplateEditor.templateTypeCoord')
}

function fieldText(value: unknown) {
  const text = value == null ? '' : String(value).trim()
  return text || '-'
}

function numericTotal(values: unknown[]) {
  const total = values.reduce<number>((sum, value) => {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? sum + numericValue : sum
  }, 0)
  return total > 0 ? total : null
}

function formattedTotal(value: number | null, fractionDigits = 3) {
  if (value == null) return '-'
  return value.toFixed(fractionDigits).replace(/\.?0+$/, '')
}

const PRINT_ITEM_FIELDS = [
  { key: 'category', labelKey: 'modules.print.itemCategory' },
  { key: 'material', labelKey: 'modules.print.itemMaterial' },
  { key: 'spec', labelKey: 'modules.print.itemSpec' },
  { key: 'quantity', labelKey: 'modules.print.itemQuantity' },
  { key: 'pieceWeightTon', labelKey: 'modules.print.itemPieceWeight' },
  { key: 'weightTon', labelKey: 'modules.print.itemWeight' },
  { key: 'unitPrice', labelKey: 'modules.print.itemUnitPrice' },
  { key: 'amount', labelKey: 'modules.print.itemAmount' },
] as const

function printItemsGridClass(brandOverrideEnabled: boolean) {
  return brandOverrideEnabled
    ? 'grid min-w-[1140px] grid-cols-[52px_minmax(100px,130px)_128px_minmax(92px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(70px,0.7fr)_minmax(80px,0.8fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(110px,1fr)] items-center gap-4 text-base'
    : 'grid min-w-[1040px] grid-cols-[52px_minmax(120px,150px)_minmax(92px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(70px,0.7fr)_minmax(80px,0.8fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(110px,1fr)] items-center gap-4 text-base'
}

interface PrintJobModalState {
  selectedTemplateId?: string
  hideUnitPrice: boolean
  hideRemark: boolean
  brandOverrideEnabled: boolean
  brandOverridesByItemId: Record<string, string>
  orderedPrintItemIds: string[]
}

type PrintJobModalAction =
  | { type: 'selectTemplate'; templateId: string }
  | { type: 'setHideUnitPrice'; value: boolean }
  | { type: 'setHideRemark'; value: boolean }
  | { type: 'setBrandOverrideEnabled'; value: boolean }
  | { type: 'setBrandOverride'; itemId: string; value: string }
  | { type: 'setOrderedPrintItemIds'; itemIds: string[] }

const INITIAL_PRINT_JOB_MODAL_STATE: PrintJobModalState = {
  hideUnitPrice: false,
  hideRemark: false,
  brandOverrideEnabled: false,
  brandOverridesByItemId: {},
  orderedPrintItemIds: [],
}

function printJobModalReducer(
  state: PrintJobModalState,
  action: PrintJobModalAction,
): PrintJobModalState {
  switch (action.type) {
    case 'selectTemplate':
      return { ...state, selectedTemplateId: action.templateId }
    case 'setHideUnitPrice':
      return { ...state, hideUnitPrice: action.value }
    case 'setHideRemark':
      return { ...state, hideRemark: action.value }
    case 'setBrandOverrideEnabled':
      return { ...state, brandOverrideEnabled: action.value }
    case 'setBrandOverride':
      return {
        ...state,
        brandOverridesByItemId: {
          ...state.brandOverridesByItemId,
          [action.itemId]: action.value,
        },
      }
    case 'setOrderedPrintItemIds':
      return { ...state, orderedPrintItemIds: action.itemIds }
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

function printItemFieldText(item: PrintRecordItem, key: keyof PrintRecordItem) {
  if (key === 'pieceWeightTon' && shouldDisplayPieceWeightAsDash(item)) {
    return '-'
  }
  return fieldText(item[key])
}

interface SortablePrintItemRowProps {
  brandOverrideEnabled: boolean
  brandOverrideValue: string
  index: number
  item: PrintRecordItem
  onBrandOverrideChange: (itemId: string, value: string) => void
  t: (key: string) => string
}

function SortablePrintItemRow({
  brandOverrideEnabled,
  brandOverrideValue,
  index,
  item,
  onBrandOverrideChange,
  t,
}: SortablePrintItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      className="px-3 py-2"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className={printItemsGridClass(brandOverrideEnabled)}>
        <span className="flex items-center gap-2 text-gray-500">
          <button
            {...attributes}
            {...listeners}
            aria-label={t('modules.print.dragItem')}
            className="inline-flex cursor-grab items-center border-0 bg-transparent p-0 text-gray-400"
            type="button"
            title={t('modules.print.dragItem')}
          >
            <HolderOutlined />
          </button>
          <Typography.Text type="secondary">#{index + 1}</Typography.Text>
        </span>
        <Typography.Text className="block truncate">
          {fieldText(item.brand)}
        </Typography.Text>
        {brandOverrideEnabled ? (
          <Input
            maxLength={64}
            className="h-8 w-[120px]"
            onChange={(event) =>
              onBrandOverrideChange(item.id, event.target.value)
            }
            placeholder={t('modules.print.brandOverridePlaceholder')}
            value={brandOverrideValue}
          />
        ) : null}
        {PRINT_ITEM_FIELDS.map((field) => (
          <Typography.Text
            key={field.key}
            className="block truncate"
            title={`${t(field.labelKey)}：${printItemFieldText(item, field.key)}`}
          >
            {printItemFieldText(item, field.key)}
          </Typography.Text>
        ))}
      </div>
    </div>
  )
}

interface PrintJobHeaderProps {
  moduleTitle?: string
  primaryHeaderSummary: string
  selectedTemplate?: PrintTemplateRecord
  t: (key: string) => string
}

function PrintJobHeader({
  moduleTitle,
  primaryHeaderSummary,
  selectedTemplate,
  t,
}: PrintJobHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Typography.Text strong className="text-lg">
            {moduleTitle || t('modules.print.currentModule')}
          </Typography.Text>
          {primaryHeaderSummary ? (
            <Typography.Text
              className="min-w-0 flex-1 whitespace-normal break-words leading-6"
              title={primaryHeaderSummary}
            >
              {primaryHeaderSummary}
            </Typography.Text>
          ) : null}
        </div>
      </div>
      {selectedTemplate ? (
        <Tag color={isPdfTemplate(selectedTemplate) ? 'blue' : 'green'}>
          {templateTypeLabel(selectedTemplate, t)}
        </Tag>
      ) : null}
    </div>
  )
}

interface PrintTemplateFieldProps {
  selectedTemplateId?: string
  templateOptions: Array<{ label: React.ReactNode; value: string }>
  templates: PrintTemplateRecord[]
  onChange: (templateId: string) => void
  t: (key: string) => string
}

function PrintTemplateField({
  selectedTemplateId,
  templateOptions,
  templates,
  onChange,
  t,
}: PrintTemplateFieldProps) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,520px)] items-center gap-3">
      <Typography.Text strong className="whitespace-nowrap">
        {t('modules.print.selectTemplate')}
      </Typography.Text>
      <div>
        {templates.length ? (
          <Select
            className="w-full"
            onChange={onChange}
            options={templateOptions}
            value={selectedTemplateId}
          />
        ) : (
          <Empty description={t('modules.print.noTemplate')} />
        )}
      </div>
    </div>
  )
}

interface PrintOptionsFieldProps {
  brandOverrideEnabled: boolean
  hideRemark: boolean
  hideUnitPrice: boolean
  onBrandOverrideEnabledChange: (value: boolean) => void
  onHideRemarkChange: (value: boolean) => void
  onHideUnitPriceChange: (value: boolean) => void
  t: (key: string) => string
}

function PrintOptionsField({
  brandOverrideEnabled,
  hideRemark,
  hideUnitPrice,
  onBrandOverrideEnabledChange,
  onHideRemarkChange,
  onHideUnitPriceChange,
  t,
}: PrintOptionsFieldProps) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3">
      <Typography.Text strong className="whitespace-nowrap">
        {t('modules.print.printOptions')}
      </Typography.Text>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-base">
        <Checkbox
          checked={hideUnitPrice}
          onChange={(event) => onHideUnitPriceChange(event.target.checked)}
        >
          {t('modules.print.hideUnitPrice')}
        </Checkbox>
        <Checkbox
          checked={hideRemark}
          onChange={(event) => onHideRemarkChange(event.target.checked)}
        >
          {t('modules.print.hideRemark')}
        </Checkbox>
        <Checkbox
          checked={brandOverrideEnabled}
          onChange={(event) =>
            onBrandOverrideEnabledChange(event.target.checked)
          }
        >
          {t('modules.print.enableBrandOverride')}
        </Checkbox>
      </div>
    </div>
  )
}

interface PrintItemSectionProps {
  brandOverrideEnabled: boolean
  brandOverridesByItemId: Record<string, string>
  orderedPrintItems: PrintRecordItem[]
  printItems: PrintRecordItem[]
  recordRemark: string
  sensors: ReturnType<typeof useSensors>
  totalQuantity: number | null
  totalWeight: number | null
  onBrandOverrideChange: (itemId: string, value: string) => void
  onDragEnd: (event: DragEndEvent) => void
  t: (key: string) => string
}

function PrintItemSection({
  brandOverrideEnabled,
  brandOverridesByItemId,
  orderedPrintItems,
  printItems,
  recordRemark,
  sensors,
  totalQuantity,
  totalWeight,
  onBrandOverrideChange,
  onDragEnd,
  t,
}: PrintItemSectionProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <Typography.Text strong>
          {t('modules.print.selectedPrintItems')}
        </Typography.Text>
        <Typography.Text className="min-w-0 max-w-[560px] truncate">
          <Typography.Text type="secondary">
            {t('modules.print.recordRemark')}：
          </Typography.Text>
          {recordRemark}
        </Typography.Text>
        <Typography.Text>
          <Typography.Text type="secondary">
            {t('modules.print.totalQuantity')}：
          </Typography.Text>
          {formattedTotal(totalQuantity, 0)}
        </Typography.Text>
        <Typography.Text>
          <Typography.Text type="secondary">
            {t('modules.print.totalWeight')}：
          </Typography.Text>
          {formattedTotal(totalWeight)}
        </Typography.Text>
      </div>
      <div className="mt-8 max-h-[320px] overflow-auto rounded border border-gray-200 bg-gray-50">
        {printItems.length ? (
          <div className="divide-y divide-gray-200">
            <div
              className={`${printItemsGridClass(
                brandOverrideEnabled,
              )} bg-gray-100 px-3 py-2 font-medium text-gray-600`}
            >
              <span>#</span>
              <span>{t('modules.print.itemBrand')}</span>
              {brandOverrideEnabled ? (
                <span>{t('modules.print.brandOverrideTo')}</span>
              ) : null}
              {PRINT_ITEM_FIELDS.map((field) => (
                <span key={field.key}>{t(field.labelKey)}</span>
              ))}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={orderedPrintItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {orderedPrintItems.map((item, index) => (
                  <SortablePrintItemRow
                    key={item.id}
                    brandOverrideEnabled={brandOverrideEnabled}
                    brandOverrideValue={brandOverridesByItemId[item.id] || ''}
                    index={index}
                    item={item}
                    onBrandOverrideChange={onBrandOverrideChange}
                    t={t}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <div className="px-3 py-6 text-center text-gray-500">
            {t('modules.print.noPrintItems')}
          </div>
        )}
      </div>
    </div>
  )
}

interface PrintJobActionsProps {
  canExportPrintXlsx?: (() => void) | false
  selectedTemplate?: PrintTemplateRecord
  onClose: () => void
  onExportPrintXlsx: () => void
  onPrint: (mode: PrintActionMode) => void
  t: (key: string) => string
}

function PrintJobActions({
  canExportPrintXlsx,
  selectedTemplate,
  onClose,
  onExportPrintXlsx,
  onPrint,
  t,
}: PrintJobActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
      {canExportPrintXlsx ? (
        <Button icon={<FileExcelOutlined />} onClick={onExportPrintXlsx}>
          {t('modules.print.exportXlsx')}
        </Button>
      ) : null}
      <div className="ml-auto flex flex-wrap justify-end gap-2">
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        {isPdfTemplate(selectedTemplate) ? (
          <Button
            disabled={!selectedTemplate}
            icon={<DownloadOutlined />}
            onClick={() => onPrint('download')}
          >
            {t('modules.print.downloadPdf')}
          </Button>
        ) : null}
        <Button
          disabled={!selectedTemplate}
          icon={<EyeOutlined />}
          onClick={() => onPrint('preview')}
        >
          {t('modules.print.preview')}
        </Button>
        <Button
          disabled={!selectedTemplate}
          icon={<PrinterOutlined />}
          onClick={() => onPrint('print')}
          type="primary"
        >
          {t('modules.print.directPrint')}
        </Button>
      </div>
    </div>
  )
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
  const [state, dispatchPrintJobModal] = useReducer(
    printJobModalReducer,
    INITIAL_PRINT_JOB_MODAL_STATE,
  )
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )
  const { data: fetchedPrintItems } = useQuery<PrintRecordItem[]>({
    queryKey: QUERY_KEYS.printRecordItems(moduleKey, selectedRowKeys),
    queryFn: async () => {
      const response = await listPrintRecordItems(moduleKey, selectedRowKeys)
      return Array.isArray(response.data) ? response.data : []
    },
    enabled: open && selectedRowKeys.length > 0,
    staleTime: 30 * 1000,
  })
  const printItems = fetchedPrintItems ?? EMPTY_PRINT_ITEMS
  const selectedTemplate =
    templates.find((template) => template.id === state.selectedTemplateId) ||
    templates[0]
  const selectedTemplateId = selectedTemplate?.id
  const primaryRecord = selectedRows[0]
  const primaryRecordSummary = primaryRecord ? recordSummary(primaryRecord) : ''
  const primaryProjectSummary = projectSummary(primaryRecord)
  const primaryHeaderSummary = [primaryRecordSummary, primaryProjectSummary]
    .filter(Boolean)
    .join(' / ')
  const recordRemark = fieldText(primaryRecord?.remark)
  const totalQuantity =
    numericTotal([primaryRecord?.totalQuantity, primaryRecord?.quantity]) ??
    numericTotal(printItems.map((item) => item.quantity))
  const totalWeight =
    numericTotal([primaryRecord?.totalWeight, primaryRecord?.weightTon]) ??
    numericTotal(printItems.map((item) => item.weightTon))
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

  const orderedPrintItems = useMemo(() => {
    if (!state.orderedPrintItemIds.length) return printItems
    const printItemsById = new Map(printItems.map((item) => [item.id, item]))
    const result: PrintRecordItem[] = []
    for (const itemId of state.orderedPrintItemIds) {
      const item = printItemsById.get(itemId)
      if (item) result.push(item)
    }
    return result.length ? result : printItems
  }, [state.orderedPrintItemIds, printItems])

  const currentItemOrder = () =>
    orderedPrintItems.length
      ? orderedPrintItems.map((item) => item.id)
      : undefined

  const currentBrandOverridesByItemId = () => {
    const normalizedBrandOverridesByItemId: Record<string, string> = {}
    for (const [itemId, value] of Object.entries(
      state.brandOverridesByItemId,
    )) {
      const trimmed = value.trim()
      if (trimmed) {
        normalizedBrandOverridesByItemId[itemId] = trimmed
      }
    }
    return state.brandOverrideEnabled &&
      Object.keys(normalizedBrandOverridesByItemId).length
      ? normalizedBrandOverridesByItemId
      : undefined
  }

  const currentPrintRenderOptions = (): PrintRenderOptions => {
    const itemOrder = currentItemOrder()
    const normalizedBrandOverridesByItemId = currentBrandOverridesByItemId()
    return {
      hideUnitPrice: state.hideUnitPrice,
      hideRemark: state.hideRemark,
      ...(itemOrder ? { itemOrder } : {}),
      ...(normalizedBrandOverridesByItemId
        ? { brandOverridesByItemId: normalizedBrandOverridesByItemId }
        : {}),
    }
  }

  const currentSalesOrderPrintXlsxOptions = (): SalesOrderPrintXlsxOptions => {
    const itemOrder = currentItemOrder()
    const normalizedBrandOverridesByItemId = currentBrandOverridesByItemId()
    return {
      hideUnitPrice: state.hideUnitPrice,
      hideRemark: state.hideRemark,
      ...(itemOrder ? { itemOrder } : {}),
      ...(normalizedBrandOverridesByItemId
        ? { brandOverridesByItemId: normalizedBrandOverridesByItemId }
        : {}),
    }
  }

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

  const handleTemplateChange = (templateId: string) => {
    dispatchPrintJobModal({ type: 'selectTemplate', templateId })
  }

  const handleHideUnitPriceChange = (value: boolean) => {
    dispatchPrintJobModal({ type: 'setHideUnitPrice', value })
  }

  const handleHideRemarkChange = (value: boolean) => {
    dispatchPrintJobModal({ type: 'setHideRemark', value })
  }

  const handleBrandOverrideEnabledChange = (value: boolean) => {
    dispatchPrintJobModal({ type: 'setBrandOverrideEnabled', value })
  }

  const handleBrandOverrideChange = (itemId: string, value: string) => {
    dispatchPrintJobModal({ type: 'setBrandOverride', itemId, value })
  }

  const handlePrint = (mode: PrintActionMode) => {
    if (!selectedTemplate) return
    onPrint(mode, selectedTemplate, currentPrintRenderOptions())
  }

  const handleExportPrintXlsx = () => {
    onExportPrintXlsx?.(currentSalesOrderPrintXlsxOptions())
  }

  const canExportPrintXlsx = moduleKey === 'sales-order' && onExportPrintXlsx

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={
        <div className="text-center font-semibold">
          {t('modules.print.jobTitle')}
        </div>
      }
      width="92vw"
    >
      <div className="space-y-4 text-base">
        <PrintJobHeader
          moduleTitle={moduleTitle}
          primaryHeaderSummary={primaryHeaderSummary}
          selectedTemplate={selectedTemplate}
          t={t}
        />
        <PrintTemplateField
          onChange={handleTemplateChange}
          selectedTemplateId={selectedTemplateId}
          templateOptions={templateOptions}
          templates={templates}
          t={t}
        />
        <PrintOptionsField
          brandOverrideEnabled={state.brandOverrideEnabled}
          hideRemark={state.hideRemark}
          hideUnitPrice={state.hideUnitPrice}
          onBrandOverrideEnabledChange={handleBrandOverrideEnabledChange}
          onHideRemarkChange={handleHideRemarkChange}
          onHideUnitPriceChange={handleHideUnitPriceChange}
          t={t}
        />
        <PrintItemSection
          brandOverrideEnabled={state.brandOverrideEnabled}
          brandOverridesByItemId={state.brandOverridesByItemId}
          onBrandOverrideChange={handleBrandOverrideChange}
          onDragEnd={handleDragEnd}
          orderedPrintItems={orderedPrintItems}
          printItems={printItems}
          recordRemark={recordRemark}
          sensors={sensors}
          totalQuantity={totalQuantity}
          totalWeight={totalWeight}
          t={t}
        />
        <PrintJobActions
          canExportPrintXlsx={canExportPrintXlsx}
          onClose={onClose}
          onExportPrintXlsx={handleExportPrintXlsx}
          onPrint={handlePrint}
          selectedTemplate={selectedTemplate}
          t={t}
        />
      </div>
    </Modal>
  )
}
