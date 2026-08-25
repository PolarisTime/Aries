import {
  CheckCircleFilled,
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import type { TableProps } from 'antd'
import {
  Button,
  Checkbox,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd'
import {
  createContext,
  type Dispatch,
  Fragment,
  type HTMLAttributes,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  listPrintRecordItems,
  type PrintRecordItem,
  type SalesOrderPrintXlsxOptions,
} from '@/api/system/print-template'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { PrintRenderOptions } from '@/hooks/useBusinessGridPrintActions'
import { getCustomerProjectOptions } from '@/module-system/core/module-option-resolvers'
import type { PrintActionMode, PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'
import { modal } from '@/utils/antd-app'
import { formatDate } from '@/utils/formatters'
import {
  getPrintItemColumnAlign,
  getPrintItemColumnWidth,
  getPrintItemFields,
  type PrintItemFieldKey,
  type PrintItemFieldSpec,
  supportsSalesOrderPrintOption,
} from '@/utils/print-module-config'
import {
  buildPrintItemMergeMarkers,
  reorderPrintItemIds,
} from '@/views/modules/components/print-job-modal-utils'
import {
  type CustomerStatementItemGroup,
  groupCustomerStatementItems,
} from '@/views/modules/customer-statement-item-groups'
import { groupFreightStatementItems } from '@/views/modules/freight-statement-item-groups'
import { CustomerStatementItemGroupHeader } from './CustomerStatementItemGroupHeader'
import {
  FreightStatementItemGroupHeader,
  FreightStatementProjectGroupHeader,
} from './FreightStatementItemGroupHeader'

const EMPTY_PRINT_ITEMS: PrintRecordItem[] = []
const EMPTY_PRINT_OPTIONS: PrintOptionKey[] = []

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

function recordOrderNo(record?: ModuleRecord) {
  return record ? firstText(record, SUMMARY_FIELDS) : ''
}

function recordCounterparty(record?: ModuleRecord) {
  return record ? firstText(record, COUNTERPARTY_FIELDS) : ''
}

function lookupProjectNameAbbr(record: ModuleRecord) {
  const projectName = firstText(record, PROJECT_NAME_FIELDS)
  if (!projectName) return ''

  const projectId = firstText(record, ['projectId'])
  const options = getCustomerProjectOptions({ customerId: record.customerId })
  const matched = options.find(
    (option) =>
      (projectId && String(option.id).trim() === projectId) ||
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
  t: (key: string, values?: Record<string, unknown>) => string,
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
    const numericValue = toNumberOrNull(value)
    return numericValue == null ? sum : sum + numericValue
  }, 0)
  return total > 0 ? total : null
}

function toNumberOrNull(value: unknown) {
  if (value == null || String(value).trim() === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function formattedTotal(value: number | null, fractionDigits = 3) {
  if (value == null) return '-'
  const fixed = value.toFixed(fractionDigits)
  // 整数展示（如合计件数）不做尾零截断，避免 100 被截成 "1"。
  if (fractionDigits === 0) return fixed
  return fixed.replace(/\.?0+$/, '')
}

/** 金额、单价统一两位小数展示。 */
function formatAmount(value: unknown) {
  const numeric = toNumberOrNull(value)
  return numeric == null ? '-' : numeric.toFixed(2)
}

/** 按字段语义格式化明细单元格：件数取整、重量三位去尾零、金额两位小数。 */
function printItemCellText(field: PrintItemFieldKey, value?: string) {
  if (field === 'quantity') return formattedTotal(toNumberOrNull(value), 0)
  if (field === 'pieceWeightTon' || field === 'weightTon') {
    return formattedTotal(toNumberOrNull(value), 3)
  }
  if (field === 'unitPrice' || field === 'amount') return formatAmount(value)
  return fieldText(value)
}

type PendingOutputAction = PrintActionMode | 'xlsx'

/** 参数配置表单承载的打印选项。 */
type PrintOptionKey =
  | 'hideUnitPrice'
  | 'hideRemark'
  | 'enableBrandOverride'
  | 'enableItemSelection'

interface PrintJobFormValues {
  mergeMode: 'merge' | 'split'
  printOptions: PrintOptionKey[]
  templateId?: string
}

interface PrintJobModalState {
  brandOverridesByItemId: Record<string, string>
  orderedPrintItemIds: string[]
  excludedPrintItemIds: string[]
  outputPrintItemIds: string[]
  pendingOutputAction?: PendingOutputAction
}

type PrintJobModalAction =
  | { type: 'setBrandOverride'; itemId: string; value: string }
  | { type: 'setOrderedPrintItemIds'; itemIds: string[] }
  | { type: 'setExcludedPrintItemIds'; itemIds: string[] }
  | { type: 'markPrintItemsOutput'; itemIds: string[] }
  | { type: 'setPendingOutputAction'; value?: PendingOutputAction }
  | { type: 'reset' }

const INITIAL_PRINT_JOB_MODAL_STATE: PrintJobModalState = {
  brandOverridesByItemId: {},
  excludedPrintItemIds: [],
  orderedPrintItemIds: [],
  outputPrintItemIds: [],
}

function printJobModalReducer(
  state: PrintJobModalState,
  action: PrintJobModalAction,
): PrintJobModalState {
  switch (action.type) {
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
    case 'setExcludedPrintItemIds':
      return { ...state, excludedPrintItemIds: action.itemIds }
    case 'markPrintItemsOutput':
      return {
        ...state,
        outputPrintItemIds: Array.from(
          new Set([...state.outputPrintItemIds, ...action.itemIds]),
        ),
      }
    case 'setPendingOutputAction':
      return { ...state, pendingOutputAction: action.value }
    case 'reset':
      return INITIAL_PRINT_JOB_MODAL_STATE
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

interface RowDragContextValue {
  activatorNodeRef: (element: HTMLElement | null) => void
  dragAttributes: Record<string, unknown>
  dragListeners: Record<string, unknown> | undefined
}

const RowDragContext = createContext<RowDragContextValue | null>(null)

function DragHandle({ label }: { label: string }) {
  const { token } = theme.useToken()
  const context = useContext(RowDragContext)
  if (!context) return null
  return (
    <button
      {...context.dragAttributes}
      {...(context.dragListeners ?? {})}
      aria-label={label}
      className="inline-flex cursor-grab items-center border-0 bg-transparent p-0"
      ref={context.activatorNodeRef}
      style={{ color: token.colorTextTertiary }}
      title={label}
      type="button"
    >
      <HolderOutlined />
    </button>
  )
}

interface SortableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key'?: string
}

function SortableRow({ children, ...props }: SortableRowProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props['data-row-key'] ?? '' })
  const contextValue = useMemo<RowDragContextValue>(
    () => ({
      activatorNodeRef: setActivatorNodeRef,
      dragAttributes: { ...attributes },
      dragListeners: listeners ? { ...listeners } : undefined,
    }),
    [attributes, listeners, setActivatorNodeRef],
  )
  return (
    <RowDragContext.Provider value={contextValue}>
      <tr
        {...props}
        ref={setNodeRef}
        style={{
          ...props.style,
          opacity: isDragging ? 0.6 : undefined,
          transform: CSS.Translate.toString(transform),
          transition,
        }}
      >
        {children}
      </tr>
    </RowDragContext.Provider>
  )
}

interface PrintJobHeaderProps {
  counterpartyName: string
  moduleTitle?: string
  orderNo: string
  projectSummaryText: string
  selectedTemplate?: PrintTemplateRecord
  t: (key: string, values?: Record<string, unknown>) => string
}

function PrintJobHeader({
  counterpartyName,
  moduleTitle,
  orderNo,
  projectSummaryText,
  selectedTemplate,
  t,
}: PrintJobHeaderProps) {
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
          <Typography.Text copyable={{ text: orderNo }}>
            <Tag color="blue">{orderNo}</Tag>
          </Typography.Text>
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

/** 汇总条内的“标签：值”项，长文本单行截断并悬浮提示。 */
function SummaryInfo({
  label,
  value,
  valueMaxWidth,
}: {
  label: string
  value: string
  valueMaxWidth: number
}) {
  return (
    <span className="inline-flex items-center whitespace-nowrap">
      <Typography.Text type="secondary">{label}：</Typography.Text>
      <Typography.Text
        ellipsis={{ tooltip: true }}
        style={{ maxWidth: valueMaxWidth }}
      >
        {value}
      </Typography.Text>
    </span>
  )
}

interface PrintJobOutputActionsInput {
  brandOverrideEnabled: boolean
  brandOverridesByItemId: Record<string, string>
  dispatch: Dispatch<PrintJobModalAction>
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
  const { token } = theme.useToken()
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
  const orderedPrintItemIds = useMemo(
    () => orderedPrintItems.map((item) => item.id),
    [orderedPrintItems],
  )
  const excludedPrintItemIdSet = useMemo(
    () => new Set(state.excludedPrintItemIds),
    [state.excludedPrintItemIds],
  )
  const selectedPrintItems = useMemo(() => {
    if (!itemSelectionEnabled) return orderedPrintItems
    return orderedPrintItems.filter(
      (item) => !excludedPrintItemIdSet.has(item.id),
    )
  }, [excludedPrintItemIdSet, itemSelectionEnabled, orderedPrintItems])
  const isSalesOrder = supportsSalesOrderPrintOption(moduleKey)
  const printItemFields = useMemo(
    () => getPrintItemFields(moduleKey),
    [moduleKey],
  )
  type PrintGroupItem = PrintRecordItem & Record<string, unknown>
  const customerStatementGroups = useMemo(
    () =>
      moduleKey === 'customer-statement'
        ? groupCustomerStatementItems(orderedPrintItems as PrintGroupItem[])
        : [],
    [moduleKey, orderedPrintItems],
  )
  const freightStatementGroups = useMemo(
    () =>
      moduleKey === 'freight-statement'
        ? groupFreightStatementItems(orderedPrintItems as PrintGroupItem[])
        : [],
    [moduleKey, orderedPrintItems],
  )
  const totalQuantity = numericTotal(
    selectedPrintItems.map((item) => item.quantity),
  )
  const totalWeight = numericTotal(
    selectedPrintItems.map((item) => item.weightTon),
  )
  const mergeEquivalentItemsAvailable = isSalesOrder
  const showMergeGroup = mergeEquivalentItemsAvailable && mergeEquivalentItems
  const mergeMarkersByItemId = useMemo(() => {
    if (!showMergeGroup) {
      return {}
    }
    return buildPrintItemMergeMarkers(
      selectedPrintItems,
      brandOverrideEnabled ? state.brandOverridesByItemId : {},
    )
  }, [
    brandOverrideEnabled,
    selectedPrintItems,
    showMergeGroup,
    state.brandOverridesByItemId,
  ])
  const outputPrintItemIdSet = useMemo(
    () => new Set(state.outputPrintItemIds),
    [state.outputPrintItemIds],
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

  const rowSelection: TableProps<PrintRecordItem>['rowSelection'] = {
    align: 'center',
    columnWidth: 40,
    getCheckboxProps: () => ({ disabled: !itemSelectionEnabled }),
    getTitleCheckboxProps: () => ({ disabled: !itemSelectionEnabled }),
    preserveSelectedRowKeys: true,
    selectedRowKeys: selectedPrintItems.map((item) => item.id),
    onChange: (keys) => {
      const selectedKeySet = new Set(keys.map(String))
      dispatchPrintJobModal({
        type: 'setExcludedPrintItemIds',
        itemIds: printItems
          .filter((item) => !selectedKeySet.has(item.id))
          .map((item) => item.id),
      })
    },
  }

  const columns: TableProps<PrintRecordItem>['columns'] = [
    {
      key: 'drag',
      width: 36,
      align: 'center',
      render: (_, item) => (
        <DragHandle
          label={t('modules.print.dragRowAriaLabel', {
            index: orderedPrintItemIds.indexOf(item.id) + 1,
          })}
        />
      ),
    },
    {
      key: 'sequence',
      width: 56,
      align: 'center',
      title: t('modules.print.itemSequence'),
      render: (_, item) => (
        <Space size={4}>
          <span>{orderedPrintItemIds.indexOf(item.id) + 1}</span>
          {outputPrintItemIdSet.has(item.id) ? (
            <Tooltip title={t('modules.print.outputted')}>
              <CheckCircleFilled style={{ color: token.colorSuccess }} />
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    ...printItemFields.flatMap((field: PrintItemFieldSpec) => {
      const itemColumn = {
        key: field.key,
        width:
          field.key === 'brand' && showMergeGroup
            ? 136
            : getPrintItemColumnWidth(field),
        align: getPrintItemColumnAlign(field, moduleKey),
        ellipsis: true,
        title: t(field.labelKey),
        render: (_: unknown, item: PrintRecordItem) => {
          if (field.key !== 'brand') {
            return printItemCellText(field.key, item[field.key])
          }
          const mergeMarker = showMergeGroup
            ? mergeMarkersByItemId[item.id]
            : undefined
          return (
            <span className="flex min-w-0 items-center gap-1">
              {mergeMarker ? (
                <Tag
                  className="m-0"
                  color="processing"
                  title={`${mergeMarker.itemCount} ${t('modules.print.mergeRows')}`}
                >
                  {mergeMarker.groupIndex}
                </Tag>
              ) : null}
              <Typography.Text
                ellipsis={{ tooltip: true }}
                style={{ minWidth: 0, flex: 1 }}
              >
                {fieldText(item.brand)}
              </Typography.Text>
            </span>
          )
        },
      }
      if (field.key !== 'brand' || !brandOverrideEnabled) {
        return [itemColumn]
      }
      return [
        itemColumn,
        {
          key: 'brandOverrideTo',
          width: 132,
          align: 'left' as const,
          title: t('modules.print.brandOverrideTo'),
          render: (_: unknown, item: PrintRecordItem) => (
            <Input
              maxLength={64}
              onChange={(event) =>
                dispatchPrintJobModal({
                  type: 'setBrandOverride',
                  itemId: item.id,
                  value: event.target.value,
                })
              }
              placeholder={t('modules.print.brandOverridePlaceholder')}
              size="small"
              value={state.brandOverridesByItemId[item.id] || ''}
              variant="filled"
            />
          ),
        },
      ]
    }),
  ]

  const tableEmptyText = printItemsError ? (
    <div className="flex flex-col items-center gap-2 py-4">
      <Typography.Text type="secondary">
        {t('modules.print.printItemsLoadFailed')}
      </Typography.Text>
      <Button
        size="small"
        onClick={() => {
          void refetchPrintItems()
        }}
      >
        {t('common.retry')}
      </Button>
    </div>
  ) : (
    t('modules.print.noPrintItems')
  )

  const printItemsTable = (items: PrintRecordItem[]) => (
    <Table<PrintRecordItem>
      columns={columns}
      components={{ body: { row: SortableRow } }}
      dataSource={items}
      locale={{ emptyText: tableEmptyText }}
      pagination={false}
      rowKey={(item) => item.id}
      rowSelection={rowSelection}
      scroll={{ y: brandOverrideEnabled ? 376 : 320 }}
      size="small"
    />
  )

  const printItemsContent =
    moduleKey === 'customer-statement' && customerStatementGroups.length ? (
      <div className="module-items-groups">
        {customerStatementGroups.map((group) => (
          <div className="module-items-group" key={group.key}>
            <CustomerStatementItemGroupHeader
              group={
                group as CustomerStatementItemGroup<
                  PrintRecordItem & Record<string, unknown>
                >
              }
            />
            {printItemsTable(group.items as PrintRecordItem[])}
          </div>
        ))}
      </div>
    ) : moduleKey === 'freight-statement' && freightStatementGroups.length ? (
      <div className="module-items-groups">
        {freightStatementGroups.map((group) => (
          <div className="module-items-group" key={group.key}>
            <FreightStatementItemGroupHeader group={group} />
            {group.projectGroups.map((projectGroup) => (
              <div
                className="module-items-project-group"
                key={projectGroup.key}
              >
                <FreightStatementProjectGroupHeader group={projectGroup} />
                {printItemsTable(projectGroup.items as PrintRecordItem[])}
              </div>
            ))}
          </div>
        ))}
      </div>
    ) : (
      printItemsTable(orderedPrintItems)
    )

  const footer = (
    <Flex justify="space-between" align="center" gap="small" wrap="wrap">
      {canExportPrintXlsx ? (
        <Button
          disabled={!hasSelectedPrintItems || Boolean(pendingOutputAction)}
          icon={<FileExcelOutlined />}
          loading={pendingOutputAction === 'xlsx'}
          onClick={() => {
            void handleExportPrintXlsx()
          }}
          type="text"
        >
          {t('modules.print.exportXlsx')}
        </Button>
      ) : (
        <span />
      )}
      <Flex gap="small" wrap="wrap">
        <Button
          disabled={Boolean(pendingOutputAction)}
          onClick={handleRequestClose}
        >
          {t('common.cancel')}
        </Button>
        {isPdfTemplate(selectedTemplate) ? (
          <Button
            disabled={!hasSelectedPrintItems || Boolean(pendingOutputAction)}
            icon={<FilePdfOutlined />}
            loading={pendingOutputAction === 'download'}
            onClick={() => {
              void handlePrint('download')
            }}
          >
            {t('modules.print.downloadPdf')}
          </Button>
        ) : null}
        <Button
          disabled={!hasSelectedPrintItems || Boolean(pendingOutputAction)}
          icon={<EyeOutlined />}
          loading={pendingOutputAction === 'preview'}
          onClick={() => {
            void handlePrint('preview')
          }}
        >
          {t('modules.print.preview')}
        </Button>
        <Button
          disabled={!hasSelectedPrintItems || Boolean(pendingOutputAction)}
          icon={<PrinterOutlined />}
          loading={pendingOutputAction === 'print'}
          onClick={() => {
            void handlePrint('print')
          }}
          type="primary"
        >
          {t('modules.print.directPrint')}
        </Button>
      </Flex>
    </Flex>
  )

  return (
    <Modal
      closable={!pendingOutputAction}
      destroyOnHidden
      footer={footer}
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
          moduleTitle={moduleTitle}
          orderNo={orderNo}
          projectSummaryText={projectSummaryText}
          selectedTemplate={selectedTemplate}
          t={t}
        />
        <Form
          component={false}
          form={form}
          initialValues={{
            mergeMode: 'merge',
            printOptions: EMPTY_PRINT_OPTIONS,
            templateId: templates[0]?.id,
          }}
        >
          <Flex align="center" gap="middle" wrap="wrap">
            <Typography.Text strong className="whitespace-nowrap">
              {t('modules.print.selectTemplate')}
            </Typography.Text>
            {templates.length ? (
              <Form.Item name="templateId" noStyle>
                <Select
                  options={templateOptions}
                  style={{ width: 220 }}
                  variant="outlined"
                />
              </Form.Item>
            ) : (
              <Empty
                description={t('modules.print.noTemplate')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
            <Typography.Text strong className="whitespace-nowrap">
              {t('modules.print.printOptions')}
            </Typography.Text>
            <Form.Item name="printOptions" noStyle>
              <Checkbox.Group className="flex flex-wrap items-center gap-x-6 gap-y-1">
                {isSalesOrder ? (
                  <Checkbox value="hideUnitPrice">
                    {t('modules.print.hideUnitPrice')}
                  </Checkbox>
                ) : null}
                <Checkbox value="hideRemark">
                  {t('modules.print.hideRemark')}
                </Checkbox>
                {isSalesOrder ? (
                  <Checkbox value="enableBrandOverride">
                    {t('modules.print.enableBrandOverride')}
                  </Checkbox>
                ) : null}
                <Checkbox value="enableItemSelection">
                  {t('modules.print.enableItemSelection')}
                </Checkbox>
              </Checkbox.Group>
            </Form.Item>
          </Flex>
        </Form>
        <Flex
          justify="space-between"
          align="center"
          gap="small"
          wrap="wrap"
          style={{
            background: token.colorFillQuaternary,
            borderRadius: token.borderRadiusSM,
            paddingBlock: token.paddingXS,
            paddingInline: token.paddingSM,
          }}
        >
          <Flex align="center" gap="middle" wrap="wrap" style={{ minWidth: 0 }}>
            <SummaryInfo
              label={t('modules.print.deliveryDate')}
              value={recordDeliveryDate}
              valueMaxWidth={160}
            />
            <SummaryInfo
              label={t('modules.print.recordRemark')}
              value={recordRemark}
              valueMaxWidth={320}
            />
            <SummaryInfo
              label={t('modules.print.currentSettlementCompany')}
              value={settlementCompanyName}
              valueMaxWidth={280}
            />
          </Flex>
          <Flex align="center" gap="large" wrap="wrap">
            <span className="whitespace-nowrap">
              <Typography.Text type="secondary">
                {t('modules.print.totalQuantity')}：
              </Typography.Text>
              <Typography.Text strong style={{ color: token.colorPrimary }}>
                {formattedTotal(totalQuantity, 0)}
              </Typography.Text>
            </span>
            <span className="whitespace-nowrap">
              <Typography.Text type="secondary">
                {t('modules.print.totalWeight')}：
              </Typography.Text>
              <Typography.Text strong style={{ color: token.colorPrimary }}>
                {formattedTotal(totalWeight)}
              </Typography.Text>
            </span>
          </Flex>
        </Flex>
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
            {printItemsContent}
          </SortableContext>
        </DndContext>
      </Flex>
    </Modal>
  )
}
