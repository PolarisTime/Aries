import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Empty,
  Input,
  Modal,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchPurchaseOrderTonnages,
  type PurchaseOrderTonnageRecord,
} from '@/api/market/quote-sheets'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import { formatWeight } from '@/utils/formatters'

interface Props {
  open: boolean
  /** 当前已关联明细行 id(用于高亮与清除)。 */
  selectedItemId?: string
  /** 排除的报价单标识(编辑当前单据时排除自身已保存吨位), 可为空。 */
  excludeSheetId?: string
  /** 选中明细行(undefined 表示清除关联); 选择后由调用方关闭弹窗。 */
  onSelect: (record: PurchaseOrderTonnageRecord | undefined) => void
  onClose: () => void
}

const SEARCH_DEBOUNCE_MS = 300

/**
 * 采购订单明细行选择弹窗: **服务端**按关键字(单号/供应商/规格)过滤并展示订货/已开/剩余吨位。
 * <p>搜索下沉到后端, 避免固定条数截断导致匹配行落在窗口外搜不到。</p>
 */
export function PurchaseOrderPickerModal({
  open,
  selectedItemId,
  excludeSheetId,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')

  // 关键字防抖: 避免每次输入都打后端。
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedKeyword(keyword.trim()),
      SEARCH_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [keyword])

  const { data = [], isFetching } = useQuery({
    queryKey: [
      ...QUERY_KEYS.priceCompare.purchaseOrderTonnages,
      'picker',
      debouncedKeyword,
      excludeSheetId ?? '',
    ],
    queryFn: ({ signal }) =>
      fetchPurchaseOrderTonnages(
        {
          ...(debouncedKeyword ? { keyword: debouncedKeyword } : {}),
          ...(excludeSheetId ? { excludeSheetId } : {}),
        },
        signal,
      ),
    enabled: open,
    staleTime: STALE_REALTIME,
    retry: 1,
  })

  const columns: ColumnsType<PurchaseOrderTonnageRecord> = [
    {
      title: t('priceCompare.sheet.columns.purchaseOrderNo'),
      dataIndex: 'orderNo',
      width: 140,
      ellipsis: true,
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderSupplier'),
      dataIndex: 'supplierName',
      width: 120,
      ellipsis: true,
    },
    {
      title: t('priceCompare.sheet.columns.variety'),
      key: 'variety',
      width: 180,
      ellipsis: true,
      render: (_value, record) =>
        `${record.category} ${record.material} Φ${record.spec} ${record.length}`,
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderOrdered'),
      dataIndex: 'orderedWeight',
      width: 96,
      align: 'right',
      render: (value: number) => formatWeight(value),
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderIssued'),
      dataIndex: 'issuedWeight',
      width: 96,
      align: 'right',
      render: (value: number) => formatWeight(value),
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderRemaining'),
      dataIndex: 'remainingWeight',
      width: 96,
      align: 'right',
      render: (value: number) => (
        <Typography.Text type={value < 0 ? 'danger' : undefined}>
          {formatWeight(value)}
        </Typography.Text>
      ),
    },
    {
      title: t('priceCompare.sheet.columns.purchaseOrderStatus'),
      dataIndex: 'status',
      width: 88,
      align: 'center',
      render: (value: string) => <Tag>{value}</Tag>,
    },
  ]

  return (
    <Modal
      title={t('priceCompare.sheet.purchaseOrderPickerTitle')}
      open={open}
      width={920}
      destroyOnHidden
      footer={
        <div className="price-compare-purchase-order-picker-footer">
          <Tooltip title={t('priceCompare.sheet.purchaseOrderPickerClearHint')}>
            <Button
              danger
              disabled={!selectedItemId}
              onClick={() => onSelect(undefined)}
            >
              {t('priceCompare.sheet.purchaseOrderPickerClear')}
            </Button>
          </Tooltip>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      }
      onCancel={onClose}
      styles={{ body: { paddingTop: 'var(--space-xs)' } }}
    >
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder={t('priceCompare.sheet.purchaseOrderPickerSearch')}
        value={keyword}
        onChange={(event) => setKeyword(event.currentTarget.value)}
        style={{ marginBottom: 'var(--space-sm)' }}
      />
      <Table<PurchaseOrderTonnageRecord>
        columns={columns}
        dataSource={data}
        rowKey="purchaseOrderItemId"
        loading={isFetching}
        size="small"
        pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
        scroll={{ y: 320 }}
        locale={{
          emptyText: (
            <Empty
              description={t('priceCompare.sheet.purchaseOrderPickerEmpty')}
            />
          ),
        }}
        onRow={(record) => ({
          onClick: () => onSelect(record),
          style: {
            cursor: 'pointer',
            background:
              record.purchaseOrderItemId === selectedItemId
                ? 'var(--ant-color-primary-bg, #e6f4ff)'
                : undefined,
          },
        })}
      />
      <Typography.Text
        type="secondary"
        style={{ fontSize: 'var(--font-size-xs)' }}
      >
        {t('priceCompare.sheet.purchaseOrderPickerHint')}
      </Typography.Text>
    </Modal>
  )
}
