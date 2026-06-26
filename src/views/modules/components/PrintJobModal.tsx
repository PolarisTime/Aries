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

const COUNTERPARTY_FIELDS = [
  'customerName',
  'supplierName',
  'carrierName',
  'projectName',
]

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

function isPdfTemplate(template?: PrintTemplateRecord) {
  return template?.templateType === 'PDF_FORM'
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
  selectedCount,
  selectedRowKeys,
  selectedRows,
  templates,
  onClose,
  onPrint,
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
  const unloadedCount = Math.max(0, selectedCount - selectedRows.length)
  const templateOptions = useMemo(
    () =>
      templates.map((template) => ({
        label: (
          <Space size={8}>
            <span>{template.templateName}</span>
            <Tag>{template.templateType || 'COORD'}</Tag>
          </Space>
        ),
        value: template.id,
      })),
    [templates],
  )
  const visibleRows = selectedRows.slice(0, 8)

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

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={t('modules.print.jobTitle')}
      width={840}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <Typography.Text strong>
              {moduleTitle || t('modules.print.currentModule')}
            </Typography.Text>
            <Typography.Text type="secondary" className="ml-12">
              {t('modules.print.selectedRecords', { count: selectedCount })}
            </Typography.Text>
          </div>
          {selectedTemplate ? (
            <Tag color={isPdfTemplate(selectedTemplate) ? 'blue' : 'green'}>
              {selectedTemplate.templateType || 'COORD'}
            </Tag>
          ) : null}
        </div>

        <div>
          <Typography.Text strong>
            {t('modules.print.selectTemplate')}
          </Typography.Text>
          <div className="mt-8">
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

        <div>
          <Typography.Text strong>
            {t('modules.print.printOptions')}
          </Typography.Text>
          <div className="mt-8">
            <Checkbox
              checked={hideUnitPrice}
              onChange={(event) => setHideUnitPrice(event.target.checked)}
            >
              {t('modules.print.hideUnitPrice')}
            </Checkbox>
            <div className="mt-8 flex flex-wrap items-center gap-2">
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
        </div>

        <div>
          <Typography.Text strong>
            {t('modules.print.selectedPrintItems')}
          </Typography.Text>
          <div className="mt-8 max-h-[260px] overflow-auto rounded border border-gray-200 bg-gray-50">
            {printItems.length ? (
              <div className="divide-y divide-gray-200">
                {printItems.map((item, index) => (
                  <div key={item.id} className="px-3 py-2">
                    <div
                      className={
                        brandOverrideEnabled
                          ? 'grid grid-cols-[32px_minmax(80px,120px)_minmax(140px,180px)_minmax(0,1fr)] items-center gap-3'
                          : 'grid grid-cols-[32px_minmax(96px,150px)_minmax(0,1fr)] items-center gap-3'
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
                      <div className="grid grid-cols-4 gap-x-3 gap-y-1">
                        {PRINT_ITEM_FIELDS.map((field) => (
                          <div key={field.key} className="min-w-0">
                            <Typography.Text
                              className="block text-xs"
                              type="secondary"
                            >
                              {t(field.labelKey)}
                            </Typography.Text>
                            <Typography.Text className="block truncate">
                              {fieldText(item[field.key])}
                            </Typography.Text>
                          </div>
                        ))}
                      </div>
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

        <div>
          <Typography.Text strong>
            {t('modules.print.selectedRecordList')}
          </Typography.Text>
          <div className="mt-8 rounded border border-gray-200">
            {visibleRows.length ? (
              <div className="divide-y divide-gray-200">
                {visibleRows.map((record, index) => (
                  <div
                    key={String(record.id)}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <Typography.Text className="truncate">
                      {recordSummary(record)}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      #{index + 1}
                    </Typography.Text>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-6 text-center text-gray-500">
                {t('modules.print.onlySelectedIds')}
              </div>
            )}
          </div>
          {selectedRows.length > visibleRows.length ? (
            <Typography.Text type="secondary" className="mt-8 block">
              {t('modules.print.moreSelectedRows', {
                count: selectedRows.length - visibleRows.length,
              })}
            </Typography.Text>
          ) : null}
          {unloadedCount ? (
            <Typography.Text type="secondary" className="mt-4 block">
              {t('modules.print.unloadedSelectedRows', {
                count: unloadedCount,
              })}
            </Typography.Text>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
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
