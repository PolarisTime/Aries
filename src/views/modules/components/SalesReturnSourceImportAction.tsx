import { ImportOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { TableProps } from 'antd'
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listBusinessModule } from '@/api/business/business-listing'
import {
  createSalesReturnFromSource,
  getSalesReturnCandidates,
} from '@/api/sales/sales-returns'
import {
  buildSalesReturnSaveRequestFromCandidates,
  type SalesReturnSourceSelection,
} from '@/config/business-pages/operations/sales-return-rules'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { SalesReturnCandidateItem } from '@/shared/schemas/module-record'
import { message } from '@/utils/antd-app'

interface Props {
  refreshModuleQueries: () => Promise<void>
}

const AUDITED_OUTBOUND_FILTERS = { status: '已审核' } as const

export function SalesReturnSourceImportAction({ refreshModuleQueries }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [outboundId, setOutboundId] = useState('')
  const [returnDate, setReturnDate] = useState<Dayjs>(dayjs())
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [quantityById, setQuantityById] = useState<Record<string, number>>({})
  const [creating, setCreating] = useState(false)

  const outboundQuery = useQuery({
    queryKey: QUERY_KEYS.salesOutboundAuditedList(0, 100),
    queryFn: ({ signal }) =>
      listBusinessModule(
        'sales-outbound',
        AUDITED_OUTBOUND_FILTERS,
        { currentPage: 0, pageSize: 100 },
        { signal },
      ),
    enabled: open,
    staleTime: 30_000,
  })

  const candidatesQuery = useQuery({
    queryKey: QUERY_KEYS.salesReturnCandidates(outboundId),
    queryFn: ({ signal }) => getSalesReturnCandidates(outboundId, signal),
    enabled: open && Boolean(outboundId),
    staleTime: 0,
  })

  const candidates = candidatesQuery.data
  const returnableItems = useMemo(
    () =>
      (candidates?.items ?? []).filter((item) => item.returnableQuantity > 0),
    [candidates],
  )

  useEffect(() => {
    if (!candidates) {
      return
    }
    const items = candidates.items.filter((item) => item.returnableQuantity > 0)
    setSelectedIds(items.map((item) => item.sourceSalesOutboundItemId))
    setQuantityById(
      Object.fromEntries(
        items.map((item) => [
          item.sourceSalesOutboundItemId,
          item.returnableQuantity,
        ]),
      ),
    )
  }, [candidates])

  const outboundOptions = useMemo(
    () =>
      (outboundQuery.data?.data?.rows ?? []).map((record) => {
        const id = String(record.id)
        const parts = [
          record.outboundNo,
          record.customerName,
          record.projectName,
        ]
          .map((value) => String(value ?? '').trim())
          .filter(Boolean)
        return { value: id, label: parts.join(' · ') || id }
      }),
    [outboundQuery.data],
  )

  const resetState = () => {
    setOutboundId('')
    setReturnDate(dayjs())
    setSelectedIds([])
    setQuantityById({})
    setCreating(false)
  }

  const handleClose = () => {
    setOpen(false)
    resetState()
  }

  const handleConfirm = async () => {
    if (!candidates) {
      return
    }
    const selections: SalesReturnSourceSelection[] = returnableItems
      .filter((item) => selectedIds.includes(item.sourceSalesOutboundItemId))
      .map((item) => ({
        item,
        quantity: quantityById[item.sourceSalesOutboundItemId] ?? 0,
      }))
      .filter((selection) => selection.quantity > 0)

    if (!selections.length) {
      message.warning(
        t('modules.pages.salesReturn.sourceImport.quantityRequired'),
      )
      return
    }

    setCreating(true)
    try {
      const payload = buildSalesReturnSaveRequestFromCandidates(candidates, {
        returnDate: returnDate.format('YYYY-MM-DD'),
        selections,
      })
      await createSalesReturnFromSource(payload)
      await refreshModuleQueries()
      message.success(t('modules.pages.salesReturn.sourceImport.createSuccess'))
      handleClose()
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('modules.pages.salesReturn.sourceImport.createFailed'),
      )
      setCreating(false)
    }
  }

  const columns: TableProps<SalesReturnCandidateItem>['columns'] = [
    {
      title: t('modules.pages.salesReturn.sourceImport.colMaterialCode'),
      dataIndex: 'materialCode',
      width: 140,
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colBrand'),
      dataIndex: 'brand',
      width: 90,
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colMaterial'),
      dataIndex: 'material',
      width: 100,
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colSpec'),
      dataIndex: 'spec',
      width: 90,
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colOutboundQuantity'),
      dataIndex: 'outboundQuantity',
      width: 100,
      align: 'right',
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colReturnedQuantity'),
      dataIndex: 'returnedQuantity',
      width: 100,
      align: 'right',
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colReturnableQuantity'),
      dataIndex: 'returnableQuantity',
      width: 100,
      align: 'right',
    },
    {
      title: t('modules.pages.salesReturn.sourceImport.colReturnQuantity'),
      dataIndex: 'sourceSalesOutboundItemId',
      width: 120,
      render: (_value, item) => (
        <InputNumber
          min={0}
          max={item.returnableQuantity}
          precision={0}
          value={quantityById[item.sourceSalesOutboundItemId] ?? 0}
          onChange={(value) =>
            setQuantityById((current) => ({
              ...current,
              [item.sourceSalesOutboundItemId]: Number(value ?? 0),
            }))
          }
        />
      ),
    },
  ]

  return (
    <>
      <Button icon={<ImportOutlined />} onClick={() => setOpen(true)}>
        {t('modules.pages.salesReturn.sourceImport.action')}
      </Button>
      <Modal
        open={open}
        title={t('modules.pages.salesReturn.sourceImport.title')}
        width={960}
        onCancel={handleClose}
        onOk={() => {
          void handleConfirm()
        }}
        okText={t('modules.pages.salesReturn.sourceImport.confirm')}
        confirmLoading={creating}
        okButtonProps={{
          disabled: !outboundId || returnableItems.length === 0,
        }}
        destroyOnHidden
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: 380 }}
              placeholder={t(
                'modules.pages.salesReturn.sourceImport.outboundPlaceholder',
              )}
              value={outboundId || undefined}
              loading={outboundQuery.isPending || outboundQuery.isFetching}
              options={outboundOptions}
              onChange={(value) => setOutboundId(String(value))}
            />
            <DatePicker
              value={returnDate}
              onChange={(value) => setReturnDate(value ?? dayjs())}
            />
          </Space>
          {outboundQuery.isError ? (
            <Alert
              type="error"
              showIcon
              message={t(
                'modules.pages.salesReturn.sourceImport.loadOutboundFailed',
              )}
            />
          ) : null}
          {candidatesQuery.isError ? (
            <Alert
              type="error"
              showIcon
              message={t(
                'modules.pages.salesReturn.sourceImport.loadCandidatesFailed',
              )}
            />
          ) : null}
          {candidates && returnableItems.length === 0 ? (
            <Empty
              description={t(
                'modules.pages.salesReturn.sourceImport.noReturnableItems',
              )}
            />
          ) : null}
          {returnableItems.length > 0 ? (
            <>
              <Typography.Text type="secondary">
                {[candidates?.salesOutboundNo, candidates?.salesOrderNo]
                  .map((value) => String(value ?? '').trim())
                  .filter(Boolean)
                  .join(' · ')}
              </Typography.Text>
              <Table<SalesReturnCandidateItem>
                rowKey="sourceSalesOutboundItemId"
                size="small"
                columns={columns}
                dataSource={returnableItems}
                pagination={false}
                scroll={{ y: 320 }}
                rowSelection={{
                  selectedRowKeys: selectedIds,
                  onChange: (keys) => setSelectedIds(keys.map(String)),
                }}
              />
            </>
          ) : null}
        </Space>
      </Modal>
    </>
  )
}
