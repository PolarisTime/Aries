import { ImportOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Modal,
  Select,
  Space,
  Spin,
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
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import { message } from '@/utils/antd-app'
import { DATE_PICKER_FORMATS } from '@/utils/formatters'
import { SalesReturnSourceImportActionTable } from './SalesReturnSourceImportActionTable'
import {
  buildDefaultSelection,
  isItemQuantityOutOfRange,
  isSelectionDraftForSource,
  type SalesReturnSelectionDraft,
} from './sales-return-source-import-utils'

interface Props {
  refreshModuleQueries: () => Promise<void>
}

const AUDITED_OUTBOUND_FILTERS = {
  status: DOCUMENT_STATUS.AUDITED,
} as const
const OUTBOUND_SEARCH_PAGE_SIZE = 30
const OUTBOUND_SEARCH_DEBOUNCE_MS = 300

export function SalesReturnSourceImportAction({ refreshModuleQueries }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [outboundId, setOutboundId] = useState('')
  const [outboundKeyword, setOutboundKeyword] = useState('')
  const [debouncedOutboundKeyword, setDebouncedOutboundKeyword] = useState('')
  // 惰性初始化: dayjs() 每次渲染都新建会被丢弃(react-doctor rerender-lazy-state-init)
  const [returnDate, setReturnDate] = useState<Dayjs>(() => dayjs())
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedOutboundKeyword(outboundKeyword),
      OUTBOUND_SEARCH_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [outboundKeyword])

  const outboundQuery = useQuery({
    queryKey: QUERY_KEYS.salesOutboundAuditedList(
      0,
      OUTBOUND_SEARCH_PAGE_SIZE,
      debouncedOutboundKeyword,
    ),
    queryFn: ({ signal }) =>
      listBusinessModule(
        'sales-outbound',
        debouncedOutboundKeyword
          ? { ...AUDITED_OUTBOUND_FILTERS, keyword: debouncedOutboundKeyword }
          : AUDITED_OUTBOUND_FILTERS,
        { currentPage: 0, pageSize: OUTBOUND_SEARCH_PAGE_SIZE },
        { signal },
      ),
    enabled: open,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
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

  /**
   * 勾选与退货数量的本地草稿。草稿记录了它所基于的候选数据对象：候选一变
   * （重新拉取或换出库单）即作废，自动回退到默认值（全部勾选、数量取可退数量），
   * 因此不需要用 effect 把查询结果同步进 state。
   */
  const [draft, setDraft] = useState<SalesReturnSelectionDraft | null>(null)

  const defaultSelection = useMemo(
    () => buildDefaultSelection(returnableItems),
    [returnableItems],
  )
  const { selectedIds, quantityById } = isSelectionDraftForSource(
    draft,
    candidates,
  )
    ? draft
    : defaultSelection

  const handleSelectedIdsChange = (ids: string[]) => {
    setDraft({ source: candidates, selectedIds: ids, quantityById })
  }
  const handleQuantityChange = (itemId: string, quantity: number) => {
    setDraft({
      source: candidates,
      selectedIds,
      quantityById: { ...quantityById, [itemId]: quantity },
    })
  }

  const hasInvalidQuantity = returnableItems.some((item) =>
    isItemQuantityOutOfRange(item, quantityById),
  )

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
    setOutboundKeyword('')
    setDebouncedOutboundKeyword('')
    setReturnDate(dayjs())
    setDraft(null)
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
    // Set 查找: 候选行逐行比对勾选集, 数组 includes 会退化成 O(n²)
    const selectedIdSet = new Set(selectedIds)
    const selections: SalesReturnSourceSelection[] = returnableItems
      .filter((item) => selectedIdSet.has(item.sourceSalesOutboundItemId))
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
          disabled:
            !outboundId || returnableItems.length === 0 || hasInvalidQuantity,
        }}
        destroyOnHidden
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Select
              showSearch={{
                filterOption: false,
                onSearch: setOutboundKeyword,
              }}
              style={{ width: 380 }}
              aria-label={t(
                'modules.pages.salesReturn.sourceImport.outboundPlaceholder',
              )}
              placeholder={t(
                'modules.pages.salesReturn.sourceImport.outboundPlaceholder',
              )}
              value={outboundId || undefined}
              loading={outboundQuery.isPending || outboundQuery.isFetching}
              options={outboundOptions}
              notFoundContent={
                outboundQuery.isFetching ? (
                  <Spin size="small" />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t(
                      'modules.pages.salesReturn.sourceImport.noOutbound',
                    )}
                  />
                )
              }
              onChange={(value) => {
                setOutboundId(String(value))
                setOutboundKeyword('')
              }}
            />
            <DatePicker
              aria-label={t(
                'modules.pages.salesReturn.sourceImport.returnDateLabel',
              )}
              format={DATE_PICKER_FORMATS}
              value={returnDate}
              onChange={(value) => setReturnDate(value ?? dayjs())}
            />
          </Space>
          {outboundQuery.isError ? (
            <Alert
              type="error"
              showIcon
              title={t(
                'modules.pages.salesReturn.sourceImport.loadOutboundFailed',
              )}
            />
          ) : null}
          {candidatesQuery.isError ? (
            <Alert
              type="error"
              showIcon
              title={t(
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
              <SalesReturnSourceImportActionTable
                items={returnableItems}
                selectedIds={selectedIds}
                quantityById={quantityById}
                onSelectedIdsChange={handleSelectedIdsChange}
                onQuantityChange={handleQuantityChange}
              />
            </>
          ) : null}
        </Space>
      </Modal>
    </>
  )
}
