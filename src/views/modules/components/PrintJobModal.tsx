import {
  DownloadOutlined,
  EyeOutlined,
  PrinterOutlined,
} from '@ant-design/icons'
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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  listPrintRecordItems,
  type PrintRecordItem,
} from '@/api/print-template'
import { getCustomerProjectOptions } from '@/constants/module-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { PrintOptions } from '@/hooks/useBusinessGridPrintActions'
import type { ModuleRecord } from '@/types/module-page'
import type {
  PrintActionMode,
  PrintTemplateRecord,
} from '@/types/print-template'

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
    printOptions?: PrintOptions,
  ) => void
  onExportPrintXlsx?: () => void
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>()
  const [hideUnitPrice, setHideUnitPrice] = useState(false)
  const [brandOverrideEnabled, setBrandOverrideEnabled] = useState(false)
  const [brandOverridesByItemId, setBrandOverridesByItemId] = useState<
    Record<string, string>
  >({})
  const { data: printItems = [] } = useQuery<PrintRecordItem[]>({
    queryKey: QUERY_KEYS.printRecordItems(moduleKey, selectedRowKeys),
    queryFn: async () => {
      const response = await listPrintRecordItems(moduleKey, selectedRowKeys)
      return Array.isArray(response.data) ? response.data : []
    },
    enabled: open && selectedRowKeys.length > 0,
    staleTime: 30 * 1000,
  })
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  )
  const primaryRecord = selectedRows[0]
  const primaryRecordSummary = primaryRecord ? recordSummary(primaryRecord) : ''
  const primaryProjectSummary = projectSummary(primaryRecord)
  const primaryHeaderSummary = [primaryRecordSummary, primaryProjectSummary]
    .filter(Boolean)
    .join(' / ')
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

  useEffect(() => {
    if (!open) return
    setSelectedTemplateId((current) => {
      if (current && templates.some((template) => template.id === current)) {
        return current
      }
      return templates[0]?.id
    })
  }, [open, templates])

  const handlePrint = (mode: PrintActionMode) => {
    if (!selectedTemplate) return
    const normalizedBrandOverridesByItemId = Object.fromEntries(
      Object.entries(brandOverridesByItemId)
        .map(([itemId, value]) => [itemId, value.trim()])
        .filter(([, value]) => value),
    )
    onPrint(mode, selectedTemplate, {
      hideUnitPrice,
      ...(brandOverrideEnabled &&
      Object.keys(normalizedBrandOverridesByItemId).length
        ? { brandOverridesByItemId: normalizedBrandOverridesByItemId }
        : {}),
    })
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
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Typography.Text strong className="text-lg">
                {moduleTitle || t('modules.print.currentModule')}
              </Typography.Text>
              {primaryHeaderSummary ? (
                <Typography.Text className="max-w-[720px] truncate">
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

        <div className="grid grid-cols-[96px_minmax(0,520px)] items-center gap-3">
          <Typography.Text strong className="whitespace-nowrap">
            {t('modules.print.selectTemplate')}
          </Typography.Text>
          <div>
            {templates.length ? (
              <Select
                className="w-full"
                onChange={setSelectedTemplateId}
                options={templateOptions}
                value={selectedTemplateId}
              />
            ) : (
              <Empty description={t('modules.print.noTemplate')} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3">
          <Typography.Text strong className="whitespace-nowrap">
            {t('modules.print.printOptions')}
          </Typography.Text>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-base">
            <Checkbox
              checked={hideUnitPrice}
              onChange={(event) => setHideUnitPrice(event.target.checked)}
            >
              {t('modules.print.hideUnitPrice')}
            </Checkbox>
            <Checkbox
              checked={brandOverrideEnabled}
              onChange={(event) =>
                setBrandOverrideEnabled(event.target.checked)
              }
            >
              {t('modules.print.enableBrandOverride')}
            </Checkbox>
          </div>
        </div>

        <div>
          <Typography.Text strong>
            {t('modules.print.selectedPrintItems')}
          </Typography.Text>
          <div className="mt-8 max-h-[320px] overflow-auto rounded border border-gray-200 bg-gray-50">
            {printItems.length ? (
              <div className="divide-y divide-gray-200">
                {printItems.map((item, index) => (
                  <div key={item.id} className="px-3 py-3">
                    <div
                      className={
                        brandOverrideEnabled
                          ? 'grid min-w-[1220px] grid-cols-[44px_minmax(100px,130px)_minmax(160px,210px)_minmax(92px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(70px,0.7fr)_minmax(80px,0.8fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(110px,1fr)] items-center gap-4 text-base'
                          : 'grid min-w-[1040px] grid-cols-[44px_minmax(120px,150px)_minmax(92px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(70px,0.7fr)_minmax(80px,0.8fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(110px,1fr)] items-center gap-4 text-base'
                      }
                    >
                      <Typography.Text type="secondary">
                        #{index + 1}
                      </Typography.Text>
                      <Typography.Text className="block truncate">
                        {fieldText(item.brand)}
                      </Typography.Text>
                      {brandOverrideEnabled ? (
                        <Input
                          maxLength={64}
                          className="h-32 w-[168px]"
                          onChange={(event) =>
                            setBrandOverridesByItemId((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          placeholder={t(
                            'modules.print.brandOverridePlaceholder',
                          )}
                          value={brandOverridesByItemId[item.id] || ''}
                        />
                      ) : null}
                      {PRINT_ITEM_FIELDS.map((field) => (
                        <Typography.Text
                          key={field.key}
                          className="block truncate"
                          title={`${t(field.labelKey)}：${fieldText(
                            item[field.key],
                          )}`}
                        >
                          <Typography.Text type="secondary">
                            {t(field.labelKey)}：
                          </Typography.Text>
                          {fieldText(item[field.key])}
                        </Typography.Text>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-6 text-center text-gray-500">
                {t('modules.print.noPrintItems')}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          {canExportPrintXlsx ? (
            <Button icon={<DownloadOutlined />} onClick={onExportPrintXlsx}>
              {t('modules.print.exportXlsx')}
            </Button>
          ) : null}
          {isPdfTemplate(selectedTemplate) ? (
            <Button
              disabled={!selectedTemplate}
              icon={<DownloadOutlined />}
              onClick={() => handlePrint('download')}
            >
              {t('modules.print.downloadPdf')}
            </Button>
          ) : null}
          <Button
            disabled={!selectedTemplate}
            icon={<EyeOutlined />}
            onClick={() => handlePrint('preview')}
          >
            {t('modules.print.preview')}
          </Button>
          <Button
            disabled={!selectedTemplate}
            icon={<PrinterOutlined />}
            onClick={() => handlePrint('print')}
            type="primary"
          >
            {t('modules.print.directPrint')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
